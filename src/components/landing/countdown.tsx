"use client";

import { useSyncExternalStore } from "react";

const UNITS = [
  { label: "Días", ms: 86_400_000 },
  { label: "Horas", ms: 3_600_000 },
  { label: "Min", ms: 60_000 },
  { label: "Seg", ms: 1_000 },
] as const;

function split(remaining: number): number[] {
  let rest = Math.max(0, remaining);
  return UNITS.map(({ ms }) => {
    const n = Math.floor(rest / ms);
    rest -= n * ms;
    return n;
  });
}

// Reloj compartido con resolución de segundos: el mismo valor dentro de un segundo evita renders de más.
const subscribe = (tick: () => void) => {
  const timer = setInterval(tick, 1000);
  return () => clearInterval(timer);
};
const nowSeconds = () => Math.floor(Date.now() / 1000) * 1000;
const noClockOnServer = () => null;

/**
 * Cuenta regresiva al arranque del torneo. La hora sale de PostgreSQL; el reloj es el
 * del navegador. Hasta montar se pintan guiones: el servidor y el cliente no comparten
 * el mismo segundo y un número distinto rompería la hidratación.
 */
export function Countdown({ startsAt, registrationOpen }: { startsAt: string; registrationOpen: boolean }) {
  const now = useSyncExternalStore<number | null>(subscribe, nowSeconds, noClockOnServer);

  const target = new Date(startsAt).getTime();
  const started = now !== null && now >= target;
  const parts = now === null ? null : split(target - now);

  return (
    <div className="flex flex-col items-center gap-2 lg:items-start">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        {started ? "El torneo ya empezó" : "El torneo empieza en"}
      </p>
      {!started && (
        <ol className="flex gap-2" aria-label="Tiempo para el arranque del torneo">
          {UNITS.map(({ label }, i) => (
            <li key={label} className="surface flex min-w-16 flex-col items-center px-3 py-2">
              <span className="font-display text-3xl font-bold tabular-nums leading-none text-brand sm:text-4xl">
                {parts ? String(parts[i]).padStart(2, "0") : "--"}
              </span>
              <span className="mt-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
            </li>
          ))}
        </ol>
      )}
      <p className="text-xs text-muted-foreground">
        {registrationOpen ? "Inscripciones abiertas." : "Las inscripciones ya cerraron."}
      </p>
    </div>
  );
}
