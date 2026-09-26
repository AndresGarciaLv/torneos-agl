import "server-only";
import type { BracketPlan } from "@/core/domain/bracket";
import { DomainError } from "@/core/domain/errors";
import type { Match, Slot } from "@/core/domain/match";
import type { NewParticipant, Participant, ParticipantChanges, PublicPlayer } from "@/core/domain/participant";
import type { Tournament, TournamentStatus } from "@/core/domain/tournament";
import type {
  MatchRepository,
  ParticipantRepository,
  Repositories,
  TournamentRepository,
} from "@/core/ports/repositories";
import type { Queryable } from "./pool";

// Todas las consultas van parametrizadas ($1, $2...). Ningún dato externo se interpola en el SQL.

interface TournamentRow {
  id: string;
  slug: string;
  name: string;
  starts_at: Date;
  registration_closes_at: Date;
  status: TournamentStatus;
  created_at: Date;
  updated_at: Date;
}

export const toTournament = (r: TournamentRow): Tournament => ({
  id: r.id,
  slug: r.slug,
  name: r.name,
  startsAt: r.starts_at,
  registrationClosesAt: r.registration_closes_at,
  status: r.status,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export const TOURNAMENT_COLUMNS = "id, slug, name, starts_at, registration_closes_at, status, created_at, updated_at";

export class PgTournamentRepository implements TournamentRepository {
  constructor(private readonly db: Queryable) {}

  async findBySlug(slug: string): Promise<Tournament | null> {
    const { rows } = await this.db.query<TournamentRow>(
      `SELECT ${TOURNAMENT_COLUMNS} FROM tournaments WHERE slug = $1`,
      [slug],
    );
    return rows[0] ? toTournament(rows[0]) : null;
  }

  async updateStatus(tournamentId: string, status: TournamentStatus): Promise<void> {
    await this.db.query("UPDATE tournaments SET status = $2, updated_at = now() WHERE id = $1", [tournamentId, status]);
  }
}

interface ParticipantRow {
  id: string;
  tournament_id: string;
  gamer_tag: string;
  email: string | null;
  mobile_legends_id: string | null;
  accepted_rules: boolean;
  created_at: Date;
}

const toParticipant = (r: ParticipantRow): Participant => ({
  id: r.id,
  tournamentId: r.tournament_id,
  gamerTag: r.gamer_tag,
  email: r.email,
  mobileLegendsId: r.mobile_legends_id,
  acceptedRules: r.accepted_rules,
  createdAt: r.created_at,
});

const UNIQUE_VIOLATION = "23505";
const PARTICIPANT_COLUMNS = "id, tournament_id, gamer_tag, email, mobile_legends_id, accepted_rules, created_at";

/** Traduce un choque con los índices únicos a un error que el usuario entiende. */
function duplicateError(error: unknown): unknown {
  const pgError = error as { code?: string; constraint?: string };
  if (pgError.code === UNIQUE_VIOLATION) {
    if (pgError.constraint === "participants_tournament_email_key") {
      return new DomainError("DUPLICATE_EMAIL", "Ese correo ya está inscrito en este torneo.");
    }
    if (pgError.constraint === "participants_tournament_gamer_tag_key") {
      return new DomainError("DUPLICATE_GAMER_TAG", "Ese nickname ya está tomado en este torneo.");
    }
    if (pgError.constraint === "participants_tournament_ml_id_key") {
      return new DomainError("DUPLICATE_ML_ID", "Ese ID de Mobile Legends ya está inscrito en este torneo.");
    }
  }
  return error;
}

export class PgParticipantRepository implements ParticipantRepository {
  constructor(private readonly db: Queryable) {}

  async insert(tournamentId: string, p: NewParticipant): Promise<Participant> {
    try {
      const { rows } = await this.db.query<ParticipantRow>(
        `INSERT INTO participants (tournament_id, gamer_tag, email, mobile_legends_id, accepted_rules)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING ${PARTICIPANT_COLUMNS}`,
        [tournamentId, p.gamerTag, p.email, p.mobileLegendsId, p.acceptedRules],
      );
      const row = rows[0];
      if (!row) throw new Error("INSERT sin RETURNING");
      return toParticipant(row);
    } catch (error) {
      throw duplicateError(error);
    }
  }

  async update(tournamentId: string, participantId: string, c: ParticipantChanges): Promise<Participant | null> {
    try {
      const { rows } = await this.db.query<ParticipantRow>(
        `UPDATE participants SET gamer_tag = $3, email = $4, mobile_legends_id = $5
         WHERE tournament_id = $1 AND id = $2
         RETURNING ${PARTICIPANT_COLUMNS}`,
        [tournamentId, participantId, c.gamerTag, c.email, c.mobileLegendsId],
      );
      return rows[0] ? toParticipant(rows[0]) : null;
    } catch (error) {
      throw duplicateError(error);
    }
  }

  async count(tournamentId: string): Promise<number> {
    const { rows } = await this.db.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM participants WHERE tournament_id = $1",
      [tournamentId],
    );
    return rows[0]?.n ?? 0;
  }

  async delete(tournamentId: string, participantId: string): Promise<boolean> {
    const { rowCount } = await this.db.query("DELETE FROM participants WHERE tournament_id = $1 AND id = $2", [
      tournamentId,
      participantId,
    ]);
    return (rowCount ?? 0) > 0;
  }

  async listIds(tournamentId: string): Promise<string[]> {
    const { rows } = await this.db.query<{ id: string }>(
      "SELECT id FROM participants WHERE tournament_id = $1 ORDER BY created_at, id",
      [tournamentId],
    );
    return rows.map((r) => r.id);
  }

  async listPublic(tournamentId: string): Promise<PublicPlayer[]> {
    // Se piden SOLO las dos columnas públicas: el correo ni siquiera sale de la base.
    const { rows } = await this.db.query<{ id: string; gamer_tag: string }>(
      "SELECT id, gamer_tag FROM participants WHERE tournament_id = $1 ORDER BY created_at, id",
      [tournamentId],
    );
    return rows.map((r) => ({ id: r.id, gamerTag: r.gamer_tag }));
  }

  async listForAdmin(tournamentId: string): Promise<Participant[]> {
    const { rows } = await this.db.query<ParticipantRow>(
      `SELECT ${PARTICIPANT_COLUMNS} FROM participants WHERE tournament_id = $1 ORDER BY created_at, id`,
      [tournamentId],
    );
    return rows.map(toParticipant);
  }
}

interface MatchRow {
  id: string;
  tournament_id: string;
  round: number;
  position: number;
  player1_id: string | null;
  player2_id: string | null;
  winner_id: string | null;
  next_match_id: string | null;
  next_slot: number | null;
  created_at: Date;
}

const toMatch = (r: MatchRow): Match => ({
  id: r.id,
  tournamentId: r.tournament_id,
  round: r.round,
  position: r.position,
  player1Id: r.player1_id,
  player2Id: r.player2_id,
  winnerId: r.winner_id,
  nextMatchId: r.next_match_id,
  nextSlot: r.next_slot === 1 || r.next_slot === 2 ? r.next_slot : null,
  createdAt: r.created_at,
});

export class PgMatchRepository implements MatchRepository {
  constructor(private readonly db: Queryable) {}

  async list(tournamentId: string): Promise<Match[]> {
    const { rows } = await this.db.query<MatchRow>(
      `SELECT id, tournament_id, round, position, player1_id, player2_id, winner_id,
              next_match_id, next_slot, created_at
       FROM matches WHERE tournament_id = $1 ORDER BY round, position`,
      [tournamentId],
    );
    return rows.map(toMatch);
  }

  /**
   * Dos consultas sin importar el tamaño del cuadro: un INSERT masivo con unnest()
   * y un UPDATE que enlaza cada encuentro con el siguiente por (ronda, posición).
   * Debe correr dentro de la transacción del UnitOfWork.
   */
  async replaceBracket(tournamentId: string, plan: BracketPlan): Promise<void> {
    await this.clear(tournamentId);

    const m = plan.matches;
    await this.db.query(
      `INSERT INTO matches (tournament_id, round, position, player1_id, player2_id, winner_id)
       SELECT $1, v.round, v.position, v.p1, v.p2, v.w
       FROM unnest($2::int[], $3::int[], $4::uuid[], $5::uuid[], $6::uuid[]) AS v(round, position, p1, p2, w)`,
      [
        tournamentId,
        m.map((x) => x.round),
        m.map((x) => x.position),
        m.map((x) => x.player1Id),
        m.map((x) => x.player2Id),
        m.map((x) => x.winnerId),
      ],
    );

    const linked = m.filter((x) => x.next !== null);
    if (linked.length === 0) return;
    await this.db.query(
      `UPDATE matches AS cur
       SET next_match_id = nxt.id, next_slot = v.slot
       FROM unnest($2::int[], $3::int[], $4::int[], $5::int[], $6::smallint[])
              AS v(round, position, next_round, next_position, slot)
       JOIN matches AS nxt
         ON nxt.tournament_id = $1 AND nxt.round = v.next_round AND nxt.position = v.next_position
       WHERE cur.tournament_id = $1 AND cur.round = v.round AND cur.position = v.position`,
      [
        tournamentId,
        linked.map((x) => x.round),
        linked.map((x) => x.position),
        linked.map((x) => x.next!.round),
        linked.map((x) => x.next!.position),
        linked.map((x) => x.next!.slot),
      ],
    );
  }

  async clear(tournamentId: string): Promise<void> {
    await this.db.query("DELETE FROM matches WHERE tournament_id = $1", [tournamentId]);
  }

  async replacePlayer(tournamentId: string, oldId: string, newId: string): Promise<void> {
    await this.db.query(
      `UPDATE matches SET
         player1_id = CASE WHEN player1_id = $2 THEN $3::uuid ELSE player1_id END,
         player2_id = CASE WHEN player2_id = $2 THEN $3::uuid ELSE player2_id END,
         winner_id  = CASE WHEN winner_id  = $2 THEN $3::uuid ELSE winner_id  END
       WHERE tournament_id = $1 AND $2::uuid IN (player1_id, player2_id, winner_id)`,
      [tournamentId, oldId, newId],
    );
  }

  async setWinner(matchId: string, winnerId: string | null): Promise<void> {
    await this.db.query("UPDATE matches SET winner_id = $2 WHERE id = $1", [matchId, winnerId]);
  }

  async setSlot(matchId: string, slot: Slot, participantId: string | null): Promise<void> {
    // La columna sale de un literal tipado (1 | 2), nunca de la entrada del usuario.
    const column = slot === 1 ? "player1_id" : "player2_id";
    await this.db.query(`UPDATE matches SET ${column} = $2 WHERE id = $1`, [matchId, participantId]);
  }
}

export function pgRepositories(db: Queryable): Repositories {
  return {
    tournaments: new PgTournamentRepository(db),
    participants: new PgParticipantRepository(db),
    matches: new PgMatchRepository(db),
  };
}
