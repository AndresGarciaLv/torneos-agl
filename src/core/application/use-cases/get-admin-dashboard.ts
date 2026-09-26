import { DomainError } from "../../domain/errors";
import type { Repositories } from "../../ports/repositories";
import { buildAdminDashboard, type AdminDashboardView } from "../views";

/** El panel lee siempre de PostgreSQL: quien administra necesita el estado real, no uno de hace 30 s. */
export class GetAdminDashboard {
  constructor(
    private readonly repos: Repositories,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(slug: string): Promise<AdminDashboardView> {
    const tournament = await this.repos.tournaments.findBySlug(slug);
    if (!tournament) throw new DomainError("NOT_FOUND", "El torneo no existe.");
    const [participants, matches] = await Promise.all([
      this.repos.participants.listForAdmin(tournament.id),
      this.repos.matches.list(tournament.id),
    ]);
    return buildAdminDashboard(tournament, participants, matches, this.now());
  }
}
