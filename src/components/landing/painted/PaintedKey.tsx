import { useId } from "react";
import { cn } from "@/lib/utils";

export function PaintedKey({ className }: { className?: string }) {
  const uid = useId().replace(/:/g, "");
  const wobbleId = `cle-wobble-${uid}`;
  const grainId = `cle-grain-${uid}`;

  return (
    <svg
      viewBox="0 0 96 96"
      role="img"
      aria-label="Illustration peinte d'une clé, symbole de confiance."
      className={cn("block h-24 w-24 shrink-0", className)}
    >
      <defs>
        <filter id={wobbleId} x="-15%" y="-15%" width="130%" height="130%">
          <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="2" seed="21" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.6" />
        </filter>
        <filter id={grainId} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.95" numOctaves="2" seed="5" stitchTiles="stitch" result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.1  0 0 0 0 0.07  0 0 0 0 0.05  0.95 0.95 0.95 0 -1.55" result="speck" />
          <feComposite in="speck" in2="SourceAlpha" operator="in" result="clipped" />
          <feMerge>
            <feMergeNode in="SourceGraphic" />
            <feMergeNode in="clipped" />
          </feMerge>
        </filter>
      </defs>

      <g filter={`url(#${grainId})`} transform="rotate(-30 48 48)">
        <path opacity="0.22" transform="translate(3 3)" fill="#9A6A44" d="M48,8 C33,9 22,21 22,35 C22,48 31,58 44,61 C45,70 45,78 46,86 C49,88 54,88 56,86 C57,78 57,70 58,61 C70,58 79,48 79,35 C79,21 66,9 48,8 Z" />
        <g filter={`url(#${wobbleId})`}>
          <path fill="#9A6A44" d="M48,8 C33,9 22,21 22,35 C22,48 31,58 44,61 C45,70 45,78 46,86 C49,88 54,88 56,86 C57,78 57,70 58,61 C70,58 79,48 79,35 C79,21 66,9 48,8 Z" />
          <path fill="#F2ECE0" d="M49,21 C40,22 34,27 34,35 C34,42 40,47 49,48 C57,47 63,42 63,35 C63,27 57,22 49,21 Z" />
          <path fill="#9A6A44" d="M57,64 C64,64 71,64 78,65 C79,68 79,72 78,75 C71,75 64,75 57,75 Z" />
          <path fill="#9A6A44" d="M57,80 C62,80 67,80 72,81 C73,83 73,86 72,88 C67,88 62,88 57,88 Z" />
          <path fill="#7C5335" opacity="0.45" d="M46,62 C48,62 50,62 52,63 C52,72 52,80 51,87 C49,87 48,87 47,86 C46,78 46,70 46,62 Z" />
        </g>
      </g>
    </svg>
  );
}