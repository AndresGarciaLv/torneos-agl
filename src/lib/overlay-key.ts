import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { serverEnv } from "@/infrastructure/config/env";

/**
 * Llave del enlace del overlay. El overlay abre la conexión al live de TikTok,
 * así que no puede quedar abierto a cualquiera: solo quien tiene el enlace.
 * Se deriva del secreto de sesión, sin variable nueva.
 */
export function overlayKey(): string {
  return createHmac("sha256", serverEnv().ADMIN_SESSION_SECRET).update("overlay:donors").digest("base64url").slice(0, 24);
}

export function isValidOverlayKey(candidate: string | null): boolean {
  if (!candidate) return false;
  const expected = Buffer.from(overlayKey());
  const given = Buffer.from(candidate);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
