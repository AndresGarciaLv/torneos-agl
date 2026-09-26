import { DomainError } from "./errors";
import { isBye, isPlayable, type Match, type Slot } from "./match";

export const MIN_PARTICIPANTS = 2;
/**
 * Cupo del torneo: 16 jugadores, un cuadro de 4 rondas. Con menos, el cuadro
 * baja a la potencia de 2 siguiente y los BYE se reparten; nunca pasa de 16.
 */
export const MAX_PARTICIPANTS = 16;

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

/** Encuentros de primera ronda con BYE donde todavía cabe un jugador de último momento. */
export function openByeMatches(matches: readonly Match[]): Match[] {
  return matches.filter((m) => {
    if (!isBye(m)) return false;
    if (m.nextMatchId === null) return true;
    const next = matches.find((x) => x.id === m.nextMatchId);
    // Si el que pasó por BYE ya jugó su segunda ronda, meter a alguien antes lo borraría de la historia.
    return next !== undefined && next.winnerId === null;
  });
}

export interface ByeFill {
  readonly matchId: string;
  /** La casilla vacía del BYE, donde entra el nuevo. */
  readonly slot: Slot;
  /** De dónde se retira al que había avanzado por BYE; null si el BYE era la final. */
  readonly retract: { readonly matchId: string; readonly slot: Slot } | null;
}

/**
 * Mete a un jugador nuevo en un cuadro ya sorteado sin tocar a nadie más: el BYE
 * elegido se convierte en un encuentro normal y quien iba a pasar solo vuelve a
 * primera ronda. `pick(max)` elige el hueco (azar criptográfico en producción).
 */
export function planByeFill(matches: readonly Match[], pick: (max: number) => number): ByeFill {
  const open = openByeMatches(matches);
  if (open.length === 0) {
    throw new DomainError(
      "BRACKET_FULL",
      "El cuadro no tiene huecos libres. Para meter a alguien más hay que reabrir inscripciones y volver a sortear.",
    );
  }
  const i = pick(open.length);
  const m = open[i];
  if (!Number.isInteger(i) || m === undefined) throw new RangeError("pick() devolvió un índice fuera de rango.");
  return {
    matchId: m.id,
    slot: m.player1Id === null ? 1 : 2,
    retract: m.nextMatchId !== null && m.nextSlot !== null ? { matchId: m.nextMatchId, slot: m.nextSlot } : null,
  };
}

export interface UndoDecision {
  readonly matchId: string;
  /** Casilla del encuentro siguiente que queda vacía otra vez; null en la final. */
  readonly retract: { readonly matchId: string; readonly slot: Slot } | null;
}

/** Deja un encuentro sin ganador. Solo mientras el siguiente no se haya jugado. */
export function planUndo(matches: readonly Match[], matchId: string): UndoDecision {
  const match = matches.find((m) => m.id === matchId);
  if (!match) throw new DomainError("NOT_FOUND", "El encuentro no existe en este torneo.");
  if (isBye(match)) throw new DomainError("MATCH_NOT_READY", "Un BYE no tiene resultado que deshacer.");
  if (match.winnerId === null) throw new DomainError("MATCH_NOT_READY", "Este encuentro todavía no tiene ganador.");
  if (match.nextMatchId === null) return { matchId, retract: null };
  const next = matches.find((m) => m.id === match.nextMatchId);
  if (!next || match.nextSlot === null) {
    throw new DomainError("INVALID_STATE", "El bracket está incompleto: falta el encuentro siguiente.");
  }
  if (next.winnerId !== null) {
    throw new DomainError("DOWNSTREAM_DECIDED", "El encuentro siguiente ya tiene ganador. Deshaz primero ese resultado.");
  }
  return { matchId, retract: { matchId: next.id, slot: match.nextSlot } };
}

export interface Withdrawal {
  /** El encuentro de primera ronda que se convierte en BYE para el rival. */
  readonly matchId: string;
  readonly slot: Slot;
  readonly opponentId: string;
  readonly advance: { readonly matchId: string; readonly slot: Slot };
}

/**
 * Baja de un jugador con el cuadro sorteado. Solo se puede mientras su encuentro
 * de primera ronda no se haya jugado: el rival pasa por BYE y queda un hueco que
 * la siguiente alta rellena. En cualquier otro punto se usa «Sustituir» o se le
 * da la victoria al rival.
 */
export function planWithdrawal(matches: readonly Match[], playerId: string): Withdrawal {
  const involved = matches.filter((m) => m.player1Id === playerId || m.player2Id === playerId);
  const first = involved.find((m) => m.round === 1);
  if (!first) throw new DomainError("NOT_FOUND", "Ese jugador no está en el cuadro.");
  if (isBye(first) || involved.length > 1) {
    throw new DomainError(
      "INVALID_STATE",
      "Ya avanzó de ronda. Para quitarlo usa «Sustituir», o marca como ganador a su rival.",
    );
  }
  if (first.winnerId !== null) {
    throw new DomainError("INVALID_STATE", "Su encuentro ya se jugó. Deshaz primero el resultado.");
  }
  if (first.nextMatchId === null || first.nextSlot === null) {
    throw new DomainError("INVALID_STATE", "Es la final: sin él no hay torneo. Usa «Sustituir».");
  }
  const slot: Slot = first.player1Id === playerId ? 1 : 2;
  const opponentId = slot === 1 ? first.player2Id : first.player1Id;
  if (opponentId === null) throw new DomainError("INVALID_STATE", "El encuentro no tiene rival.");
  return { matchId: first.id, slot, opponentId, advance: { matchId: first.nextMatchId, slot: first.nextSlot } };
}

/** El estado se deduce del cuadro, no se arrastra: así nunca queda desfasado tras deshacer o corregir. */
export function statusOf(matches: readonly Match[]): "bracket_ready" | "live" | "finished" {
  if (championId(matches) !== null) return "finished";
  return countPlayable(matches).decided > 0 ? "live" : "bracket_ready";
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

/** Segundo lugar: quien perdió la final. null mientras la final no tenga ganador. */
export function runnerUpId(matches: readonly Match[]): string | null {
  const final = matches.find((m) => m.nextMatchId === null);
  if (!final?.winnerId) return null;
  return final.player1Id === final.winnerId ? final.player2Id : final.player1Id;
}

/** Encuentros reales (sin contar BYE): cuántos hay y cuántos ya tienen ganador. */
export function countPlayable(matches: readonly Match[]): { decided: number; total: number } {
  const real = matches.filter((m) => !isBye(m));
  return { decided: real.filter((m) => m.winnerId !== null).length, total: real.length };
}
