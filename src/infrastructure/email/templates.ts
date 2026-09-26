import type { RegistrationNotice } from "@/core/ports/services";

/**
 * Plantillas de los dos correos de una inscripción, con el branding del torneo.
 *
 * HTML con tablas y estilos en línea: es lo único que Gmail, Outlook y Apple
 * Mail pintan igual. Siempre va una versión en texto plano al lado.
 *
 * Todo lo que escribió el participante (Gamer Tag, ID, correo) pasa por
 * `escapeHtml`: es texto de un formulario público que termina dentro de un HTML.
 */

export interface EmailLinks {
  readonly siteUrl: string;
  readonly tiktokUrl: string;
  /**
   * De dónde sale el logo: `cid:…` cuando va adjunto en el correo (se ve aunque
   * el sitio no sea público), o una URL absoluta como plan B.
   */
  readonly logoSrc: string;
}

export interface RenderedEmail {
  readonly subject: string;
  readonly html: string;
  readonly text: string;
}

/** Id del logo adjunto. El adaptador SMTP adjunta el archivo con este mismo cid. */
export const LOGO_CID = "logo-monster-agl@monster-agl";

/** Paleta del logo (la misma de globals.css). */
const C = {
  bg: "#050706",
  panel: "#0a0e0c",
  card: "#0f1512",
  border: "#1d2621",
  brand: "#44e433",
  brandDark: "#0f2a0d",
  gold: "#f2be62",
  goldDark: "#2a2112",
  text: "#eef2ef",
  muted: "#8d978f",
} as const;

const DISPLAY = "Impact,'Arial Narrow Bold','Arial Black',Arial,sans-serif";
const BODY = "Arial,Helvetica,sans-serif";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Sin barra final, para poder concatenar rutas. */
const base = (url: string) => url.replace(/\/+$/, "");

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "Sábado 26 de septiembre" y "5:00 PM", en la zona del torneo, no en la del servidor. */
function cdmx(date: Date): { day: string; time: string; full: string } {
  const tz = "America/Mexico_City";
  const day = capitalize(
    new Intl.DateTimeFormat("es-MX", { timeZone: tz, weekday: "long", day: "numeric", month: "long" }).format(date),
  ).replace(",", "");
  const time = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" }).format(date);
  return { day, time, full: `${day}, ${time}` };
}

// ── Piezas ─────────────────────────────────────────────────────────────

function layout(opts: { preheader: string; logoSrc: string; body: string; reason: string }): string {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>Monster_AGL · Torneo 1 vs 1</title>
</head>
<body style="margin:0;padding:0;background:${C.bg};" bgcolor="${C.bg}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.bg};">${escapeHtml(opts.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.bg}" style="background:${C.bg};">
<tr><td align="center" style="padding:28px 12px 36px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;font-family:${BODY};color:${C.text};">
<tr><td align="center" style="padding:0 0 18px;">
<img src="${opts.logoSrc}" width="150" alt="Monster_AGL" style="display:block;width:150px;max-width:150px;height:auto;border:0;outline:none;">
</td></tr>
<tr><td align="center" style="padding:0 0 20px;font-family:${DISPLAY};font-size:13px;letter-spacing:3px;text-transform:uppercase;color:${C.muted};">
Torneo <span style="color:${C.brand};">1 vs 1</span> &nbsp;·&nbsp; Mobile Legends
</td></tr>
<tr><td bgcolor="${C.panel}" style="background:${C.panel};border:1px solid ${C.border};border-top:4px solid ${C.brand};border-radius:14px;padding:34px 26px 30px;">
${opts.body}
</td></tr>
<tr><td align="center" style="padding:22px 12px 0;font-size:12px;line-height:18px;color:${C.muted};">
<strong style="color:${C.text};">Monster_AGL</strong> · @monster_agl en TikTok · Todos los días 8:00 PM CDMX<br>
${escapeHtml(opts.reason)}
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

const eyebrow = (text: string) =>
  `<p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:${C.brand};">${text}</p>`;

const headline = (html: string) =>
  `<h1 style="margin:0 0 14px;font-family:${DISPLAY};font-size:34px;line-height:38px;font-weight:400;text-transform:uppercase;letter-spacing:.5px;color:${C.text};">${html}</h1>`;

const para = (html: string, extra = "") =>
  `<p style="margin:0 0 18px;font-size:15px;line-height:24px;color:${C.muted};${extra}">${html}</p>`;

const sectionTitle = (text: string) =>
  `<p style="margin:26px 0 10px;font-family:${DISPLAY};font-size:18px;letter-spacing:1.5px;text-transform:uppercase;color:${C.text};">${text}</p>`;

const row = (label: string, value: string, color: string = C.text) =>
  `<tr>` +
  `<td style="padding:11px 14px 11px 0;white-space:nowrap;vertical-align:top;border-bottom:1px solid ${C.border};font-size:11px;letter-spacing:1.6px;text-transform:uppercase;color:${C.muted};">${label}</td>` +
  `<td align="right" style="padding:11px 0;border-bottom:1px solid ${C.border};font-size:15px;line-height:21px;font-weight:700;color:${color};word-break:break-word;">${value}</td>` +
  `</tr>`;

/** Tarjeta con borde verde a la izquierda, como las del sitio. */
const card = (inner: string) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 6px;">` +
  `<tr><td bgcolor="${C.card}" style="background:${C.card};border:1px solid ${C.border};border-left:3px solid ${C.brand};border-radius:10px;padding:6px 18px 8px;">` +
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${inner}</table>` +
  `</td></tr></table>`;

const button = (href: string, label: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 0;"><tr>` +
  `<td bgcolor="${C.brand}" style="background:${C.brand};border-radius:8px;">` +
  `<a href="${href}" style="display:inline-block;padding:15px 28px;font-family:${DISPLAY};font-size:16px;letter-spacing:2px;text-transform:uppercase;color:${C.bg};text-decoration:none;">${label}</a>` +
  `</td></tr></table>`;

function prizes(): string {
  const cell = (place: string, prize: string, accent: string, bg: string, side: "left" | "right") =>
    `<td width="50%" valign="top" style="padding:0 ${side === "left" ? "5px 0 0" : "0 0 5px"};">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>` +
    `<td bgcolor="${bg}" style="background:${bg};border:1px solid ${accent};border-radius:10px;padding:14px 14px 16px;">` +
    `<p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${accent};">${place}</p>` +
    `<p style="margin:0;font-family:${DISPLAY};font-size:20px;line-height:23px;text-transform:uppercase;color:${C.text};">${prize}</p>` +
    `</td></tr></table></td>`;
  return (
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>` +
    cell("1.er lugar", "Pase VIP mensual", C.gold, C.goldDark, "left") +
    cell("2.º lugar", "Pase semanal", C.brand, C.brandDark, "right") +
    `</tr></table>` +
    para(`Y habrá <strong style="color:${C.text};">más sorpresas durante el live</strong>: dinámicas y premios adicionales.`, "margin:12px 0 0;font-size:14px;")
  );
}

/** Aviso de asistencia. En dorado, como la corona: es lo único del correo que no se puede pasar por alto. */
function attendanceNotice(): string {
  return (
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:26px 0 0;"><tr>` +
    `<td bgcolor="${C.goldDark}" style="background:${C.goldDark};border:1px solid ${C.gold};border-radius:10px;padding:16px 18px;">` +
    `<p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:${C.gold};">Importante</p>` +
    `<p style="margin:0;font-size:14px;line-height:22px;color:${C.text};">` +
    `Si te inscribes y el día del evento no te presentas, <strong>no se te tomará en cuenta para próximos eventos</strong>. ` +
    `Si al final no puedes jugar, avísanos respondiendo este correo antes del torneo.` +
    `</p></td></tr></table>`
  );
}

function checklist(items: string[]): string {
  return (
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">` +
    items
      .map(
        (item, i) =>
          `<tr><td valign="top" width="30" style="padding:6px 0;font-family:${DISPLAY};font-size:16px;color:${C.brand};">0${i + 1}</td>` +
          `<td style="padding:6px 0;font-size:14px;line-height:22px;color:${C.muted};">${item}</td></tr>`,
      )
      .join("") +
    `</table>`
  );
}

// ── Correos ────────────────────────────────────────────────────────────

/** Confirmación para quien se inscribió, armada con lo que puso en el formulario. */
export function participantEmail(n: RegistrationNotice, links: EmailLinks): RenderedEmail {
  const tag = escapeHtml(n.gamerTag);
  const when = cdmx(n.startsAt);
  const bracketUrl = `${base(links.siteUrl)}/#bracket`;
  const mlId = n.mobileLegendsId
    ? escapeHtml(n.mobileLegendsId)
    : `<span style="font-weight:400;color:${C.muted};">No lo indicaste</span>`;

  const html = layout({
    preheader: `${n.gamerTag}, estás inscrito. ${when.day} a las ${when.time} (CDMX). Nos vemos en el campo de batalla.`,
    logoSrc: links.logoSrc,
    reason: `Recibes este correo porque ${n.gamerTag} se inscribió con esta dirección en el Torneo 1 vs 1 de Monster_AGL.`,
    body:
      eyebrow(`Inscripción confirmada · Jugador #${n.participantNumber}`) +
      headline(`¡<span style="color:${C.brand};">${tag}</span>, estás inscrito!`) +
      para(
        `Tu lugar en el <strong style="color:${C.text};">${escapeHtml(n.tournamentName)}</strong> ya está guardado. ` +
          `Guarda este correo: es tu comprobante de inscripción. Antes del torneo se hace el sorteo aleatorio y tu nickname aparecerá en el bracket.`,
      ) +
      sectionTitle("Tu pase de jugador") +
      card(
        row("Nickname", tag, C.brand) +
          row("ID de MLBB", mlId) +
          (n.email ? row("Correo", escapeHtml(n.email)) : "") +
          row("Inscripción", `#${n.participantNumber}`) +
          row("Fecha", escapeHtml(when.day)) +
          row("Hora", `${escapeHtml(when.time)} <span style="font-weight:400;color:${C.muted};">CDMX</span>`),
      ) +
      sectionTitle("Lo que está en juego") +
      prizes() +
      attendanceNotice() +
      sectionTitle("Antes del torneo") +
      checklist([
        `Entra al live de <strong style="color:${C.text};">@monster_agl</strong> en TikTok el ${escapeHtml(when.day.toLowerCase())} a las <strong style="color:${C.text};">${escapeHtml(when.time)}</strong> (CDMX).`,
        `Ten Mobile Legends actualizado y una conexión estable${n.mobileLegendsId ? "" : ", y ten a la mano tu ID de jugador"}.`,
        `Revisa tu rival en el bracket en cuanto se sortee: <a href="${bracketUrl}" style="color:${C.brand};">ver llaves</a>.`,
      ]) +
      `<div style="height:22px;line-height:22px;">&nbsp;</div>` +
      button(links.tiktokUrl, "Seguir a @monster_agl") +
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:30px 0 0;border-top:1px solid ${C.border};"><tr><td style="padding:24px 0 0;">` +
      `<p style="margin:0 0 4px;font-size:15px;color:${C.muted};">Mucha suerte, <strong style="color:${C.text};">${tag}</strong>.</p>` +
      `<p style="margin:0;font-family:${DISPLAY};font-size:26px;line-height:30px;text-transform:uppercase;color:${C.text};">Nos vemos en el <span style="color:${C.brand};">campo de batalla</span>.</p>` +
      `<p style="margin:10px 0 0;font-size:13px;letter-spacing:1px;color:${C.muted};">— Monster_AGL</p>` +
      `</td></tr></table>`,
  });

  const text = [
    `¡${n.gamerTag}, estás inscrito!`,
    "",
    `Tu lugar en el ${n.tournamentName} ya está guardado. Guarda este correo: es tu comprobante de inscripción.`,
    "Antes del torneo se hace el sorteo aleatorio y tu nickname aparecerá en el bracket.",
    "",
    "TU PASE DE JUGADOR",
    `Nickname: ${n.gamerTag}`,
    `ID de MLBB: ${n.mobileLegendsId ?? "No lo indicaste"}`,
    ...(n.email ? [`Correo: ${n.email}`] : []),
    `Inscripción: #${n.participantNumber}`,
    `Fecha: ${when.day}, ${when.time} (CDMX)`,
    "",
    "PREMIOS",
    "1.er lugar: Pase VIP mensual",
    "2.º lugar: Pase semanal",
    "Y más sorpresas durante el live.",
    "",
    "IMPORTANTE",
    "Si te inscribes y el día del evento no te presentas, no se te tomará en cuenta para próximos eventos.",
    "Si al final no puedes jugar, avísanos respondiendo este correo antes del torneo.",
    "",
    "ANTES DEL TORNEO",
    `1. Entra al live de @monster_agl en TikTok a las ${when.time} (CDMX): ${links.tiktokUrl}`,
    "2. Ten Mobile Legends actualizado y una conexión estable.",
    `3. Revisa tu rival en el bracket: ${bracketUrl}`,
    "",
    `Mucha suerte, ${n.gamerTag}. Nos vemos en el campo de batalla.`,
    "— Monster_AGL",
  ].join("\n");

  return { subject: `${n.gamerTag}, estás inscrito en el Torneo 1 vs 1 de Monster_AGL`, html, text };
}

/** Aviso al organizador. Lleva el correo del participante: solo va a esta bandeja. */
export function organizerEmail(n: RegistrationNotice, links: EmailLinks): RenderedEmail {
  const adminUrl = `${base(links.siteUrl)}/admin`;
  const registeredAt = cdmx(new Date()).full;

  const html = layout({
    preheader: `${n.gamerTag} se inscribió. Van ${n.participantNumber}.`,
    logoSrc: links.logoSrc,
    reason: "Aviso para el organizador. Contiene datos privados del participante: no lo reenvíes.",
    body:
      eyebrow(`Nueva inscripción · #${n.participantNumber}`) +
      headline(`<span style="color:${C.brand};">${escapeHtml(n.gamerTag)}</span> entra a la arena`) +
      para(
        `Se registró en el ${escapeHtml(n.tournamentName)} y ya quedó guardado en la base de datos.` +
          (n.email ? " Responder este correo le escribe directo." : ""),
      ) +
      card(
        row("Nickname", escapeHtml(n.gamerTag), C.brand) +
          row("Correo", n.email ? escapeHtml(n.email) : "—") +
          row("ID de MLBB", n.mobileLegendsId ? escapeHtml(n.mobileLegendsId) : "—") +
          row("Inscritos", String(n.participantNumber)) +
          row("Registrado", escapeHtml(registeredAt)),
      ) +
      `<div style="height:18px;line-height:18px;">&nbsp;</div>` +
      button(adminUrl, "Abrir el panel"),
  });

  const text = [
    `Nueva inscripción #${n.participantNumber} en el ${n.tournamentName}`,
    "",
    `Nickname: ${n.gamerTag}`,
    `Correo: ${n.email ?? "—"}`,
    `ID de MLBB: ${n.mobileLegendsId ?? "—"}`,
    `Inscritos: ${n.participantNumber}`,
    `Registrado: ${registeredAt} (hora de CDMX)`,
    "",
    `Panel: ${adminUrl}`,
  ].join("\n");

  return { subject: `Nuevo inscrito #${n.participantNumber}: ${n.gamerTag}`, html, text };
}
