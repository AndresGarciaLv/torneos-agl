import type { PublicMatchView } from "@/core/application/views";
import { cn } from "@/lib/utils";
import { PlayerRow } from "./bracket-board";

export function PublicMatchCard({ match }: { match: PublicMatchView }) {
  const decided = match.winnerId !== null && !match.isBye;
  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-lg border bg-[#0a0e0b]/90 transition-colors duration-500",
        match.isFinal ? "border-gold/25" : "border-white/[0.09]",
        match.isBye && "opacity-70",
      )}
    >
      <PlayerRow
        player={match.player1}
        isWinner={decided && match.winnerId === match.player1?.id}
        isLoser={decided && match.winnerId !== match.player1?.id}
        isByeSlot={match.isBye && match.player1 === null}
      />
      <div className="h-px bg-white/[0.06]" />
      <PlayerRow
        player={match.player2}
        isWinner={decided && match.winnerId === match.player2?.id}
        isLoser={decided && match.winnerId !== match.player2?.id}
        isByeSlot={match.isBye && match.player2 === null}
      />
    </div>
  );
}
