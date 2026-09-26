"use client";

import { Loader2, RotateCcw, Shuffle, Undo2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { TournamentStatus } from "@/core/domain/tournament";
import { useAdminAction } from "./use-admin-action";

const MIN = 2;

export function BracketControls({
  status,
  participantCount,
  matchesDecided,
}: {
  status: TournamentStatus;
  participantCount: number;
  matchesDecided: number;
}) {
  const { run, busy, error, notice } = useAdminAction();

  const summary = (d: Record<string, unknown>) =>
    `Sorteo listo: ${String(d.participants)} jugadores en un cuadro de ${String(d.size)}` +
    (Number(d.byes) > 0 ? ` (${String(d.byes)} BYE).` : ".");

  return (
    <section className="surface flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="font-display text-xl font-bold uppercase">Sorteo</h2>
        <p className="text-sm text-muted-foreground">
          {status === "registration"
            ? participantCount < MIN
              ? `Se necesitan al menos ${MIN} inscritos para sortear.`
              : `Sortear cierra las inscripciones y arma el cuadro con los ${participantCount} inscritos.`
            : status === "finished"
              ? "El torneo terminó."
              : "Las llaves están sorteadas y publicadas."}
        </p>
        {error && (
          <p role="alert" className="mt-2 text-sm text-destructive">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="mt-2 text-sm text-brand-300">
            {notice}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        {status === "registration" ? (
          <Button
            disabled={busy || participantCount < MIN}
            onClick={() => run("/api/admin/bracket", { action: "generate" }, summary)}
          >
            {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Shuffle aria-hidden />} Sortear bracket
          </Button>
        ) : (
          <>
            {status !== "finished" && (
              <Confirm
                trigger={
                  <Button variant="outline" disabled={busy}>
                    <RotateCcw aria-hidden /> Regenerar bracket
                  </Button>
                }
                title="¿Volver a sortear?"
                description={
                  matchesDecided > 0
                    ? `Se borran las llaves actuales y los ${matchesDecided} resultados ya cargados. Todos los jugadores vuelven a sortearse.`
                    : "Se borran las llaves actuales y se hace un sorteo nuevo con los mismos inscritos."
                }
                confirmLabel="Sí, regenerar"
                onConfirm={() => run("/api/admin/bracket", { action: "regenerate", confirm: true }, summary)}
              />
            )}
            <Confirm
              trigger={
                <Button variant="ghost" disabled={busy}>
                  <Undo2 aria-hidden /> Reabrir inscripciones
                </Button>
              }
              title="¿Reabrir inscripciones?"
              description="Se borra el bracket y sus resultados, y el formulario vuelve a aceptar inscripciones. Los inscritos se conservan."
              confirmLabel="Sí, reabrir"
              onConfirm={() =>
                run("/api/admin/bracket", { action: "reset", confirm: true }, () => "Inscripciones reabiertas.")
              }
            />
          </>
        )}
      </div>
    </section>
  );
}

function Confirm({
  trigger,
  title,
  description,
  confirmLabel,
  onConfirm,
}: {
  trigger: React.ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{confirmLabel}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
