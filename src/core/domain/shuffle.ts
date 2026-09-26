/** Devuelve un entero uniforme en [0, maxExclusive). Lo implementa una fuente criptográfica. */
export type RandomInt = (maxExclusive: number) => number;

/**
 * Fisher-Yates (variante de Durstenfeld). Nunca muta la entrada: trabaja sobre una copia.
 * Con una fuente uniforme, cada una de las n! permutaciones tiene la misma probabilidad.
 */
export function fisherYatesShuffle<T>(items: readonly T[], randomInt: RandomInt): T[] {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    if (!Number.isInteger(j) || j < 0 || j > i) {
      throw new RangeError(`La fuente aleatoria devolvió ${j}, fuera de [0, ${i}].`);
    }
    const tmp = copy[i] as T;
    copy[i] = copy[j] as T;
    copy[j] = tmp;
  }
  return copy;
}
