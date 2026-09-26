import "server-only";
import { z } from "zod";

/** Una variable definida pero vacía (`SMTP_USER=`) cuenta como no definida. */
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), schema.optional());

/**
 * Variables de servidor. Se validan la primera vez que se piden (no al importar),
 * para que `next build` no exija secretos de producción.
 */
const serverEnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    DATABASE_URL: z.string().min(1, "DATABASE_URL es obligatoria."),
    REDIS_URL: z.string().optional(),
    ADMIN_PASSWORD: z.string().min(12, "ADMIN_PASSWORD necesita al menos 12 caracteres."),
    ADMIN_SESSION_SECRET: z.string().min(32, "ADMIN_SESSION_SECRET necesita al menos 32 caracteres."),
    TOURNAMENT_SLUG: z.string().regex(/^[a-z0-9-]+$/).default("monster-agl-1v1-2026-09"),
    /** Cuántos proxies de confianza agregan su salto a X-Forwarded-For (Vercel, Nginx, Cloudflare → 1). */
    TRUSTED_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(1),
    // Correo (Brevo u otro SMTP). Sin SMTP_USER + SMTP_PASS no se envía nada y la inscripción sigue igual.
    SMTP_HOST: z.string().min(1).default("smtp-relay.brevo.com"),
    SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
    SMTP_USER: optional(z.string().trim()),
    SMTP_PASS: optional(z.string().trim()),
    /** Remitente. Tiene que estar verificado en Brevo (Senders & IPs). */
    MAIL_FROM: z.string().trim().min(3).default("Monster_AGL <monster.aglv@gmail.com>"),
    /** A quién le llega el aviso de cada inscripción. */
    ADMIN_NOTIFY_EMAIL: optional(z.email()),
    NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
    NEXT_PUBLIC_TIKTOK_URL: z.url().default("https://www.tiktok.com/@monster_agl/live"),
  })
  .superRefine((env, ctx) => {
    if (env.ADMIN_PASSWORD === env.ADMIN_SESSION_SECRET) {
      ctx.addIssue({ code: "custom", message: "La contraseña y el secreto de sesión no pueden ser iguales." });
    }
  });

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | null = null;

export function serverEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    // Solo nombres de variables y reglas: nunca los valores.
    const problems = parsed.error.issues.map((i) => `${i.path.join(".") || "env"}: ${i.message}`).join("; ");
    throw new Error(`Configuración inválida → ${problems}`);
  }
  cached = parsed.data;
  return cached;
}

/** Slug del torneo que muestra la landing. No necesita secretos. */
export function tournamentSlug(): string {
  return process.env.TOURNAMENT_SLUG?.trim() || "monster-agl-1v1-2026-09";
}
