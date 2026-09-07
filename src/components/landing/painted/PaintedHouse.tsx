import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * PaintedHouse : une maison simple, le foyer confié.
 * Format spot 96 px pour la section « Votre prochaine histoire commence
 * ici », posée au-dessus du titre. Le bloc est vert pin : les murs sont
 * crème, le toit brique douce, pour ressortir sur le fond.
 *
 * Technique peinture : bords déplacés par feTurbulence + feDisplacementMap,
 * grain de papier interne, passe fantôme décalée qui déborde des formes.
 * Aucune forme parfaite, aucun or.
 */
export function PaintedHouse({ className }: { className?: string }) {
  const uid = useId().replace(/:/g, "");
  const wobbleId = `maison-wobble-${uid}`;
  const grainId = `maison-grain-${uid}`;

  return (
    <svg
      viewBox="0 0 96 96"
      role="img"
      aria-label="Illustration peinte d'une maison, le foyer confié au gardien."
      className={cn("block h-24 w-24", className)}
    >
      <defs>
        <filter id={wobbleId} x="-15%" y="-15%" width="130%" height="130%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.085"
            numOctaves="2"
            seed="17"
            result="noise"
          />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="3.5" />
        </filter>
        {/* Grain confiné aux formes, fusionné par-dessus les passes. */}
        <filter id={grainId} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.8"
            numOctaves="2"
            seed="9"
            stitchTiles="stitch"
            result="n"
          />
          <feColorMatrix
            in="n"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.8 0.8 0.8 0 -1.7"
            result="speck"
          />
          <feComposite in="speck" in2="SourceAlpha" operator="in" result="clipped" />
          <feMerge>
            <feMergeNode in="SourceGraphic" />
            <feMergeNode in="clipped" />
          </feMerge>
        </filter>
      </defs>

      <g filter={`url(#${grainId})`}>

      {/* Passe fantôme décalée : débord de couleur assumé. */}
      <g filter={`url(#${wobbleId})`} opacity="0.3" transform="translate(2 2)">
        <path
          fill="#C07A54"
          d="M14,47 C28,33 42,21 48,16 C55,22 70,35 82,48 C62,44 36,44 14,47 Z"
        />
        <path
          fill="#FAF8F5"
          d="M24,46 C23,58 23,70 25,82 C40,84 58,84 72,81 C73,69 73,57 71,45 C56,43 39,43 24,46 Z"
        />
      </g>

      {/* Passe principale. */}
      <g filter={`url(#${wobbleId})`}>
        {/* Murs crème. */}
        <path
          fill="#FAF8F5"
          opacity="0.95"
          d="M24,46 C23,58 23,70 25,82 C40,84 58,84 72,81 C73,69 73,57 71,45 C56,43 39,43 24,46 Z"
        />
        {/* Toit brique douce. */}
        <path
          fill="#C07A54"
          d="M14,47 C28,33 42,21 48,16 C55,22 70,35 82,48 C62,44 36,44 14,47 Z"
        />
        {/* Cheminée. */}
        <path
          fill="#C07A54"
          opacity="0.9"
          d="M60,30 C60,25 60,20 61,16 C64,15 67,15 69,17 C69,22 69,27 68,32 Z"
        />
        {/* Porte vert pin. */}
        <path
          fill="#2C6D50"
          d="M41,60 C41,68 41,75 42,83 C46,84 51,84 55,83 C56,75 55,67 54,60 C50,58 45,58 41,60 Z"
        />
        {/* Fenêtre vert pin. */}
        <path
          fill="#2C6D50"
          opacity="0.85"
          d="M29,53 C29,58 29,62 30,66 C33,67 37,67 39,66 C40,61 40,57 39,53 C36,51 32,52 29,53 Z"
        />
        {/* Touche de lumière sur le toit. */}
        <path
          fill="#FAF8F5"
          opacity="0.4"
          d="M30,40 C36,33 42,27 47,23 C49,25 49,28 47,30 C42,34 37,39 33,44 C31,43 29,42 30,40 Z"
        />
      </g>
      </g>
    </svg>
  );
}
