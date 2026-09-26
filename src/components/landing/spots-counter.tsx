import { cn } from "@/lib/utils";

/** Lugares libres del torneo: una barra con un segmento por lugar. Se pinta en el servidor. */
export function SpotsCounter({ taken, capacity, className }: { taken: number; capacity: number; className?: string }) {
  const left = Math.max(capacity - taken, 0);
  const full = left === 0;
  const low = !full && left <= 4;

  return (
    <div className={cn("flex w-full max-w-sm flex-col gap-2", className)}>
      <p className="flex items-baseline justify-between gap-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
        {full ? (
          <span className="font-display text-base font-bold text-gold">¡Lugares agotados!</span>
        ) : (
          <span>
            {left === 1 ? "Queda" : "Quedan"}{" "}
            <span className={cn("font-display text-2xl font-bold", low ? "text-gold" : "text-brand")}>{left}</span>{" "}
            {left === 1 ? "lugar" : "lugares"}
          </span>
        )}
        <span>
          {Math.min(taken, capacity)} / {capacity}
        </span>
      </p>
      <div
        role="meter"
        aria-label="Lugares ocupados"
        aria-valuemin={0}
        aria-valuemax={capacity}
        aria-valuenow={Math.min(taken, capacity)}
        aria-valuetext={full ? "Lugares agotados" : `Quedan ${left} de ${capacity} lugares`}
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${capacity}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: capacity }, (_, i) => (
          <span
            key={i}
            className={cn(
              "h-2 rounded-full",
              i < taken ? (full || low ? "bg-gold" : "bg-brand") : "bg-white/[0.08]",
            )}
          />
        ))}
      </div>
    </div>
  );
}
