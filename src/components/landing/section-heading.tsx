import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  className,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center text-center", className)}>
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-3 text-4xl font-extrabold uppercase leading-none tracking-tight sm:text-5xl">{title}</h2>
      {subtitle && <p className="mt-3 max-w-xl text-muted-foreground">{subtitle}</p>}
      <span aria-hidden className="mt-5 h-px w-16 bg-gradient-to-r from-transparent via-brand to-transparent" />
    </div>
  );
}
