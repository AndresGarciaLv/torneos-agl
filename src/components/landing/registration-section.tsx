import { Lock, ShieldCheck, Shuffle } from "lucide-react";
import type { TournamentStatus } from "@/core/domain/tournament";
import { Button } from "@/components/ui/button";
import { RegistrationForm } from "./registration-form";
import { SectionHeading } from "./section-heading";

export function RegistrationSection({ status }: { status: TournamentStatus | null }) {
  const open = status === "registration";
  return (
    <section id="registro" className="scroll-mt-20 px-4 py-20 sm:px-6">
      <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div className="lg:sticky lg:top-24">
          <SectionHeading
            eyebrow="Inscripción"
            title="Entra a la arena"
            subtitle="Un minuto y ya estás en el sorteo. Cupo abierto hasta que se sorteen las llaves."
            className="lg:items-start lg:text-left"
          />
          <ul className="mt-8 hidden flex-col gap-4 text-sm text-muted-foreground lg:flex">
            <li className="flex gap-3">
              <Shuffle className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
              Sorteo aleatorio en el servidor: nadie elige a su rival.
            </li>
            <li className="flex gap-3">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
              En el bracket solo aparece tu Gamer Tag. Tu correo queda privado.
            </li>
          </ul>
        </div>

        <div className="surface p-6 sm:p-8">
          {open ? (
            <RegistrationForm />
          ) : status === null ? (
            <Closed
              title="Inscripciones no disponibles"
              text="No pudimos cargar el torneo en este momento. Recarga la página en unos segundos."
            />
          ) : (
            <Closed
              title="Inscripciones cerradas"
              text="Las llaves ya están sorteadas. Mira el bracket y no te pierdas el torneo en vivo."
            />
          )}
        </div>
      </div>
    </section>
  );
}

function Closed({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-8 text-center">
      <span className="flex size-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
        <Lock className="size-5 text-silver" aria-hidden />
      </span>
      <h3 className="text-2xl font-extrabold uppercase">{title}</h3>
      <p className="max-w-sm text-muted-foreground">{text}</p>
      <Button asChild variant="outline">
        <a href="#bracket">Ver bracket</a>
      </Button>
    </div>
  );
}
