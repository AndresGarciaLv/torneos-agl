/**
 * Contratos de entrada. Se usan en el servidor (obligatorio) y en el cliente
 * (solo para dar feedback rápido): la validación del cliente nunca se da por buena.
 */
import { z } from "zod";
import { EMAIL_MAX, GAMER_TAG_MAX, GAMER_TAG_MIN, ML_ID_MAX, normalizeGamerTag } from "../domain/participant";

const gamerTag = z
  .string({ error: "Escribe tu Gamer Tag." })
  .transform(normalizeGamerTag)
  .refine((v) => [...v].length >= GAMER_TAG_MIN, `Mínimo ${GAMER_TAG_MIN} caracteres.`)
  .refine((v) => [...v].length <= GAMER_TAG_MAX, `Máximo ${GAMER_TAG_MAX} caracteres.`);

export const registrationSchema = z.object({
  gamerTag,
  email: z
    .string({ error: "Escribe tu correo." })
    .trim()
    .toLowerCase()
    .max(EMAIL_MAX, "El correo es demasiado largo.")
    .pipe(z.email({ error: "Escribe un correo válido." })),
  mobileLegendsId: z
    .string()
    .trim()
    .max(ML_ID_MAX, `Máximo ${ML_ID_MAX} caracteres.`)
    .regex(/^[0-9A-Za-z()\s-]*$/, "Solo números, letras, espacios, guiones y paréntesis.")
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  acceptedRules: z.literal(true, { error: "Tienes que aceptar para aparecer en el bracket." }),
  /** Trampa para bots: un campo invisible que una persona nunca llena. */
  website: z.string().max(200).optional(),
  /** Token de CAPTCHA, solo si hay un verificador activo. */
  captchaToken: z.string().max(4096).optional().nullable(),
});
export type RegistrationInput = z.input<typeof registrationSchema>;
export type RegistrationData = z.output<typeof registrationSchema>;

export const loginSchema = z.object({
  password: z.string().min(1, "Escribe la contraseña.").max(512),
});

export const bracketActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("generate") }),
  z.object({ action: z.literal("regenerate"), confirm: z.literal(true, { error: "Confirma para regenerar." }) }),
  z.object({ action: z.literal("reset"), confirm: z.literal(true, { error: "Confirma para reabrir inscripciones." }) }),
]);
export type BracketAction = z.infer<typeof bracketActionSchema>;

export const selectWinnerSchema = z.object({
  matchId: z.uuid(),
  winnerId: z.uuid(),
});

/** Primer mensaje por campo, listo para pintar debajo de cada input. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "form");
    out[field] ??= issue.message;
  }
  return out;
}
