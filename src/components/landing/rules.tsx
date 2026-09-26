import { Ban, Clock, DoorOpen, Flag, Gamepad2, ShieldAlert, Swords, Timer, Trophy, Wifi } from "lucide-react";
import { SectionHeading } from "./section-heading";

interface RuleBlock {
  icon: React.ReactNode;
  title: string;
  rules: readonly React.ReactNode[];
}

const B = ({ children }: { children: React.ReactNode }) => <strong className="font-semibold text-foreground">{children}</strong>;

const BLOCKS: readonly RuleBlock[] = [
  {
    icon: <Swords aria-hidden />,
    title: "Formato",
    rules: [
      <>
        Eliminación directa a <B>una sola partida</B> por encuentro. Quien pierde queda fuera: <B>no hay revancha ni segundas oportunidades</B>.
      </>,
      <>
        Entras con la <B>cuenta del ID que registraste</B>. Si juegas con otra cuenta o alguien juega por ti, quedas descalificado.
      </>,
    ],
  },
  {
    icon: <DoorOpen aria-hidden />,
    title: "Sala personalizada",
    rules: [
      <>
        Cada duelo se juega en una <B>sala personalizada</B> de Mobile Legends (modo <B>Personalizado</B>) configurada <B>1 vs 1</B> en
        el mapa clásico. No cuenta para tu rango ni te quita estrellas.
      </>,
      <>
        Monster_AGL crea la sala en el live de TikTok y <B>pasa el ID de la sala</B> cuando te toque: entra con ese ID. Monster_AGL se queda
        como espectador para ver todo el duelo.
      </>,
      <>
        En el juego usa el <B>mismo nickname que registraste</B>: así te identificamos en la sala. Si tu nickname no coincide, no te
        dejamos entrar hasta confirmar que eres tú.
      </>,
    ],
  },
  {
    icon: <Gamepad2 aria-hidden />,
    title: "Héroes libres",
    rules: [
      <>
        Usa <B>el héroe que tú quieras</B>: no hay baneos ni restricciones de rol. Emblemas y objetos también son libres.
      </>,
      <>
        Hechizo de batalla libre, <B>excepto Retribución</B>: sin jungla no tiene uso y solo daría ventaja sobre los súbditos.
      </>,
      <>
        Tu héroe <B>no se cambia</B> una vez que empieza la partida. Elige pensando en ganar el duelo temprano: tu rival puede traer
        cualquier cosa.
      </>,
    ],
  },
  {
    icon: <Trophy aria-hidden />,
    title: "Cómo se gana",
    rules: [
      <>
        Gana quien logre primero <B>cualquiera</B> de estas dos cosas:
      </>,
      <>
        <B>1. Primera sangre.</B> La primera muerte pierde, sin importar la causa: el rival, la torreta o los súbditos.
      </>,
      <>
        <B>2. Primera torreta.</B> Destruir la primera torreta del carril central del rival.
      </>,
      <>Rendirse o abandonar la partida también cuenta como derrota.</>,
    ],
  },
  {
    icon: <Flag aria-hidden />,
    title: "Zona de juego",
    rules: [
      <>
        Solo el <B>carril central</B> y su orilla del río. Puedes volver a la base para curarte y comprar.
      </>,
      <>
        Prohibido matar <B>monstruos de la jungla</B>, la Tortuga o el Señor, y prohibido farmear o empujar los <B>carriles laterales</B>.
      </>,
      <>Farmear fuera del carril central es derrota inmediata. El organizador lo ve en vivo desde el modo espectador.</>,
    ],
  },
  {
    icon: <Timer aria-hidden />,
    title: "Tiempo límite",
    rules: [
      <>
        Si al <B>minuto 10</B> nadie ha ganado, empieza la <B>muerte súbita</B>: prohibido volver a la base y se sigue peleando en el carril
        central.
      </>,
      <>
        Si al <B>minuto 15</B> sigue sin haber ganador, gana quien tenga <B>más oro</B> según el espectador.
      </>,
    ],
  },
  {
    icon: <Wifi aria-hidden />,
    title: "Conexión",
    rules: [
      <>
        <B>No hay reinicios.</B> Si te desconectas la partida sigue; tienes <B>3 minutos</B> para volver o pierdes.
      </>,
      <>Revisa tu internet, batería y que Mobile Legends esté actualizado antes de que te llamen.</>,
      <>Solo si el juego se cae para los dos (falla del servidor de Mobile Legends) se repite, con los mismos héroes.</>,
    ],
  },
  {
    icon: <Clock aria-hidden />,
    title: "Puntualidad",
    rules: [
      <>
        Cuando te llamen en el live tienes <B>5 minutos</B> para entrar a la sala con el ID que se pasó. Si no llegas, pierdes por W.O. y tu rival avanza.
      </>,
      <>Mantente conectado al live de TikTok: ahí se anuncia cada encuentro.</>,
    ],
  },
  {
    icon: <Ban aria-hidden />,
    title: "Juego limpio",
    rules: [
      <>
        Prohibidos hacks, apps de terceros, abusar de bugs y las <B>cuentas compartidas</B>. Todo esto es descalificación.
      </>,
      <>Respeto en la sala y en el chat. Insultar o provocar puede costar la descalificación.</>,
    ],
  },
];

export function Rules() {
  return (
    <section id="reglas" className="scroll-mt-20 px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="Reglamento"
          title="Reglas del 1 vs 1"
          subtitle="Una partida, héroes libres y sin segundas oportunidades. Léelas antes de inscribirte: al registrarte las aceptas."
        />

        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {BLOCKS.map((block) => (
            <article key={block.title} className="surface p-6">
              <h3 className="flex items-center gap-3 font-display text-xl font-bold uppercase">
                <span className="flex size-9 items-center justify-center rounded-lg border border-brand/30 bg-brand/10 text-brand [&_svg]:size-4.5">
                  {block.icon}
                </span>
                {block.title}
              </h3>
              <ul className="mt-4 flex flex-col gap-2.5 text-sm leading-relaxed text-muted-foreground">
                {block.rules.map((rule, i) => (
                  <li key={i} className="flex gap-2.5">
                    <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-brand/70" />
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <p className="mx-auto mt-8 flex max-w-2xl items-start gap-3 rounded-lg border border-gold/25 bg-gold/[0.05] p-4 text-sm text-silver">
          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden />
          <span>
            Los premios se envían al ID de Mobile Legends que registraste. Cualquier situación que no cubran estas reglas la decide el
            organizador en vivo y su decisión es final.
          </span>
        </p>
      </div>
    </section>
  );
}
