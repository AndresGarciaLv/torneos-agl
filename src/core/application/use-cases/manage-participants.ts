import { MAX_PARTICIPANTS, planByeFill, planWithdrawal, statusOf } from "../../domain/bracket";
import { DomainError } from "../../domain/errors";
import { createAdminParticipant } from "../../domain/participant";
import type { TournamentTransactionContext, UnitOfWork } from "../../ports/repositories";
import type { Logger, RandomSource } from "../../ports/services";
import type { AdminAddParticipant, AdminEditParticipant } from "../schemas";
import type { TournamentCacheInvalidator } from "../tournament-cache";

export type AddOutcome = "listed" | "filled_bye" | "replaced";

export interface AddParticipantResult {
  readonly gamerTag: string;
  readonly participantCount: number;
  readonly outcome: AddOutcome;
}

export interface EditParticipantResult {
  readonly gamerTag: string;
}

export type RemoveOutcome = "deleted" | "opponent_advances";

/**
 * Altas, bajas y sustituciones desde el panel, en cualquier momento antes de la final:
 * - Inscripciones abiertas: solo cambia la lista.
 * - Cuadro sorteado: el alta ocupa un BYE libre; la baja convierte su encuentro
 *   en BYE para el rival (y deja el hueco para la siguiente alta); la sustitución
 *   pone al nuevo exactamente donde estaba el otro.
 * Nadie más cambia de lugar y ningún resultado se pierde.
 * Corregir Gamer Tag, correo o ID se puede hasta el final: el cuadro guarda ids, no nombres.
 */
export class ManageParticipants {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly random: RandomSource,
    private readonly invalidator: TournamentCacheInvalidator,
    private readonly logger: Logger,
  ) {}

  async add(slug: string, input: AdminAddParticipant): Promise<AddParticipantResult> {
    const candidate = createAdminParticipant(input);

    const result = await this.uow.withTournament(slug, "exclusive", async (ctx) => {
      const { tournament } = ctx;
      if (tournament.status === "finished") throw new DomainError("INVALID_STATE", "El torneo ya terminó.");
      const drawn = tournament.status !== "registration";

      const ids = await ctx.participants.listIds(tournament.id);
      if (input.replaces !== null) {
        if (!ids.includes(input.replaces)) throw new DomainError("NOT_FOUND", "El jugador a sustituir ya no existe.");
      } else if (ids.length >= MAX_PARTICIPANTS) {
        // Una sustitución no suma a nadie; un alta sí, y el cupo vale también para el organizador.
        throw new DomainError(
          "TOURNAMENT_FULL",
          `Ya hay ${MAX_PARTICIPANTS} jugadores. Para meter a alguien usa «Sustituir» o da de baja a otro.`,
        );
      }

      // El hueco se valida ANTES de insertar: si el cuadro está lleno no queda un inscrito fuera del bracket.
      const fill =
        drawn && input.replaces === null
          ? planByeFill(await ctx.matches.list(tournament.id), (max) => this.random.int(max))
          : null;

      const participant = await ctx.participants.insert(tournament.id, candidate);
      let outcome: AddOutcome = "listed";

      if (input.replaces !== null) {
        if (drawn) await ctx.matches.replacePlayer(tournament.id, input.replaces, participant.id);
        await ctx.participants.delete(tournament.id, input.replaces);
        outcome = "replaced";
      } else if (fill) {
        if (fill.retract) await ctx.matches.setSlot(fill.retract.matchId, fill.retract.slot, null);
        await ctx.matches.setWinner(fill.matchId, null);
        await ctx.matches.setSlot(fill.matchId, fill.slot, participant.id);
        outcome = "filled_bye";
      }
      if (drawn) await syncStatus(ctx);

      return {
        gamerTag: participant.gamerTag,
        participantCount: await ctx.participants.count(tournament.id),
        outcome,
      };
    });

    await this.invalidator.invalidate(slug, "participant_added_by_admin");
    this.logger.info("participant.added", { participants: result.participantCount, outcome: result.outcome });
    return result;
  }

  async edit(slug: string, input: AdminEditParticipant): Promise<EditParticipantResult> {
    const { gamerTag, email, mobileLegendsId } = createAdminParticipant(input);

    const result = await this.uow.withTournament(slug, "exclusive", async (ctx) => {
      const updated = await ctx.participants.update(ctx.tournament.id, input.participantId, {
        gamerTag,
        email,
        mobileLegendsId,
      });
      if (!updated) throw new DomainError("NOT_FOUND", "Ese inscrito ya no existe.");
      return { gamerTag: updated.gamerTag };
    });

    // El Gamer Tag sale en la vista pública cacheada.
    await this.invalidator.invalidate(slug, "participant_edited");
    this.logger.info("participant.edited");
    return result;
  }

  async remove(slug: string, participantId: string): Promise<{ participantCount: number; outcome: RemoveOutcome }> {
    const result = await this.uow.withTournament(slug, "exclusive", async (ctx) => {
      const { tournament } = ctx;
      if (tournament.status === "finished") throw new DomainError("INVALID_STATE", "El torneo ya terminó.");
      let outcome: RemoveOutcome = "deleted";

      if (tournament.status !== "registration") {
        const w = planWithdrawal(await ctx.matches.list(tournament.id), participantId);
        await ctx.matches.setSlot(w.matchId, w.slot, null);
        await ctx.matches.setWinner(w.matchId, w.opponentId);
        await ctx.matches.setSlot(w.advance.matchId, w.advance.slot, w.opponentId);
        outcome = "opponent_advances";
      }

      const deleted = await ctx.participants.delete(tournament.id, participantId);
      if (!deleted) throw new DomainError("NOT_FOUND", "Ese inscrito ya no existe.");
      if (tournament.status !== "registration") await syncStatus(ctx);
      return { participantCount: await ctx.participants.count(tournament.id), outcome };
    });

    await this.invalidator.invalidate(slug, "participant_removed");
    this.logger.info("participant.removed", { participants: result.participantCount, outcome: result.outcome });
    return result;
  }
}

async function syncStatus(ctx: TournamentTransactionContext): Promise<void> {
  const status = statusOf(await ctx.matches.list(ctx.tournament.id));
  if (status !== ctx.tournament.status) await ctx.tournaments.updateStatus(ctx.tournament.id, status);
}
