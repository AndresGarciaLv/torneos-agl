export const TOURNAMENT_STATUSES = ["registration", "bracket_ready", "live", "finished"] as const;
export type TournamentStatus = (typeof TOURNAMENT_STATUSES)[number];

export interface Tournament {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly startsAt: Date;
  readonly status: TournamentStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export const isRegistrationOpen = (t: Pick<Tournament, "status">): boolean => t.status === "registration";

export const hasBracket = (t: Pick<Tournament, "status">): boolean => t.status !== "registration";

export const STATUS_LABEL: Record<TournamentStatus, string> = {
  registration: "Inscripciones abiertas",
  bracket_ready: "Llaves sorteadas",
  live: "En juego",
  finished: "Finalizado",
};
