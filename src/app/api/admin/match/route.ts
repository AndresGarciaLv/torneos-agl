import type { NextRequest } from "next/server";
import { selectWinnerSchema } from "@/core/application/schemas";
import { tournamentSlug } from "@/infrastructure/config/env";
import { container } from "@/infrastructure/container";
import { requireAdmin } from "@/lib/admin-session";
import { assertSameOrigin, errorResponse, json, readJson } from "@/lib/http";

/** Marca el ganador de un encuentro y lo hace avanzar al siguiente. */
export async function POST(req: NextRequest) {
  const c = container();
  try {
    assertSameOrigin(req);
    await requireAdmin();
    const { matchId, winnerId } = await readJson(req, selectWinnerSchema);
    const result = await c.selectWinner.execute(tournamentSlug(), matchId, winnerId);
    return json({ ok: true, ...result });
  } catch (error) {
    return errorResponse(error, (e, f) => c.logger.error(e, f));
  }
}
