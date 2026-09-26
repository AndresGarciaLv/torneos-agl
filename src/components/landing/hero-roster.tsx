import Image from "next/image";
import heroes from "@/content/heroes.json";
import { SectionHeading } from "./section-heading";

/**
 * Galería de héroes. Server Component sin JS: en móvil es un carril con scroll
 * y snap; en escritorio, una rejilla de 8 columnas. El arte lo baja `npm run heroes`.
 */
export function HeroRoster() {
  if (heroes.length === 0) return null;
  return (
    <section id="heroes" aria-label="Héroes de Mobile Legends" className="scroll-mt-20 py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Tu héroe, tu jugada"
          title="Elige a tu main"
          subtitle="Natan, Yi Sun-shin, Eudora, Atlas, Lukas… Llega con el que mejor dominas: en el 1 vs 1 no hay a quién echarle la culpa."
        />
      </div>

      <ul
        className="mt-12 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-4 sm:scroll-px-6 [scrollbar-width:thin] sm:px-6 lg:mx-auto lg:grid lg:max-w-6xl lg:snap-none lg:grid-cols-8 lg:overflow-visible lg:pb-0"
        aria-label="Héroes"
      >
        {heroes.map((hero, i) => (
          <li key={hero.slug} className="w-[38%] shrink-0 snap-start sm:w-[22%] lg:w-auto">
            <figure className="group relative overflow-hidden rounded-lg border border-white/[0.07] bg-white/[0.02] transition-[transform,border-color] duration-300 motion-safe:hover:-translate-y-1 hover:border-brand/45">
              <Image
                src={hero.src}
                alt={`${hero.name}, héroe de Mobile Legends`}
                width={hero.width}
                height={hero.height}
                sizes="(min-width: 1024px) 140px, (min-width: 640px) 22vw, 38vw"
                loading={i < 4 ? "eager" : "lazy"}
                className="aspect-[240/390] h-auto w-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-[1.04]"
              />
              <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent px-3 pb-3 pt-10">
                <span className="block font-display text-lg font-extrabold uppercase leading-none tracking-wide text-foreground">
                  {hero.name}
                </span>
                <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.2em] text-brand">{hero.role}</span>
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>

      <p className="mx-auto mt-6 max-w-6xl px-4 text-center text-xs text-muted-foreground/70 sm:px-6">
        Arte de los héroes © Moonton. Torneo de la comunidad, sin afiliación con Moonton ni Mobile Legends: Bang Bang.
      </p>
    </section>
  );
}
