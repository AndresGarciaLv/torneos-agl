import { ShieldAlert, Users } from "lucide-react";
import { SectionHeading } from "./section-heading";

const B = ({ children }: { children: React.ReactNode }) => <strong className="font-semibold text-foreground">{children}</strong>;

/** Pocas y fáciles de recordar: se leen en voz alta en el live. */
const RULES: readonly React.ReactNode[] = [
  <>
    Se juega en el modo <B>1VS1</B> de Mobile Legends (Modo VS I.A. → 1VS1), <B>no en Clásica</B>.
  </>,
  <>
    Monster_AGL crea la sala y <B>pasa el ID de la sala</B> en el live de TikTok cuando te toque.
  </>,
  <>
    Entra con la <B>cuenta del ID que registraste</B> y con el <B>mismo nickname</B>: así te identificamos.
  </>,
  <>
    Cada encuentro es <B>una sola partida al mejor de 3 rondas</B>: pierdes si te tiran la torre o si mueres 3 veces.
  </>,
  <>
    Quien pierde queda <B>eliminado</B>. No hay revancha.
  </>,
  <>
    <B>Elige muy bien tu héroe</B>: es tu responsabilidad dar lo mejor de ti. Los héroes que el modo tiene baneados no se pueden usar.
  </>,
  <>
    Cuando te llamen tienes <B>5 minutos</B> para entrar a la sala o pierdes por W.O.
  </>,
  <>
    Si te desconectas, <B>la partida no se repite</B>. Revisa tu internet y batería antes de jugar.
  </>,
  <>
    <B>Juego limpio</B>: sin hacks, sin cuentas prestadas y con respeto. Romper esto es descalificación.
  </>,
];

export function Rules() {
  return (
    <section id="reglas" className="scroll-mt-20 px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <SectionHeading
          eyebrow="Reglamento"
          title="Reglas del 1 vs 1"
          subtitle="Simples y rápidas de recordar. Al inscribirte las aceptas."
        />

        <ol className="surface mt-12 flex flex-col divide-y divide-white/[0.06]">
          {RULES.map((rule, i) => (
            <li key={i} className="flex items-start gap-4 px-5 py-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand font-display text-sm font-bold text-primary-foreground">
                {i + 1}
              </span>
              <span className="pt-0.5">{rule}</span>
            </li>
          ))}
        </ol>

        <p className="mt-6 flex items-start gap-3 rounded-lg border border-gold/25 bg-gold/[0.05] p-4 text-sm text-silver">
          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden />
          <span>
            El premio se envía al ID de Mobile Legends que registraste. Lo que no cubran estas reglas lo decide el organizador en vivo.
          </span>
        </p>

        <ClanInvite className="mt-6" />
      </div>
    </section>
  );
}

/** Invitación al escuadrón de la comunidad. También se muestra al terminar la inscripción. */
export function ClanInvite({ className }: { className?: string }) {
  return (
    <div className={`flex items-start gap-4 rounded-xl border border-brand/30 bg-brand/[0.06] p-5 ${className ?? ""}`}>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-brand/40 bg-brand/10 text-brand">
        <Users className="size-5" aria-hidden />
      </span>
      <div className="flex flex-col gap-1 text-left">
        <p className="font-display text-lg font-bold uppercase tracking-wide">Únete a Monstercos</p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Estaremos enviando <B>invitaciones al clan Monstercos</B>, el escuadrón de la comunidad, donde habrá <B>vs, eventos y
          sorpresas</B> para todos.
        </p>
      </div>
    </div>
  );
}
