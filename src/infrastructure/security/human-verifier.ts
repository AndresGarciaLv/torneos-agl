import type { HumanVerifier } from "@/core/ports/services";

/**
 * Sin CAPTCHA (configuración inicial). Para activar Cloudflare Turnstile o
 * hCaptcha basta con otro adaptador de HumanVerifier en `container.ts` y el
 * widget en el formulario, que ya envía `captchaToken`. El caso de uso no cambia.
 */
export class DisabledHumanVerifier implements HumanVerifier {
  readonly enabled = false;
  async verify(): Promise<boolean> {
    return true;
  }
}
