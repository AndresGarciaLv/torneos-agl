import type { Cache, Logger } from "../ports/services";

export const PUBLIC_TOURNAMENT_TTL_SECONDS = 30;

export const cacheKeys = {
  tournament: (slug: string) => `tournament:${slug}`,
} as const;

/**
 * Único punto que invalida la vista pública. Se llama DESPUÉS del commit: si se
 * invalidara dentro de la transacción, una lectura concurrente podría volver a
 * llenar la caché con el estado anterior antes de que el cambio se confirme.
 */
export class TournamentCacheInvalidator {
  constructor(
    private readonly cache: Cache,
    private readonly logger: Logger,
  ) {}

  async invalidate(slug: string, reason: string): Promise<void> {
    await this.cache.delete(cacheKeys.tournament(slug));
    this.logger.info("cache.invalidated", { key: "tournament", reason });
  }
}
