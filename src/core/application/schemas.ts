/**
 * Contratos de entrada. Se usan en el servidor (obligatorio) y en el cliente
 * (solo para dar feedback rápido): la validación del cliente nunca se da por buena.
 */
import { z } from "zod";
import { EMAIL_MAX, GAMER_TAG_MAX, GAMER_TAG_MIN, ML_FULL_ID, ML_ID_MAX, normalizeGamerTag } from "../domain/participant";

const gamerTag = z
  .string({ error: "Escribe tu nickname." })
  .transform(normalizeGamerTag)
  .refine((v) => [...v].length >= GAMER_TAG_MIN, `Mínimo ${GAMER_TAG_MIN} caracteres.`)
  .refine((v) => [...v].length <= GAMER_TAG_MAX, `Máximo ${GAMER_TAG_MAX} caracteres.`);

/** Obligatorio: es a donde se mandan los premios si el jugador gana. */
const mobileLegendsId = z
  .string({ error: "Escribe tu ID de Mobile Legends." })
  .trim()
  .min(1, "Escribe tu ID de Mobile Legends: lo necesitamos para enviarte el premio.")
  .max(ML_ID_MAX, `Máximo ${ML_ID_MAX} caracteres.`)
  .regex(/^[0-9A-Za-z()\s-]*$/, "Solo números, letras, espacios, guiones y paréntesis.");

/** En el panel el correo es opcional: vacío cuenta como ausente. */
const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .max(EMAIL_MAX, "El correo es demasiado largo.")
  .refine((v) => v === "" || z.email().safeParse(v).success, "Escribe un correo válido o déjalo vacío.")
  .optional()
  .nullable()
  .transform((v) => (v ? v : null));

export const registrationSchema = z.object({
  gamerTag,
  // El formulario junta User ID y Server ID: aquí solo entra ese formato, así el premio llega a una cuenta real.
  mobileLegendsId: mobileLegendsId.regex(ML_FULL_ID, "Revisa tu User ID y tu Server ID."),
  acceptedRules: z.literal(true, { error: "Tienes que aceptar las reglas para participar." }),
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

export const selectWinnerSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("win"), matchId: z.uuid(), winnerId: z.uuid() }),
  z.object({ action: z.literal("undo"), matchId: z.uuid() }),
]);

/** Alta, corrección o baja desde el panel. El correo es opcional; el ID no. */
export const adminParticipantSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("add"),
    gamerTag,
    email: optionalEmail,
    mobileLegendsId,
    /** Si viene, el nuevo toma el lugar exacto de este jugador en el cuadro. */
    replaces: z.uuid().optional().nullable().transform((v) => v ?? null),
  }),
  z.object({
    action: z.literal("edit"),
    participantId: z.uuid(),
    gamerTag,
    email: optionalEmail,
    mobileLegendsId,
  }),
  z.object({ action: z.literal("remove"), participantId: z.uuid() }),
]);
export type AdminAddParticipant = Extract<z.output<typeof adminParticipantSchema>, { action: "add" }>;
export type AdminEditParticipant = Extract<z.output<typeof adminParticipantSchema>, { action: "edit" }>;

/** Ruleta del live (solo panel). */
export const raffleActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    keyword: z.string().trim().min(1, "Escribe la palabra clave.").max(30, "Máximo 30 caracteres."),
    prize: z.string().trim().min(1, "Escribe el premio.").max(80, "Máximo 80 caracteres."),
  }),
  z.object({ action: z.literal("add"), user: z.string().trim().min(1, "Escribe el usuario.").max(61) }),
  z.object({ action: z.literal("remove"), user: z.string().trim().min(1).max(61) }),
  z.object({ action: z.literal("spin") }),
]);

/** Primer mensaje por campo, listo para pintar debajo de cada input. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "form");
    out[field] ??= issue.message;
  }
  return out;
}
