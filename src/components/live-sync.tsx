"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Tiempo real sin WebSockets: pregunta la huella del torneo cada `seconds` y, si
 * cambió (alguien se inscribió, se sorteó el cuadro, avanzó un ganador), vuelve a
 * pedir los Server Components. router.refresh() conserva lo que el usuario está
 * escribiendo en el formulario. Con la pestaña oculta no consulta nada.
 */
export function LiveSync({ seconds = 3 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    let last: string | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;

    async function tick() {
      timer = null;
      if (stopped || document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/tournament/version", { cache: "no-store" });
        if (res.ok) {
          const { v } = (await res.json()) as { v: string };
          if (last !== null && v !== last) router.refresh();
          last = v;
        }
      } catch {
        // Sin red: se reintenta en el siguiente ciclo.
      }
      if (!stopped) timer = setTimeout(tick, seconds * 1000);
    }

    const onVisibility = () => {
      if (document.visibilityState === "visible" && timer === null) void tick();
    };
    void tick();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stopped = true;
      if (timer !== null) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [router, seconds]);
  return null;
}
