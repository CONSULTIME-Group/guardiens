import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * PaintedKey : une clé, le geste de la remise et de la confiance.
 * Format spot 96 px pour la section « Tout a commencé avec un visa »,
 * posée en ouverture du récit à côté du titre.
 *
 * Technique peinture : bords déplacés par feTurbulence + feDisplacementMap,
 * grain de papier interne, double passe décalée terracotta / ocre pour les
 * coups de pinceau superposés. Aucune forme parfaite, aucun or.
 */
export function PaintedKey({ className }: { className?: string }) {
  const uid = useId().replace(/:/g, "");
  const wobbleId = `cle-wobble-${uid}`;
  const grainId = `cle-grain-${uid}`;

  return (
    <svg
      viewBox="0 0 96 96"
      role="img"
      aria-label="Illustration peinte d'une clé, symbole de la confiance et de la remise des clés."
      className={cn("block h-24 w-24 shrink-0", className)}
    >
      <defs>
        <filter id={wobbleId} x="-15%" y="-15%" width="130%" height="130%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.09"
            numOctaves="2"
            seed="11"
            result="noise"
          />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="3.5" />
        </filter>
        {/* Grain confiné aux formes : le bruit est découpé par l'alpha des
            passes peintes, puis fusionné par-dessus. */}
        <filter id={grainId} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.8"
            numOctaves="2"
            seed="5"
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

      {/* Passe fantôme ocre, décalée : la couleur déborde légèrement. */}
      <g filter={`url(#${wobbleId})`} opacity="0.3" transform="translate(2.5 1.5)">
        <path
          fill="#C08A3E"
          fillRule="evenodd"
          d="M46,10 C33,9 21,19 20,32 C19,45 29,56 42,57 C55,58 66,48 67,35 C68,22 59,11 46,10 Z M45,24 C39,23 33,28 32,34 C31,41 36,46 43,47 C49,48 55,43 56,36 C57,30 52,25 45,24 Z"
        />
        <path
          fill="#C08A3E"
          d="M42,55 C40,64 40,74 42,84 C45,85 49,85 52,84 C53,74 53,64 52,55 C49,56 45,56 42,55 Z"
        />
      </g>

      {/* Passe principale terracotta. */}
      <g filter={`url(#${wobbleId})`}>
        {/* Anneau de la clé, tracé à main levée avec son trou. */}
        <path
          fill="#9A6A44"
          fillRule="evenodd"
          d="M46,10 C33,9 21,19 20,32 C19,45 29,56 42,57 C55,58 66,48 67,35 C68,22 59,11 46,10 Z M45,24 C39,23 33,28 32,34 C31,41 36,46 43,47 C49,48 55,43 56,36 C57,30 52,25 45,24 Z"
        />
        {/* Tige. */}
        <path
          fill="#9A6A44"
          d="M42,55 C40,64 40,74 42,84 C45,85 49,85 52,84 C53,74 53,64 52,55 C49,56 45,56 42,55 Z"
        />
        {/* Dents du panneton, deux touches irrégulières. */}
        <path
          fill="#9A6A44"
          d="M52,68 C57,67 62,66 66,67 C67,70 67,73 66,75 C61,76 56,75 52,74 Z"
        />
        <path
          fill="#9A6A44"
          d="M52,78 C56,77 60,77 63,78 C64,81 64,84 63,86 C59,87 55,86 52,85 Z"
        />
        {/* Reflet de matière sur l'anneau. */}
        <path
          fill="#C08A3E"
          opacity="0.55"
          d="M30,22 C27,26 25,31 25,36 C27,37 30,37 31,35 C32,30 34,26 37,23 C35,21 32,21 30,22 Z"
        />
      </g>
      </g>
    </svg>
  );
}
