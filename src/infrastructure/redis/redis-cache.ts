import "server-only";
import type { Redis } from "ioredis";
import type { Cache, Logger } from "@/core/ports/services";
import { isUsable } from "./client";

/** Caché sobre Redis que nunca lanza: un fallo se trata como "no está en caché". */
export class RedisCache implements Cache {
  constructor(
    private readonly redis: Redis,
    private readonly logger: Logger,
  ) {}

  async getJson<T>(key: string): Promise<T | null> {
    if (!isUsable(this.redis)) return null;
    try {
      const raw = await this.redis.get(key);
      return raw === null ? null : (JSON.parse(raw) as T);
    } catch {
      this.logger.warn("cache.get_failed");
      return null;
    }
  }

  async setJson(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    if (!isUsable(this.redis)) return;
    try {
      await this.redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
    } catch {
      this.logger.warn("cache.set_failed");
    }
  }

  async delete(key: string): Promise<void> {
    if (!isUsable(this.redis)) {
      // Si Redis está caído no hay nada viejo que servir, y al volver la entrada caduca sola (TTL).
      this.logger.warn("cache.delete_skipped");
      return;
    }
    try {
      await this.redis.del(key);
    } catch {
      this.logger.warn("cache.delete_failed");
    }
  }
}

/** Sin Redis configurado: toda lectura va a PostgreSQL. */
export class NoCache implements Cache {
  async getJson<T>(): Promise<T | null> {
    return null;
  }
  async setJson(): Promise<void> {}
  async delete(): Promise<void> {}
}
