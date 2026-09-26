export type Slot = 1 | 2;

export interface Match {
  readonly id: string;
  readonly tournamentId: string;
  readonly round: number;
  readonly position: number;
  readonly player1Id: string | null;
  readonly player2Id: string | null;
  readonly winnerId: string | null;
  readonly nextMatchId: string | null;
  readonly nextSlot: Slot | null;
  readonly createdAt: Date;
}

/** Solo la primera ronda puede tener BYE: un único jugador que avanza sin jugar. */
export function isBye(m: Pick<Match, "round" | "player1Id" | "player2Id">): boolean {
  return m.round === 1 && (m.player1Id === null) !== (m.player2Id === null);
}

/** Un encuentro se puede decidir cuando tiene a sus dos jugadores. */
export function isPlayable(m: Pick<Match, "player1Id" | "player2Id">): boolean {
  return m.player1Id !== null && m.player2Id !== null;
}

export function isFinal(m: Pick<Match, "nextMatchId">): boolean {
  return m.nextMatchId === null;
}
