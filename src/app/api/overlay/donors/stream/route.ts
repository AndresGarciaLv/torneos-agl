import type { NextRequest } from "next/server";
import type { Donor } from "@/core/domain/donors";
import { container } from "@/infrastructure/container";
import { LiveOfflineError } from "@/infrastructure/tiktok/tiktok-live-chat";
import { json } from "@/lib/http";
import { isValidOverlayKey } from "@/lib/overlay-key";

/** Vercel corta la función a los 300 s: el overlay reconecta solo (campo `retry`). */
export const maxDuration = 300;
const RUN_SECONDS = 280;
const LEASE_SECONDS = RUN_SECONDS + 10;
const WATCH_EVERY_MS = 3000;

/**
 * Server-Sent Events del top de donadores. La primera copia del overlay que
 * llega se conecta al live y guarda cada regalo; las demás leen la base cada
 * 3 s. Así hay una sola conexión a TikTok aunque el overlay esté abierto en
 * LIVE Studio y en una vista previa a la vez.
 */
export async function GET(req: NextRequest) {
  if (!isValidOverlayKey(req.nextUrl.searchParams.get("key"))) {
    return json({ error: { code: "FORBIDDEN", message: "Enlace inválido." } }, { status: 403 });
  }
  const c = container();
  const board = c.donorBoard;
  const stop = new AbortController();
  req.signal.addEventListener("abort", () => stop.abort(), { once: true });
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let open = true;
      const write = (chunk: string) => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          open = false;
        }
      };
      const send = (event: string, data: unknown) => write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      let last = "";
      const pushBoard = async () => {
        const donors: Donor[] = await board.top();
        const snapshot = JSON.stringify(donors);
        if (snapshot !== last) {
          last = snapshot;
          send("board", donors);
        }
      };

      const timer = setTimeout(() => stop.abort(), RUN_SECONDS * 1000);
      let collector = false;
      try {
        write("retry: 2000\n\n");
        await pushBoard();
        // Si la copia que escucha el live se cierra, esta toma el relevo en el siguiente ciclo.
        while (!stop.signal.aborted) {
          collector = await board.tryBecomeCollector(LEASE_SECONDS);
          if (collector) {
            send("status", { state: "connecting" });
            await board.collect(stop.signal, {
              onConnected: () => send("status", { state: "live" }),
              onChange: () => void pushBoard().catch(() => undefined),
            });
            // El live terminó o se acabó el tiempo: la siguiente conexión lo retoma.
            break;
          }
          send("status", { state: "watching" });
          await new Promise((r) => setTimeout(r, WATCH_EVERY_MS));
          if (!stop.signal.aborted) await pushBoard();
        }
      } catch (error) {
        if (error instanceof LiveOfflineError) {
          // Sin live: reintenta en 30 s y mientras tanto muestra lo guardado.
          write("retry: 30000\n\n");
          send("status", { state: "offline" });
        } else {
          c.logger.error("donors.stream_failed", { name: error instanceof Error ? error.name : "unknown" });
          write("retry: 10000\n\n");
          send("status", { state: "error" });
        }
      } finally {
        clearTimeout(timer);
        if (collector) await board.releaseCollector().catch(() => undefined);
        open = false;
        try {
          controller.close();
        } catch {
          // El overlay ya se había ido.
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
