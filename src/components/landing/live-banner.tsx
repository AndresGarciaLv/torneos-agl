import { Button } from "@/components/ui/button";
import { site } from "@/lib/site";
import { TikTokIcon } from "./tiktok-icon";

export function LiveBanner() {
  return (
    <section className="px-4 pb-20 sm:px-6">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-2xl border border-brand/20 bg-gradient-to-br from-brand-950 via-[#07140a] to-background px-6 py-12 text-center sm:px-12">
        <div aria-hidden className="bg-arena-grid pointer-events-none absolute inset-0 opacity-70" />
        <div className="relative flex flex-col items-center">
          <p className="eyebrow">En vivo en TikTok</p>
          <h2 className="mt-3 text-4xl font-extrabold uppercase leading-none sm:text-5xl">Cada encuentro se juega en el live</h2>
          <p className="mt-4 max-w-xl text-muted-foreground">
            Domingo 27 · 4:00 PM CDMX. Entra al directo de {site.handle} para ver las llaves en vivo, apoyar a tu jugador
            y no perderte las sorpresas.
          </p>
          <Button asChild size="lg" className="mt-8">
            <a href={site.tiktokUrl} target="_blank" rel="noopener noreferrer">
              <TikTokIcon /> Ver live en TikTok
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
