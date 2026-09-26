export const TOURNAMENT_STATUSES = ["registration", "bracket_ready", "live", "finished"] as const;
export type TournamentStatus = (typeof TOURNAMENT_STATUSES)[number];

export interface Tournament {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly startsAt: Date;
  /** A partir de este instante el formulario público deja de aceptar inscripciones. */
  readonly registrationClosesAt: Date;
  readonly status: TournamentStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export type RegistrationGate = "open" | "drawn" | "time_over" | "full";

/**
 * Por qué el formulario público acepta o no una inscripción. El panel no pasa por
 * aquí: el organizador puede dar de alta a alguien después de la hora, pero nunca
 * por encima del cupo.
 */
export function registrationGate(
  t: Pick<Tournament, "status" | "registrationClosesAt">,
  participantCount: number,
  capacity: number,
  now: Date,
): RegistrationGate {
  if (t.status !== "registration") return "drawn";
  if (participantCount >= capacity) return "full";
  if (now.getTime() >= t.registrationClosesAt.getTime()) return "time_over";
  return "open";
}

export const isRegistrationOpen = (t: Pick<Tournament, "status">): boolean => t.status === "registration";

export const hasBracket = (t: Pick<Tournament, "status">): boolean => t.status !== "registration";

export const STATUS_LABEL: Record<TournamentStatus, string> = {
  registration: "Inscripciones abiertas",
  bracket_ready: "Llaves sorteadas",
  live: "En juego",
  finished: "Finalizado",
};
