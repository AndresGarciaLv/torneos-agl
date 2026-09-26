import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 font-display text-[11px] font-semibold uppercase tracking-[0.18em] [&_svg]:size-3",
  {
    variants: {
      variant: {
        default: "border-brand/30 bg-brand/10 text-brand-300",
        outline: "border-white/12 bg-white/[0.03] text-silver",
        gold: "border-gold/35 bg-gold/10 text-gold",
        muted: "border-white/8 bg-white/[0.02] text-muted-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Badge({ className, variant, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
