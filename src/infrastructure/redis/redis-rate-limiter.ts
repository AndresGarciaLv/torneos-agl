import "server-only";
import { createHmac } from "node:crypto";
import type { Redis } from "ioredis";
import type { Logger, RateLimiter, RateLimitResult } from "@/core/ports/services";
import { isUsable } from "./client";

/**
 * Ventana fija con INCR + EXPIRE NX en una sola transacción MULTI.
 * La IP no se guarda en claro: la clave lleva un HMAC de ella.
 *
 * Si Redis no responde, deja pasar (fail-open) y lo registra: la inscripción no
 * puede depender de la caché. Las constraints de PostgreSQL siguen impidiendo duplicados.
 */
export class RedisRateLimiter implements RateLimiter {
  constructor(
    private readonly redis: Redis | null,
    private readonly keySecret: string,
    private readonly logger: Logger,
  ) {}

  private fingerprint(identifier: string): string {
    return createHmac("sha256", this.keySecret).update(identifier).digest("base64url").slice(0, 32);
  }

  async consume(bucket: string, identifier: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
    const open: RateLimitResult = { allowed: true, remaining: limit, retryAfterSeconds: 0 };
    if (!this.redis || !isUsable(this.redis)) {
      this.logger.warn("ratelimit.bypassed", { bucket, reason: "redis_unavailable" });
      return open;
    }
    const key = `ratelimit:${bucket}:${this.fingerprint(identifier)}`;
    try {
      const results = await this.redis.multi().incr(key).expire(key, windowSeconds, "NX").ttl(key).exec();
      const count = Number(results?.[0]?.[1] ?? 0);
      const ttl = Number(results?.[2]?.[1] ?? windowSeconds);
      return {
        allowed: count <= limit,
        remaining: Math.max(0, limit - count),
        retryAfterSeconds: count <= limit ? 0 : Math.max(1, ttl),
      };
    } catch {
      this.logger.warn("ratelimit.bypassed", { bucket, reason: "redis_error" });
      return open;
    }
  }
}
