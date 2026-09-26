/**
 * Vistas que salen del núcleo. La pública es la que se cachea en Redis y se
 * sirve en /api/tournament: por construcción no tiene ningún campo de correo.
 */
import { championId, countPlayable, currentRound, roundCountOf, roundName } from "../domain/bracket";
import { isBye, type Match } from "../domain/match";
import type { Participant, PublicPlayer } from "../domain/participant";
import type { Tournament, TournamentStatus } from "../domain/tournament";

export interface PublicMatchView {
  readonly id: string;
  readonly round: number;
  readonly position: number;
  readonly player1: PublicPlayer | null;
  readonly player2: PublicPlayer | null;
  readonly winnerId: string | null;
  readonly isBye: boolean;
  readonly isFinal: boolean;
}

export interface RoundView {
  readonly round: number;
  readonly name: string;
  readonly matches: readonly PublicMatchView[];
}

export interface PublicTournamentView {
  readonly slug: string;
  readonly name: string;
  readonly startsAt: string;
  readonly status: TournamentStatus;
  readonly participantCount: number;
  readonly rounds: readonly RoundView[];
  readonly currentRound: number | null;
  readonly champion: PublicPlayer | null;
  readonly generatedAt: string;
}

export interface AdminParticipantView {
  readonly id: string;
  readonly gamerTag: string;
  readonly email: string;
  readonly mobileLegendsId: string | null;
  readonly createdAt: string;
}

export interface AdminDashboardView {
  readonly tournament: PublicTournamentView;
  readonly participants: readonly AdminParticipantView[];
  readonly matchesDecided: number;
  readonly matchesTotal: number;
}

export function buildRounds(matches: readonly Match[], players: readonly PublicPlayer[]): RoundView[] {
  const byId = new Map(players.map((p) => [p.id, p] as const));
  const lookup = (id: string | null): PublicPlayer | null => {
    if (id === null) return null;
    const p = byId.get(id);
    return p ? { id: p.id, gamerTag: p.gamerTag } : null;
  };
  const total = roundCountOf(matches);
  const rounds: RoundView[] = [];
  for (let r = 1; r <= total; r++) {
    const inRound = matches
      .filter((m) => m.round === r)
      .sort((a, b) => a.position - b.position)
      .map<PublicMatchView>((m) => ({
        id: m.id,
        round: m.round,
        position: m.position,
        player1: lookup(m.player1Id),
        player2: lookup(m.player2Id),
        winnerId: m.winnerId,
        isBye: isBye(m),
        isFinal: m.nextMatchId === null,
      }));
    rounds.push({ round: r, name: roundName(r, total), matches: inRound });
  }
  return rounds;
}

export function buildPublicView(
  tournament: Tournament,
  participantCount: number,
  matches: readonly Match[],
  players: readonly PublicPlayer[],
  now: Date,
): PublicTournamentView {
  const champId = championId(matches);
  const champ = champId ? players.find((p) => p.id === champId) : undefined;
  return {
    slug: tournament.slug,
    name: tournament.name,
    startsAt: tournament.startsAt.toISOString(),
    status: tournament.status,
    participantCount,
    rounds: buildRounds(matches, players),
    currentRound: currentRound(matches),
    champion: champ ? { id: champ.id, gamerTag: champ.gamerTag } : null,
    generatedAt: now.toISOString(),
  };
}

export function buildAdminDashboard(
  tournament: Tournament,
  participants: readonly Participant[],
  matches: readonly Match[],
  now: Date,
): AdminDashboardView {
  const players = participants.map((p) => ({ id: p.id, gamerTag: p.gamerTag }));
  const { decided, total } = countPlayable(matches);
  return {
    tournament: buildPublicView(tournament, participants.length, matches, players, now),
    participants: participants.map((p) => ({
      id: p.id,
      gamerTag: p.gamerTag,
      email: p.email,
      mobileLegendsId: p.mobileLegendsId,
      createdAt: p.createdAt.toISOString(),
    })),
    matchesDecided: decided,
    matchesTotal: total,
  };
}
