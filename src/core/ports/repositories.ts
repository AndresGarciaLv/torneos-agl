import type { BracketPlan } from "../domain/bracket";
import type { Match, Slot } from "../domain/match";
import type { NewParticipant, Participant, PublicPlayer } from "../domain/participant";
import type { Tournament, TournamentStatus } from "../domain/tournament";

export interface TournamentRepository {
  findBySlug(slug: string): Promise<Tournament | null>;
  updateStatus(tournamentId: string, status: TournamentStatus): Promise<void>;
}

export interface ParticipantRepository {
  /**
   * Inserta un participante. Si choca con una restricción de unicidad lanza
   * DomainError DUPLICATE_EMAIL o DUPLICATE_GAMER_TAG: la base de datos manda.
   */
  insert(tournamentId: string, participant: NewParticipant): Promise<Participant>;
  count(tournamentId: string): Promise<number>;
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
  setWinner(matchId: string, winnerId: string): Promise<void>;
  setSlot(matchId: string, slot: Slot, participantId: string): Promise<void>;
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
