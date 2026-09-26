"use client";

import { Eye, Gift, Loader2, MessageSquareText, MonitorPlay, Plus, Radio, Settings2, Square, Trophy, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { RafflePerson, RaffleView, SpinResult } from "@/core/application/use-cases/manage-raffle";
import { cn } from "@/lib/utils";
import { rotationFor, Wheel } from "./wheel";

const SPIN_MS = 7000;
const DURATIONS = [60, 120, 180, 240] as const;

type Listen =
  | { state: "idle" }
  | { state: "connecting" }
  | { state: "listening"; endsAt: number }
  | { state: "closed"; message: string }
  | { state: "error"; message: string };

type ApiError = { error?: { message?: string; fields?: Record<string, string> } };

async function post<T>(body: unknown): Promise<T> {
  const res = await fetch("/api/admin/raffle", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T & ApiError;
  if (!res.ok) {
    const fields = Object.values(data.error?.fields ?? {});
    throw new Error(fields.length > 0 ? fields.join(" ") : (data.error?.message ?? "La acción falló."));
  }
  return data;
}

export function RaffleBoard({ initial }: { initial: RaffleView }) {
  const [view, setView] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const [listen, setListen] = useState<Listen>({ state: "idle" });
  const [viewers, setViewers] = useState<number | null>(null);
  const [duration, setDuration] = useState<number>(120);
  const [now, setNow] = useState(() => Date.now());
  const source = useRef<EventSource | null>(null);

  // Rueda: fuera de un giro muestra a quienes pueden ganar; durante el giro, la foto que mandó el servidor.
  const winnersSet = useMemo(() => new Set(view.winners.map((w) => w.user)), [view.winners]);
  const eligible = useMemo(() => view.entries.filter((e) => !winnersSet.has(e.user)), [view.entries, winnersSet]);
  const [spin, setSpin] = useState<{ wheel: readonly RafflePerson[]; winner: RafflePerson } | null>(null);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [revealed, setRevealed] = useState<RafflePerson | null>(null);
  const wheelPeople = spin?.wheel ?? eligible;

  const listening = listen.state === "connecting" || listen.state === "listening";

  useEffect(() => {
    if (listen.state !== "listening") return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [listen.state]);

  useEffect(() => () => source.current?.close(), []);

  function stopListening(message = "Escucha detenida.") {
    source.current?.close();
    source.current = null;
    setListen({ state: "closed", message });
  }

  function startListening() {
    if (!view.raffle || listening) return;
    setError(null);
    setListen({ state: "connecting" });
    const es = new EventSource(`/api/admin/raffle/listen?seconds=${duration}`);
    source.current = es;
    es.addEventListener("status", (ev) => {
      const data = JSON.parse((ev as MessageEvent<string>).data) as
        | { state: "connecting" }
        | { state: "listening"; endsAt: number }
        | { state: "closed"; reason: "timeout" | "live_ended" }
        | { state: "error"; message: string };
      if (data.state === "listening") setListen({ state: "listening", endsAt: data.endsAt });
      else if (data.state === "closed") {
        es.close();
        source.current = null;
        setListen({
          state: "closed",
          message: data.reason === "timeout" ? "Se acabó el tiempo: la ruleta ya no recibe más." : "El live terminó.",
        });
      } else if (data.state === "error") {
        es.close();
        source.current = null;
        setListen({ state: "error", message: data.message });
      }
    });
    es.addEventListener("entry", (ev) => {
      const p = JSON.parse((ev as MessageEvent<string>).data) as RafflePerson;
      setView((v) => (v.entries.some((e) => e.user === p.user) ? v : { ...v, entries: [...v.entries, p] }));
    });
    es.addEventListener("viewers", (ev) => {
      setViewers((JSON.parse((ev as MessageEvent<string>).data) as { count: number }).count);
    });
    // Sin esto EventSource reconecta solo y abriría otra escucha.
    es.onerror = () => {
      if (source.current !== es) return;
      es.close();
      source.current = null;
      setListen((l) => (l.state === "closed" || l.state === "error" ? l : { state: "error", message: "Se perdió la conexión con el chat." }));
    };
  }

  async function act(body: unknown) {
    setBusy(true);
    setError(null);
    try {
      const { view: next } = await post<{ view: RaffleView }>(body);
      setView(next);
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function doSpin() {
    if (spinning || busy) return;
    setError(null);
    setRevealed(null);
    setBusy(true);
    try {
      const result = await post<SpinResult>({ action: "spin" });
      const index = result.wheel.findIndex((p) => p.user === result.winner.user);
      setSpin({ wheel: result.wheel, winner: result.winner });
      // Un cuadro para pintar la rueda nueva antes de arrancar la transición.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          setSpinning(true);
          setRotation((r) => rotationFor(index, result.wheel.length, r));
        }),
      );
      setTimeout(() => {
        setSpinning(false);
        setRevealed(result.winner);
        setView(result.view);
      }, SPIN_MS + 150);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function closeWinner() {
    setRevealed(null);
    setSpin(null);
  }

  const secondsLeft = listen.state === "listening" ? Math.max(0, Math.ceil((listen.endsAt - now) / 1000)) : null;

  return (
    <div className={cn("grid gap-6", !presenting && "lg:grid-cols-[1fr_380px]")}>
      {/* Escenario: lo que se comparte en el live */}
      <section className="surface relative flex flex-col items-center gap-5 overflow-hidden p-5 sm:p-8">
        <div aria-hidden className="bg-arena-grid pointer-events-none absolute inset-0 opacity-60" />
        <div className="relative flex w-full flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow">Ruleta sorpresa</p>
            <h1 className="mt-1 flex items-center gap-2 text-3xl font-extrabold uppercase leading-none sm:text-5xl">
              <Gift className="size-7 text-gold sm:size-10" aria-hidden />
              {view.raffle?.prize ?? "Pases semanales"}
            </h1>
          </div>
          <Button variant="outline" size="sm" onClick={() => setPresenting((p) => !p)}>
            {presenting ? <Settings2 aria-hidden /> : <MonitorPlay aria-hidden />}
            {presenting ? "Mostrar controles" : "Modo presentación"}
          </Button>
        </div>

        {view.raffle && (
          <div className="relative flex flex-wrap items-center justify-center gap-3 text-center">
            <p className="flex items-center gap-2 rounded-full border border-brand/40 bg-brand/10 px-5 py-2.5 font-display text-lg font-bold uppercase tracking-wide sm:text-2xl">
              <MessageSquareText className="size-5 text-brand sm:size-6" aria-hidden />
              Comenta <span className="text-brand">«{view.raffle.keyword.toUpperCase()}»</span> para entrar
            </p>
            {listen.state === "listening" && (
              <span className="flex items-center gap-2 rounded-full border border-destructive/40 bg-destructive/10 px-4 py-2 font-display text-lg font-bold tabular-nums">
                <Radio className="size-4 animate-pulse text-destructive" aria-hidden />
                {Math.floor((secondsLeft ?? 0) / 60)}:{String((secondsLeft ?? 0) % 60).padStart(2, "0")}
              </span>
            )}
          </div>
        )}

        <div className="relative w-full">
          <Wheel people={wheelPeople} rotation={rotation} spinning={spinning} durationMs={SPIN_MS} />
        </div>

        <div className="relative flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
          <span>
            <span className="font-display text-2xl font-bold text-foreground">{eligible.length}</span> en la ruleta
          </span>
          {viewers !== null && (
            <span className="flex items-center gap-1.5">
              <Eye className="size-4" aria-hidden />
              <span className="font-display text-2xl font-bold text-foreground">{viewers}</span> viendo el live
            </span>
          )}
        </div>

        <Button
          size="lg"
          className="relative min-w-56 text-lg"
          onClick={doSpin}
          disabled={!view.raffle || eligible.length === 0 || spinning || busy}
        >
          {spinning || (busy && !listening) ? <Loader2 className="animate-spin" aria-hidden /> : <Trophy aria-hidden />}
          {spinning ? "Girando…" : "¡Girar!"}
        </Button>

        {view.winners.length > 0 && (
          <div className="relative w-full max-w-2xl">
            <p className="mb-2 text-center text-xs uppercase tracking-[0.18em] text-gold">Ganadores</p>
            <ol className="flex flex-wrap justify-center gap-2">
              {view.winners.map((w, i) => (
                <li
                  key={w.user}
                  className="flex items-center gap-2 rounded-full border border-gold/40 bg-gold/[0.08] px-3 py-1.5 text-sm"
                >
                  <span className="font-display font-bold text-gold">{i + 1}</span>
                  <span className="font-semibold">{w.nickname}</span>
                  <span className="text-muted-foreground">@{w.user}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {error && presenting && (
          <p role="alert" className="relative text-sm text-destructive">
            {error}
          </p>
        )}

        {revealed && <WinnerReveal winner={revealed} prize={view.raffle?.prize ?? ""} onClose={closeWinner} />}
      </section>

      {!presenting && (
        <aside className="flex flex-col gap-4">
          {error && (
            <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
              {error}
            </p>
          )}

          <CreateRaffle
            busy={busy || listening || spinning}
            hasRaffle={view.raffle !== null}
            onCreate={(keyword, prize) => act({ action: "create", keyword, prize })}
          />

          {view.raffle && (
            <div className="surface flex flex-col gap-3 p-5">
              <h2 className="font-display text-lg font-bold uppercase">Escuchar el chat</h2>
              <p className="text-xs text-muted-foreground">
                Se conecta al chat de tu live y mete a quien comente la palabra. Tu live tiene que estar activo.
              </p>
              {!listening ? (
                <div className="flex gap-2">
                  <select
                    aria-label="Duración"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
                  >
                    {DURATIONS.map((d) => (
                      <option key={d} value={d} className="bg-background">
                        {d / 60} min
                      </option>
                    ))}
                  </select>
                  <Button className="flex-1" onClick={startListening} disabled={spinning}>
                    <Radio aria-hidden /> Abrir ruleta
                  </Button>
                </div>
              ) : (
                <Button variant="outline" onClick={() => stopListening()}>
                  {listen.state === "connecting" ? <Loader2 className="animate-spin" aria-hidden /> : <Square aria-hidden />}
                  {listen.state === "connecting" ? "Conectando… (detener)" : `Cerrar ruleta (${secondsLeft}s)`}
                </Button>
              )}
              {(listen.state === "closed" || listen.state === "error") && (
                <p className={cn("text-xs", listen.state === "error" ? "text-destructive" : "text-muted-foreground")}>
                  {listen.message}
                </p>
              )}
            </div>
          )}

          {view.raffle && (
            <Entrants
              entries={view.entries}
              winners={winnersSet}
              busy={busy || spinning}
              onAdd={(user) => act({ action: "add", user })}
              onRemove={(user) => act({ action: "remove", user })}
            />
          )}
        </aside>
      )}
    </div>
  );
}

function CreateRaffle({
  busy,
  hasRaffle,
  onCreate,
}: {
  busy: boolean;
  hasRaffle: boolean;
  onCreate: (keyword: string, prize: string) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(!hasRaffle);
  const [keyword, setKeyword] = useState("MONSTER");
  const [prize, setPrize] = useState("Pase semanal");

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)} disabled={busy}>
        <Plus aria-hidden /> Nueva ruleta
      </Button>
    );
  }
  return (
    <form
      className="surface flex flex-col gap-3 p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        if (await onCreate(keyword, prize)) setOpen(false);
      }}
    >
      <h2 className="font-display text-lg font-bold uppercase">{hasRaffle ? "Nueva ruleta" : "Crear ruleta"}</h2>
      {hasRaffle && (
        <p className="text-xs text-muted-foreground">Empieza vacía. La anterior y sus ganadores quedan guardados.</p>
      )}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="raffle-keyword">Palabra clave</Label>
        <Input id="raffle-keyword" maxLength={30} value={keyword} onChange={(e) => setKeyword(e.target.value)} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="raffle-prize">Premio</Label>
        <Input id="raffle-prize" maxLength={80} value={prize} onChange={(e) => setPrize(e.target.value)} required />
      </div>
      <div className="flex gap-2">
        {hasRaffle && (
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
        )}
        <Button type="submit" className="flex-1" disabled={busy}>
          Crear
        </Button>
      </div>
    </form>
  );
}

function Entrants({
  entries,
  winners,
  busy,
  onAdd,
  onRemove,
}: {
  entries: readonly RafflePerson[];
  winners: ReadonlySet<string>;
  busy: boolean;
  onAdd: (user: string) => Promise<boolean>;
  onRemove: (user: string) => Promise<boolean>;
}) {
  const [user, setUser] = useState("");
  return (
    <div className="surface flex flex-col gap-3 p-5">
      <h2 className="flex items-center justify-between font-display text-lg font-bold uppercase">
        Participantes <span className="text-sm text-muted-foreground">{entries.length}</span>
      </h2>
      <form
        className="flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (user.trim() && (await onAdd(user))) setUser("");
        }}
      >
        <Input
          aria-label="Agregar usuario de TikTok a mano"
          placeholder="@usuario (a mano)"
          maxLength={61}
          value={user}
          onChange={(e) => setUser(e.target.value)}
        />
        <Button type="submit" variant="outline" disabled={busy || !user.trim()} aria-label="Agregar">
          <Plus aria-hidden />
        </Button>
      </form>
      {entries.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">Nadie ha entrado todavía.</p>
      ) : (
        <ul className="scrollbar-thin flex max-h-[360px] flex-col divide-y divide-white/[0.05] overflow-y-auto">
          {[...entries].reverse().map((e) => (
            <li key={e.user} className="flex items-center justify-between gap-2 py-2 text-sm">
              <span className="min-w-0 truncate">
                <span className={cn("font-semibold", winners.has(e.user) && "text-gold")}>{e.nickname}</span>{" "}
                <span className="text-muted-foreground">@{e.user}</span>
                {winners.has(e.user) && <Trophy className="ml-1.5 inline size-3.5 text-gold" aria-label="Ganó" />}
              </span>
              {!winners.has(e.user) && (
                <button
                  type="button"
                  onClick={() => onRemove(e.user)}
                  disabled={busy}
                  aria-label={`Quitar a ${e.nickname}`}
                  className="rounded p-1 text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-destructive"
                >
                  <X className="size-4" aria-hidden />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function WinnerReveal({ winner, prize, onClose }: { winner: RafflePerson; prize: string; onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="raffle-winner"
      className="absolute inset-0 z-20 flex items-center justify-center bg-background/80 p-6 backdrop-blur-sm motion-safe:animate-fade"
    >
      <div className="flex max-w-lg flex-col items-center gap-4 rounded-2xl border border-gold/50 bg-[#0a0e0b] px-8 py-10 text-center shadow-glow-gold motion-safe:animate-rise">
        <Trophy className="size-14 text-gold" aria-hidden />
        <p className="eyebrow text-gold">¡Tenemos ganador!</p>
        <h2 id="raffle-winner" className="break-all text-5xl font-extrabold uppercase leading-none sm:text-6xl">
          {winner.nickname}
        </h2>
        <p className="text-lg text-muted-foreground">@{winner.user}</p>
        {prize && (
          <p className="rounded-full border border-brand/40 bg-brand/10 px-5 py-2 font-display text-xl font-bold uppercase text-brand">
            {prize}
          </p>
        )}
        <Button variant="outline" onClick={onClose}>
          Cerrar
        </Button>
      </div>
    </div>
  );
}
