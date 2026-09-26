import { randomInt } from "node:crypto";
import type { RandomSource } from "@/core/ports/services";

/** crypto.randomInt: uniforme y sin sesgo de módulo. Nunca Math.random(). */
export class CryptoRandomSource implements RandomSource {
  int(maxExclusive: number): number {
    if (maxExclusive <= 1) return 0;
    return randomInt(maxExclusive);
  }
}
