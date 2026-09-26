"use client";

import { KeyRound, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [, startTransition] = useTransition();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return setError("Escribe la contraseña.");
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        setPassword("");
        startTransition(() => router.refresh());
        return;
      }
      const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
      setError(body?.error?.message ?? "No se pudo iniciar sesión.");
    } catch {
      setError("Sin conexión con el servidor.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto mt-10 max-w-sm">
      <form onSubmit={onSubmit} className="surface flex flex-col gap-5 p-7">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex size-12 items-center justify-center rounded-full border border-brand/30 bg-brand/10">
            <KeyRound className="size-5 text-brand" aria-hidden />
          </span>
          <h1 className="text-3xl font-extrabold uppercase">Panel del torneo</h1>
          <p className="text-sm text-muted-foreground">Acceso exclusivo del canal.</p>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="admin-password">Contraseña</Label>
          <Input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={Boolean(error)}
            autoFocus
          />
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" aria-hidden />} Entrar
        </Button>
      </form>
    </div>
  );
}
