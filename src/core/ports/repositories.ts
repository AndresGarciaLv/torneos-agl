import type { BracketPlan } from "../domain/bracket";
import type { Match, Slot } from "../domain/match";
import type { NewParticipant, Participant, ParticipantChanges, PublicPlayer } from "../domain/participant";
import type { Raffle, RaffleEntry } from "../domain/raffle";
import type { Tournament, TournamentStatus } from "../domain/tournament";

export interface TournamentRepository {
  findBySlug(slug: string): Promise<Tournament | null>;
  updateStatus(tournamentId: string, status: TournamentStatus): Promise<void>;
}

export interface ParticipantRepository {
  /**
   * Inserta un participante. Si choca con una restricción de unicidad lanza
   * DomainError DUPLICATE_EMAIL, DUPLICATE_GAMER_TAG o DUPLICATE_ML_ID: la base de datos manda.
   */
  insert(tournamentId: string, participant: NewParticipant): Promise<Participant>;
  count(tournamentId: string): Promise<number>;
  /** Corrige Gamer Tag, correo e ID. null si no existía en este torneo. Mismos errores de unicidad que insert. */
  update(tournamentId: string, participantId: string, changes: ParticipantChanges): Promise<Participant | null>;
  /** Borra un inscrito. false si no existía en este torneo. */
  delete(tournamentId: string, participantId: string): Promise<boolean>;
  /** Ids en orden de inscripción: la entrada del sorteo. */
  listIds(tournamentId: string): Promise<string[]>;
  /** Solo id y Gamer Tag. Nunca el correo. */
  listPublic(tournamentId: string): Promise<PublicPlayer[]>;
  /** Vista completa, exclusiva de administración. */
  listForAdmin(tournamentId: string): Promise<Participant[]>;
}

export interface MatchRepository {
  list(tournamentId: string): Promise<Match[]>;
  /** Borra el cuadro anterior (si lo hay) y persiste el nuevo con sus enlaces. */
  replaceBracket(tournamentId: string, plan: BracketPlan): Promise<void>;
  clear(tournamentId: string): Promise<void>;
  /** Pone a `newId` en todas las casillas y victorias de `oldId`. Para sustituir a quien no se presentó. */
  replacePlayer(tournamentId: string, oldId: string, newId: string): Promise<void>;
  /** null deja el encuentro sin ganador. */
  setWinner(matchId: string, winnerId: string | null): Promise<void>;
  /** null deja la casilla vacía. */
  setSlot(matchId: string, slot: Slot, participantId: string | null): Promise<void>;
}

export interface Repositories {
  readonly tournaments: TournamentRepository;
  readonly participants: ParticipantRepository;
  readonly matches: MatchRepository;
}

/**
 * - "shared": varias inscripciones pueden correr a la vez, pero ninguna mientras
 *   se sortea o se decide un resultado.
 * - "exclusive": un solo cambio de cuadro a la vez por torneo.
 */
export type LockMode = "shared" | "exclusive";

export interface TournamentTransactionContext extends Repositories {
  /** El torneo, ya bloqueado en el modo pedido durante toda la transacción. */
  readonly tournament: Tournament;
}

export interface UnitOfWork {
  /**
   * Corre fn dentro de una transacción con el torneo bloqueado.
   * Si fn lanza, se revierte todo. Lanza NOT_FOUND si el torneo no existe.
   */
  withTournament<T>(slug: string, mode: LockMode, fn: (ctx: TournamentTransactionContext) => Promise<T>): Promise<T>;
}

export interface RaffleRepository {
  /** La ruleta más reciente: es la que se muestra y la que escucha el chat. */
  current(): Promise<Raffle | null>;
  create(keyword: string, prize: string): Promise<Raffle>;
  /** Entradas en orden de llegada. */
  entries(raffleId: string): Promise<RaffleEntry[]>;
  /** true si entró; false si ese usuario ya estaba. */
  addEntry(raffleId: string, tiktokUser: string, nickname: string): Promise<boolean>;
  removeEntry(raffleId: string, tiktokUser: string): Promise<boolean>;
  winners(raffleId: string): Promise<RaffleEntry[]>;
  /** false si esa persona ya había ganado en esta ruleta (otro giro simultáneo). */
  addWinner(raffleId: string, entry: RaffleEntry): Promise<boolean>;
}
