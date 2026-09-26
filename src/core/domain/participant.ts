import { DomainError } from "./errors";

export interface Participant {
  readonly id: string;
  readonly tournamentId: string;
  readonly gamerTag: string;
  /** El formulario ya no lo pide: solo lo tienen inscripciones anteriores o lo que el organizador anote. */
  readonly email: string | null;
  /** null solo en inscripciones anteriores a que el ID fuera obligatorio: el panel permite completarlo. */
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

/** Perfil de MLBB: «ID: 454928618 (5207)» = User ID y, entre paréntesis, Server ID. */
export const ML_USER_ID = /^\d{5,12}$/;
export const ML_SERVER_ID = /^\d{2,6}$/;
/** Lo que manda el formulario público: los dos números ya juntos. */
export const ML_FULL_ID = /^\d{5,12}\s*\(\d{2,6}\)$/;

export const formatMobileLegendsId = (userId: string, serverId: string): string => `${userId} (${serverId})`;

/** Separa «454928618 (5207)» (con o sin espacio) en sus dos números. null si no tiene esa forma. */
export function parseMobileLegendsId(raw: string | null | undefined): { userId: string; serverId: string } | null {
  const m = raw ? /^\s*(\d{5,12})\s*\(\s*(\d{2,6})\s*\)\s*$/.exec(raw) : null;
  return m ? { userId: m[1]!, serverId: m[2]! } : null;
}

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
  readonly email: string | null;
  /** Obligatorio: es a donde se mandan los premios si gana. */
  readonly mobileLegendsId: string;
  readonly acceptedRules: true;
}

/** Datos que el organizador puede corregir de un inscrito. */
export type ParticipantChanges = Pick<NewParticipant, "gamerTag" | "email" | "mobileLegendsId">;

function requireMobileLegendsId(raw: string | null | undefined): string {
  const id = normalizeMobileLegendsId(raw);
  if (id === null) throw new DomainError("VALIDATION", "El ID de Mobile Legends es obligatorio para enviar los premios.");
  if (id.length > ML_ID_MAX) throw new DomainError("VALIDATION", "El ID de Mobile Legends es demasiado largo.");
  return id;
}

/** Reglas de dominio para un registro. La validación de formato ya ocurrió en el borde. */
export function createNewParticipant(input: {
  gamerTag: string;
  mobileLegendsId?: string | null;
  acceptedRules: boolean;
}): NewParticipant {
  const gamerTag = normalizeGamerTag(input.gamerTag);
  const mobileLegendsId = requireMobileLegendsId(input.mobileLegendsId);

  if ([...gamerTag].length < GAMER_TAG_MIN || [...gamerTag].length > GAMER_TAG_MAX) {
    throw new DomainError("VALIDATION", `El nickname debe tener entre ${GAMER_TAG_MIN} y ${GAMER_TAG_MAX} caracteres.`);
  }
  if (!input.acceptedRules) {
    throw new DomainError("VALIDATION", "Debes aceptar que tu nickname aparezca en el bracket.");
  }
  return { gamerTag, email: null, mobileLegendsId, acceptedRules: true };
}

/**
 * Alta o corrección desde el panel: el organizador mete a alguien que se apuntó por
 * el chat o arregla un dato mal escrito. El correo es opcional; el Gamer Tag y el ID
 * siguen las mismas reglas que el formulario.
 */
export function createAdminParticipant(input: {
  gamerTag: string;
  email?: string | null;
  mobileLegendsId?: string | null;
}): NewParticipant {
  const gamerTag = normalizeGamerTag(input.gamerTag);
  const email = input.email ? normalizeEmail(input.email) : null;
  const mobileLegendsId = requireMobileLegendsId(input.mobileLegendsId);

  if ([...gamerTag].length < GAMER_TAG_MIN || [...gamerTag].length > GAMER_TAG_MAX) {
    throw new DomainError("VALIDATION", `El nickname debe tener entre ${GAMER_TAG_MIN} y ${GAMER_TAG_MAX} caracteres.`);
  }
  if (email !== null && (email.length > EMAIL_MAX || !email.includes("@"))) {
    throw new DomainError("VALIDATION", "El correo no es válido.");
  }
  // Quien lo da de alta es el organizador: la aceptación la dio de palabra en el directo.
  return { gamerTag, email, mobileLegendsId, acceptedRules: true };
}
