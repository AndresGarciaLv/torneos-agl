"use client";

import { Coins, Loader2, RotateCcw } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "./copy-button";

/** Enlace del overlay de donadores para LIVE Studio y reinicio del ranking. */
export function DonorsCard({ overlayUrl }: { overlayUrl: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function reset() {
    if (!window.confirm("¿Reiniciar el top de donadores? Empieza de cero desde ahora.")) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/donors", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      });
      setMessage(res.ok ? "Ranking reiniciado." : "No se pudo reiniciar.");
    } catch {
      setMessage("Sin conexión con el servidor.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="surface flex flex-col gap-3 p-5">
      <h2 className="flex items-center gap-2 font-display text-xl font-bold uppercase">
        <Coins className="size-5 text-gold" aria-hidden /> Overlay: Top donadores
      </h2>
      <p className="text-sm text-muted-foreground">
        Cuenta solo regalos reales (monedas × cantidad) y los acumula: nadie sale del top aunque deje el live. Pégalo en TikTok
        LIVE Studio como fuente <strong className="text-foreground">Enlace</strong> (unos 400 × 300).
      </p>
      <div className="flex items-center gap-2 rounded-md border border-white/[0.08] bg-black/30 px-3 py-2">
        <code className="min-w-0 flex-1 truncate text-xs text-brand-300">{overlayUrl}</code>
        <CopyButton value={overlayUrl} label="enlace del overlay" />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" asChild>
          <a href={overlayUrl} target="_blank" rel="noopener noreferrer">
            Ver overlay
          </a>
        </Button>
        <Button variant="ghost" size="sm" onClick={reset} disabled={busy}>
          {busy ? <Loader2 className="animate-spin" aria-hidden /> : <RotateCcw aria-hidden />} Reiniciar ranking
        </Button>
        {message && <span className="text-xs text-muted-foreground">{message}</span>}
      </div>
    </section>
  );
}
