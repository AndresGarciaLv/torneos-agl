import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { LoginForm } from "@/components/admin/login-form";
import { RaffleBoard } from "@/components/admin/raffle/raffle-board";
import { container } from "@/infrastructure/container";
import { isAdmin } from "@/lib/admin-session";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ruleta del live",
  robots: { index: false, follow: false },
};

/** Ruleta de pases semanales. Solo administración: es sorpresa para el live. */
export default async function RafflePage() {
  const authed = await isAdmin();
  return (
    <div className="min-h-dvh">
      <header className="border-b border-white/[0.06] bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/admin" className="flex items-center gap-2.5">
            <Image src={site.logo} alt="" width={36} height={32} className="h-8 w-auto" />
            <span className="font-display text-lg font-bold uppercase tracking-wider">
              Monster<span className="text-brand">_AGL</span>
              <span className="ml-2 text-sm text-muted-foreground">Ruleta</span>
            </span>
          </Link>
          <Link href="/admin" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            ← Volver al panel
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        {authed ? <RaffleBoard initial={await container().manageRaffle.view()} /> : <LoginForm />}
      </main>
    </div>
  );
}
