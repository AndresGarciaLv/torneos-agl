import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import type { Logger, RegistrationNotice, RegistrationNotifier, RegistrationNotifyResult } from "@/core/ports/services";
import { LOGO_CID, organizerEmail, participantEmail, type EmailLinks, type RenderedEmail } from "./templates";

export interface SmtpConfig {
  readonly host: string;
  readonly port: number;
  readonly user: string;
  readonly pass: string;
  readonly from: string;
  /**
   * A dónde van las respuestas del participante. Brevo reescribe los remitentes
   * @gmail.com a `…@brevosend.com`; sin Reply-To, "responder" no llegaría al canal.
   */
  readonly replyTo: string;
  /** Sin destinatario solo sale la confirmación al participante. */
  readonly organizerEmail: string | null;
  /** Logo que va adjunto en cada correo (cid). Sin archivo, las plantillas usan la URL pública. */
  readonly logoPath: string | null;
}

/**
 * Envía los dos correos de una inscripción por SMTP (Brevo: smtp-relay.brevo.com:587, STARTTLS).
 *
 * Los dos salen a la vez y cada uno por su lado: si falla el del organizador,
 * el participante recibe el suyo igual. Nunca lanza, y los logs llevan solo el
 * tipo de correo y el código de error SMTP, nunca direcciones.
 */
export class SmtpRegistrationNotifier implements RegistrationNotifier {
  readonly enabled = true;
  private readonly transport: Transporter;

  constructor(
    private readonly config: SmtpConfig,
    private readonly links: Omit<EmailLinks, "logoSrc">,
    private readonly logger: Logger,
  ) {
    this.transport = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      requireTLS: config.port !== 465,
      auth: { user: config.user, pass: config.pass },
      // Un SMTP colgado no puede dejar esperando al formulario.
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });
  }

  /** Con el logo adjunto se ve siempre; con la URL, solo si el sitio es público y el cliente carga imágenes remotas. */
  private get templateLinks(): EmailLinks {
    const site = this.links.siteUrl.endsWith("/") ? this.links.siteUrl.slice(0, -1) : this.links.siteUrl;
    const logoSrc = this.config.logoPath ? `cid:${LOGO_CID}` : `${site}/branding/logo-email.png`;
    return { ...this.links, logoSrc };
  }

  async notify(notice: RegistrationNotice): Promise<RegistrationNotifyResult> {
    const links = this.templateLinks;
    const [participant, organizer] = await Promise.all([
      this.send("participant", notice.email, participantEmail(notice, links), this.config.replyTo),
      this.config.organizerEmail
        ? this.send("organizer", this.config.organizerEmail, organizerEmail(notice, links), notice.email)
        : Promise.resolve(false),
    ]);
    return { participantNotified: participant, organizerNotified: organizer };
  }

  private async send(kind: "participant" | "organizer", to: string, mail: RenderedEmail, replyTo?: string): Promise<boolean> {
    try {
      await this.transport.sendMail({
        from: this.config.from,
        to,
        replyTo,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        attachments: this.config.logoPath
          ? [{ filename: "monster-agl.png", path: this.config.logoPath, cid: LOGO_CID, contentDisposition: "inline" }]
          : [],
      });
      this.logger.info("email.sent", { kind });
      return true;
    } catch (error) {
      const e = error as { code?: string; responseCode?: number };
      this.logger.error("email.failed", { kind, code: e.code ?? "unknown", smtp: e.responseCode ?? null });
      return false;
    }
  }
}

/** Sin SMTP configurado: la inscripción funciona igual, solo que sin correos. */
export class DisabledRegistrationNotifier implements RegistrationNotifier {
  readonly enabled = false;
  async notify(): Promise<RegistrationNotifyResult> {
    return { participantNotified: false, organizerNotified: false };
  }
}
