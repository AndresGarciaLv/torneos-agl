import { DomainError } from "../../domain/errors";
import type { Repositories } from "../../ports/repositories";
import type { Cache } from "../../ports/services";
import { cacheKeys, PUBLIC_TOURNAMENT_TTL_SECONDS } from "../tournament-cache";
import { buildPublicView, type PublicTournamentView } from "../views";

/**
 * Cache-aside: Redis primero, PostgreSQL si no está o si Redis no responde.
 * La caché solo guarda la vista pública, que no tiene correos.
 */
export class GetPublicTournament {
  constructor(
    private readonly repos: Repositories,
    private readonly cache: Cache,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(slug: string): Promise<PublicTournamentView> {
    const key = cacheKeys.tournament(slug);
    const cached = await this.cache.getJson<PublicTournamentView>(key);
    if (cached) return cached;

    const tournament = await this.repos.tournaments.findBySlug(slug);
    if (!tournament) throw new DomainError("NOT_FOUND", "El torneo no existe.");

    const [participantCount, matches, players] = await Promise.all([
      this.repos.participants.count(tournament.id),
      this.repos.matches.list(tournament.id),
      this.repos.participants.listPublic(tournament.id),
    ]);
    const view = buildPublicView(tournament, participantCount, matches, players, this.now());

    await this.cache.setJson(key, view, PUBLIC_TOURNAMENT_TTL_SECONDS);
    return view;
  }
}
