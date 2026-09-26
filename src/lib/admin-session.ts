import "server-only";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import type { AdminSession } from "@/core/ports/services";
import { container } from "@/infrastructure/container";
import { HttpError } from "./http";

const isProd = process.env.NODE_ENV === "production";

/** En producción el prefijo __Host- obliga a Secure, Path=/ y a no tener Domain. */
export const ADMIN_COOKIE = isProd ? "__Host-monster_admin" : "monster_admin";

export async function isAdmin(): Promise<boolean> {
  const jar = await cookies();
  return container().sessions.verify(jar.get(ADMIN_COOKIE)?.value);
}

/** Para Route Handlers: corta la petición con 401 si no hay sesión válida. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) throw new HttpError(401, "UNAUTHORIZED", "Tu sesión expiró. Vuelve a iniciar sesión.");
}

export function setAdminCookie(res: NextResponse, session: AdminSession): void {
  res.cookies.set({
    name: ADMIN_COOKIE,
    value: session.token,
    httpOnly: true,
    secure: isProd,
    sameSite: "strict",
    path: "/",
    expires: session.expiresAt,
  });
}

export function clearAdminCookie(res: NextResponse): void {
  res.cookies.set({ name: ADMIN_COOKIE, value: "", httpOnly: true, secure: isProd, sameSite: "strict", path: "/", maxAge: 0 });
}
