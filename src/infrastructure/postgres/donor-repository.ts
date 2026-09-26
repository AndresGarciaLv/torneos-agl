import "server-only";
import type { Donor, LiveGift } from "@/core/domain/donors";
import type { DonorRepository } from "@/core/ports/repositories";
import type { Queryable } from "./pool";

interface DonorRow {
  tiktok_user: string;
  nickname: string;
  avatar_url: string | null;
  coins: number;
}

export class PgDonorRepository implements DonorRepository {
  constructor(private readonly db: Queryable) {}

  async record(gift: LiveGift): Promise<void> {
    // Una racha llega como varios eventos: se queda la cuenta más alta.
    await this.db.query(
      `INSERT INTO live_gifts (streak_key, tiktok_user, nickname, avatar_url, gift_name, coins_each, repeat_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (streak_key) DO UPDATE SET
         repeat_count = GREATEST(live_gifts.repeat_count, EXCLUDED.repeat_count),
         nickname = EXCLUDED.nickname,
         avatar_url = COALESCE(EXCLUDED.avatar_url, live_gifts.avatar_url),
         updated_at = now()`,
      [
        gift.streakKey.slice(0, 200),
        gift.user.slice(0, 60),
        gift.nickname.slice(0, 60) || gift.user.slice(0, 60),
        gift.avatarUrl && gift.avatarUrl.length <= 1000 ? gift.avatarUrl : null,
        gift.giftName.slice(0, 80),
        Math.max(0, Math.round(gift.coinsEach)),
        Math.max(1, Math.round(gift.repeatCount)),
      ],
    );
  }

  async top(limit: number): Promise<Donor[]> {
    const { rows } = await this.db.query<DonorRow>(
      `SELECT tiktok_user,
              (array_agg(nickname ORDER BY updated_at DESC))[1] AS nickname,
              (array_agg(avatar_url ORDER BY updated_at DESC) FILTER (WHERE avatar_url IS NOT NULL))[1] AS avatar_url,
              SUM(coins_each * repeat_count)::int AS coins
         FROM live_gifts
        WHERE created_at >= (SELECT reset_at FROM donor_board WHERE id = 1)
        GROUP BY tiktok_user
       HAVING SUM(coins_each * repeat_count) > 0
        ORDER BY coins DESC, MIN(created_at)
        LIMIT $1`,
      [limit],
    );
    return rows.map((r) => ({ user: r.tiktok_user, nickname: r.nickname, avatarUrl: r.avatar_url, coins: r.coins }));
  }

  async reset(): Promise<void> {
    await this.db.query("UPDATE donor_board SET reset_at = now() WHERE id = 1");
  }

  async acquireCollector(seconds: number): Promise<boolean> {
    const { rowCount } = await this.db.query(
      `UPDATE donor_board SET collector_until = now() + make_interval(secs => $1)
        WHERE id = 1 AND (collector_until IS NULL OR collector_until < now())`,
      [seconds],
    );
    return rowCount === 1;
  }

  async releaseCollector(): Promise<void> {
    await this.db.query("UPDATE donor_board SET collector_until = NULL WHERE id = 1");
  }
}
