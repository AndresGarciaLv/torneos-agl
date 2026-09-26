import "server-only";
import pg from "pg";

// En desarrollo el HMR recarga módulos: sin esto cada recarga abriría otro pool.
const globalForPg = globalThis as unknown as { __monsterPgPool?: pg.Pool };

export function getPool(connectionString: string): pg.Pool {
  if (globalForPg.__monsterPgPool) return globalForPg.__monsterPgPool;
  const pool = new pg.Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    statement_timeout: 10_000,
    application_name: "monster-agl-torneo",
  });
  // Un cliente ocioso que se cae no debe tumbar el proceso.
  pool.on("error", (error) => console.error(JSON.stringify({ level: "error", event: "pg.pool_error", code: (error as { code?: string }).code ?? null })));
  globalForPg.__monsterPgPool = pool;
  return pool;
}

/** Lo que tienen en común un Pool y un cliente dentro de una transacción. */
export type Queryable = Pick<pg.Pool | pg.PoolClient, "query">;
