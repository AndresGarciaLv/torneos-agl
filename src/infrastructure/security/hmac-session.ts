import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { AdminSession, PasswordVerifier, SessionService } from "@/core/ports/services";

export const ADMIN_SESSION_TTL_SECONDS = 8 * 60 * 60;

interface SessionPayload {
  v: 1;
  sub: "admin";
  iat: number;
  exp: number;
  jti: string;
}

const b64 = (buf: Buffer | string) => Buffer.from(buf).toString("base64url");

/**
 * Sesión sin estado: `payload.firma`, con HMAC-SHA256 sobre el payload.
 * Rotar ADMIN_SESSION_SECRET invalida todas las sesiones abiertas.
 */
export class HmacSessionService implements SessionService {
  private readonly key: Buffer;

  constructor(
    secret: string,
    private readonly ttlSeconds = ADMIN_SESSION_TTL_SECONDS,
    private readonly now: () => number = () => Date.now(),
  ) {
    if (secret.length < 32) throw new Error("El secreto de sesión es demasiado corto.");
    // Clave derivada: el mismo secreto no se usa tal cual para dos propósitos.
    this.key = createHmac("sha256", secret).update("monster-agl/admin-session/v1").digest();
  }

  private sign(data: string): string {
    return createHmac("sha256", this.key).update(data).digest("base64url");
  }

  issue(): AdminSession {
    const iat = Math.floor(this.now() / 1000);
    const payload: SessionPayload = { v: 1, sub: "admin", iat, exp: iat + this.ttlSeconds, jti: b64(randomBytes(16)) };
    const body = b64(JSON.stringify(payload));
    return { token: `${body}.${this.sign(body)}`, expiresAt: new Date(payload.exp * 1000) };
  }

  verify(token: string | null | undefined): boolean {
    if (!token || token.length > 1024) return false;
    const dot = token.indexOf(".");
    if (dot <= 0 || dot !== token.lastIndexOf(".")) return false;
    const body = token.slice(0, dot);
    const given = Buffer.from(token.slice(dot + 1), "base64url");
    const expected = Buffer.from(this.sign(body), "base64url");
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) return false;
    try {
      const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Partial<SessionPayload>;
      const nowSec = Math.floor(this.now() / 1000);
      return payload.v === 1 && payload.sub === "admin" && typeof payload.exp === "number" && payload.exp > nowSec;
    } catch {
      return false;
    }
  }
}

/**
 * Compara contra ADMIN_PASSWORD en tiempo constante. Se comparan los HMAC de
 * ambos valores (misma longitud siempre), así ni la longitud de la contraseña
 * se filtra por tiempo de respuesta.
 */
export class EnvPasswordVerifier implements PasswordVerifier {
  private readonly key = randomBytes(32);
  private readonly expected: Buffer;

  constructor(password: string) {
    this.expected = createHmac("sha256", this.key).update(password, "utf8").digest();
  }

  verify(candidate: string): boolean {
    const got = createHmac("sha256", this.key).update(candidate, "utf8").digest();
    return timingSafeEqual(got, this.expected);
  }
}
