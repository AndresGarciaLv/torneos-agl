"use client";

import { Loader2, Trash2 } from "lucide-react";
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

/** Baja de un inscrito. Con el cuadro sorteado, su rival avanza por BYE. */
export function RemoveParticipant({
  participantId,
  gamerTag,
  status,
}: {
  participantId: string;
  gamerTag: string;
  status: TournamentStatus;
}) {
  const { run, busy, error } = useAdminAction();
  if (status === "finished") return null;

  return (
    <div className="flex flex-col items-end gap-1">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="sm" disabled={busy} aria-label={`Eliminar a ${gamerTag}`}>
            {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Trash2 aria-hidden />} Eliminar
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar a {gamerTag}?</AlertDialogTitle>
            <AlertDialogDescription>
              {status === "registration"
                ? "Se borra su inscripción y libera su lugar. Podrá volver a inscribirse."
                : "Se borra su inscripción y su rival de la ronda avanza por BYE. Los demás no cambian de lugar."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => run("/api/admin/participants", { action: "remove", participantId })}>
              Sí, eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
