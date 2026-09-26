import { planBracket } from "../../domain/bracket";
import { DomainError } from "../../domain/errors";
import { fisherYatesShuffle } from "../../domain/shuffle";
import type { UnitOfWork } from "../../ports/repositories";
import type { Logger, RandomSource } from "../../ports/services";
import type { BracketAction } from "../schemas";
import type { TournamentCacheInvalidator } from "../tournament-cache";

export interface BracketActionResult {
  readonly action: BracketAction["action"];
  readonly participants: number;
  readonly size: number;
  readonly byes: number;
  readonly rounds: number;
}

/**
 * Sortear, volver a sortear o deshacer el cuadro. El sorteo ocurre solo aquí,
 * en el servidor, con una fuente criptográfica y Fisher-Yates.
 */
export class ManageBracket {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly random: RandomSource,
    private readonly invalidator: TournamentCacheInvalidator,
    private readonly logger: Logger,
  ) {}

  async execute(slug: string, command: BracketAction): Promise<BracketActionResult> {
    const result = await this.uow.withTournament(slug, "exclusive", async (ctx) => {
      const { tournament } = ctx;

      if (command.action === "reset") {
        if (tournament.status === "registration") {
          throw new DomainError("INVALID_STATE", "Las inscripciones ya están abiertas.");
        }
        await ctx.matches.clear(tournament.id);
        await ctx.tournaments.updateStatus(tournament.id, "registration");
        const participants = await ctx.participants.count(tournament.id);
        return { action: command.action, participants, size: 0, byes: 0, rounds: 0 };
      }

      if (command.action === "generate" && tournament.status !== "registration") {
        throw new DomainError("INVALID_STATE", "El bracket ya existe. Usa «Regenerar bracket» si quieres volver a sortear.");
      }
      if (command.action === "regenerate") {
        if (tournament.status === "registration") {
          throw new DomainError("INVALID_STATE", "Todavía no hay bracket que regenerar.");
        }
        if (tournament.status === "finished") {
          throw new DomainError("INVALID_STATE", "El torneo ya terminó: no se puede volver a sortear.");
        }
      }

      // 1. Recuperar  2. copiar  3. Fisher-Yates  4-7. potencia de 2, BYE, rondas y enlaces  8. persistir.
      const ids = await ctx.participants.listIds(tournament.id);
      const shuffled = fisherYatesShuffle(ids, (max) => this.random.int(max));
      const plan = planBracket(shuffled);
      await ctx.matches.replaceBracket(tournament.id, plan);
      await ctx.tournaments.updateStatus(tournament.id, "bracket_ready");
      return {
        action: command.action,
        participants: ids.length,
        size: plan.size,
        byes: plan.byes,
        rounds: plan.roundCount,
      };
    });

    await this.invalidator.invalidate(slug, `bracket_${command.action}`);
    this.logger.info("bracket.changed", {
      action: result.action,
      participants: result.participants,
      size: result.size,
      byes: result.byes,
    });
    return result;
  }
}
