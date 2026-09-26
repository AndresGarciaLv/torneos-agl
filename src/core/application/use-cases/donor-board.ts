import { TOP_DONORS, type Donor } from "../../domain/donors";
import type { DonorRepository } from "../../ports/repositories";
import type { LiveChatSource, Logger } from "../../ports/services";

/**
 * Top de donadores del live. Una sola conexión a TikTok guarda los regalos
 * (la "recolectora"); cualquier otra copia del overlay solo lee la base.
 */
export class DonorBoard {
  constructor(
    private readonly donors: DonorRepository,
    private readonly chat: LiveChatSource,
    private readonly logger: Logger,
  ) {}

  top(): Promise<Donor[]> {
    return this.donors.top(TOP_DONORS);
  }

  async reset(): Promise<void> {
    await this.donors.reset();
    this.logger.info("donors.reset");
  }

  tryBecomeCollector(seconds: number): Promise<boolean> {
    return this.donors.acquireCollector(seconds);
  }

  releaseCollector(): Promise<void> {
    return this.donors.releaseCollector();
  }

  /** Escucha los regalos hasta que `signal` se aborte. `onChange` avisa tras guardar cada uno. */
  async collect(signal: AbortSignal, events: { onConnected(): void; onChange(): void }): Promise<void> {
    await this.chat.listen(
      {
        onConnected: events.onConnected,
        onGift: (gift) => {
          if (gift.coinsEach <= 0) return;
          void this.donors
            .record(gift)
            .then(events.onChange)
            .catch(() => this.logger.warn("donors.record_failed"));
        },
      },
      signal,
    );
  }
}
