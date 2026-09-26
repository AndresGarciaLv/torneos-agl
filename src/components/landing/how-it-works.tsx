import { SectionHeading } from "./section-heading";

const STEPS = [
  { n: "01", title: "Inscríbete", text: "Deja tu Gamer Tag y tu ID de Mobile Legends. Tu ID nunca se publica." },
  { n: "02", title: "Sorteo aleatorio", text: "Las llaves se sortean en el servidor, sin favoritos. Si faltan rivales, hay BYE." },
  { n: "03", title: "Eliminación directa", text: "Cada encuentro es 1 vs 1 a una sola partida. Quien gana avanza; quien pierde queda fuera." },
  { n: "04", title: "Final en el live", text: "El bracket se actualiza en vivo aquí mismo mientras se juega en TikTok." },
] as const;

export function HowItWorks() {
  return (
    <section className="border-y border-white/[0.05] bg-white/[0.012] px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <SectionHeading eyebrow="Formato" title="Cómo funciona" />
        <ol className="mt-12 grid gap-px overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.06] sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <li key={s.n} className="bg-background p-6">
              <span className="font-display text-sm font-bold tracking-[0.2em] text-brand">{s.n}</span>
              <h3 className="mt-3 text-xl font-bold uppercase">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
