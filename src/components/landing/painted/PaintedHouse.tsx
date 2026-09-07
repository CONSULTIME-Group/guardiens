import { useId } from "react";
import { cn } from "@/lib/utils";

export function PaintedHouse({ className }: { className?: string }) {
  const uid = useId().replace(/:/g, "");
  const wobbleId = `maison-wobble-${uid}`;
  const grainId = `maison-grain-${uid}`;

  return (
    <svg
      viewBox="0 0 110 110"
      role="img"
      aria-label="Illustration peinte d'une maison confiée à un gardien."
      className={cn("block h-24 w-24", className)}
    >
      <defs>
        <filter id={wobbleId} x="-15%" y="-15%" width="130%" height="130%">
          <feTurbulence type="fractalNoise" baseFrequency="0.055" numOctaves="2" seed="33" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="2" />
        </filter>
        <filter id={grainId} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" stitchTiles="stitch" result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.07  0 0 0 0 0.06  0 0 0 0 0.04  0.9 0.9 0.9 0 -1.5" result="speck" />
          <feComposite in="speck" in2="SourceAlpha" operator="in" result="clipped" />
          <feMerge>
            <feMergeNode in="SourceGraphic" />
            <feMergeNode in="clipped" />
          </feMerge>
        </filter>
      </defs>

      <g filter={`url(#${grainId})`}>
        <g opacity="0.2" transform="translate(3 4)">
          <path fill="#F2ECE0" d="M18,52 C17,70 18,88 20,103 C42,107 68,107 90,103 C92,87 92,69 90,51 C68,47 40,47 18,52 Z" />
          <path fill="#C4714E" d="M6,56 C24,36 43,20 54,13 C65,20 84,37 102,57 C74,49 36,50 6,56 Z" />
        </g>
        <g filter={`url(#${wobbleId})`}>
          <path fill="#F2ECE0" d="M18,52 C17,70 18,88 20,103 C42,107 68,107 90,103 C92,87 92,69 90,51 C68,47 40,47 18,52 Z" />
          <path fill="#C4714E" d="M6,56 C24,36 43,20 54,13 C65,20 84,37 102,57 C74,49 36,50 6,56 Z" />
          <path fill="#9E5B3B" d="M76,34 C76,28 76,22 77,16 C81,15 86,15 88,17 C88,24 88,31 87,38 Z" />
          <path fill="#9E5B3B" d="M46,76 C46,86 46,96 47,105 C53,106 61,106 67,105 C68,96 67,86 66,76 C60,73 52,73 46,76 Z" />
          <path fill="#F2ECE0" opacity="0.75" d="M62,91 C63,91 64,92 64,93 C64,95 63,96 62,96 C61,96 60,95 60,93 C60,92 61,91 62,91 Z" />
          <path fill="#D9A04E" d="M27,66 C27,74 27,81 28,88 C33,89 39,89 43,88 C44,80 44,73 43,65 C38,63 32,63 27,66 Z" />
          <path fill="#F2ECE0" opacity="0.18" d="M30,47 C37,39 44,32 50,27 C52,29 52,31 50,33 C44,37 38,43 34,49 C32,49 29,48 30,47 Z" />
        </g>
      </g>
    </svg>
  );
}