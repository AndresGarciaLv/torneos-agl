/**
 * Caché de lectura. NUNCA es fuente de verdad: si falla, quien la usa sigue
 * contra PostgreSQL. Por eso los adaptadores no lanzan: devuelven null / no-op.
 */
export interface Cache {
  getJson<T>(key: string): Promise<T | null>;
  setJson(key: string, value: unknown, ttlSeconds: number): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface RateLimitResult {
  readonly allowed: boolean;
  readonly remaining: number;
  readonly retryAfterSeconds: number;
}

export interface RateLimiter {
  /**
   * Cuenta un intento de `identifier` (una IP, por ejemplo) en la ventana dada.
   * El adaptador decide cómo guarda el identificador; nunca debería guardarlo en claro.
   */
  consume(bucket: string, identifier: string, limit: number, windowSeconds: number): Promise<RateLimitResult>;
}

export interface RandomSource {
  /** Entero uniforme en [0, maxExclusive), de una fuente criptográficamente segura. */
  int(maxExclusive: number): number;
}

/**
 * Prueba de humanidad (Cloudflare Turnstile, hCaptcha...). El adaptador por
 * defecto acepta todo; activar un CAPTCHA es cambiar el adaptador, no el caso de uso.
 */
export interface HumanVerifier {
  readonly enabled: boolean;
  verify(token: string | null, remoteIp: string | null): Promise<boolean>;
}

export interface PasswordVerifier {
  /** Comparación en tiempo constante contra la contraseña configurada. */
  verify(candidate: string): boolean;
}

export interface AdminSession {
  readonly token: string;
  readonly expiresAt: Date;
}

export interface SessionService {
  issue(): AdminSession;
  verify(token: string | null | undefined): boolean;
}

/** Logger sin PII: los campos son códigos y contadores, nunca correos, IPs ni contraseñas. */
export interface Logger {
  info(event: string, fields?: Record<string, string | number | boolean | null>): void;
  warn(event: string, fields?: Record<string, string | number | boolean | null>): void;
  error(event: string, fields?: Record<string, string | number | boolean | null>): void;
}

/** Lo que hace falta para avisar de una inscripción. Si lleva correo, nunca va a un log. */
export interface RegistrationNotice {
  readonly tournamentName: string;
  readonly startsAt: Date;
  readonly gamerTag: string;
  /** null cuando el jugador no dejó correo: entonces solo sale el aviso al organizador. */
  readonly email: string | null;
  readonly mobileLegendsId: string | null;
  readonly participantNumber: number;
}

export interface RegistrationNotifyResult {
  /** El correo de confirmación salió hacia el participante. */
  readonly participantNotified: boolean;
  /** El aviso salió hacia el organizador. */
  readonly organizerNotified: boolean;
}

/**
 * Correos de una inscripción: la confirmación al participante y el aviso al
 * organizador. El adaptador NO lanza: un correo que falla no deshace una
 * inscripción que PostgreSQL ya confirmó.
 */
export interface RegistrationNotifier {
  readonly enabled: boolean;
  notify(notice: RegistrationNotice): Promise<RegistrationNotifyResult>;
}

export interface LiveChatComment {
  /** Usuario de TikTok (sin @). */
  readonly user: string;
  readonly nickname: string;
  readonly comment: string;
}

/**
 * Chat del live en tiempo real. `listen` resuelve cuando la conexión termina:
 * porque se abortó `signal`, porque el live se cortó o por un error (lanza).
 */
export interface LiveChatSource {
  listen(
    handlers: { onComment(c: LiveChatComment): void; onViewers(count: number): void; onConnected(): void },
    signal: AbortSignal,
  ): Promise<void>;
}
