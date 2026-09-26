import type { NextRequest } from "next/server";
import { isDomainError } from "@/core/domain/errors";
import { container } from "@/infrastructure/container";
import { LiveOfflineError } from "@/infrastructure/tiktok/tiktok-live-chat";
import { requireAdmin } from "@/lib/admin-session";
import { errorResponse } from "@/lib/http";

/** La escucha vive dentro de esta función: Vercel la corta a los 300 s. */
export const maxDuration = 300;
const MAX_SECONDS = 280;

/**
 * Server-Sent Events: se conecta al chat del live y avisa de cada persona que
 * entra a la ruleta. Termina al cumplirse `seconds`, al cerrar la pestaña o si
 * el live se corta. Cada entrada ya queda guardada en PostgreSQL.
 */
export async function GET(req: NextRequest) {
  const c = container();
  try {
    await requireAdmin();
  } catch (error) {
    return errorResponse(error, (e, f) => c.logger.error(e, f));
  }
  const requested = Number(req.nextUrl.searchParams.get("seconds"));
  const seconds = Number.isFinite(requested) && requested > 0 ? Math.min(Math.max(Math.round(requested), 10), MAX_SECONDS) : 120;

  const stop = new AbortController();
  req.signal.addEventListener("abort", () => stop.abort(), { once: true });
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let open = true;
      const send = (event: string, data: unknown) => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          open = false;
        }
      };
      const timer = setTimeout(() => stop.abort(), seconds * 1000);
      send("status", { state: "connecting", seconds });
      try {
        await c.manageRaffle.listen(stop.signal, {
          onConnected: () => send("status", { state: "listening", endsAt: Date.now() + seconds * 1000 }),
          onEntry: (p) => send("entry", p),
          onViewers: (count) => send("viewers", { count }),
        });
        send("status", { state: "closed", reason: stop.signal.aborted ? "timeout" : "live_ended" });
      } catch (error) {
        const known = error instanceof LiveOfflineError || isDomainError(error);
        if (!known) c.logger.error("raffle.listen_failed", { name: error instanceof Error ? error.name : "unknown" });
        send("status", {
          state: "error",
          message: known
            ? (error as Error).message
            : "No se pudo conectar al chat de TikTok. Intenta de nuevo o agrega a los participantes a mano.",
        });
      } finally {
        clearTimeout(timer);
        open = false;
        try {
          controller.close();
        } catch {
          // Ya estaba cerrado: el panel se fue.
        }
      }
    },
    cancel() {
      stop.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
