import "server-only";
import { Redis } from "ioredis";

const globalForRedis = globalThis as unknown as { __monsterRedis?: Redis | null };

let lastErrorLog = 0;

/**
 * Cliente Redis compartido, o null si no hay REDIS_URL. Configurado para fallar
 * rápido: con Redis caído, cada operación se rinde en ≤ 500 ms (o al instante si
 * ya se sabe que está reconectando) y la app sigue contra PostgreSQL.
 */
export function getRedis(url: string | undefined): Redis | null {
  if (globalForRedis.__monsterRedis !== undefined) return globalForRedis.__monsterRedis;
  if (!url) {
    globalForRedis.__monsterRedis = null;
    return null;
  }
  const client = new Redis(url, {
    connectionName: "monster-agl-torneo",
    connectTimeout: 2_000,
    commandTimeout: 500,
    maxRetriesPerRequest: 1,
    retryStrategy: (times) => Math.min(times * 250, 5_000),
    // En Redis gestionado con TLS (rediss://) ioredis activa TLS solo por el esquema.
  });
  client.on("error", (error: Error & { code?: string }) => {
    // Un error por cada 30 s como mucho: con Redis caído el reintento es constante.
    const now = Date.now();
    if (now - lastErrorLog > 30_000) {
      lastErrorLog = now;
      console.warn(JSON.stringify({ level: "warn", event: "redis.unavailable", code: error.code ?? null }));
    }
  });
  globalForRedis.__monsterRedis = client;
  return client;
}

/** false si sabemos que Redis no está: evita pagar el timeout en cada petición. */
export function isUsable(client: Redis): boolean {
  return client.status === "ready" || client.status === "connecting" || client.status === "connect";
}
