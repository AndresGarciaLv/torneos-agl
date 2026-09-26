import type { NextRequest } from "next/server";
import { z } from "zod";
import { container } from "@/infrastructure/container";
import { requireAdmin } from "@/lib/admin-session";
import { assertSameOrigin, errorResponse, json, readJson } from "@/lib/http";

const donorActionSchema = z.object({ action: z.literal("reset") });

/** Top de donadores actual (para el panel). */
export async function GET() {
  const c = container();
  try {
    await requireAdmin();
    return json({ donors: await c.donorBoard.top() });
  } catch (error) {
    return errorResponse(error, (e, f) => c.logger.error(e, f));
  }
}

/** Reinicia el ranking: los regalos anteriores dejan de contar (siguen guardados). */
export async function POST(req: NextRequest) {
  const c = container();
  try {
    assertSameOrigin(req);
    await requireAdmin();
    await readJson(req, donorActionSchema);
    await c.donorBoard.reset();
    return json({ ok: true, donors: await c.donorBoard.top() });
  } catch (error) {
    return errorResponse(error, (e, f) => c.logger.error(e, f));
  }
}
