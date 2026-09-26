import { DomainError } from "../../domain/errors";
import {
  commentMatchesKeyword,
  eligibleEntries,
  normalizeKeyword,
  normalizeTiktokUser,
  RAFFLE_NICKNAME_MAX,
  RAFFLE_PRIZE_MAX,
  type Raffle,
  type RaffleEntry,
} from "../../domain/raffle";
import type { RaffleRepository } from "../../ports/repositories";
import type { LiveChatSource, Logger, RandomSource } from "../../ports/services";

export interface RafflePerson {
  readonly user: string;
  readonly nickname: string;
}

/** Lo que pinta el panel de la ruleta. Solo administración: es sorpresa. */
export interface RaffleView {
  readonly raffle: { readonly id: string; readonly keyword: string; readonly prize: string } | null;
  readonly entries: readonly RafflePerson[];
  readonly winners: readonly RafflePerson[];
}

export interface SpinResult {
  /** Las personas de la rueda en este giro, en el orden en que se pintan. */
  readonly wheel: readonly RafflePerson[];
  readonly winner: RafflePerson;
  readonly view: RaffleView;
}

const person = (e: RaffleEntry): RafflePerson => ({ user: e.tiktokUser, nickname: e.nickname });

export class ManageRaffle {
  constructor(
    private readonly raffles: RaffleRepository,
    private readonly chat: LiveChatSource,
    private readonly random: RandomSource,
    private readonly logger: Logger,
  ) {}

  async view(): Promise<RaffleView> {
    const raffle = await this.raffles.current();
    if (!raffle) return { raffle: null, entries: [], winners: [] };
    const [entries, winners] = await Promise.all([this.raffles.entries(raffle.id), this.raffles.winners(raffle.id)]);
    return {
      raffle: { id: raffle.id, keyword: raffle.keyword, prize: raffle.prize },
      entries: entries.map(person),
      winners: winners.map(person),
    };
  }

  /** Empieza una ruleta nueva, vacía. Las anteriores quedan guardadas. */
  async create(keyword: string, prize: string): Promise<RaffleView> {
    const cleanPrize = prize.trim().replace(/\s+/g, " ");
    if (cleanPrize.length === 0 || cleanPrize.length > RAFFLE_PRIZE_MAX) {
      throw new DomainError("VALIDATION", `El premio lleva de 1 a ${RAFFLE_PRIZE_MAX} caracteres.`);
    }
    const raffle = await this.raffles.create(normalizeKeyword(keyword), cleanPrize);
    this.logger.info("raffle.created", { raffleId: raffle.id });
    return this.view();
  }

  /** Por si el chat no conecta: el organizador escribe el @ de quien comentó. */
  async addManual(rawUser: string): Promise<RaffleView> {
    const raffle = await this.requireCurrent();
    const user = normalizeTiktokUser(rawUser);
    if (!/^[\p{L}\p{N}._]{1,60}$/u.test(user)) {
      throw new DomainError("VALIDATION", "Escribe el usuario de TikTok (letras, números, punto o guion bajo).");
    }
    await this.raffles.addEntry(raffle.id, user, user);
    return this.view();
  }

  async remove(rawUser: string): Promise<RaffleView> {
    const raffle = await this.requireCurrent();
    await this.raffles.removeEntry(raffle.id, normalizeTiktokUser(rawUser));
    return this.view();
  }

  /**
   * Elige al ganador en el servidor con azar criptográfico. La rueda del panel
   * solo anima hasta él: girar de nuevo no cambia un resultado ya elegido.
   */
  async spin(): Promise<SpinResult> {
    const raffle = await this.requireCurrent();
    // Dos giros a la vez: si otro ya se llevó al elegido, se vuelve a sortear.
    for (let attempt = 0; attempt < 3; attempt++) {
      const [entries, winners] = await Promise.all([this.raffles.entries(raffle.id), this.raffles.winners(raffle.id)]);
      const wheel = eligibleEntries(entries, new Set(winners.map((w) => w.tiktokUser)));
      if (wheel.length === 0) {
        throw new DomainError(
          "VALIDATION",
          entries.length === 0 ? "Todavía nadie ha entrado a la ruleta." : "Ya ganaron todos los que entraron.",
        );
      }
      const winner = wheel[this.random.int(wheel.length)]!;
      if (await this.raffles.addWinner(raffle.id, winner)) {
        this.logger.info("raffle.winner", { raffleId: raffle.id, entrants: wheel.length });
        return { wheel: wheel.map(person), winner: person(winner), view: await this.view() };
      }
    }
    throw new DomainError("INVALID_STATE", "Hubo otro giro al mismo tiempo. Intenta de nuevo.");
  }

  /**
   * Escucha el chat hasta que `signal` se aborte y mete a quien comente la palabra
   * clave. `onEntry` avisa solo de personas nuevas.
   */
  async listen(
    signal: AbortSignal,
    events: { onEntry(p: RafflePerson): void; onViewers(count: number): void; onConnected(): void },
  ): Promise<void> {
    const raffle = await this.requireCurrent();
    await this.chat.listen(
      {
        onConnected: events.onConnected,
        onViewers: events.onViewers,
        onComment: (c) => {
          if (!commentMatchesKeyword(c.comment, raffle.keyword)) return;
          const user = normalizeTiktokUser(c.user);
          const nickname = c.nickname.trim().slice(0, RAFFLE_NICKNAME_MAX) || user;
          void this.raffles
            .addEntry(raffle.id, user, nickname)
            .then((added) => added && events.onEntry({ user, nickname }))
            .catch(() => this.logger.warn("raffle.entry_failed", { raffleId: raffle.id }));
        },
      },
      signal,
    );
  }

  private async requireCurrent(): Promise<Raffle> {
    const raffle = await this.raffles.current();
    if (!raffle) throw new DomainError("NOT_FOUND", "Primero crea una ruleta.");
    return raffle;
  }
}
