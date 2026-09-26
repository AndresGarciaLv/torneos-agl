"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";

/**
 * POST a una ruta de administración y refresco del panel. Si la sesión expiró
 * (401), el refresco muestra el login otra vez.
 */
export function useAdminAction() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const run = useCallback(
    async (url: string, body: unknown, success?: (data: Record<string, unknown>) => string | null) => {
      setBusy(true);
      setError(null);
      setNotice(null);
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = (await res.json().catch(() => ({}))) as Record<string, unknown> & {
          error?: { message?: string; fields?: Record<string, string> };
        };
        if (!res.ok) {
          // Con errores por campo se muestran esos: "Revisa los campos marcados" no dice cuál.
          const fields = Object.values(data.error?.fields ?? {});
          setError(fields.length > 0 ? fields.join(" ") : (data.error?.message ?? "La acción falló."));
          if (res.status === 401) startTransition(() => router.refresh());
          return false;
        }
        setNotice(success?.(data) ?? null);
        startTransition(() => router.refresh());
        return true;
      } catch {
        setError("Sin conexión con el servidor.");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [router],
  );

  return { run, busy, error, notice, clear: () => (setError(null), setNotice(null)) };
}
