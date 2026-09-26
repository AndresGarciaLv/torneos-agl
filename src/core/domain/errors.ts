/**
 * Errores de dominio. Cada uno lleva un código estable que la capa de entrega
 * traduce a HTTP; el mensaje está pensado para mostrarse tal cual al usuario.
 */
export type DomainErrorCode =
  | "VALIDATION"
  | "NOT_FOUND"
  | "REGISTRATION_CLOSED"
  | "DUPLICATE_EMAIL"
  | "DUPLICATE_GAMER_TAG"
  | "NOT_ENOUGH_PARTICIPANTS"
  | "INVALID_STATE"
  | "CONFIRMATION_REQUIRED"
  | "MATCH_NOT_READY"
  | "INVALID_WINNER"
  | "DOWNSTREAM_DECIDED";

export class DomainError extends Error {
  constructor(
    readonly code: DomainErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

/**
 * Se reconoce por nombre y código, no solo con instanceof: el bundler de Next
 * puede cargar este módulo dos veces (una por ruta) y entonces la clase con la
 * que se lanzó no es la misma con la que se compara.
 */
export const isDomainError = (value: unknown): value is DomainError =>
  value instanceof DomainError ||
  (value instanceof Error && value.name === "DomainError" && typeof (value as { code?: unknown }).code === "string");
