import { describe, expect, it } from "vitest";
import { adminParticipantSchema, registrationSchema } from "@/core/application/schemas";
import { buildPublicView } from "@/core/application/views";
import { parseMobileLegendsId } from "@/core/domain/participant";
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
  const ok = { gamerTag: "  Natan   MX ", mobileLegendsId: " 123456789 (2001) ", acceptedRules: true };

  it("normaliza el Gamer Tag y no pide correo", () => {
    const r = registrationSchema.parse(ok);
    expect(r.gamerTag).toBe("Natan MX");
    expect(r).not.toHaveProperty("email");
    expect(r.mobileLegendsId).toBe("123456789 (2001)");
  });

  it("el ID de Mobile Legends es obligatorio: sin él no hay a dónde mandar el premio", () => {
    expect(registrationSchema.safeParse({ ...ok, mobileLegendsId: undefined }).success).toBe(false);
    expect(registrationSchema.safeParse({ ...ok, mobileLegendsId: "   " }).success).toBe(false);
  });

  it("el formulario solo acepta «User ID (Server ID)», con o sin espacio", () => {
    expect(registrationSchema.safeParse({ ...ok, mobileLegendsId: "454928618(5207)" }).success).toBe(true);
    for (const bad of ["454928618", "(5207)", "abc (5207)", "1234 (5207)", "454928618 (1)", "454928618 5207"]) {
      expect(registrationSchema.safeParse({ ...ok, mobileLegendsId: bad }).success, bad).toBe(false);
    }
  });

  it("exige aceptar las reglas y respeta los límites del Gamer Tag", () => {
    expect(registrationSchema.safeParse({ ...ok, acceptedRules: false }).success).toBe(false);
    expect(registrationSchema.safeParse({ ...ok, gamerTag: "x" }).success).toBe(false);
    expect(registrationSchema.safeParse({ ...ok, gamerTag: "x".repeat(41) }).success).toBe(false);
    expect(registrationSchema.safeParse({ ...ok, gamerTag: "​​x​" }).success).toBe(false);
  });
});

describe("adminParticipantSchema", () => {
  const id = "0192a0b4-7c1e-7d3a-9f00-000000000001";

  it("editar pide Gamer Tag e ID; el correo vacío cuenta como ausente", () => {
    const r = adminParticipantSchema.parse({
      action: "edit",
      participantId: id,
      gamerTag: " Natan ",
      email: "",
      mobileLegendsId: "123456789 (2001)",
    });
    expect(r).toMatchObject({ action: "edit", gamerTag: "Natan", email: null, mobileLegendsId: "123456789 (2001)" });
  });

  it("ni el alta ni la edición del panel aceptan un inscrito sin ID", () => {
    const base = { gamerTag: "Natan", mobileLegendsId: "" };
    expect(adminParticipantSchema.safeParse({ action: "edit", participantId: id, ...base }).success).toBe(false);
    expect(adminParticipantSchema.safeParse({ action: "add", ...base }).success).toBe(false);
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
        registrationClosed: false,
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

describe("parseMobileLegendsId", () => {
  it("separa User ID y Server ID con o sin espacio", () => {
    expect(parseMobileLegendsId("454928618 (5207)")).toEqual({ userId: "454928618", serverId: "5207" });
    expect(parseMobileLegendsId("454928618(5207)")).toEqual({ userId: "454928618", serverId: "5207" });
  });
  it("devuelve null si no tiene la forma del perfil", () => {
    for (const bad of [null, "", "454928618", "abc (12)", "1234 (5207)"]) expect(parseMobileLegendsId(bad)).toBeNull();
  });
});
