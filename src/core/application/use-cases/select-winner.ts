import { decideMatch, planUndo, statusOf } from "../../domain/bracket";
import { DomainError } from "../../domain/errors";
import type { TournamentStatus } from "../../domain/tournament";
import type { TournamentTransactionContext, UnitOfWork } from "../../ports/repositories";
import type { Logger } from "../../ports/services";
import type { TournamentCacheInvalidator } from "../tournament-cache";

export interface SelectWinnerResult {
  readonly status: TournamentStatus;
  readonly championDecided: boolean;
  readonly corrected: boolean;
}

export class SelectWinner {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly invalidator: TournamentCacheInvalidator,
    private readonly logger: Logger,
  ) {}

  async execute(slug: string, matchId: string, winnerId: string): Promise<SelectWinnerResult> {
    const result = await this.uow.withTournament(slug, "exclusive", async (ctx) => {
      const { tournament } = ctx;
      if (tournament.status === "registration") {
        throw new DomainError("INVALID_STATE", "Primero hay que sortear el bracket.");
      }

      const matches = await ctx.matches.list(tournament.id);
      const decision = decideMatch(matches, matchId, winnerId);

      // 1. persistir el ganador  2-4. meterlo en su casilla del encuentro siguiente.
      await ctx.matches.setWinner(decision.matchId, decision.winnerId);
      if (decision.advance) {
        await ctx.matches.setSlot(decision.advance.matchId, decision.advance.slot, decision.winnerId);
      }

      const status = await syncStatus(ctx);
      return { status, championDecided: decision.decidesChampion, corrected: decision.isCorrection };
    });

    // 5. invalidar Redis  (6. el bracket público se refresca en la siguiente lectura)
    await this.invalidator.invalidate(slug, result.corrected ? "winner_corrected" : "winner_selected");
    this.logger.info("match.decided", { champion: result.championDecided, corrected: result.corrected });
    return result;
  }

  /** Deja el encuentro sin ganador y saca al que había avanzado. Para un toque equivocado. */
  async undo(slug: string, matchId: string): Promise<{ status: TournamentStatus }> {
    const result = await this.uow.withTournament(slug, "exclusive", async (ctx) => {
      if (ctx.tournament.status === "registration") {
        throw new DomainError("INVALID_STATE", "Todavía no hay bracket.");
      }
      const decision = planUndo(await ctx.matches.list(ctx.tournament.id), matchId);
      if (decision.retract) await ctx.matches.setSlot(decision.retract.matchId, decision.retract.slot, null);
      await ctx.matches.setWinner(decision.matchId, null);
      return { status: await syncStatus(ctx) };
    });

    await this.invalidator.invalidate(slug, "winner_undone");
    this.logger.info("match.undone", { status: result.status });
    return result;
  }
}

/** Recalcula el estado desde el cuadro ya escrito, dentro de la misma transacción. */
async function syncStatus(ctx: TournamentTransactionContext): Promise<TournamentStatus> {
  const status = statusOf(await ctx.matches.list(ctx.tournament.id));
  if (status !== ctx.tournament.status) await ctx.tournaments.updateStatus(ctx.tournament.id, status);
  return status;
}
