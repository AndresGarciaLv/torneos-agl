import { DomainError } from "./errors";

/**
 * Ruleta del live: entran quienes comentan la palabra clave mientras la ruleta
 * escucha el chat. TikTok no publica la lista de espectadores, así que comentar
 * es la forma de demostrar que estás viendo el directo en ese momento.
 */
export interface Raffle {
  readonly id: string;
  readonly keyword: string;
  readonly prize: string;
  readonly createdAt: Date;
}

export interface RaffleEntry {
  /** Usuario de TikTok en minúsculas (el @ sin la arroba). Identifica a la persona: una entrada por usuario. */
  readonly tiktokUser: string;
  /** Nombre visible en el live. */
  readonly nickname: string;
  readonly createdAt: Date;
}

export const RAFFLE_KEYWORD_MAX = 30;
export const RAFFLE_PRIZE_MAX = 80;
export const RAFFLE_NICKNAME_MAX = 60;

/** Minúsculas y sin acentos: «Mónster» y «MONSTER» cuentan igual. */
export function normalizeText(raw: string): string {
  return raw.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

export function normalizeKeyword(raw: string): string {
  const keyword = normalizeText(raw).replace(/\s+/g, " ");
  if (keyword.length === 0) throw new DomainError("VALIDATION", "Escribe la palabra clave.");
  if (keyword.length > RAFFLE_KEYWORD_MAX) throw new DomainError("VALIDATION", "La palabra clave es demasiado larga.");
  return keyword;
}

/**
 * ¿El comentario trae la palabra clave? Tiene que aparecer como palabra completa:
 * con «monster», «MONSTER!!» y «vamos monster» entran; «monsters» no.
 */
export function commentMatchesKeyword(comment: string, keyword: string): boolean {
  const words = ` ${normalizeText(comment).replace(/[^\p{L}\p{N}]+/gu, " ").trim()} `;
  const target = normalizeKeyword(keyword).replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  return target.length > 0 && words.includes(` ${target} `);
}

/** «@Juan_MX» → «juan_mx». Así se guarda el usuario para no repetir entradas. */
export function normalizeTiktokUser(raw: string): string {
  return raw.trim().replace(/^@/, "").toLowerCase();
}

/**
 * Quién puede ganar en este giro: los inscritos que todavía no ganaron.
 * Orden de llegada, que es el mismo orden en que se pintan en la rueda.
 */
export function eligibleEntries(entries: readonly RaffleEntry[], winners: ReadonlySet<string>): RaffleEntry[] {
  return entries.filter((e) => !winners.has(e.tiktokUser));
}
