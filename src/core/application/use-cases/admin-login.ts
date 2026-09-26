import type { AdminSession, Logger, PasswordVerifier, RateLimiter, SessionService } from "../../ports/services";
import { InvalidCredentialsError, RateLimitedError } from "../errors";

export const LOGIN_RATE_LIMIT = { limit: 10, windowSeconds: 300 } as const;

export class AdminLogin {
  constructor(
    private readonly passwords: PasswordVerifier,
    private readonly sessions: SessionService,
    private readonly rateLimiter: RateLimiter,
    private readonly logger: Logger,
  ) {}

  async execute(password: string, clientIp: string | null): Promise<AdminSession> {
    const rate = await this.rateLimiter.consume(
      "admin-login",
      clientIp ?? "unknown",
      LOGIN_RATE_LIMIT.limit,
      LOGIN_RATE_LIMIT.windowSeconds,
    );
    if (!rate.allowed) {
      this.logger.warn("admin.login_rate_limited", { retryAfter: rate.retryAfterSeconds });
      throw new RateLimitedError(rate.retryAfterSeconds);
    }
    if (!this.passwords.verify(password)) {
      this.logger.warn("admin.login_failed");
      throw new InvalidCredentialsError();
    }
    this.logger.info("admin.login_ok");
    return this.sessions.issue();
  }
}
