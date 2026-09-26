import { AutoRefresh } from "@/components/landing/auto-refresh";
import { BracketSection } from "@/components/landing/bracket-section";
import { Hero } from "@/components/landing/hero";
import { HeroRoster } from "@/components/landing/hero-roster";
import { HowItWorks } from "@/components/landing/how-it-works";
import { LiveBanner } from "@/components/landing/live-banner";
import { Prizes } from "@/components/landing/prizes";
import { RegistrationSection } from "@/components/landing/registration-section";
import { Rules } from "@/components/landing/rules";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import type { PublicTournamentView } from "@/core/application/views";
import { tournamentSlug } from "@/infrastructure/config/env";
import { container } from "@/infrastructure/container";

// El estado del torneo cambia en vivo: la página se arma en cada petición (Redis la hace barata).
export const dynamic = "force-dynamic";

async function loadTournament(): Promise<PublicTournamentView | null> {
  try {
    return await container().getPublicTournament.execute(tournamentSlug());
  } catch (error) {
    // La promoción se sigue viendo aunque la base no responda; solo faltan el formulario y el cuadro.
    console.error(JSON.stringify({ level: "error", event: "landing.tournament_unavailable", name: (error as Error)?.name ?? null }));
    return null;
  }
}

/** La página se arma en cada petición: con la hora del servidor basta para cerrar el formulario. */
function acceptsRegistrations(view: PublicTournamentView | null): boolean {
  return view !== null && view.status === "registration" && Date.now() < new Date(view.registrationClosesAt).getTime();
}

export default async function HomePage() {
  const view = await loadTournament();
  const liveUpdates = view?.status === "bracket_ready" || view?.status === "live";
  const spots = view ? { taken: view.participantCount, capacity: view.capacity } : null;
  const full = spots !== null && spots.taken >= spots.capacity;
  // Con los 16 lugares ocupados el formulario se cierra aunque siga corriendo el plazo.
  const registrationOpen = acceptsRegistrations(view) && !full;
  return (
    <>
      <SiteHeader />
      <main>
        <Hero
          status={view?.status ?? null}
          participantCount={view?.participantCount ?? null}
          schedule={view ? { startsAt: view.startsAt, registrationClosesAt: view.registrationClosesAt } : null}
          registrationOpen={registrationOpen}
          spots={view?.status === "registration" ? spots : null}
        />
        <Prizes />
        <HeroRoster />
        <HowItWorks />
        <Rules />
        <RegistrationSection status={view?.status ?? null} open={registrationOpen} spots={spots} />
        <BracketSection view={view} />
        <LiveBanner />
      </main>
      <SiteFooter />
      {liveUpdates && <AutoRefresh seconds={20} />}
    </>
  );
}
