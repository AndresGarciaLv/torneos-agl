import { ChevronsRight, Crown, Shuffle } from "lucide-react";
import { BracketBoard } from "@/components/bracket/bracket-board";
import { PublicMatchCard } from "@/components/bracket/public-match-card";
import type { PublicTournamentView } from "@/core/application/views";
import { SectionHeading } from "./section-heading";

export function BracketSection({ view }: { view: PublicTournamentView | null }) {
  const hasBracket = view !== null && view.rounds.length > 0;
  return (
    <section id="bracket" className="scroll-mt-20 border-t border-white/[0.05] px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <SectionHeading eyebrow="Llaves del torneo" title="Bracket 1 vs 1" />

        {view?.champion && (
          <div className="mx-auto mt-10 flex max-w-md flex-col items-center gap-2 rounded-xl border border-gold/35 bg-gradient-to-b from-gold/[0.1] to-transparent px-6 py-7 text-center shadow-glow-gold motion-safe:animate-rise">
            <Crown className="size-8 text-gold" aria-hidden />
            <p className="font-display text-xs font-semibold uppercase tracking-[0.3em] text-gold">Campeón del 1 vs 1</p>
            <p className="max-w-full truncate font-display text-4xl font-extrabold uppercase">{view.champion.gamerTag}</p>
          </div>
        )}

        {hasBracket ? (
          <div className="mt-12">
            <p className="mb-3 flex items-center gap-1 text-xs uppercase tracking-[0.18em] text-muted-foreground sm:hidden">
              Desliza para ver todas las rondas <ChevronsRight className="size-3.5" aria-hidden />
            </p>
            <BracketBoard
              rounds={view.rounds}
              champion={view.champion}
              renderMatch={(m) => <PublicMatchCard match={m} />}
            />
          </div>
        ) : (
          <div className="surface mx-auto mt-12 flex max-w-lg flex-col items-center gap-3 px-6 py-12 text-center">
            <Shuffle className="size-7 text-brand" aria-hidden />
            <h3 className="text-2xl font-extrabold uppercase">El sorteo todavía no se hace</h3>
            <p className="text-muted-foreground">
              Las llaves se sortean al cerrar inscripciones y aparecen aquí al instante.
              {view && view.participantCount > 0 && (
                <>
                  {" "}
                  Por ahora van{" "}
                  <span className="font-semibold text-foreground">
                    {view.participantCount} {view.participantCount === 1 ? "inscrito" : "inscritos"}
                  </span>
                  .
                </>
              )}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
