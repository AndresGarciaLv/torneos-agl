import { Crown } from "lucide-react";
import type * as React from "react";
import type { PublicMatchView, RoundView } from "@/core/application/views";
import type { PublicPlayer } from "@/core/domain/participant";
import { cn } from "@/lib/utils";

/**
 * Esqueleto del cuadro, sin estado y sin "use client": lo usan la landing
 * (Server Component) y el panel (Client Component), cada uno con su tarjeta.
 *
 * Geometría: todas las columnas comparten alto; cada par de encuentros ocupa la
 * misma fracción que el encuentro al que alimenta en la ronda siguiente. Así los
 * centros coinciden y los conectores son solo bordes CSS, sin medir nada en JS.
 */
export function BracketBoard({
  rounds,
  champion,
  renderMatch,
  className,
}: {
  rounds: readonly RoundView[];
  champion: PublicPlayer | null;
  renderMatch: (match: PublicMatchView) => React.ReactNode;
  className?: string;
}) {
  const last = rounds.length - 1;
  return (
    <div
      className={cn("scrollbar-thin -mx-4 snap-x snap-proximity overflow-x-auto overscroll-x-contain px-4 pb-4 sm:mx-0 sm:px-0", className)}
      role="region"
      aria-label="Bracket del torneo"
      tabIndex={0}
    >
      <div className="flex min-w-max">
        {rounds.map((round, idx) => (
          <div
            key={round.round}
            className={cn(
              "flex w-[228px] snap-start flex-col motion-safe:animate-rise sm:w-[248px]",
              idx > 0 && "pl-3",
              idx < last && "pr-3",
            )}
            style={{ animationDelay: `${idx * 70}ms` }}
          >
            <RoundHeader name={round.name} count={round.matches.length} />
            <ol className="flex flex-1 flex-col">
              {pairs(round.matches).map((pair) => (
                <li key={pair[0]?.id} className="relative flex flex-1 flex-col">
                  {pair.map((m) => (
                    <div
                      key={m.id}
                      className={cn(
                        "relative flex flex-1 items-center py-2",
                        idx > 0 && "before:absolute before:-left-3 before:top-1/2 before:w-3 before:border-t before:border-white/15",
                      )}
                    >
                      {renderMatch(m)}
                    </div>
                  ))}
                  {idx < last && pair.length === 2 && (
                    <span
                      aria-hidden
                      className="absolute bottom-1/4 right-[-12px] top-1/4 w-3 rounded-r-sm border-y border-r border-white/15"
                    />
                  )}
                </li>
              ))}
            </ol>
          </div>
        ))}

        <div className="flex w-[200px] snap-start flex-col pl-6">
          <RoundHeader name="Campeón" gold />
          <div className="relative flex flex-1 items-center before:absolute before:-left-6 before:top-1/2 before:w-6 before:border-t before:border-white/15">
            <ChampionCard champion={champion} />
          </div>
        </div>
      </div>
    </div>
  );
}

function pairs<T>(items: readonly T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += 2) out.push(items.slice(i, i + 2));
  return out;
}

function RoundHeader({ name, count, gold }: { name: string; count?: number; gold?: boolean }) {
  return (
    <div className="mb-3 flex h-10 items-end justify-between border-b border-white/[0.07] pb-2">
      <h3 className={cn("text-lg font-bold uppercase tracking-wider", gold ? "text-gold" : "text-foreground")}>{name}</h3>
      {count !== undefined && (
        <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          {count} {count === 1 ? "encuentro" : "encuentros"}
        </span>
      )}
    </div>
  );
}

function ChampionCard({ champion }: { champion: PublicPlayer | null }) {
  return (
    <div
      className={cn(
        "w-full rounded-lg border p-4 text-center transition-colors duration-500",
        champion ? "border-gold/40 bg-gold/[0.08] shadow-glow-gold" : "border-dashed border-white/12 bg-white/[0.015]",
      )}
    >
      <Crown className={cn("mx-auto size-6", champion ? "text-gold" : "text-white/20")} aria-hidden />
      <p
        className={cn(
          "mt-2 truncate font-display text-xl font-bold uppercase",
          champion ? "text-foreground" : "text-muted-foreground/60",
        )}
        title={champion?.gamerTag}
      >
        {champion?.gamerTag ?? "Por definir"}
      </p>
    </div>
  );
}

/** Una fila de jugador dentro de una tarjeta de encuentro. */
export function PlayerRow({
  player,
  isWinner,
  isLoser,
  isByeSlot,
  trailing,
}: {
  player: PublicPlayer | null;
  isWinner: boolean;
  isLoser: boolean;
  isByeSlot: boolean;
  trailing?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative flex h-10 items-center justify-between gap-2 px-3 transition-colors duration-500",
        isWinner && "bg-brand/[0.11] text-brand-300",
        isLoser && "text-muted-foreground/55",
      )}
    >
      {isWinner && <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-brand" />}
      {player ? (
        <span className={cn("truncate text-sm", isWinner ? "font-semibold" : "font-medium")} title={player.gamerTag}>
          {player.gamerTag}
        </span>
      ) : isByeSlot ? (
        <span className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/60">BYE</span>
      ) : (
        <span className="text-sm italic text-muted-foreground/50">Por definir</span>
      )}
      {trailing}
      {isWinner && !trailing && (
        <span className="font-display text-[10px] font-bold uppercase tracking-[0.18em] text-brand">
          <span className="sr-only">Ganador: </span>Avanza
        </span>
      )}
    </div>
  );
}
