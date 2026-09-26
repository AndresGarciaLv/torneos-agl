"use client";

import { Crown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { TOP_DONORS, type Donor } from "@/core/domain/donors";
import { cn } from "@/lib/utils";

const PLACES = [
  { ring: "#f2be62", text: "text-gold", glow: "shadow-[0_0_24px_-6px_rgba(242,190,98,0.8)]" },
  { ring: "#d7dcd9", text: "text-silver", glow: "" },
  { ring: "#cd7f32", text: "text-[#e0a266]", glow: "" },
] as const;

/**
 * Top 3 de donadores para el stream. Recibe el ranking por SSE; EventSource
 * reconecta solo cuando el servidor cierra (cada ~5 min o si el live se corta).
 */
export function DonorsOverlay({ streamUrl }: { streamUrl: string }) {
  const [donors, setDonors] = useState<Donor[]>([]);
  const [bumped, setBumped] = useState<string | null>(null);
  const prev = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const es = new EventSource(streamUrl);
    es.addEventListener("board", (ev) => {
      const next = JSON.parse((ev as MessageEvent<string>).data) as Donor[];
      // Resalta a quien acaba de subir sus monedas.
      const up = next.find((d) => (prev.current.get(d.user) ?? 0) < d.coins && prev.current.size > 0);
      prev.current = new Map(next.map((d) => [d.user, d.coins]));
      setDonors(next);
      if (up) {
        setBumped(up.user);
        setTimeout(() => setBumped((b) => (b === up.user ? null : b)), 2500);
      }
    });
    return () => es.close();
  }, [streamUrl]);

  const slots = Array.from({ length: TOP_DONORS }, (_, i) => donors[i] ?? null);

  return (
    <div className="w-[380px] p-3 font-display">
      <div className="overflow-hidden rounded-2xl border border-brand/40 bg-[#050706]/85 shadow-[0_0_30px_-10px_rgba(68,228,51,0.6)] backdrop-blur-sm">
        <div className="flex items-center justify-center gap-2 border-b border-brand/25 bg-brand/10 px-4 py-2.5">
          <span aria-hidden className="text-xl">🪙</span>
          <p className="text-2xl font-extrabold uppercase tracking-wide text-white [text-shadow:0_2px_0_#000]">
            Top <span className="text-brand">Donadores</span>
          </p>
        </div>
        <ol className="flex flex-col gap-1.5 p-2.5">
          {slots.map((d, i) => {
            const place = PLACES[i]!;
            return (
              <li
                key={d?.user ?? `empty-${i}`}
                className={cn(
                  "flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.04] px-2.5 py-2 transition-all duration-500",
                  i === 0 && d && "border-gold/40 bg-gold/[0.08]",
                  i === 0 && d && place.glow,
                  bumped && d?.user === bumped && "scale-[1.03] border-brand bg-brand/15",
                )}
              >
                <span className={cn("w-6 text-center text-2xl font-extrabold", place.text)}>{i + 1}</span>
                <span className="relative shrink-0">
                  {i === 0 && d && (
                    <Crown aria-hidden className="absolute -top-3.5 left-1/2 size-5 -translate-x-1/2 fill-gold text-gold" />
                  )}
                  <Avatar donor={d} ring={place.ring} />
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block truncate text-xl font-bold leading-tight [text-shadow:0_1px_0_#000]",
                      d ? "text-white" : "text-white/40",
                    )}
                  >
                    {d ? d.nickname : i === 0 ? "¡Sé el primero!" : "—"}
                  </span>
                  {d && <span className="block truncate text-xs font-semibold text-white/50">@{d.user}</span>}
                </span>
                {d && (
                  <span className="flex shrink-0 items-center gap-1 text-xl font-extrabold text-gold [text-shadow:0_1px_0_#000]">
                    <span aria-hidden className="text-base">🪙</span>
                    {d.coins.toLocaleString("es-MX")}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

function Avatar({ donor, ring }: { donor: Donor | null; ring: string }) {
  const [broken, setBroken] = useState(false);
  const style = { boxShadow: `0 0 0 2px ${ring}` };
  if (!donor || !donor.avatarUrl || broken) {
    return (
      <span style={style} className="flex size-10 items-center justify-center rounded-full bg-brand-900 text-lg font-bold text-brand">
        {donor ? donor.nickname.slice(0, 1).toUpperCase() : "?"}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- avatar externo de TikTok, sin optimizar
    <img
      src={donor.avatarUrl}
      alt=""
      referrerPolicy="no-referrer"
      onError={() => setBroken(true)}
      style={style}
      className="size-10 rounded-full object-cover"
    />
  );
}
