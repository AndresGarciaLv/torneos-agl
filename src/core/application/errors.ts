/** Errores de aplicación que no son reglas del torneo, sino de acceso y de entrada. */

export class RateLimitedError extends Error {
  constructor(readonly retryAfterSeconds: number) {
    super("Demasiados intentos. Espera un momento y vuelve a intentarlo.");
    this.name = "RateLimitedError";
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super("Contraseña incorrecta.");
    this.name = "InvalidCredentialsError";
  }
}

/** La entrada no cumple el contrato. Lleva el primer mensaje por campo. */
export class InputValidationError extends Error {
  constructor(readonly fields: Record<string, string>) {
    super("Revisa los campos marcados.");
    this.name = "InputValidationError";
  }
}

// Reconocidos por nombre por la misma razón que isDomainError: el módulo puede cargarse dos veces.
const named = (value: unknown, name: string): boolean => value instanceof Error && value.name === name;

export const isRateLimitedError = (v: unknown): v is RateLimitedError => v instanceof RateLimitedError || named(v, "RateLimitedError");
export const isInvalidCredentialsError = (v: unknown): v is InvalidCredentialsError =>
  v instanceof InvalidCredentialsError || named(v, "InvalidCredentialsError");
export const isInputValidationError = (v: unknown): v is InputValidationError =>
  v instanceof InputValidationError || named(v, "InputValidationError");
