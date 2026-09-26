"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

/** Copia un número al portapapeles: el organizador lo pega en la tienda de diamantes. */
export function CopyButton({ value, label, className }: { value: string; label: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Sin permiso de portapapeles: el número sigue visible para copiarlo a mano.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? `${label} copiado` : `Copiar ${label}`}
      title={copied ? "Copiado" : "Copiar"}
      className={cn(
        "inline-flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground",
        className,
      )}
    >
      {copied ? <Check className="size-3.5 text-brand" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
    </button>
  );
}
