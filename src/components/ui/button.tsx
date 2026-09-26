import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-display font-bold uppercase tracking-[0.12em]",
    "transition-[background-color,color,box-shadow,transform,border-color] duration-200 outline-none",
    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-45 active:translate-y-px",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "cut-corners shine bg-primary text-primary-foreground hover:bg-brand-400 hover:shadow-glow",
        outline:
          "cut-corners border border-white/15 bg-white/[0.03] text-foreground hover:border-brand/60 hover:bg-brand/[0.07] hover:text-brand-300",
        ghost: "rounded-md text-muted-foreground hover:bg-white/5 hover:text-foreground",
        gold: "cut-corners shine bg-gold text-[#1d1403] hover:bg-[#f7cd80] hover:shadow-glow-gold",
        destructive:
          "cut-corners border border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20",
        link: "text-brand underline-offset-4 hover:underline normal-case tracking-normal font-sans font-medium",
      },
      size: {
        default: "h-11 px-5 text-sm",
        sm: "h-9 px-3.5 text-xs",
        lg: "h-13 px-7 text-base",
        icon: "size-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button";
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
