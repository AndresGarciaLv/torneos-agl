import "server-only";
import { ControlEvent, TikTokLiveConnection, UserOfflineError, WebcastEvent } from "tiktok-live-connector";
import type { LiveChatSource } from "@/core/ports/services";

export class LiveOfflineError extends Error {
  constructor() {
    super("El live no está activo. Inicia el directo en TikTok y vuelve a intentar.");
    this.name = "LiveOfflineError";
  }
}

/**
 * Chat de TikTok LIVE con tiktok-live-connector. No es una API oficial: lee el
 * servicio interno del live con firmas de Euler Stream (gratis con límite; con
 * EULER_API_KEY el límite sube). Si TikTok cambia algo puede dejar de funcionar:
 * por eso el panel también permite agregar participantes a mano.
 */
export class TikTokLiveChat implements LiveChatSource {
  constructor(
    private readonly username: string,
    private readonly signApiKey: string | undefined,
  ) {}

  async listen(
    handlers: Parameters<LiveChatSource["listen"]>[0],
    signal: AbortSignal,
  ): Promise<void> {
    if (signal.aborted) return;
    const connection = new TikTokLiveConnection(this.username, {
      signApiKey: this.signApiKey,
      // Los comentarios anteriores a abrir la ruleta no cuentan.
      processInitialData: false,
    });

    const closed = new Promise<void>((resolve) => connection.on(ControlEvent.DISCONNECTED, () => resolve()));
    // En los mensajes v3 el @usuario viene en `displayId` y el texto en `content`.
    connection.on(WebcastEvent.CHAT, (data) => {
      const user = data.user?.displayId;
      if (!user || !data.content) return;
      handlers.onComment({ user, nickname: data.user?.nickname || user, comment: data.content });
    });
    connection.on(WebcastEvent.ROOM_USER, (data) => {
      const viewers = Number(data.total);
      if (Number.isFinite(viewers)) handlers.onViewers(viewers);
    });

    const stop = () => void connection.disconnect().catch(() => undefined);
    signal.addEventListener("abort", stop, { once: true });
    try {
      await connection.connect();
    } catch (error) {
      signal.removeEventListener("abort", stop);
      if (error instanceof UserOfflineError) throw new LiveOfflineError();
      throw error;
    }
    handlers.onConnected();
    await closed;
    signal.removeEventListener("abort", stop);
  }
}
