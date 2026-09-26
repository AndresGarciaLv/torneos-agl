import { CalendarDays, Clock, Swords } from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { TournamentStatus } from "@/core/domain/tournament";
import { site } from "@/lib/site";
import { TikTokIcon } from "./tiktok-icon";

interface HeroProps {
  status: TournamentStatus | null;
  participantCount: number | null;
}

const STATUS_BADGE: Record<TournamentStatus, string> = {
  registration: "Inscripciones abiertas",
  bracket_ready: "Llaves sorteadas",
  live: "Torneo en juego",
  finished: "Tenemos campeón",
};

export function Hero({ status, participantCount }: HeroProps) {
  const registrationOpen = status === null || status === "registration";
  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="bg-arena-grid pointer-events-none absolute inset-0" />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-24 size-[520px] -translate-x-1/2 rounded-full bg-brand/[0.07] blur-[110px] lg:left-3/4"
      />

      <div className="relative mx-auto grid max-w-6xl items-center gap-8 px-4 pb-16 pt-10 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12 lg:pb-24 lg:pt-16">
        <div className="order-2 flex flex-col items-center text-center lg:order-1 lg:items-start lg:text-left">
          <div className="flex flex-wrap items-center justify-center gap-2 motion-safe:animate-rise lg:justify-start">
            {status && <Badge>{STATUS_BADGE[status]}</Badge>}
            <Badge variant="outline">
              <Swords aria-hidden /> {site.game}
            </Badge>
          </div>

          <h1 className="mt-6 text-[2.75rem] font-extrabold uppercase leading-[0.92] tracking-tight motion-safe:animate-rise [animation-delay:80ms] sm:text-6xl lg:text-7xl">
            Demuestra quién manda en el{" "}
            <span className="relative inline-block whitespace-nowrap text-brand">
              1 vs 1
              <span aria-hidden className="absolute -bottom-1 left-0 h-[3px] w-full bg-gradient-to-r from-brand to-transparent" />
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-base text-muted-foreground motion-safe:animate-rise [animation-delay:160ms] sm:text-lg">
            La comunidad Monster_AGL entra a la arena. Inscríbete, entra al sorteo aleatorio y demuestra quién manda en
            Mobile Legends.
          </p>

          <dl className="mt-7 flex flex-wrap items-center justify-center gap-3 motion-safe:animate-rise [animation-delay:220ms] lg:justify-start">
            <div className="surface flex items-center gap-2.5 px-4 py-2.5">
              <CalendarDays className="size-4 text-brand" aria-hidden />
              <dt className="sr-only">Fecha</dt>
              <dd className="font-display text-base font-semibold uppercase tracking-wider">{site.dateLabel}</dd>
            </div>
            <div className="surface flex items-center gap-2.5 px-4 py-2.5">
              <Clock className="size-4 text-brand" aria-hidden />
              <dt className="sr-only">Hora</dt>
              <dd className="font-display text-base font-semibold uppercase tracking-wider">{site.timeLabel}</dd>
            </div>
          </dl>

          <div className="mt-8 flex w-full flex-col gap-3 motion-safe:animate-rise [animation-delay:280ms] sm:w-auto sm:flex-row">
            {registrationOpen ? (
              <Button asChild size="lg">
                <a href="#registro">Quiero participar</a>
              </Button>
            ) : null}
            <Button asChild size="lg" variant={registrationOpen ? "outline" : "default"}>
              <a href="#bracket">Ver bracket</a>
            </Button>
          </div>

          <a
            href={site.tiktokUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-brand-300 motion-safe:animate-fade [animation-delay:400ms]"
          >
            <TikTokIcon className="size-4" /> Ver live en TikTok · {site.handle}
          </a>

          {participantCount !== null && participantCount > 0 && (
            <p className="mt-6 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              <span className="font-display text-base font-bold text-foreground">{participantCount}</span>{" "}
              {participantCount === 1 ? "jugador inscrito" : "jugadores inscritos"}
            </p>
          )}
        </div>

        <div className="order-1 flex justify-center motion-safe:animate-fade lg:order-2">
          <Image
            src={site.logo}
            alt="Monster_AGL"
            width={1007}
            height={890}
            priority
            sizes="(min-width: 1024px) 420px, 260px"
            className="h-auto w-[240px] drop-shadow-[0_18px_40px_rgba(0,0,0,0.55)] sm:w-[300px] lg:w-[420px]"
          />
        </div>
      </div>
    </section>
  );
}
