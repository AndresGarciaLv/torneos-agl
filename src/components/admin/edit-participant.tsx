"use client";

import { Loader2, Pencil } from "lucide-react";
import { useId, useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AdminParticipantView } from "@/core/application/views";
import { formatMobileLegendsId, ML_SERVER_ID, ML_USER_ID, parseMobileLegendsId } from "@/core/domain/participant";
import { useAdminAction } from "./use-admin-action";

/** Corrige Gamer Tag o ID de un inscrito. El cuadro no se mueve: guarda ids, no nombres. */
export function EditParticipant({ participant }: { participant: AdminParticipantView }) {
  const { run, busy, error, clear } = useAdminAction();
  const ids = { tag: useId(), user: useId(), server: useId() };
  const parsed = parseMobileLegendsId(participant.mobileLegendsId);
  const initial = {
    gamerTag: participant.gamerTag,
    // Un ID viejo sin la forma «123 (4567)» deja sus números en User ID para corregirlo.
    userId: parsed?.userId ?? (participant.mobileLegendsId ?? "").replace(/\D/g, ""),
    serverId: parsed?.serverId ?? "",
  };
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState(initial);
  const [idError, setIdError] = useState<string | null>(null);

  const set = (field: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setValues((v) => ({ ...v, [field]: field === "gamerTag" ? raw : raw.replace(/\D/g, "") }));
    setIdError(null);
  };

  function onOpenChange(next: boolean) {
    // Al abrir se parte de los datos actuales, no de lo que quedó escrito la vez anterior.
    if (next) {
      setValues(initial);
      setIdError(null);
      clear();
    }
    setOpen(next);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!ML_USER_ID.test(values.userId) || !ML_SERVER_ID.test(values.serverId)) {
      setIdError("El User ID lleva de 5 a 12 números y el Server ID de 2 a 6.");
      return;
    }
    const ok = await run("/api/admin/participants", {
      action: "edit",
      participantId: participant.id,
      gamerTag: values.gamerTag,
      // El correo ya no se usa en el panel: se conserva el que hubiera.
      email: participant.email,
      mobileLegendsId: formatMobileLegendsId(values.userId, values.serverId),
    });
    if (ok) setOpen(false);
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={`Editar a ${participant.gamerTag}`}>
          <Pencil aria-hidden /> Editar
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
          <AlertDialogHeader>
            <AlertDialogTitle>Editar a {participant.gamerTag}</AlertDialogTitle>
            <AlertDialogDescription>
              Los cambios se ven en el bracket al momento. Su lugar y sus resultados no cambian.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex flex-col gap-2">
            <Label htmlFor={ids.tag}>Nickname</Label>
            <Input id={ids.tag} maxLength={40} value={values.gamerTag} onChange={set("gamerTag")} required />
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor={ids.user}>User ID</Label>
              <Input
                id={ids.user}
                inputMode="numeric"
                maxLength={12}
                placeholder="454928618"
                value={values.userId}
                onChange={set("userId")}
                required
              />
            </div>
            <div className="flex w-28 flex-col gap-2">
              <Label htmlFor={ids.server}>Server ID</Label>
              <Input
                id={ids.server}
                inputMode="numeric"
                maxLength={6}
                placeholder="5207"
                value={values.serverId}
                onChange={set("serverId")}
                required
              />
            </div>
          </div>

          {(idError ?? error) && (
            <p role="alert" className="text-sm text-destructive">
              {idError ?? error}
            </p>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel type="button">Cancelar</AlertDialogCancel>
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="animate-spin" aria-hidden /> : null} Guardar
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
