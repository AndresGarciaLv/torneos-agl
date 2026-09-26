import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Inter } from "next/font/google";
import { site } from "@/lib/site";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const barlow = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-barlow",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: "Torneo 1 vs 1 · Monster_AGL", template: "%s · Monster_AGL" },
  description:
    "Torneo 1 vs 1 de Mobile Legends: Bang Bang de la comunidad Monster_AGL. Domingo 27 de septiembre, 4:00 PM CDMX. Premios: Pase VIP mensual y Pase semanal.",
  openGraph: {
    title: "Monster_AGL — Torneo 1 vs 1",
    description: "Inscríbete, entra al sorteo y demuestra quién manda en Mobile Legends. Domingo 27 · 4:00 PM CDMX.",
    images: [{ url: site.logo, width: 1007, height: 890, alt: "Logo de Monster_AGL" }],
    locale: "es_MX",
    type: "website",
  },
  icons: { icon: site.logo },
};

export const viewport: Viewport = {
  themeColor: "#050706",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-MX" className={`${inter.variable} ${barlow.variable}`}>
      <body>{children}</body>
    </html>
  );
}
