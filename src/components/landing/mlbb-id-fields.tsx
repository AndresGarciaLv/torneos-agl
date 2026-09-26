"use client";

import { Check, ChevronDown, Gamepad2 } from "lucide-react";
import Image from "next/image";
import { useId } from "react";
import { Input } from "@/components/ui/input";
import { ML_SERVER_ID, ML_USER_ID } from "@/core/domain/participant";
import { cn } from "@/lib/utils";

export interface MlbbIdValue {
  userId: string;
  serverId: string;
}

const STEPS = ["Ve a tu perfil", "Toca tu avatar", "Copia el número de ID y el de (servidor)"] as const;

/**
 * User ID y Server ID por separado, como los piden las tiendas de diamantes: la gente
 * ya sabe llenarlos así. El formulario los junta en "454928618 (5207)" al enviar.
 */
export function MlbbIdFields({
  value,
  onChange,
  errors,
}: {
  value: MlbbIdValue;
  onChange: (field: keyof MlbbIdValue, v: string) => void;
  errors: { userId?: string; serverId?: string; combined?: string };
}) {
  const ids = { user: useId(), server: useId() };
  const userOk = ML_USER_ID.test(value.userId);
  const serverOk = ML_SERVER_ID.test(value.serverId);
  const complete = userOk && serverOk;
  // Solo dígitos: pegar "454928618 (5207)" completo en el primero lo reparte en los dos.
  const digits = (field: keyof MlbbIdValue) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const pasted = /^\s*(\d{5,12})\s*\(\s*(\d{2,6})\s*\)\s*$/.exec(raw);
    if (field === "userId" && pasted) {
      onChange("userId", pasted[1]!);
      onChange("serverId", pasted[2]!);
      return;
    }
    onChange(field, raw.replace(/\D/g, ""));
  };

  return (
    <fieldset className="overflow-hidden rounded-xl border border-white/[0.08] bg-black/25">
      <legend className="sr-only">Tus datos de Mobile Legends</legend>
      <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3.5 sm:px-5">
        <span
          aria-hidden
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-full border transition-colors",
            complete ? "border-brand bg-brand text-primary-foreground" : "border-white/15 bg-white/[0.03] text-transparent",
          )}
        >
          <Check className="size-4" strokeWidth={3} />
        </span>
        <p className="flex items-center gap-2 font-display text-lg font-bold uppercase tracking-wide">
          <Gamepad2 className="size-5 text-brand" aria-hidden /> Ingresa tus datos
        </p>
      </div>

      <div className="flex flex-col gap-5 p-4 sm:p-5">
        <Field
          id={ids.user}
          label="Mobile Legends User ID"
          placeholder="454928618"
          maxLength={20}
          value={value.userId}
          onChange={digits("userId")}
          ok={userOk}
          error={errors.userId}
        />
        <Field
          id={ids.server}
          label="Server ID"
          placeholder="5207"
          maxLength={6}
          value={value.serverId}
          onChange={digits("serverId")}
          ok={serverOk}
          error={errors.serverId}
        />
        {errors.combined && !errors.userId && !errors.serverId && (
          <p role="alert" className="text-xs font-medium text-destructive">
            {errors.combined}
          </p>
        )}

        <details className="group rounded-lg border border-white/[0.08] bg-white/[0.02]">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-brand-300 [&::-webkit-details-marker]:hidden">
            ¿Dónde encuentro mis datos?
            <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          <div className="flex flex-col gap-4 border-t border-white/[0.06] p-4 sm:flex-row sm:items-center">
            <Image
              src="/branding/donde-esta-mi-id.jpg"
              alt="Perfil de Mobile Legends: debajo del nombre aparece «ID: 454928618 (5207)». El primer número es el User ID y el de paréntesis el Server ID."
              width={723}
              height={349}
              sizes="(min-width: 640px) 220px, 100vw"
              className="h-auto w-full rounded-md border border-white/10 sm:w-[220px]"
            />
            <ol className="flex flex-col gap-3 text-sm">
              {STEPS.map((step, i) => (
                <li key={step} className="flex items-center gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand font-display text-xs font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
          <p className="border-t border-white/[0.06] px-4 py-3 text-xs text-muted-foreground">
            En «ID: 454928618 (5207)» el User ID es <span className="text-foreground">454928618</span> y el Server ID es{" "}
            <span className="text-foreground">5207</span>. Si ganas, el premio se envía a este ID: revísalo bien.
          </p>
        </details>
      </div>
    </fieldset>
  );
}

function Field({
  id,
  label,
  ok,
  error,
  ...input
}: {
  id: string;
  label: string;
  ok: boolean;
  error?: string;
  placeholder: string;
  maxLength: number;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-brand-300">
        <Gamepad2 className="size-4 text-brand" aria-hidden />
        {label} <span className="text-brand">*</span>
      </label>
      <Input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        required
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-err` : undefined}
        className={cn("h-12 text-base", ok && !error && "border-brand/70 focus-visible:border-brand")}
        {...input}
      />
      {error && (
        <p id={`${id}-err`} className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
