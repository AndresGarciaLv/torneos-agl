import type { NextRequest } from "next/server";
import { adminParticipantSchema } from "@/core/application/schemas";
import { tournamentSlug } from "@/infrastructure/config/env";
import { container } from "@/infrastructure/container";
import { requireAdmin } from "@/lib/admin-session";
import { assertSameOrigin, errorResponse, json, readJson } from "@/lib/http";

/** Alta manual (`add`), corrección (`edit`) o baja (`remove`) de un inscrito desde el panel. */
export async function POST(req: NextRequest) {
  const c = container();
  try {
    assertSameOrigin(req);
    await requireAdmin();
    const command = await readJson(req, adminParticipantSchema);
    const result =
      command.action === "add"
        ? await c.manageParticipants.add(tournamentSlug(), command)
        : command.action === "edit"
          ? await c.manageParticipants.edit(tournamentSlug(), command)
          : await c.manageParticipants.remove(tournamentSlug(), command.participantId);
    return json({ ok: true, ...result });
  } catch (error) {
    return errorResponse(error, (e, f) => c.logger.error(e, f));
  }
}
