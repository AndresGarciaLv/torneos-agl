import { Crown, Medal, Radio, Swords, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { AdminDashboardView, AdminParticipantView } from "@/core/application/views";
import { parseMobileLegendsId } from "@/core/domain/participant";
import { STATUS_LABEL } from "@/core/domain/tournament";
import { formatCdmx } from "@/lib/site";
import { cn } from "@/lib/utils";
import { AdminBracket } from "./admin-bracket";
import { BracketControls } from "./bracket-controls";
import { CopyButton } from "./copy-button";
import { EditParticipant } from "./edit-participant";
import { RemoveParticipant } from "./remove-participant";

export function AdminDashboard({ dashboard }: { dashboard: AdminDashboardView }) {
  const t = dashboard.tournament;
  const current = t.currentRound !== null ? t.rounds.find((r) => r.round === t.currentRound) : undefined;
  const hasBracket = t.rounds.length > 0;
  const first = dashboard.participants.find((p) => p.place === 1);
  const second = dashboard.participants.find((p) => p.place === 2);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <p className="eyebrow">Panel del torneo</p>
        <h1 className="text-4xl font-extrabold uppercase leading-none sm:text-5xl">{t.name}</h1>
        <p className="text-sm text-muted-foreground first-letter:uppercase">{formatCdmx(t.startsAt)} · hora de CDMX</p>
      </div>

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={<Users aria-hidden />} label="Inscritos" value={String(t.participantCount)} />
        <Stat
          icon={<Radio aria-hidden />}
          label="Estado"
          value={t.status === "registration" && t.registrationClosed ? "Inscripciones cerradas" : STATUS_LABEL[t.status]}
        />
        <Stat
          icon={<Swords aria-hidden />}
          label="Partidas jugadas"
          value={hasBracket ? `${dashboard.matchesDecided} / ${dashboard.matchesTotal}` : "—"}
        />
        <Stat
          icon={<Crown aria-hidden />}
          label={t.champion ? "Campeón" : "Ronda actual"}
          value={t.champion ? t.champion.gamerTag : (current?.name ?? "—")}
          gold={Boolean(t.champion)}
        />
      </dl>

      {first && (
        <section aria-labelledby="ganadores" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 id="ganadores" className="text-2xl font-extrabold uppercase">
              Ganadores
            </h2>
            <p className="text-xs text-muted-foreground">Los premios se envían a estos IDs.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <PodiumCard player={first} place={1} />
            {second && <PodiumCard player={second} place={2} />}
          </div>
        </section>
      )}

      <BracketControls
        status={t.status}
        registrationClosed={t.registrationClosed}
        participantCount={t.participantCount}
        matchesDecided={dashboard.matchesDecided}
      />

      {hasBracket && (
        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className="text-2xl font-extrabold uppercase">Llaves</h2>
            <p className="text-xs text-muted-foreground">Toca al jugador que ganó. Avanza solo a su siguiente encuentro.</p>
          </div>
          <AdminBracket rounds={t.rounds} champion={t.champion} />
        </section>
      )}

      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-extrabold uppercase">Inscritos</h2>
          <Badge variant="muted">{dashboard.participants.length}</Badge>
        </div>
        {dashboard.participants.length === 0 ? (
          <p className="surface px-5 py-8 text-center text-sm text-muted-foreground">Todavía no hay inscripciones.</p>
        ) : (
          <div className="surface scrollbar-thin overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="border-b border-white/[0.07] text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">#</th>
                  <th className="px-4 py-3 font-semibold">Nickname</th>
                  <th className="px-4 py-3 font-semibold">User ID</th>
                  <th className="px-4 py-3 font-semibold">Server ID</th>
                  <th className="px-4 py-3 font-semibold">Inscrito</th>
                  <th className="px-4 py-3">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {dashboard.participants.map((p, i) => (
                  <tr
                    key={p.id}
                    className={cn(
                      "border-b border-white/[0.04] last:border-0",
                      p.place === 1 && "bg-gold/[0.08] shadow-[inset_3px_0_0_var(--gold)]",
                      p.place === 2 && "bg-silver/[0.05] shadow-[inset_3px_0_0_var(--silver)]",
                    )}
                  >
                    <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                    <td className="px-4 py-3 font-medium">
                      <span className="flex flex-wrap items-center gap-2">
                        {p.gamerTag}
                        {p.place && <PlaceBadge place={p.place} />}
                      </span>
                    </td>
                    <IdCells participant={p} />
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Intl.DateTimeFormat("es-MX", {
                        timeZone: "America/Mexico_City",
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(new Date(p.createdAt))}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-start justify-end gap-1">
                        <EditParticipant participant={p} />
                        <RemoveParticipant participantId={p.id} gamerTag={p.gamerTag} status={t.status} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ icon, label, value, gold }: { icon: React.ReactNode; label: string; value: string; gold?: boolean }) {
  return (
    <div className={gold ? "surface border-gold/35 bg-gold/[0.06] p-4" : "surface p-4"}>
      <dt className={`flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] ${gold ? "text-gold" : "text-muted-foreground"} [&_svg]:size-3.5`}>
        {icon}
        {label}
      </dt>
      <dd className="mt-2 truncate font-display text-2xl font-bold uppercase" title={value}>
        {value}
      </dd>
    </div>
  );
}

const PLACE = {
  1: { label: "Campeón", icon: Crown, tone: "text-gold border-gold/40 bg-gold/[0.07]" },
  2: { label: "2º lugar", icon: Medal, tone: "text-silver border-silver/30 bg-silver/[0.05]" },
} as const;

function PlaceBadge({ place }: { place: 1 | 2 }) {
  const { label, icon: Icon, tone } = PLACE[place];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-[0.14em]",
        tone,
      )}
    >
      <Icon className="size-3" aria-hidden />
      {label}
    </span>
  );
}

/** User ID y Server ID en columnas separadas, cada uno con su botón de copiar. */
function IdCells({ participant }: { participant: AdminParticipantView }) {
  if (!participant.mobileLegendsId) {
    return (
      <td colSpan={2} className="px-4 py-3 font-medium text-destructive">
        Falta · edítalo
      </td>
    );
  }
  const parsed = parseMobileLegendsId(participant.mobileLegendsId);
  // Inscripciones viejas con un ID que no tiene la forma «123 (4567)»: se muestra tal cual.
  if (!parsed) {
    return (
      <td colSpan={2} className="px-4 py-3 text-muted-foreground">
        {participant.mobileLegendsId} <span className="text-xs text-destructive">· revisa el formato</span>
      </td>
    );
  }
  return (
    <>
      <td className="px-4 py-3">
        <span className="flex items-center gap-1 font-mono tabular-nums">
          {parsed.userId}
          <CopyButton value={parsed.userId} label={`User ID de ${participant.gamerTag}`} />
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="flex items-center gap-1 font-mono tabular-nums">
          {parsed.serverId}
          <CopyButton value={parsed.serverId} label={`Server ID de ${participant.gamerTag}`} />
        </span>
      </td>
    </>
  );
}

function PodiumCard({ player, place }: { player: AdminParticipantView; place: 1 | 2 }) {
  const { label, icon: Icon, tone } = PLACE[place];
  const parsed = parseMobileLegendsId(player.mobileLegendsId);
  return (
    <div className={cn("surface flex flex-col gap-4 p-5", tone)}>
      <div className="flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-current">
          <Icon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="font-display text-[11px] font-bold uppercase tracking-[0.18em]">{label}</p>
          <p className="truncate font-display text-2xl font-bold uppercase text-foreground" title={player.gamerTag}>
            {player.gamerTag}
          </p>
        </div>
      </div>
      {parsed ? (
        <dl className="grid grid-cols-2 gap-3 text-sm">
          {(
            [
              ["User ID", parsed.userId],
              ["Server ID", parsed.serverId],
            ] as const
          ).map(([k, v]) => (
            <div key={k} className="rounded-md border border-white/[0.07] bg-black/25 px-3 py-2">
              <dt className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{k}</dt>
              <dd className="flex items-center justify-between gap-2 font-mono text-base tabular-nums text-foreground">
                {v}
                <CopyButton value={v} label={`${k} de ${player.gamerTag}`} />
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-sm text-destructive">
          {player.mobileLegendsId ? `ID: ${player.mobileLegendsId} · revisa el formato` : "Sin ID · edítalo en la tabla"}
        </p>
      )}
    </div>
  );
}
