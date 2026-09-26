import { describe, expect, it } from "vitest";
import { commentMatchesKeyword, eligibleEntries, normalizeKeyword, normalizeTiktokUser } from "@/core/domain/raffle";

describe("ruleta: palabra clave", () => {
  it("entra con la palabra completa sin importar mayúsculas, acentos ni signos", () => {
    for (const c of ["MONSTER", "monster", "Mónster!!", "vamos monster 🔥", "monster,yo"]) {
      expect(commentMatchesKeyword(c, "Monster"), c).toBe(true);
    }
  });

  it("no entra si la palabra está pegada a otra o no aparece", () => {
    for (const c of ["monsters", "supermonster", "hola", ""]) expect(commentMatchesKeyword(c, "monster"), c).toBe(false);
  });

  it("acepta frases como palabra clave", () => {
    expect(commentMatchesKeyword("¡Quiero pase semanal!", "pase semanal")).toBe(true);
    expect(commentMatchesKeyword("pase de semanal", "pase semanal")).toBe(false);
  });

  it("rechaza palabra clave vacía o larga", () => {
    expect(() => normalizeKeyword("   ")).toThrow();
    expect(() => normalizeKeyword("x".repeat(31))).toThrow();
  });

  it("normaliza el usuario de TikTok", () => {
    expect(normalizeTiktokUser(" @Juan_MX ")).toBe("juan_mx");
  });

  it("quien ya ganó no vuelve a la rueda", () => {
    const at = new Date();
    const entries = ["a", "b", "c"].map((u) => ({ tiktokUser: u, nickname: u, createdAt: at }));
    expect(eligibleEntries(entries, new Set(["b"])).map((e) => e.tiktokUser)).toEqual(["a", "c"]);
  });
});
