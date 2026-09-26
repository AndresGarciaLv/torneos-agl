import type * as React from "react";

/** Nota musical de TikTok como glifo genérico (lucide no trae logotipos de marcas). */
export function TikTokIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5 2.6 2.6 0 0 1-2.6-2.6 2.6 2.6 0 0 1 3.37-2.48V9.66A5.73 5.73 0 0 0 4.15 15.3a5.74 5.74 0 0 0 5.71 5.7 5.73 5.73 0 0 0 5.73-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3a4.3 4.3 0 0 1-3.29-1.48Z" />
    </svg>
  );
}
