import "server-only";
import type pg from "pg";
import { DomainError } from "@/core/domain/errors";
import type { LockMode, TournamentTransactionContext, UnitOfWork } from "@/core/ports/repositories";
import { pgRepositories, TOURNAMENT_COLUMNS, toTournament } from "./repositories";

/**
 * Transacción con el torneo bloqueado:
 * - "shared"    → FOR SHARE: las inscripciones corren en paralelo entre sí.
 * - "exclusive" → FOR UPDATE: sorteo y resultados esperan a que no haya nadie inscribiéndose,
 *                 y nunca dos administradores cambian el cuadro a la vez.
 */
export class PgUnitOfWork implements UnitOfWork {
  constructor(private readonly pool: pg.Pool) {}

  async withTournament<T>(
    slug: string,
    mode: LockMode,
    fn: (ctx: TournamentTransactionContext) => Promise<T>,
  ): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const lock = mode === "exclusive" ? "FOR UPDATE" : "FOR SHARE";
      const { rows } = await client.query(`SELECT ${TOURNAMENT_COLUMNS} FROM tournaments WHERE slug = $1 ${lock}`, [slug]);
      const row = rows[0];
      if (!row) throw new DomainError("NOT_FOUND", "El torneo no existe.");
      const result = await fn({ tournament: toTournament(row), ...pgRepositories(client) });
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }
}
