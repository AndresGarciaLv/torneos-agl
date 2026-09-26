import type { Metadata } from "next";
import { DonorsOverlay } from "@/components/overlay/donors-overlay";
import { isValidOverlayKey } from "@/lib/overlay-key";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Top donadores",
  robots: { index: false, follow: false },
};

/** Overlay para TikTok LIVE Studio / OBS: fondo transparente, solo el top 3. */
export default async function DonorsOverlayPage({ searchParams }: { searchParams: Promise<{ key?: string }> }) {
  const { key } = await searchParams;
  const valid = isValidOverlayKey(key ?? null);
  return (
    <>
      <style>{"html,body{background:transparent!important;overflow:hidden}"}</style>
      {valid ? (
        <DonorsOverlay streamUrl={`/api/overlay/donors/stream?key=${encodeURIComponent(key!)}`} />
      ) : (
        <p className="p-4 font-display text-xl text-destructive">Enlace del overlay inválido.</p>
      )}
    </>
  );
}
