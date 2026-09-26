import { DomainError } from "./errors";

export interface Participant {
  readonly id: string;
  readonly tournamentId: string;
  readonly gamerTag: string;
  readonly email: string;
  readonly mobileLegendsId: string | null;
  readonly acceptedRules: boolean;
  readonly createdAt: Date;
}

/** Lo único de un participante que puede salir a una vista pública. */
export interface PublicPlayer {
  readonly id: string;
  readonly gamerTag: string;
}

export const GAMER_TAG_MIN = 2;
export const GAMER_TAG_MAX = 40;
export const ML_ID_MAX = 40;
export const EMAIL_MAX = 254;

// Caracteres de control e invisibles que permitirían dos tags "iguales" a la vista.
const INVISIBLE_RANGES: ReadonlyArray<readonly [number, number]> = [
  [0x0000, 0x001f], [0x007f, 0x009f], [0x200b, 0x200f],
  [0x2028, 0x202e], [0x2060, 0x206f], [0xfeff, 0xfeff],
];
const INVISIBLE = new RegExp(
  `[${INVISIBLE_RANGES.map(([a, b]) => `${String.fromCharCode(a)}-${String.fromCharCode(b)}`).join("")}]`,
  "g",
);

export function normalizeGamerTag(raw: string): string {
  return raw.normalize("NFC").replace(INVISIBLE, "").replace(/\s+/g, " ").trim();
}

export function normalizeEmail(raw: string): string {
  return raw.normalize("NFC").trim().toLowerCase();
}

export function normalizeMobileLegendsId(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const value = raw.replace(INVISIBLE, "").replace(/\s+/g, "").trim();
  return value.length === 0 ? null : value;
}

export interface NewParticipant {
  readonly gamerTag: string;
  readonly email: string;
  readonly mobileLegendsId: string | null;
  readonly acceptedRules: true;
}

/** Reglas de dominio para un registro. La validación de formato ya ocurrió en el borde. */
export function createNewParticipant(input: {
  gamerTag: string;
  email: string;
  mobileLegendsId?: string | null;
  acceptedRules: boolean;
}): NewParticipant {
  const gamerTag = normalizeGamerTag(input.gamerTag);
  const email = normalizeEmail(input.email);
  const mobileLegendsId = normalizeMobileLegendsId(input.mobileLegendsId);

  if ([...gamerTag].length < GAMER_TAG_MIN || [...gamerTag].length > GAMER_TAG_MAX) {
    throw new DomainError("VALIDATION", `El Gamer Tag debe tener entre ${GAMER_TAG_MIN} y ${GAMER_TAG_MAX} caracteres.`);
  }
  if (email.length > EMAIL_MAX || !email.includes("@")) {
    throw new DomainError("VALIDATION", "El correo no es válido.");
  }
  if (mobileLegendsId !== null && mobileLegendsId.length > ML_ID_MAX) {
    throw new DomainError("VALIDATION", "El ID de Mobile Legends es demasiado largo.");
  }
  if (!input.acceptedRules) {
    throw new DomainError("VALIDATION", "Debes aceptar que tu Gamer Tag aparezca en el bracket.");
  }
  return { gamerTag, email, mobileLegendsId, acceptedRules: true };
}
