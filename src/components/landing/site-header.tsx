import Image from "next/image";
import Link from "next/link";
import { site } from "@/lib/site";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Inicio">
          <Image src={site.logo} alt="" width={36} height={32} className="h-8 w-auto" />
          <span className="font-display text-lg font-bold uppercase tracking-wider">
            Monster<span className="text-brand">_AGL</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <a href="#premios" className="hidden rounded-md px-3 py-2 text-muted-foreground hover:text-foreground sm:block">
            Premios
          </a>
          <a href="#bracket" className="hidden rounded-md px-3 py-2 text-muted-foreground hover:text-foreground sm:block">
            Bracket
          </a>
          <a
            href={site.tiktokUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium text-silver transition-colors hover:border-brand/50 hover:text-brand-300"
          >
            <span className="relative flex size-2">
              <span className="absolute inset-0 rounded-full bg-brand opacity-60 motion-safe:animate-ping [animation-iteration-count:3]" />
              <span className="relative size-2 rounded-full bg-brand" />
            </span>
            {site.handle}
          </a>
        </nav>
      </div>
    </header>
  );
}
