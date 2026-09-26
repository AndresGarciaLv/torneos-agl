"use client";

import { Check, Loader2 } from "lucide-react";
import { useState } from "react";
import { BracketBoard, PlayerRow } from "@/components/bracket/bracket-board";
import type { PublicMatchView, RoundView } from "@/core/application/views";
import type { PublicPlayer } from "@/core/domain/participant";
import { cn } from "@/lib/utils";
import { useAdminAction } from "./use-admin-action";

export function AdminBracket({ rounds, champion }: { rounds: readonly RoundView[]; champion: PublicPlayer | null }) {
  const { run, busy, error, notice } = useAdminAction();
  const [pending, setPending] = useState<string | null>(null);

  async function choose(match: PublicMatchView, player: PublicPlayer) {
    if (busy || match.winnerId === player.id) return;
    setPending(`${match.id}:${player.id}`);
    await run("/api/admin/match", { matchId: match.id, winnerId: player.id }, (d) =>
      d.championDecided ? `¡${player.gamerTag} es el campeón!` : `${player.gamerTag} avanza.`,
    );
    setPending(null);
  }

  return (
    <div className="flex flex-col gap-3">
      {(error || notice) && (
        <p
          role={error ? "alert" : "status"}
          className={cn(
            "rounded-md border px-4 py-2.5 text-sm",
            error ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-brand/25 bg-brand/[0.07] text-brand-300",
          )}
        >
          {error ?? notice}
        </p>
      )}
      <BracketBoard
        rounds={rounds}
        champion={champion}
        renderMatch={(m) => <AdminMatchCard match={m} onChoose={choose} pendingKey={pending} disabled={busy} />}
      />
    </div>
  );
}

function AdminMatchCard({
  match,
  onChoose,
  pendingKey,
  disabled,
}: {
  match: PublicMatchView;
  onChoose: (m: PublicMatchView, p: PublicPlayer) => void;
  pendingKey: string | null;
  disabled: boolean;
}) {
  const playable = !match.isBye && match.player1 !== null && match.player2 !== null;
  const decided = match.winnerId !== null && !match.isBye;

  const row = (player: PublicPlayer | null) => {
    const isWinner = decided && player !== null && match.winnerId === player.id;
    const content = (
      <PlayerRow
        player={player}
        isWinner={isWinner}
        isLoser={decided && !isWinner}
        isByeSlot={match.isBye && player === null}
        trailing={
          player && pendingKey === `${match.id}:${player.id}` ? (
            <Loader2 className="size-4 animate-spin text-brand" aria-hidden />
          ) : isWinner ? (
            <Check className="size-4 text-brand" aria-label="Ganador" />
          ) : playable ? (
            <span className="font-display text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/70 transition-colors group-hover:text-brand sm:text-transparent sm:group-hover:text-brand">
              {/* Con el encuentro decidido, tocar al otro jugador corrige el resultado: no "ganó". */}
              {decided ? "Corregir" : "Ganó"}
            </span>
          ) : undefined
        }
      />
    );
    if (!playable || !player) return content;
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChoose(match, player)}
        aria-pressed={isWinner}
        aria-label={`Marcar a ${player.gamerTag} como ganador`}
        className="group block w-full text-left outline-none transition-colors hover:bg-white/[0.04] focus-visible:bg-brand/10 disabled:cursor-wait"
      >
        {content}
      </button>
    );
  };

  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-lg border bg-[#0a0e0b] transition-colors duration-500",
        playable && !decided ? "border-brand/35" : "border-white/[0.09]",
        match.isFinal && "border-gold/30",
        match.isBye && "opacity-60",
      )}
    >
      {row(match.player1)}
      <div className="h-px bg-white/[0.06]" />
      {row(match.player2)}
    </div>
  );
}
