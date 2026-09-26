import { createHash } from "node:crypto";
import { tournamentSlug } from "@/infrastructure/config/env";
import { container } from "@/infrastructure/container";
import { errorResponse, json } from "@/lib/http";

/**
 * Huella del estado público (inscritos, cuadro, ganadores). Los navegadores la
 * consultan cada pocos segundos y solo recargan cuando cambia. El CDN la guarda
 * 2 s: con 500 personas mirando, la base recibe una consulta cada 2 s, no 500.
 */
export async function GET() {
  const c = container();
  try {
    const view = await c.getPublicTournament.execute(tournamentSlug());
    // generatedAt cambia en cada lectura: no cuenta como cambio del torneo.
    const state = JSON.stringify({ ...view, generatedAt: null });
    const v = createHash("sha256").update(state).digest("base64url").slice(0, 16);
    return json({ v }, { headers: { "CDN-Cache-Control": "public, max-age=2, stale-while-revalidate=2" } });
  } catch (error) {
    return errorResponse(error, (e, f) => c.logger.error(e, f));
  }
}
