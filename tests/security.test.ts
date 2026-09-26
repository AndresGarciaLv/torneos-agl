import { describe, expect, it } from "vitest";
import { registrationSchema } from "@/core/application/schemas";
import { buildPublicView } from "@/core/application/views";
import { EnvPasswordVerifier, HmacSessionService } from "@/infrastructure/security/hmac-session";

const SECRET = "x".repeat(48);

describe("HmacSessionService", () => {
  it("acepta un token recién emitido", () => {
    const s = new HmacSessionService(SECRET);
    expect(s.verify(s.issue().token)).toBe(true);
  });

  it("rechaza un token alterado, uno firmado con otro secreto y basura", () => {
    const s = new HmacSessionService(SECRET);
    const { token } = s.issue();
    const [body, sig] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ v: 1, sub: "admin", iat: 0, exp: 9e9, jti: "x" })).toString("base64url");
    expect(s.verify(`${forged}.${sig}`)).toBe(false);
    expect(s.verify(`${body}.${sig}x`)).toBe(false);
    expect(new HmacSessionService("y".repeat(48)).verify(token)).toBe(false);
    expect(s.verify("")).toBe(false);
    expect(s.verify(null)).toBe(false);
    expect(s.verify("a.b.c")).toBe(false);
  });

  it("rechaza un token vencido", () => {
    let now = 1_000_000_000_000;
    const s = new HmacSessionService(SECRET, 60, () => now);
    const { token } = s.issue();
    now += 61_000;
    expect(s.verify(token)).toBe(false);
  });
});

describe("EnvPasswordVerifier", () => {
  it("compara en tiempo constante sin importar la longitud", () => {
    const v = new EnvPasswordVerifier("una-contraseña-larga");
    expect(v.verify("una-contraseña-larga")).toBe(true);
    expect(v.verify("una-contraseña-larg")).toBe(false);
    expect(v.verify("")).toBe(false);
    expect(v.verify("x".repeat(5000))).toBe(false);
  });
});

describe("registrationSchema", () => {
  const ok = { gamerTag: "  Natan   MX ", email: " NATAN@Mail.com ", acceptedRules: true };

  it("normaliza Gamer Tag y correo", () => {
    const r = registrationSchema.parse(ok);
    expect(r.gamerTag).toBe("Natan MX");
    expect(r.email).toBe("natan@mail.com");
    expect(r.mobileLegendsId).toBeNull();
  });

  it("exige aceptar las reglas y respeta los límites del Gamer Tag", () => {
    expect(registrationSchema.safeParse({ ...ok, acceptedRules: false }).success).toBe(false);
    expect(registrationSchema.safeParse({ ...ok, gamerTag: "x" }).success).toBe(false);
    expect(registrationSchema.safeParse({ ...ok, gamerTag: "x".repeat(41) }).success).toBe(false);
    expect(registrationSchema.safeParse({ ...ok, gamerTag: "​​x​" }).success).toBe(false);
    expect(registrationSchema.safeParse({ ...ok, email: "no-es-correo" }).success).toBe(false);
  });
});

describe("vista pública", () => {
  it("no contiene correos aunque los participantes los tengan", () => {
    const view = buildPublicView(
      {
        id: "t",
        slug: "s",
        name: "Torneo",
        startsAt: new Date("2026-09-26T23:00:00Z"),
        status: "registration",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      2,
      [
        {
          id: "m",
          tournamentId: "t",
          round: 1,
          position: 1,
          player1Id: "p",
          player2Id: "q",
          winnerId: "p",
          nextMatchId: null,
          nextSlot: null,
          createdAt: new Date(),
        },
      ],
      // Un repositorio descuidado podría devolver filas completas: la vista igual debe filtrar.
      [
        { id: "p", gamerTag: "Natan", email: "secreto@mail.com" } as never,
        { id: "q", gamerTag: "Rival", email: "otro@mail.com" } as never,
      ],
      new Date(),
    );
    expect(view.champion?.gamerTag).toBe("Natan");
    expect(JSON.stringify(view)).not.toMatch(/@mail.com/);
  });
});
