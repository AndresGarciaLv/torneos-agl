/**
 * Aplica las migraciones SQL de /migrations en orden, una sola vez cada una.
 *
 * - Cada archivo corre en su propia transacción: o entra entero o no entra.
 * - Guarda un checksum: si alguien edita una migración ya aplicada, falla en vez
 *   de dejar dos bases de datos con el mismo nombre de migración y distinto esquema.
 * - Toma un advisory lock para que dos despliegues simultáneos no migren a la vez.
 */
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import pg from "pg";

const MIGRATIONS_DIR = path.resolve(import.meta.dirname, "..", "migrations");
const LOCK_KEY = 482_615_001;

async function loadEnvFile() {
  try {
    process.loadEnvFile?.(path.resolve(import.meta.dirname, "..", ".env"));
  } catch {
    // Sin .env: se usan las variables del entorno.
  }
}

async function main() {
  await loadEnvFile();
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL no está definida.");

  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    await client.query("SELECT pg_advisory_lock($1)", [LOCK_KEY]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name        text PRIMARY KEY,
        checksum    text NOT NULL,
        applied_at  timestamptz NOT NULL DEFAULT now()
      )`);

    const applied = new Map<string, string>(
      (await client.query<{ name: string; checksum: string }>("SELECT name, checksum FROM schema_migrations")).rows.map(
        (r) => [r.name, r.checksum],
      ),
    );

    const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith(".sql")).sort();
    let count = 0;
    for (const file of files) {
      const sql = await readFile(path.join(MIGRATIONS_DIR, file), "utf8");
      const checksum = createHash("sha256").update(sql).digest("hex");
      const previous = applied.get(file);
      if (previous) {
        if (previous !== checksum) {
          throw new Error(`La migración ${file} cambió después de aplicarse. Crea una migración nueva en su lugar.`);
        }
        continue;
      }
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)", [file, checksum]);
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
      console.log(`✓ ${file}`);
      count++;
    }
    console.log(count === 0 ? "Base de datos al día." : `${count} migración(es) aplicada(s).`);
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [LOCK_KEY]).catch(() => undefined);
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error("Error de migración:", error instanceof Error ? error.message : error);
  process.exit(1);
});
