import { describe, expect, it } from "vitest";
import { InputValidationError, RateLimitedError, isInputValidationError, isRateLimitedError } from "@/core/application/errors";
import { TournamentCacheInvalidator } from "@/core/application/tournament-cache";
import { RegisterParticipant } from "@/core/application/use-cases/register-participant";
import { DomainError, isDomainError } from "@/core/domain/errors";
import type { UnitOfWork } from "@/core/ports/repositories";
import type { Cache, HumanVerifier, Logger, RateLimiter, RegistrationNotice, RegistrationNotifier } from "@/core/ports/services";
import { escapeHtml, organizerEmail, participantEmail } from "@/infrastructure/email/templates";

const logger: Logger = { info() {}, warn() {}, error() {} };
const cache: Cache = { getJson: async () => null, setJson: async () => {}, delete: async () => {} };
const noCaptcha: HumanVerifier = { enabled: false, verify: async () => true };
const noMail: RegistrationNotifier = { enabled: false, notify: async () => ({ participantNotified: false, organizerNotified: false }) };
const untouchableDb: UnitOfWork = {
  withTournament: async () => {
    throw new Error("no debería llegar a la base");
  },
};

/** Rate limiter en memoria con el mismo contrato que el de Redis. */
function memoryLimiter(): RateLimiter {
  const counts = new Map<string, number>();
  return {
    async consume(bucket, id, limit) {
      const key = `${bucket}:${id}`;
      const n = (counts.get(key) ?? 0) + 1;
      counts.set(key, n);
      return { allowed: n <= limit, remaining: Math.max(0, limit - n), retryAfterSeconds: n <= limit ? 0 : 60 };
    },
  };
}

describe("RegisterParticipant", () => {
  it("cuenta los intentos inválidos: el 6.º de una IP es 429 aunque el cuerpo sea basura", async () => {
    const useCase = new RegisterParticipant(untouchableDb, memoryLimiter(), noCaptcha, new TournamentCacheInvalidator(cache, logger), logger, noMail);
    const attempt = () => useCase.execute({ slug: "t", input: { gamerTag: "x" }, clientIp: "1.2.3.4" });

    for (let i = 0; i < 5; i++) await expect(attempt()).rejects.toBeInstanceOf(InputValidationError);
    await expect(attempt()).rejects.toBeInstanceOf(RateLimitedError);
  });

  it("devuelve el error por campo", async () => {
    const useCase = new RegisterParticipant(untouchableDb, memoryLimiter(), noCaptcha, new TournamentCacheInvalidator(cache, logger), logger, noMail);
    const error = await useCase
      .execute({ slug: "t", input: { gamerTag: "ok", email: "no", acceptedRules: false }, clientIp: null })
      .catch((e: unknown) => e);
    expect(isInputValidationError(error)).toBe(true);
    expect(Object.keys((error as InputValidationError).fields).sort()).toEqual(["acceptedRules", "email"]);
  });
});

describe("reconocer errores sin instanceof", () => {
  // Next puede cargar el módulo de errores dos veces; la clase lanzada no es la misma que la importada.
  it("acepta un error con el mismo nombre y código aunque sea otra clase", () => {
    class OtherCopy extends Error {
      constructor(readonly code: string) {
        super("x");
        this.name = "DomainError";
      }
    }
    expect(isDomainError(new OtherCopy("DUPLICATE_EMAIL"))).toBe(true);
    expect(isDomainError(new DomainError("VALIDATION", "x"))).toBe(true);
    expect(isDomainError(new Error("DomainError"))).toBe(false);

    const rl = new Error("x");
    rl.name = "RateLimitedError";
    expect(isRateLimitedError(rl)).toBe(true);
  });
});

/** Base en memoria que acepta una inscripción, para probar lo que pasa DESPUÉS del commit. */
function acceptingDb(): UnitOfWork {
  const tournament = {
    id: "t1", slug: "t", name: "Monster_AGL — Torneo 1 vs 1", status: "registration" as const,
    startsAt: new Date("2026-09-26T23:00:00Z"), createdAt: new Date(), updatedAt: new Date(),
  };
  let count = 0;
  return {
    withTournament: async (_slug, _mode, fn) =>
      fn({
        tournament,
        participants: {
          insert: async (_id: string, p: { gamerTag: string; email: string; mobileLegendsId: string | null }) => {
            count++;
            return { id: "p" + count, tournamentId: "t1", acceptedRules: true, createdAt: new Date(), ...p };
          },
          count: async () => count,
        },
      } as never),
  };
}

const valid = { gamerTag: "Natan<Main>", email: "Jugador@Example.com", mobileLegendsId: "", acceptedRules: true };

describe("correos de la inscripción", () => {
  it("avisa con los datos ya normalizados y dice si salió la confirmación", async () => {
    const seen: RegistrationNotice[] = [];
    const notifier: RegistrationNotifier = {
      enabled: true,
      notify: async (n) => {
        seen.push(n);
        return { participantNotified: true, organizerNotified: true };
      },
    };
    const useCase = new RegisterParticipant(acceptingDb(), memoryLimiter(), noCaptcha, new TournamentCacheInvalidator(cache, logger), logger, notifier);
    const result = await useCase.execute({ slug: "t", input: valid, clientIp: null });

    expect(result.confirmationEmailSent).toBe(true);
    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({ gamerTag: "Natan<Main>", email: "jugador@example.com", participantNumber: 1 });
  });

  it("si el correo revienta, la inscripción queda igual", async () => {
    const broken: RegistrationNotifier = {
      enabled: true,
      notify: async () => {
        throw new Error("smtp caído");
      },
    };
    const useCase = new RegisterParticipant(acceptingDb(), memoryLimiter(), noCaptcha, new TournamentCacheInvalidator(cache, logger), logger, broken);
    const result = await useCase.execute({ slug: "t", input: valid, clientIp: null });
    expect(result).toMatchObject({ gamerTag: "Natan<Main>", participantCount: 1, confirmationEmailSent: false });
  });

  const links = {
    siteUrl: "https://torneo.example/",
    tiktokUrl: "https://www.tiktok.com/@monster_agl/live",
    logoSrc: "cid:logo-monster-agl@monster-agl",
  };
  const notice = (over: Partial<RegistrationNotice> = {}): RegistrationNotice => ({
    tournamentName: "Monster_AGL — Torneo 1 vs 1",
    startsAt: new Date("2026-09-26T23:00:00Z"),
    gamerTag: "NatanMain",
    email: "jugador@example.com",
    mobileLegendsId: "123456789(2001)",
    participantNumber: 3,
    ...over,
  });

  it("las plantillas escapan lo que escribió el participante", () => {
    const n = notice({ gamerTag: '<img src=x onerror="alert(1)">' });
    for (const mail of [participantEmail(n, links), organizerEmail(n, links)]) {
      expect(mail.html).not.toContain("<img src=x");
      expect(mail.html).toContain(escapeHtml(n.gamerTag));
      expect(mail.html).toContain('src="cid:logo-monster-agl@monster-agl"');
    }
  });

  it("el correo del participante va con sus datos, el aviso de asistencia y la despedida", () => {
    const mail = participantEmail(notice(), links);
    expect(mail.subject).toBe("NatanMain, estás inscrito en el Torneo 1 vs 1 de Monster_AGL");
    for (const body of [mail.html, mail.text]) {
      expect(body).toContain("NatanMain");
      expect(body).toContain("123456789(2001)");
      expect(body).toContain("jugador@example.com");
      expect(body).toContain("#3");
      expect(body).toContain("no se te tomará en cuenta para próximos eventos");
      expect(body).toMatch(/Nos vemos en el (<span[^>]*>)?campo de batalla/);
      expect(body).toMatch(/Mucha suerte/);
    }
    // 17:00 en CDMX: la fecha sale en la zona del torneo, no en la del servidor.
    expect(mail.text).toContain("Sábado 26 de septiembre, 5:00 PM (CDMX)");
  });

  it("sin ID de MLBB lo dice y pide tenerlo a la mano", () => {
    const mail = participantEmail(notice({ mobileLegendsId: null }), links);
    expect(mail.html).toContain("No lo indicaste");
    expect(mail.html).toContain("ten a la mano tu ID de jugador");
  });

  it("el aviso al organizador trae el correo del participante", () => {
    expect(organizerEmail(notice(), links).html).toContain("jugador@example.com");
  });
});
