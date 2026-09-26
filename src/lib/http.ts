import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import type { z } from "zod";
import { isInputValidationError, isInvalidCredentialsError, isRateLimitedError } from "@/core/application/errors";
import { fieldErrors } from "@/core/application/schemas";
import { isDomainError, type DomainErrorCode } from "@/core/domain/errors";

/**
 * Adaptadores de entrada compartidos por los Route Handlers: leen el cuerpo,
 * validan con Zod y traducen errores de dominio a HTTP. Nada de reglas del torneo.
 */

const MAX_BODY_BYTES = 16 * 1024;

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
  }
}

export async function readJson<S extends z.ZodType>(req: NextRequest, schema: S): Promise<z.output<S>> {
  const type = req.headers.get("content-type") ?? "";
  if (!type.toLowerCase().startsWith("application/json")) {
    throw new HttpError(415, "UNSUPPORTED_MEDIA_TYPE", "Se esperaba JSON.");
  }
  const text = await req.text();
  if (Buffer.byteLength(text, "utf8") > MAX_BODY_BYTES) {
    throw new HttpError(413, "PAYLOAD_TOO_LARGE", "La petición es demasiado grande.");
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new HttpError(400, "INVALID_JSON", "El cuerpo no es JSON válido.");
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new HttpError(422, "VALIDATION", "Revisa los campos marcados.", fieldErrors(parsed.error));
  }
  return parsed.data;
}

/**
 * IP del cliente para el rate limiting. Se toma de X-Forwarded-For contando
 * desde la DERECHA tantos saltos como proxies de confianza haya: la entrada de
 * la izquierda la puede escribir cualquiera, las que agregan tus proxies no.
 * Sin cabecera (desarrollo local) devuelve null y todo cae en un cubo común.
 */
export function clientIp(req: NextRequest, trustedProxyHops: number): string | null {
  const chain = (req.headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (chain.length === 0 || trustedProxyHops < 1) return null;
  return chain[Math.max(0, chain.length - trustedProxyHops)] ?? null;
}

/**
 * Defensa extra contra CSRF en rutas de administración, además de SameSite=Strict:
 * el Origin (o Referer) tiene que ser este mismo sitio.
 */
export function assertSameOrigin(req: NextRequest): void {
  const origin = req.headers.get("origin") ?? req.headers.get("referer");
  if (!origin) throw new HttpError(403, "FORBIDDEN", "Origen no permitido.");
  let host: string;
  try {
    host = new URL(origin).host;
  } catch {
    throw new HttpError(403, "FORBIDDEN", "Origen no permitido.");
  }
  const expected = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!expected || host !== expected) throw new HttpError(403, "FORBIDDEN", "Origen no permitido.");
}

const DOMAIN_STATUS: Record<DomainErrorCode, number> = {
  VALIDATION: 422,
  NOT_FOUND: 404,
  REGISTRATION_CLOSED: 409,
  DUPLICATE_EMAIL: 409,
  DUPLICATE_GAMER_TAG: 409,
  NOT_ENOUGH_PARTICIPANTS: 409,
  INVALID_STATE: 409,
  CONFIRMATION_REQUIRED: 428,
  MATCH_NOT_READY: 409,
  INVALID_WINNER: 422,
  DOWNSTREAM_DECIDED: 409,
};

const DOMAIN_FIELD: Partial<Record<DomainErrorCode, string>> = {
  DUPLICATE_EMAIL: "email",
  DUPLICATE_GAMER_TAG: "gamerTag",
};

const NO_STORE = { "Cache-Control": "no-store" };

export function json<T>(body: T, init?: { status?: number; headers?: Record<string, string> }) {
  return NextResponse.json(body, { status: init?.status ?? 200, headers: { ...NO_STORE, ...init?.headers } });
}

export function errorResponse(error: unknown, log: (event: string, fields?: Record<string, string>) => void) {
  if (error instanceof HttpError) {
    return json({ error: { code: error.code, message: error.message, fields: error.fields } }, { status: error.status });
  }
  if (isInputValidationError(error)) {
    return json({ error: { code: "VALIDATION", message: error.message, fields: error.fields } }, { status: 422 });
  }
  if (isDomainError(error)) {
    const field = DOMAIN_FIELD[error.code];
    return json(
      { error: { code: error.code, message: error.message, fields: field ? { [field]: error.message } : undefined } },
      { status: DOMAIN_STATUS[error.code] },
    );
  }
  if (isRateLimitedError(error)) {
    return json(
      { error: { code: "RATE_LIMITED", message: error.message } },
      { status: 429, headers: { "Retry-After": String(error.retryAfterSeconds) } },
    );
  }
  if (isInvalidCredentialsError(error)) {
    return json({ error: { code: "INVALID_CREDENTIALS", message: error.message } }, { status: 401 });
  }
  // Solo el nombre del error: un mensaje de pg puede incluir valores de la fila.
  log("http.unexpected_error", { name: error instanceof Error ? error.name : "unknown" });
  return json({ error: { code: "INTERNAL", message: "Algo salió mal. Intenta de nuevo en un momento." } }, { status: 500 });
}
