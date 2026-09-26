import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { LoginForm } from "@/components/admin/login-form";
import { LogoutButton } from "@/components/admin/logout-button";
import { LiveSync } from "@/components/live-sync";
import { tournamentSlug } from "@/infrastructure/config/env";
import { container } from "@/infrastructure/container";
import { isAdmin } from "@/lib/admin-session";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Administración",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const authed = await isAdmin();

  return (
    <div className="min-h-dvh">
      <header className="border-b border-white/[0.06] bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src={site.logo} alt="" width={36} height={32} className="h-8 w-auto" />
            <span className="font-display text-lg font-bold uppercase tracking-wider">
              Monster<span className="text-brand">_AGL</span>
              <span className="ml-2 text-sm text-muted-foreground">Admin</span>
            </span>
          </Link>
          {authed && (
            <div className="flex items-center gap-2">
              <Link
                href="/admin/ruleta"
                className="rounded-md border border-gold/40 bg-gold/[0.07] px-3 py-1.5 font-display text-sm font-bold uppercase tracking-wide text-gold transition-colors hover:bg-gold/15"
              >
                Ruleta
              </Link>
              <LogoutButton />
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        {authed ? <AdminDashboard dashboard={await container().getAdminDashboard.execute(tournamentSlug())} /> : <LoginForm />}
        {authed && <LiveSync />}
      </main>
    </div>
  );
}
