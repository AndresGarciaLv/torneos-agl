"use client";

import type { RafflePerson } from "@/core/application/use-cases/manage-raffle";

const SIZE = 600;
const R = SIZE / 2;
/** Claras con texto oscuro y oscuras con texto claro, alternadas. */
const LIGHT = ["#44e433", "#8ff584"] as const;
const DARK = ["#0b3d12", "#125c17"] as const;

function sliceStyle(i: number, n: number): { fill: string; text: string } {
  // Con cantidad impar la última quedaría pegada a la primera con el mismo tono: va dorada.
  if (n % 2 === 1 && i === n - 1 && n > 1) return { fill: "#f2be62", text: "#1a1203" };
  return i % 2 === 0 ? { fill: LIGHT[(i / 2) % 2]!, text: "#041203" } : { fill: DARK[((i - 1) / 2) % 2]!, text: "#e8f5e6" };
}
/** Con más nombres que esto las rebanadas son muy finas: se pintan sin texto. */
const MAX_LABELS = 60;

/**
 * Rueda en SVG. La rebanada i va de i·seg a (i+1)·seg en sentido horario desde
 * arriba, donde está el puntero. Solo gira: quién gana lo decide el servidor.
 */
export function Wheel({
  people,
  rotation,
  spinning,
  durationMs,
}: {
  people: readonly RafflePerson[];
  rotation: number;
  spinning: boolean;
  durationMs: number;
}) {
  const n = people.length;
  const seg = n > 0 ? 360 / n : 360;
  const fontSize = Math.max(10, Math.min(26, 520 / Math.max(n, 1)));

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[min(620px,58vh)]">
      {/* Puntero */}
      <div aria-hidden className="absolute left-1/2 top-[-6px] z-10 -translate-x-1/2">
        <svg width="44" height="52" viewBox="0 0 44 52">
          <path d="M22 50 L4 8 Q22 -4 40 8 Z" fill="#f2be62" stroke="#050706" strokeWidth="3" />
        </svg>
      </div>

      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="h-full w-full drop-shadow-[0_0_40px_rgba(68,228,51,0.25)]"
        role="img"
        aria-label={n === 0 ? "Ruleta vacía" : `Ruleta con ${n} participantes`}
      >
        <g
          style={{
            transform: `rotate(${rotation}deg)`,
            transformOrigin: "50% 50%",
            transition: spinning ? `transform ${durationMs}ms cubic-bezier(0.12, 0.72, 0.08, 1)` : "none",
          }}
        >
          <circle cx={R} cy={R} r={R - 4} fill="#0a0e0b" stroke="#44e433" strokeWidth="8" />
          {n === 1 && <circle cx={R} cy={R} r={R - 12} fill={LIGHT[0]} />}
          {n > 1 &&
            people.map((p, i) => {
              const a0 = ((i * seg - 90) * Math.PI) / 180;
              const a1 = (((i + 1) * seg - 90) * Math.PI) / 180;
              const r = R - 12;
              const large = seg > 180 ? 1 : 0;
              const d = `M${R},${R} L${R + r * Math.cos(a0)},${R + r * Math.sin(a0)} A${r},${r} 0 ${large} 1 ${R + r * Math.cos(a1)},${R + r * Math.sin(a1)} Z`;
              return <path key={p.user} d={d} fill={sliceStyle(i, n).fill} stroke="#050706" strokeWidth="2" />;
            })}
          {n > 0 &&
            n <= MAX_LABELS &&
            people.map((p, i) => {
              const mid = i * seg + seg / 2;
              const label = p.nickname.length > 16 ? `${p.nickname.slice(0, 15)}…` : p.nickname;
              return (
                <text
                  key={p.user}
                  x={R}
                  y={R}
                  transform={`rotate(${mid - 90} ${R} ${R}) translate(${R - 34} 0)`}
                  textAnchor="end"
                  dominantBaseline="central"
                  fontSize={n === 1 ? 32 : fontSize}
                  fontWeight={700}
                  fontFamily="var(--font-display), sans-serif"
                  fill={sliceStyle(i, n).text}
                >
                  {label}
                </text>
              );
            })}
        </g>
        <circle cx={R} cy={R} r={54} fill="#050706" stroke="#44e433" strokeWidth="6" />
        <text
          x={R}
          y={R}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="22"
          fontWeight={800}
          fontFamily="var(--font-display), sans-serif"
          fill="#44e433"
        >
          {n === 0 ? "…" : n}
        </text>
      </svg>
    </div>
  );
}

/**
 * Rotación final para que el puntero (arriba) caiga dentro de la rebanada
 * `index`, dando varias vueltas completas desde `current`.
 */
export function rotationFor(index: number, count: number, current: number, turns = 7): number {
  const seg = 360 / count;
  // Un punto al azar dentro de la rebanada, lejos de los bordes: solo es la animación.
  const target = index * seg + seg * (0.2 + Math.random() * 0.6);
  const base = current - (((current % 360) + 360) % 360);
  return base + turns * 360 + (360 - target);
}
