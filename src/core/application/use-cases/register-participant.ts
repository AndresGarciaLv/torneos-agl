import { DomainError } from "../../domain/errors";
import { createNewParticipant } from "../../domain/participant";
import { isRegistrationOpen } from "../../domain/tournament";
import type { UnitOfWork } from "../../ports/repositories";
import type { HumanVerifier, Logger, RateLimiter, RegistrationNotifier } from "../../ports/services";
import { InputValidationError, RateLimitedError } from "../errors";
import { fieldErrors, registrationSchema } from "../schemas";
import type { TournamentCacheInvalidator } from "../tournament-cache";

export const REGISTER_RATE_LIMIT = { limit: 5, windowSeconds: 60 } as const;

export interface RegisterParticipantCommand {
  readonly slug: string;
  /** El cuerpo tal como llegó: se valida aquí, DESPUÉS de contar el intento. */
  readonly input: unknown;
  readonly clientIp: string | null;
}

export interface RegisterParticipantResult {
  readonly gamerTag: string;
  readonly participantCount: number;
  /** Salió el correo de confirmación al participante. */
  readonly confirmationEmailSent: boolean;
}

export class RegisterParticipant {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly rateLimiter: RateLimiter,
    private readonly humanVerifier: HumanVerifier,
    private readonly invalidator: TournamentCacheInvalidator,
    private readonly logger: Logger,
    private readonly notifier: RegistrationNotifier,
  ) {}

  async execute(cmd: RegisterParticipantCommand): Promise<RegisterParticipantResult> {
    const rate = await this.rateLimiter.consume(
      "register",
      cmd.clientIp ?? "unknown",
      REGISTER_RATE_LIMIT.limit,
      REGISTER_RATE_LIMIT.windowSeconds,
    );
    if (!rate.allowed) {
      this.logger.warn("register.rate_limited", { retryAfter: rate.retryAfterSeconds });
      throw new RateLimitedError(rate.retryAfterSeconds);
    }

    // Se valida después del rate limit: si no, quien manda basura nunca gasta intentos.
    const parsed = registrationSchema.safeParse(cmd.input);
    if (!parsed.success) throw new InputValidationError(fieldErrors(parsed.error));
    const data = parsed.data;

    // Un bot que llena el campo trampa recibe un error genérico y no toca la base.
    if (data.website && data.website.trim() !== "") {
      this.logger.warn("register.honeypot");
      throw new DomainError("VALIDATION", "No pudimos procesar la inscripción.");
    }

    if (this.humanVerifier.enabled) {
      const ok = await this.humanVerifier.verify(data.captchaToken ?? null, cmd.clientIp);
      if (!ok) throw new DomainError("VALIDATION", "No pudimos verificar que eres una persona. Recarga e intenta de nuevo.");
    }

    const candidate = createNewParticipant(data);

    const result = await this.uow.withTournament(cmd.slug, "shared", async (ctx) => {
      if (!isRegistrationOpen(ctx.tournament)) {
        throw new DomainError("REGISTRATION_CLOSED", "Las inscripciones ya cerraron: las llaves están sorteadas.");
      }
      const participant = await ctx.participants.insert(ctx.tournament.id, candidate);
      const participantCount = await ctx.participants.count(ctx.tournament.id);
      return {
        gamerTag: participant.gamerTag,
        participantCount,
        notice: {
          tournamentName: ctx.tournament.name,
          startsAt: ctx.tournament.startsAt,
          gamerTag: participant.gamerTag,
          email: participant.email,
          mobileLegendsId: participant.mobileLegendsId,
          participantNumber: participantCount,
        },
      };
    });

    await this.invalidator.invalidate(cmd.slug, "participant_registered");
    this.logger.info("register.ok", { participants: result.participantCount });

    // Los correos van DESPUÉS del commit: la inscripción ya es un hecho aunque el correo falle.
    let sent = { participantNotified: false, organizerNotified: false };
    if (this.notifier.enabled) {
      try {
        sent = await this.notifier.notify(result.notice);
      } catch {
        // El contrato dice que no lanza; si un adaptador lo hace igual, la inscripción no se pierde.
        this.logger.error("email.notifier_threw");
      }
    }

    return {
      gamerTag: result.gamerTag,
      participantCount: result.participantCount,
      confirmationEmailSent: sent.participantNotified,
    };
  }
}
