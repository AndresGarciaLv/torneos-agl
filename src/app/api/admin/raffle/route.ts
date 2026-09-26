import type { NextRequest } from "next/server";
import { raffleActionSchema } from "@/core/application/schemas";
import { container } from "@/infrastructure/container";
import { requireAdmin } from "@/lib/admin-session";
import { assertSameOrigin, errorResponse, json, readJson } from "@/lib/http";

/** Estado de la ruleta actual. */
export async function GET() {
  const c = container();
  try {
    await requireAdmin();
    return json(await c.manageRaffle.view());
  } catch (error) {
    return errorResponse(error, (e, f) => c.logger.error(e, f));
  }
}

/** Crear ruleta, agregar o quitar a alguien a mano, o girar. */
export async function POST(req: NextRequest) {
  const c = container();
  try {
    assertSameOrigin(req);
    await requireAdmin();
    const command = await readJson(req, raffleActionSchema);
    switch (command.action) {
      case "create":
        return json({ view: await c.manageRaffle.create(command.keyword, command.prize) });
      case "add":
        return json({ view: await c.manageRaffle.addManual(command.user) });
      case "remove":
        return json({ view: await c.manageRaffle.remove(command.user) });
      case "spin":
        return json(await c.manageRaffle.spin());
    }
  } catch (error) {
    return errorResponse(error, (e, f) => c.logger.error(e, f));
  }
}
