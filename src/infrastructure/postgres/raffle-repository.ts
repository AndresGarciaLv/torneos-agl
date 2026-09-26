import "server-only";
import type { Raffle, RaffleEntry } from "@/core/domain/raffle";
import type { RaffleRepository } from "@/core/ports/repositories";
import type { Queryable } from "./pool";

interface RaffleRow {
  id: string;
  keyword: string;
  prize: string;
  created_at: Date;
}

interface EntryRow {
  tiktok_user: string;
  nickname: string;
  created_at: Date;
}

const toRaffle = (r: RaffleRow): Raffle => ({ id: r.id, keyword: r.keyword, prize: r.prize, createdAt: r.created_at });
const toEntry = (r: EntryRow): RaffleEntry => ({ tiktokUser: r.tiktok_user, nickname: r.nickname, createdAt: r.created_at });

export class PgRaffleRepository implements RaffleRepository {
  constructor(private readonly db: Queryable) {}

  async current(): Promise<Raffle | null> {
    const { rows } = await this.db.query<RaffleRow>(
      "SELECT id, keyword, prize, created_at FROM raffles ORDER BY created_at DESC, id DESC LIMIT 1",
    );
    return rows[0] ? toRaffle(rows[0]) : null;
  }

  async create(keyword: string, prize: string): Promise<Raffle> {
    const { rows } = await this.db.query<RaffleRow>(
      "INSERT INTO raffles (keyword, prize) VALUES ($1, $2) RETURNING id, keyword, prize, created_at",
      [keyword, prize],
    );
    return toRaffle(rows[0]!);
  }

  async entries(raffleId: string): Promise<RaffleEntry[]> {
    const { rows } = await this.db.query<EntryRow>(
      "SELECT tiktok_user, nickname, created_at FROM raffle_entries WHERE raffle_id = $1 ORDER BY created_at, tiktok_user",
      [raffleId],
    );
    return rows.map(toEntry);
  }

  async addEntry(raffleId: string, tiktokUser: string, nickname: string): Promise<boolean> {
    const { rowCount } = await this.db.query(
      `INSERT INTO raffle_entries (raffle_id, tiktok_user, nickname) VALUES ($1, $2, $3)
       ON CONFLICT (raffle_id, tiktok_user) DO NOTHING`,
      [raffleId, tiktokUser, nickname],
    );
    return rowCount === 1;
  }

  async removeEntry(raffleId: string, tiktokUser: string): Promise<boolean> {
    const { rowCount } = await this.db.query("DELETE FROM raffle_entries WHERE raffle_id = $1 AND tiktok_user = $2", [
      raffleId,
      tiktokUser,
    ]);
    return rowCount === 1;
  }

  async winners(raffleId: string): Promise<RaffleEntry[]> {
    const { rows } = await this.db.query<EntryRow>(
      "SELECT tiktok_user, nickname, created_at FROM raffle_winners WHERE raffle_id = $1 ORDER BY created_at",
      [raffleId],
    );
    return rows.map(toEntry);
  }

  async addWinner(raffleId: string, entry: RaffleEntry): Promise<boolean> {
    const { rowCount } = await this.db.query(
      `INSERT INTO raffle_winners (raffle_id, tiktok_user, nickname) VALUES ($1, $2, $3)
       ON CONFLICT (raffle_id, tiktok_user) DO NOTHING`,
      [raffleId, entry.tiktokUser, entry.nickname],
    );
    return rowCount === 1;
  }
}
