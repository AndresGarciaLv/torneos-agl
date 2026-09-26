"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await fetch("/api/admin/logout", { method: "POST" }).catch(() => undefined);
          router.refresh();
        })
      }
    >
      <LogOut aria-hidden /> Salir
    </Button>
  );
}
