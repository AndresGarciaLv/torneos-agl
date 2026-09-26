import { Crown, Radio, Swords, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { AdminDashboardView } from "@/core/application/views";
import { STATUS_LABEL } from "@/core/domain/tournament";
import { formatCdmx } from "@/lib/site";
import { AdminBracket } from "./admin-bracket";
import { BracketControls } from "./bracket-controls";

export function AdminDashboard({ dashboard }: { dashboard: AdminDashboardView }) {
  const t = dashboard.tournament;
  const current = t.currentRound !== null ? t.rounds.find((r) => r.round === t.currentRound) : undefined;
  const hasBracket = t.rounds.length > 0;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <p className="eyebrow">Panel del torneo</p>
        <h1 className="text-4xl font-extrabold uppercase leading-none sm:text-5xl">{t.name}</h1>
        <p className="text-sm text-muted-foreground first-letter:uppercase">{formatCdmx(t.startsAt)} · hora de CDMX</p>
      </div>

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={<Users aria-hidden />} label="Inscritos" value={String(t.participantCount)} />
        <Stat icon={<Radio aria-hidden />} label="Estado" value={STATUS_LABEL[t.status]} />
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

      <BracketControls status={t.status} participantCount={t.participantCount} matchesDecided={dashboard.matchesDecided} />

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
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-white/[0.07] text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">#</th>
                  <th className="px-4 py-3 font-semibold">Gamer Tag</th>
                  <th className="px-4 py-3 font-semibold">Correo (privado)</th>
                  <th className="px-4 py-3 font-semibold">ID MLBB</th>
                  <th className="px-4 py-3 font-semibold">Inscrito</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.participants.map((p, i) => (
                  <tr key={p.id} className="border-b border-white/[0.04] last:border-0">
                    <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                    <td className="px-4 py-3 font-medium">{p.gamerTag}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.email}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.mobileLegendsId ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Intl.DateTimeFormat("es-MX", {
                        timeZone: "America/Mexico_City",
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(new Date(p.createdAt))}
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
