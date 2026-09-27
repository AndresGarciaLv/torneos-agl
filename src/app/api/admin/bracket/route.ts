import type { NextRequest } from "next/server";
import { bracketActionSchema } from "@/core/application/schemas";
import { tournamentSlug } from "@/infrastructure/config/env";
import { container } from "@/infrastructure/container";
import { requireAdmin } from "@/lib/admin-session";
import { assertSameOrigin, errorResponse, json, readJson } from "@/lib/http";

/**
 * Sortear (`generate`), volver a sortear (`regenerate`, con confirm), deshacer el cuadro y
 * reabrir inscripciones (`reset`), o cerrar/abrir el formulario (`close_registration`/`open_registration`).
 */
export async function POST(req: NextRequest) {
  const c = container();
  try {
    assertSameOrigin(req);
    await requireAdmin();
    const command = await readJson(req, bracketActionSchema);
    const result = await c.manageBracket.execute(tournamentSlug(), command);
    return json({ ok: true, ...result });
  } catch (error) {
    return errorResponse(error, (e, f) => c.logger.error(e, f));
  }
}
