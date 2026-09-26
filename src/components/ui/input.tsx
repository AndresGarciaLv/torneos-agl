import type * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-12 w-full min-w-0 rounded-md border border-input bg-black/40 px-4 text-base text-foreground",
        "placeholder:text-muted-foreground/70 transition-[border-color,box-shadow] outline-none",
        "focus-visible:border-brand/70 focus-visible:ring-3 focus-visible:ring-brand/15",
        "aria-invalid:border-destructive/70 aria-invalid:ring-destructive/15",
        "disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
