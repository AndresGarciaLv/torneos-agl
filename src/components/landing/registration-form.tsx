"use client";

import { CheckCircle2, Loader2, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fieldErrors, registrationSchema } from "@/core/application/schemas";
import { site } from "@/lib/site";
import { TikTokIcon } from "./tiktok-icon";

type Errors = Partial<Record<"gamerTag" | "email" | "mobileLegendsId" | "acceptedRules" | "form", string>>;

export function RegistrationForm() {
  const router = useRouter();
  const ids = { tag: useId(), email: useId(), ml: useId(), rules: useId() };
  const [values, setValues] = useState({ gamerTag: "", email: "", mobileLegendsId: "", website: "" });
  const [accepted, setAccepted] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ gamerTag: string; emailSent: boolean; email: string } | null>(null);
  const [, startTransition] = useTransition();

  const set = (field: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues((v) => ({ ...v, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: undefined, form: undefined }));
  };

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const payload = { ...values, acceptedRules: accepted };
    // Validación local solo para feedback inmediato. El servidor vuelve a validar todo.
    const local = registrationSchema.safeParse(payload);
    if (!local.success) {
      setErrors(fieldErrors(local.error));
      return;
    }
    setSubmitting(true);
    setErrors({});
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await res.json().catch(() => null)) as
        | { ok: true; gamerTag: string; confirmationEmailSent: boolean }
        | { error: { code: string; message: string; fields?: Record<string, string> } }
        | null;
      if (res.ok && body && "ok" in body) {
        setDone({ gamerTag: body.gamerTag, emailSent: body.confirmationEmailSent, email: values.email.trim() });
        startTransition(() => router.refresh());
        return;
      }
      const err = body && "error" in body ? body.error : null;
      setErrors({ ...(err?.fields ?? {}), form: err?.fields ? undefined : (err?.message ?? "No pudimos inscribirte. Intenta de nuevo.") });
    } catch {
      setErrors({ form: "Sin conexión. Revisa tu internet e intenta de nuevo." });
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div role="status" className="flex flex-col items-center gap-4 py-6 text-center motion-safe:animate-rise">
        <span className="flex size-14 items-center justify-center rounded-full border border-brand/40 bg-brand/10">
          <CheckCircle2 className="size-7 text-brand" aria-hidden />
        </span>
        <h3 className="text-3xl font-extrabold uppercase">¡Ya estás dentro!</h3>
        <p className="max-w-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{done.gamerTag}</span>, tu lugar está guardado. El sorteo se hace
          antes del torneo y tu nombre aparecerá en el bracket.
        </p>
        {done.emailSent && (
          <p className="flex max-w-sm items-center gap-2 rounded-md border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-muted-foreground">
            <Mail className="size-4 shrink-0 text-brand" aria-hidden />
            <span>
              Te enviamos la confirmación a <span className="text-foreground">{done.email}</span>. Si no la ves, revisa spam.
            </span>
          </p>
        )}
        <Button asChild variant="outline">
          <a href={site.tiktokUrl} target="_blank" rel="noopener noreferrer">
            <TikTokIcon /> Sigue a {site.handle}
          </a>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor={ids.tag}>
          Gamer Tag <span className="text-brand">*</span>
        </Label>
        <Input
          id={ids.tag}
          name="gamerTag"
          autoComplete="nickname"
          maxLength={40}
          placeholder="Como te conocen en la arena"
          value={values.gamerTag}
          onChange={set("gamerTag")}
          aria-invalid={Boolean(errors.gamerTag)}
          aria-describedby={errors.gamerTag ? `${ids.tag}-err` : undefined}
          required
        />
        <FieldError id={`${ids.tag}-err`} message={errors.gamerTag} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={ids.email}>
          Correo electrónico <span className="text-brand">*</span>
        </Label>
        <Input
          id={ids.email}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          maxLength={254}
          placeholder="tu@correo.com"
          value={values.email}
          onChange={set("email")}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={`${ids.email}-hint${errors.email ? ` ${ids.email}-err` : ""}`}
          required
        />
        <p id={`${ids.email}-hint`} className="text-xs text-muted-foreground">
          Solo para contactarte por el torneo. Nunca se muestra públicamente.
        </p>
        <FieldError id={`${ids.email}-err`} message={errors.email} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={ids.ml}>
          ID de Mobile Legends <span className="font-normal normal-case tracking-normal text-muted-foreground">(opcional)</span>
        </Label>
        <Input
          id={ids.ml}
          name="mobileLegendsId"
          inputMode="numeric"
          maxLength={40}
          placeholder="123456789 (1234)"
          value={values.mobileLegendsId}
          onChange={set("mobileLegendsId")}
          aria-invalid={Boolean(errors.mobileLegendsId)}
          aria-describedby={errors.mobileLegendsId ? `${ids.ml}-err` : undefined}
        />
        <FieldError id={`${ids.ml}-err`} message={errors.mobileLegendsId} />
      </div>

      {/* Campo trampa: invisible para personas, tentador para bots. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Sitio web
          <input tabIndex={-1} autoComplete="off" name="website" value={values.website} onChange={set("website")} />
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-start gap-3 rounded-lg border border-white/[0.08] bg-black/20 p-4">
          <Checkbox
            id={ids.rules}
            checked={accepted}
            onCheckedChange={(v) => {
              setAccepted(v === true);
              setErrors((prev) => ({ ...prev, acceptedRules: undefined }));
            }}
            aria-invalid={Boolean(errors.acceptedRules)}
            aria-describedby={errors.acceptedRules ? `${ids.rules}-err` : undefined}
            className="mt-0.5"
          />
          <label htmlFor={ids.rules} className="text-sm leading-relaxed text-silver/90">
            Acepto que mi Gamer Tag aparezca públicamente en el bracket del torneo.
          </label>
        </div>
        <FieldError id={`${ids.rules}-err`} message={errors.acceptedRules} />
      </div>

      {errors.form && (
        <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errors.form}
        </p>
      )}

      <Button type="submit" size="lg" disabled={submitting} className="w-full">
        {submitting ? <Loader2 className="animate-spin" aria-hidden /> : null}
        {submitting ? "Inscribiendo…" : "Quiero participar"}
      </Button>
    </form>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-xs font-medium text-destructive">
      {message}
    </p>
  );
}
