import { useId } from "react";
import { cn } from "@/lib/utils";

export function PaintedRooftops({ className }: { className?: string }) {
  const uid = useId().replace(/:/g, "");
  const wobbleId = `toits-wobble-${uid}`;
  const grainId = `toits-grain-${uid}`;

  return (
    <svg
      viewBox="0 0 460 150"
      role="img"
      aria-label="Illustration peinte de quatre maisons aux toits de terre cuite."
      className={cn("block w-full h-auto", className)}
      preserveAspectRatio="xMidYMax meet"
    >
      <defs>
        <filter id={wobbleId} x="-8%" y="-8%" width="116%" height="116%">
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="3" seed="4" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.4" />
        </filter>
        <filter id={grainId} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="12" stitchTiles="stitch" result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.06  0 0 0 0 0.05  0 0 0 0 0.04  0.9 0.9 0.9 0 -1.5" result="speck" />
          <feComposite in="speck" in2="SourceAlpha" operator="in" result="clipped" />
          <feMerge>
            <feMergeNode in="SourceGraphic" />
            <feMergeNode in="clipped" />
          </feMerge>
        </filter>
      </defs>

      <g filter={`url(#${grainId})`}>
        <path opacity="0.22" filter={`url(#${wobbleId})`} fill="#E8E2D6" d="M26,136 C96,133 200,132 292,134 C330,135 358,136 380,138 C350,140 306,140 260,139 C186,138 96,139 26,140 Z" />

        <g opacity="0.2" transform="translate(4 4)" filter={`url(#${wobbleId})`}>
          <path fill="#E8E2D6" d="M120,133 C118,104 119,80 122,56 C148,52 176,52 202,56 C205,80 205,106 203,134 C174,136 148,136 120,133 Z" />
          <path fill="#C4714E" d="M104,60 C132,34 155,16 162,11 C171,17 197,38 218,61 C182,52 142,53 104,60 Z" />
        </g>

        <g filter={`url(#${wobbleId})`}>
          <path fill="#F2ECE0" d="M30,133 C28,114 29,98 32,84 C50,80 68,80 84,84 C87,100 87,116 85,134 C66,136 48,136 30,133 Z" />
          <path fill="#C4714E" d="M18,88 C36,68 50,56 58,50 C66,56 82,70 98,89 C72,81 44,82 18,88 Z" />
          <path fill="#D9A04E" d="M48,102 C48,110 48,116 49,122 C55,123 62,123 66,122 C67,115 67,108 66,101 C60,99 53,99 48,102 Z" />

          <path fill="#F2ECE0" d="M120,133 C118,104 119,80 122,56 C148,52 176,52 202,56 C205,80 205,106 203,134 C174,136 148,136 120,133 Z" />
          <path fill="#C4714E" d="M104,60 C132,34 155,16 162,11 C171,17 197,38 218,61 C182,52 142,53 104,60 Z" />
          <path fill="#9E5B3B" d="M186,30 C186,23 186,17 187,11 C192,9 197,10 200,12 C200,20 200,28 199,35 Z" />
          <path fill="#D9A04E" d="M136,80 C136,90 136,98 137,105 C146,106 155,106 161,105 C162,96 162,88 161,79 C152,77 143,77 136,80 Z" />
          <path fill="#D9A04E" opacity="0.7" d="M174,86 C174,94 174,101 175,107 C181,108 188,108 192,107 C193,100 193,93 192,85 C186,83 179,83 174,86 Z" />

          <path fill="#F2ECE0" d="M232,134 C230,112 231,94 234,78 C256,74 280,74 300,78 C303,96 303,116 301,134 C280,136 254,136 232,134 Z" />
          <path fill="#B3684A" d="M220,82 C242,60 259,45 266,41 C275,47 294,63 312,83 C282,75 250,76 220,82 Z" />
          <path fill="#D9A04E" opacity="0.9" d="M250,100 C250,108 250,114 251,120 C258,121 265,121 270,120 C271,113 271,106 270,99 C263,97 256,97 250,100 Z" />

          <path fill="#F2ECE0" d="M330,134 C329,120 330,109 332,98 C348,94 364,94 378,98 C380,111 380,123 379,134 C363,136 346,136 330,134 Z" />
          <path fill="#C4714E" d="M318,102 C334,86 347,76 354,72 C362,78 374,88 388,103 C366,96 340,97 318,102 Z" />
          <path fill="#D9A04E" opacity="0.8" d="M346,112 C346,118 346,123 347,128 C352,129 358,129 362,128 C363,122 363,116 362,111 C356,109 351,109 346,112 Z" />
        </g>
      </g>
    </svg>
  );
}