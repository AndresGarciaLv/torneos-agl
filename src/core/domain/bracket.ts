import { DomainError } from "./errors";
import { isBye, isPlayable, type Match, type Slot } from "./match";

export const MIN_PARTICIPANTS = 2;
/** Tope razonable: 512 jugadores son 9 rondas, suficiente para un torneo de comunidad. */
export const MAX_PARTICIPANTS = 512;

export interface MatchRef {
  readonly round: number;
  readonly position: number;
}

export interface PlannedMatch extends MatchRef {
  readonly player1Id: string | null;
  readonly player2Id: string | null;
  readonly winnerId: string | null;
  readonly next: (MatchRef & { readonly slot: Slot }) | null;
}

export interface BracketPlan {
  /** Posiciones del cuadro: siguiente potencia de 2 desde el número de jugadores. */
  readonly size: number;
  readonly roundCount: number;
  readonly byes: number;
  readonly matches: readonly PlannedMatch[];
}

export function nextPowerOfTwo(n: number): number {
  if (!Number.isInteger(n) || n < 1) throw new RangeError("n debe ser un entero positivo.");
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

/**
 * Índices (base 0) de los encuentros de primera ronda que llevan BYE, repartidos
 * a lo largo del cuadro. Si se agruparan arriba, los jugadores con BYE se
 * cruzarían siempre entre ellos en la segunda ronda.
 * Nunca hay dos BYE en un mismo encuentro: byes < size/2 siempre que n > size/2.
 */
export function spreadByeIndexes(byes: number, matchCount: number): Set<number> {
  const out = new Set<number>();
  for (let i = 0; i < byes; i++) out.add(Math.floor((i * matchCount) / byes));
  return out;
}

export function nextRef(round: number, position: number): MatchRef & { slot: Slot } {
  return { round: round + 1, position: Math.ceil(position / 2), slot: position % 2 === 1 ? 1 : 2 };
}

/**
 * Arma el cuadro completo a partir de jugadores YA barajados: crea los BYE,
 * todas las rondas y la relación de cada encuentro con el siguiente. Quien
 * recibe BYE queda como ganador y ya aparece en su encuentro de segunda ronda.
 */
export function planBracket(shuffledPlayerIds: readonly string[]): BracketPlan {
  const n = shuffledPlayerIds.length;
  if (n < MIN_PARTICIPANTS) {
    throw new DomainError("NOT_ENOUGH_PARTICIPANTS", `Se necesitan al menos ${MIN_PARTICIPANTS} inscritos para sortear.`);
  }
  if (n > MAX_PARTICIPANTS) {
    throw new DomainError("VALIDATION", `El bracket admite hasta ${MAX_PARTICIPANTS} jugadores.`);
  }
  if (new Set(shuffledPlayerIds).size !== n) {
    throw new DomainError("VALIDATION", "Hay jugadores repetidos en el sorteo.");
  }

  const size = nextPowerOfTwo(n);
  const roundCount = Math.log2(size);
  const byes = size - n;
  const firstRoundCount = size / 2;
  const byeAt = spreadByeIndexes(byes, firstRoundCount);

  type Cell = { p1: string | null; p2: string | null; winner: string | null };
  const cells = new Map<string, Cell>();
  const key = (r: number, p: number) => `${r}:${p}`;
  const cell = (r: number, p: number): Cell => {
    const c = cells.get(key(r, p));
    if (!c) throw new Error(`Casilla ${r}:${p} inexistente.`);
    return c;
  };
  for (let r = 1; r <= roundCount; r++) {
    for (let p = 1; p <= size / 2 ** r; p++) cells.set(key(r, p), { p1: null, p2: null, winner: null });
  }

  let cursor = 0;
  const take = (): string => {
    const id = shuffledPlayerIds[cursor++];
    if (id === undefined) throw new Error("Se acabaron los jugadores antes de llenar el cuadro.");
    return id;
  };
  for (let i = 0; i < firstRoundCount; i++) {
    const c = cell(1, i + 1);
    c.p1 = take();
    if (byeAt.has(i)) c.winner = c.p1;
    else c.p2 = take();
  }

  // Quien pasa por BYE ya ocupa su lugar en la segunda ronda.
  if (roundCount > 1) {
    for (let p = 1; p <= firstRoundCount; p++) {
      const winner = cell(1, p).winner;
      if (winner === null) continue;
      const ref = nextRef(1, p);
      const next = cell(ref.round, ref.position);
      if (ref.slot === 1) next.p1 = winner;
      else next.p2 = winner;
    }
  }

  const matches: PlannedMatch[] = [];
  for (let r = 1; r <= roundCount; r++) {
    for (let p = 1; p <= size / 2 ** r; p++) {
      const c = cell(r, p);
      matches.push({
        round: r,
        position: p,
        player1Id: c.p1,
        player2Id: c.p2,
        winnerId: c.winner,
        next: r < roundCount ? nextRef(r, p) : null,
      });
    }
  }
  return { size, roundCount, byes, matches };
}

export interface ResultDecision {
  readonly matchId: string;
  readonly winnerId: string;
  /** Dónde entra el ganador; null en la final. */
  readonly advance: { readonly matchId: string; readonly slot: Slot } | null;
  /** true si este resultado decide la final. */
  readonly decidesChampion: boolean;
  /** true si ya tenía otro ganador y se está corrigiendo. */
  readonly isCorrection: boolean;
}

/**
 * Decide un encuentro y calcula a dónde avanza el ganador. No persiste nada.
 * Corregir un resultado se permite mientras el encuentro siguiente no se haya jugado:
 * si ya se jugó, cambiarlo dejaría a un jugador eliminado con una victoria posterior.
 */
export function decideMatch(matches: readonly Match[], matchId: string, winnerId: string): ResultDecision {
  const match = matches.find((m) => m.id === matchId);
  if (!match) throw new DomainError("NOT_FOUND", "El encuentro no existe en este torneo.");
  if (isBye(match)) throw new DomainError("MATCH_NOT_READY", "Este encuentro es un BYE: el jugador avanza solo.");
  if (!isPlayable(match)) throw new DomainError("MATCH_NOT_READY", "Todavía falta un jugador en este encuentro.");
  if (winnerId !== match.player1Id && winnerId !== match.player2Id) {
    throw new DomainError("INVALID_WINNER", "El ganador tiene que ser uno de los dos jugadores del encuentro.");
  }

  let advance: ResultDecision["advance"] = null;
  if (match.nextMatchId !== null) {
    const next = matches.find((m) => m.id === match.nextMatchId);
    if (!next || match.nextSlot === null) {
      throw new DomainError("INVALID_STATE", "El bracket está incompleto: falta el encuentro siguiente.");
    }
    if (next.winnerId !== null && match.winnerId !== winnerId) {
      throw new DomainError("DOWNSTREAM_DECIDED", "El encuentro siguiente ya tiene ganador. Corrige primero ese resultado.");
    }
    advance = { matchId: next.id, slot: match.nextSlot };
  }

  return {
    matchId: match.id,
    winnerId,
    advance,
    decidesChampion: match.nextMatchId === null,
    isCorrection: match.winnerId !== null && match.winnerId !== winnerId,
  };
}

export function roundCountOf(matches: readonly Pick<Match, "round">[]): number {
  return matches.reduce((max, m) => Math.max(max, m.round), 0);
}

/** "Ronda 1 · Semifinales · Final", contando desde el final del cuadro. */
export function roundName(round: number, roundCount: number): string {
  const fromEnd = roundCount - round;
  if (fromEnd === 0) return "Final";
  if (fromEnd === 1) return "Semifinales";
  if (round === 1) return "Ronda 1";
  if (fromEnd === 2) return "Cuartos de final";
  if (fromEnd === 3) return "Octavos de final";
  return `Ronda ${round}`;
}

/** La ronda más baja con algún encuentro por decidir; null si terminó o no hay cuadro. */
export function currentRound(matches: readonly Match[]): number | null {
  const pending = matches.filter((m) => m.winnerId === null);
  if (pending.length === 0) return null;
  return pending.reduce((min, m) => Math.min(min, m.round), Number.POSITIVE_INFINITY);
}

export function championId(matches: readonly Match[]): string | null {
  const final = matches.find((m) => m.nextMatchId === null);
  return final?.winnerId ?? null;
}

/** Encuentros reales (sin contar BYE): cuántos hay y cuántos ya tienen ganador. */
export function countPlayable(matches: readonly Match[]): { decided: number; total: number } {
  const real = matches.filter((m) => !isBye(m));
  return { decided: real.filter((m) => m.winnerId !== null).length, total: real.length };
}
