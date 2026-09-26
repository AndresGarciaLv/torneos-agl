import "server-only";
import { existsSync } from "node:fs";
import path from "node:path";
import { TournamentCacheInvalidator } from "@/core/application/tournament-cache";
import { AdminLogin } from "@/core/application/use-cases/admin-login";
import { GetAdminDashboard } from "@/core/application/use-cases/get-admin-dashboard";
import { GetPublicTournament } from "@/core/application/use-cases/get-public-tournament";
import { ManageBracket } from "@/core/application/use-cases/manage-bracket";
import { ManageParticipants } from "@/core/application/use-cases/manage-participants";
import { DonorBoard } from "@/core/application/use-cases/donor-board";
import { ManageRaffle } from "@/core/application/use-cases/manage-raffle";
import { RegisterParticipant } from "@/core/application/use-cases/register-participant";
import { SelectWinner } from "@/core/application/use-cases/select-winner";
import type { Logger, RegistrationNotifier, SessionService } from "@/core/ports/services";
import { serverEnv, type ServerEnv } from "./config/env";
import { DisabledRegistrationNotifier, SmtpRegistrationNotifier } from "./email/smtp-notifier";
import { ConsoleLogger } from "./logging/console-logger";
import { getPool } from "./postgres/pool";
import { pgRepositories } from "./postgres/repositories";
import { PgDonorRepository } from "./postgres/donor-repository";
import { PgRaffleRepository } from "./postgres/raffle-repository";
import { PgUnitOfWork } from "./postgres/unit-of-work";
import { getRedis } from "./redis/client";
import { NoCache, RedisCache } from "./redis/redis-cache";
import { RedisRateLimiter } from "./redis/redis-rate-limiter";
import { CryptoRandomSource } from "./security/crypto-random";
import { DisabledHumanVerifier } from "./security/human-verifier";
import { EnvPasswordVerifier, HmacSessionService } from "./security/hmac-session";
import { TikTokLiveChat } from "./tiktok/tiktok-live-chat";

/**
 * Composition root: el único lugar que conoce a la vez los casos de uso y los
 * adaptadores concretos. Cambiar PostgreSQL, Redis o el CAPTCHA se hace aquí.
 */
function build() {
  const env = serverEnv();
  const logger = new ConsoleLogger();
  const pool = getPool(env.DATABASE_URL);
  const redis = getRedis(env.REDIS_URL);

  const repos = pgRepositories(pool);
  const uow = new PgUnitOfWork(pool);
  const cache = redis ? new RedisCache(redis, logger) : new NoCache();
  const invalidator = new TournamentCacheInvalidator(cache, logger);
  const rateLimiter = new RedisRateLimiter(redis, env.ADMIN_SESSION_SECRET, logger);
  const sessions: SessionService = new HmacSessionService(env.ADMIN_SESSION_SECRET);
  const random = new CryptoRandomSource();
  const liveChat = new TikTokLiveChat(env.TIKTOK_USERNAME.replace(/^@/, ""), env.EULER_API_KEY);

  return {
    env,
    logger,
    sessions,
    registerParticipant: new RegisterParticipant(
      uow,
      rateLimiter,
      new DisabledHumanVerifier(),
      invalidator,
      logger,
      buildNotifier(env, logger),
    ),
    getPublicTournament: new GetPublicTournament(repos, cache),
    getAdminDashboard: new GetAdminDashboard(repos),
    manageBracket: new ManageBracket(uow, random, invalidator, logger),
    manageParticipants: new ManageParticipants(uow, random, invalidator, logger),
    selectWinner: new SelectWinner(uow, invalidator, logger),
    manageRaffle: new ManageRaffle(new PgRaffleRepository(pool), liveChat, random, logger),
    donorBoard: new DonorBoard(new PgDonorRepository(pool), liveChat, logger),
    adminLogin: new AdminLogin(new EnvPasswordVerifier(env.ADMIN_PASSWORD), sessions, rateLimiter, logger),
  };
}

/** Versión liviana (21 KB) del logo oficial, para adjuntar en los correos. */
const EMAIL_LOGO = path.join(process.cwd(), "public", "branding", "logo-email.png");

function buildNotifier(env: ServerEnv, logger: Logger): RegistrationNotifier {
  if (!env.SMTP_USER || !env.SMTP_PASS) {
    logger.warn("email.disabled", { reason: "smtp_not_configured" });
    return new DisabledRegistrationNotifier();
  }
  return new SmtpRegistrationNotifier(
    {
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
      from: env.MAIL_FROM,
      // "Monster_AGL <monster.aglv@gmail.com>" → "monster.aglv@gmail.com"
      replyTo: env.MAIL_FROM.match(/<([^>]+)>/)?.[1] ?? env.MAIL_FROM,
      organizerEmail: env.ADMIN_NOTIFY_EMAIL ?? null,
      logoPath: existsSync(EMAIL_LOGO) ? EMAIL_LOGO : null,
    },
    { siteUrl: env.NEXT_PUBLIC_SITE_URL, tiktokUrl: env.NEXT_PUBLIC_TIKTOK_URL },
    logger,
  );
}

export type Container = ReturnType<typeof build>;

const globalForContainer = globalThis as unknown as { __monsterContainer?: Container };

export function container(): Container {
  globalForContainer.__monsterContainer ??= build();
  return globalForContainer.__monsterContainer;
}
