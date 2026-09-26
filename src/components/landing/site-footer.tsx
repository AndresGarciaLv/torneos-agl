import { site } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/[0.06] px-4 py-10 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>
          © 2026 {site.channel}. Torneo comunitario de {site.game}.
        </p>
        <p className="max-w-md sm:text-right">
          Tu correo solo se usa para organizar el torneo y nunca se publica. En el bracket aparece únicamente tu Gamer Tag.
        </p>
      </div>
    </footer>
  );
}
