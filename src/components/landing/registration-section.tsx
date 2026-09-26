import { Lock, ShieldCheck, Shuffle } from "lucide-react";
import type { TournamentStatus } from "@/core/domain/tournament";
import { Button } from "@/components/ui/button";
import { site } from "@/lib/site";
import { RegistrationForm } from "./registration-form";
import { SectionHeading } from "./section-heading";
import { SpotsCounter } from "./spots-counter";
import { TikTokIcon } from "./tiktok-icon";

export function RegistrationSection({
  status,
  open,
  spots,
}: {
  status: TournamentStatus | null;
  open: boolean;
  spots: { taken: number; capacity: number } | null;
}) {
  const full = spots !== null && spots.taken >= spots.capacity;
  return (
    <section id="registro" className="scroll-mt-20 px-4 py-20 sm:px-6">
      <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div className="lg:sticky lg:top-24">
          <SectionHeading
            eyebrow="Inscripción"
            title="Entra a la arena"
            subtitle={`Un minuto y ya estás en el sorteo. Solo hay ${spots?.capacity ?? 16} lugares: se cierra al llenarse.`}
            className="lg:items-start lg:text-left"
          />
          <ul className="mt-8 hidden flex-col gap-4 text-sm text-muted-foreground lg:flex">
            <li className="flex gap-3">
              <Shuffle className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
              Sorteo aleatorio en el servidor: nadie elige a su rival.
            </li>
            <li className="flex gap-3">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
              En el bracket solo aparece tu nickname. Tu ID queda privado y solo se usa para enviarte el premio.
            </li>
          </ul>
        </div>

        <div className="surface p-6 sm:p-8">
          {status === "registration" && spots && (
            <SpotsCounter {...spots} className="mx-auto mb-6 max-w-none" />
          )}
          {open ? (
            <RegistrationForm />
          ) : status === null ? (
            <Closed
              title="Inscripciones no disponibles"
              text="No pudimos cargar el torneo en este momento. Recarga la página en unos segundos."
            />
          ) : status === "registration" && full ? (
            <Closed
              title="Lugares agotados"
              text={`Se llenaron los ${spots.capacity} lugares del torneo. En un momento se sortean las llaves.`}
              followUp
            />
          ) : status === "registration" ? (
            <Closed
              title="Inscripciones cerradas"
              text="Se acabó el tiempo para inscribirse. En un momento se sortean las llaves: no te pierdas el torneo en vivo."
              followUp
            />
          ) : (
            <Closed
              title="Inscripciones cerradas"
              text="Las llaves ya están sorteadas. Mira el bracket y no te pierdas el torneo en vivo."
              followUp
            />
          )}
        </div>
      </div>
    </section>
  );
}

function Closed({ title, text, followUp }: { title: string; text: string; followUp?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-4 py-8 text-center">
      <span className="flex size-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
        <Lock className="size-5 text-silver" aria-hidden />
      </span>
      <h3 className="text-2xl font-extrabold uppercase">{title}</h3>
      <p className="max-w-sm text-muted-foreground">{text}</p>
      {followUp && (
        <p className="max-w-sm rounded-lg border border-brand/25 bg-brand/[0.06] px-4 py-3 text-sm text-silver">
          ¿No lograste inscribirte? <strong className="text-foreground">Sigue el canal</strong>: habrá más eventos como este, y
          durante el live habrá <strong className="text-foreground">sorteos y sorpresas</strong>. ¡Ve a apoyar a tu favorito!
        </p>
      )}
      <div className="flex flex-wrap justify-center gap-3">
        {followUp && (
          <Button asChild>
            <a href={site.tiktokUrl} target="_blank" rel="noopener noreferrer">
              <TikTokIcon /> Seguir a {site.handle}
            </a>
          </Button>
        )}
        <Button asChild variant="outline">
          <a href="#bracket">Ver bracket</a>
        </Button>
      </div>
    </div>
  );
}
