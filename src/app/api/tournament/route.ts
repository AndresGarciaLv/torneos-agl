import { tournamentSlug } from "@/infrastructure/config/env";
import { container } from "@/infrastructure/container";
import { errorResponse, json } from "@/lib/http";

/** Vista pública del torneo: Gamer Tags y cuadro. Nunca correos. */
export async function GET() {
  const c = container();
  try {
    const view = await c.getPublicTournament.execute(tournamentSlug());
    return json(view);
  } catch (error) {
    return errorResponse(error, (e, f) => c.logger.error(e, f));
  }
}
