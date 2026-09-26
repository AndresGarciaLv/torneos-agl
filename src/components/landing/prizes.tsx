import { Crown, Gift, Medal, Trophy } from "lucide-react";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";
import { SectionHeading } from "./section-heading";

export function Prizes() {
  return (
    <section id="premios" className="scroll-mt-20 px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <SectionHeading eyebrow="Lo que está en juego" title="Premios" />

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {/* 1.º — el único lugar con dorado de verdad, como la corona del logo. */}
          <article
            className={cn(
              "surface group relative overflow-hidden p-7 transition-[transform,border-color] duration-300",
              "border-gold/25 bg-gradient-to-b from-gold/[0.07] to-transparent hover:-translate-y-1 hover:border-gold/50",
            )}
          >
            <Crown aria-hidden className="absolute -right-4 -top-4 size-28 rotate-12 text-gold/[0.06]" />
            <div className="flex items-center justify-between">
              <span className="flex size-12 items-center justify-center rounded-lg border border-gold/30 bg-gold/10">
                <Trophy className="size-6 text-gold" aria-hidden />
              </span>
              <span className="font-display text-sm font-bold uppercase tracking-[0.2em] text-gold">1.er lugar</span>
            </div>
            <h3 className="mt-8 text-3xl font-extrabold uppercase leading-none">Pase VIP mensual</h3>
            <p className="mt-3 text-sm text-muted-foreground">Para quien no pierda ni un encuentro en todo el cuadro.</p>
          </article>

          <article className="surface group relative overflow-hidden p-7 transition-[transform,border-color] duration-300 hover:-translate-y-1 hover:border-brand/40">
            <div className="flex items-center justify-between">
              <span className="flex size-12 items-center justify-center rounded-lg border border-brand/30 bg-brand/10">
                <Medal className="size-6 text-brand" aria-hidden />
              </span>
              <span className="font-display text-sm font-bold uppercase tracking-[0.2em] text-brand-300">2.º lugar</span>
            </div>
            <h3 className="mt-8 text-3xl font-extrabold uppercase leading-none">Pase semanal</h3>
            <p className="mt-3 text-sm text-muted-foreground">Para quien llegue a la final y la pelee hasta el último golpe.</p>
          </article>

          <article className="surface group relative overflow-hidden p-7 transition-[transform,border-color] duration-300 hover:-translate-y-1 hover:border-brand/40">
            <div className="flex items-center justify-between">
              <span className="flex size-12 items-center justify-center rounded-lg border border-white/12 bg-white/[0.04]">
                <Gift className="size-6 text-silver" aria-hidden />
              </span>
              <span className="font-display text-sm font-bold uppercase tracking-[0.2em] text-silver">En el live</span>
            </div>
            <h3 className="mt-8 text-3xl font-extrabold uppercase leading-none">Más sorpresas</h3>
            <p className="mt-3 text-sm text-muted-foreground">
              Caigan al live porque tendremos dinámicas y premios adicionales durante el directo.
            </p>
            <a
              href={site.tiktokUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex text-sm font-medium text-brand hover:underline"
            >
              Seguir a {site.handle} →
            </a>
          </article>
        </div>
      </div>
    </section>
  );
}
