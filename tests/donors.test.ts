import { describe, expect, it } from "vitest";
import { giftStreakKey } from "@/core/domain/donors";

describe("top de donadores: llave de racha", () => {
  const base = { userId: "u1", giftId: "5655", groupId: "1790461599884", msgId: "m1" };

  it("los toques de una misma racha comparten llave (solo cuenta el mayor)", () => {
    expect(giftStreakKey({ ...base, combo: true })).toBe(giftStreakKey({ ...base, combo: true, msgId: "m2" }));
  });

  it("otra racha del mismo regalo es otra llave", () => {
    expect(giftStreakKey({ ...base, combo: true })).not.toBe(giftStreakKey({ ...base, combo: true, groupId: "1790461604556" }));
  });

  it("un regalo no combinable cuenta por mensaje", () => {
    expect(giftStreakKey({ ...base, combo: false })).not.toBe(giftStreakKey({ ...base, combo: false, msgId: "m2" }));
  });
});
