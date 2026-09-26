"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fieldErrors, registrationSchema } from "@/core/application/schemas";
import { formatMobileLegendsId, ML_SERVER_ID, ML_USER_ID } from "@/core/domain/participant";
import { site } from "@/lib/site";
import { MlbbIdFields, type MlbbIdValue } from "./mlbb-id-fields";
import { TikTokIcon } from "./tiktok-icon";

type Errors = Partial<
  Record<"gamerTag" | "mobileLegendsId" | "mlUserId" | "mlServerId" | "acceptedRules" | "form", string>
>;

export function RegistrationForm() {
  const router = useRouter();
  const ids = { tag: useId(), rules: useId() };
  const [values, setValues] = useState({ gamerTag: "", website: "" });
  const [ml, setMl] = useState<MlbbIdValue>({ userId: "", serverId: "" });
  const [accepted, setAccepted] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ gamerTag: string; mobileLegendsId: string } | null>(null);
  const [, startTransition] = useTransition();

  const set = (field: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues((v) => ({ ...v, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: undefined, form: undefined }));
  };

  const setMlField = (field: keyof MlbbIdValue, v: string) => {
    setMl((prev) => ({ ...prev, [field]: v }));
    const key = field === "userId" ? "mlUserId" : "mlServerId";
    setErrors((prev) => ({ ...prev, [key]: undefined, mobileLegendsId: undefined, form: undefined }));
  };

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const mobileLegendsId = ml.userId || ml.serverId ? formatMobileLegendsId(ml.userId, ml.serverId) : "";
    const payload = { ...values, mobileLegendsId, acceptedRules: accepted };
    // Validación local solo para feedback inmediato. El servidor vuelve a validar todo.
    const idErrors: Errors = {
      mlUserId: ML_USER_ID.test(ml.userId) ? undefined : ml.userId ? "El User ID lleva de 5 a 12 números." : "Escribe tu User ID.",
      mlServerId: ML_SERVER_ID.test(ml.serverId)
        ? undefined
        : ml.serverId
          ? "El Server ID lleva de 2 a 6 números."
          : "Escribe tu Server ID (el número entre paréntesis).",
    };
    const local = registrationSchema.safeParse(payload);
    if (!local.success || idErrors.mlUserId || idErrors.mlServerId) {
      const found = local.success ? {} : fieldErrors(local.error);
      // El error combinado sobra si ya se marcó cada casilla.
      if (idErrors.mlUserId || idErrors.mlServerId) delete found.mobileLegendsId;
      setErrors({ ...found, ...idErrors });
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
        | { ok: true; gamerTag: string }
        | { error: { code: string; message: string; fields?: Record<string, string> } }
        | null;
      if (res.ok && body && "ok" in body) {
        setDone({ gamerTag: body.gamerTag, mobileLegendsId });
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
        <p className="max-w-sm rounded-md border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-muted-foreground">
          Si ganas, el premio va a tu ID <span className="text-foreground">{done.mobileLegendsId}</span>. Toma captura de
          esta pantalla como comprobante.
        </p>
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
          Nickname del juego <span className="text-brand">*</span>
        </Label>
        <Input
          id={ids.tag}
          name="gamerTag"
          autoComplete="nickname"
          maxLength={40}
          placeholder="Tal como aparece en Mobile Legends"
          value={values.gamerTag}
          onChange={set("gamerTag")}
          aria-invalid={Boolean(errors.gamerTag)}
          aria-describedby={`${ids.tag}-hint${errors.gamerTag ? ` ${ids.tag}-err` : ""}`}
          required
        />
        <p id={`${ids.tag}-hint`} className="text-xs text-muted-foreground">
          Escríbelo igual que en tu perfil del juego: con él te identificamos al entrar a la sala.
        </p>
        <FieldError id={`${ids.tag}-err`} message={errors.gamerTag} />
      </div>

      <MlbbIdFields
        value={ml}
        onChange={setMlField}
        errors={{ userId: errors.mlUserId, serverId: errors.mlServerId, combined: errors.mobileLegendsId }}
      />

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
            Acepto las{" "}
            <a href="#reglas" className="text-brand-300 underline underline-offset-2 hover:text-brand">
              reglas del torneo
            </a>{" "}
            y que mi nickname aparezca públicamente en el bracket.
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
