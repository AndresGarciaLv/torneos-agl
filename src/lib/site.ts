/** Datos públicos del evento. Lo que cambia por torneo vive en PostgreSQL; esto es la promoción. */
export const site = {
  channel: "Monster_AGL",
  handle: "@monster_agl",
  /** URL pública del sitio, para las imágenes de Open Graph. */
  url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  tiktokUrl: process.env.NEXT_PUBLIC_TIKTOK_URL || "https://www.tiktok.com/@monster_agl/live",
  game: "Mobile Legends: Bang Bang",
  eventTitle: "Monster_AGL — Torneo 1 vs 1",
  dateLabel: "Sábado 26 de septiembre",
  timeLabel: "5:00 PM CDMX",
  logo: "/branding/logo-monster-agl.png",
} as const;

/** "sábado 26 de septiembre, 5:00 p.m." en la zona de Ciudad de México, sin depender del servidor. */
export function formatCdmx(iso: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: "America/Mexico_City",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}
