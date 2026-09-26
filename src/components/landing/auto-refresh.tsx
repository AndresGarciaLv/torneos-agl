"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Durante el torneo, vuelve a pedir los Server Components cada `seconds` para
 * que el bracket se actualice solo. No hidrata el bracket: solo re-renderiza en
 * el servidor. Se pausa con la pestaña oculta para no gastar datos en el móvil.
 */
export function AutoRefresh({ seconds = 20 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (timer === null) timer = setInterval(() => router.refresh(), seconds * 1000);
    };
    const stop = () => {
      if (timer !== null) clearInterval(timer);
      timer = null;
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        router.refresh();
        start();
      } else {
        stop();
      }
    };
    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [router, seconds]);
  return null;
}
