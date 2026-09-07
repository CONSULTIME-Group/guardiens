import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * PaintedRooftops : les toits du quartier, maisons serrées vues de loin.
 * Illustration peinte pour le bloc sombre Prétexte : format large, discret,
 * posé en bas du bloc, jamais devant le texte. Tons clairs sur vert profond.
 *
 * Technique peinture : feTurbulence + feDisplacementMap pour des bords qui
 * respirent (aucun contour net), grain de papier interne à faible opacité,
 * double passe de couleur décalée pour les coups de pinceau superposés.
 * Palette : crème, bleu gris de toit, terracotta. Pas d'or (signature
 * réservée au ring d'affinité).
 */
export function PaintedRooftops({ className }: { className?: string }) {
  const uid = useId().replace(/:/g, "");
  const wobbleId = `toits-wobble-${uid}`;
  const grainId = `toits-grain-${uid}`;
  const fadeId = `toits-fade-${uid}`;

  return (
    <svg
      viewBox="0 0 1200 230"
      role="img"
      aria-label="Illustration peinte des toits du quartier : quelques maisons serrées vues de loin."
      className={cn("block w-full h-auto", className)}
      preserveAspectRatio="xMidYMax meet"
    >
      <defs>
        {/* Bords irréguliers : déplacement de quelques pixels sur chaque forme. */}
        <filter id={wobbleId} x="-8%" y="-8%" width="116%" height="116%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.02"
            numOctaves="2"
            seed="7"
            result="noise"
          />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="9" />
        </filter>
        {/* Grain de papier interne à l'illustration. */}
        {/* Grain confiné aux formes, fusionné par-dessus les passes. */}
        <filter id={grainId} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.75"
            numOctaves="2"
            seed="3"
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
        {/* Fondu vers le haut pour que la frise s'efface dans le fond. */}
        <linearGradient id={fadeId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.35" stopColor="#fff" stopOpacity="0.85" />
          <stop offset="1" stopColor="#fff" stopOpacity="1" />
        </linearGradient>
        <mask id={`${fadeId}-mask`}>
          <rect width="1200" height="230" fill={`url(#${fadeId})`} />
        </mask>
      </defs>

      <g mask={`url(#${fadeId}-mask)`}>
       <g filter={`url(#${grainId})`}>
        {/* Passe fantôme décalée : superposition de touches, matière. */}
        <g filter={`url(#${wobbleId})`} opacity="0.28" transform="translate(7 3)">
          <path
            fill="#9A6A44"
            d="M64,182 C63,158 65,132 68,112 C94,107 128,106 152,110 C155,134 157,160 155,182 C124,187 94,187 64,182 Z"
          />
          <path
            fill="#9A6A44"
            d="M300,186 C298,150 300,110 304,76 C336,70 374,70 400,77 C404,112 405,152 403,186 C368,191 334,191 300,186 Z"
          />
          <path
            fill="#9A6A44"
            d="M560,180 C559,152 561,124 565,102 C596,96 634,96 660,102 C664,128 665,156 663,180 C628,185 594,185 560,180 Z"
          />
          <path
            fill="#9A6A44"
            d="M830,184 C829,156 831,128 834,106 C862,101 896,101 920,107 C923,132 924,160 922,184 C890,189 860,189 830,184 Z"
          />
          <path
            fill="#9A6A44"
            d="M1046,178 C1045,154 1047,130 1050,112 C1076,107 1108,107 1130,112 C1133,134 1134,158 1132,178 C1102,183 1074,183 1046,178 Z"
          />
        </g>

        {/* Passe principale : murs crème, toits bleu gris. */}
        <g filter={`url(#${wobbleId})`}>
          {/* Maison 1 */}
          <path
            fill="#FAF8F5"
            opacity="0.92"
            d="M64,182 C63,158 65,132 68,112 C94,107 128,106 152,110 C155,134 157,160 155,182 C124,187 94,187 64,182 Z"
          />
          <path
            fill="#7C93A0"
            opacity="0.95"
            d="M54,114 C74,94 98,78 112,68 C128,78 148,96 164,112 C130,106 92,107 54,114 Z"
          />
          <path
            fill="#7C93A0"
            opacity="0.9"
            d="M132,84 C132,76 132,68 133,62 C137,60 141,60 144,62 C145,70 145,78 144,86 Z"
          />
          {/* Maison 2, la plus haute */}
          <path
            fill="#FAF8F5"
            opacity="0.9"
            d="M300,186 C298,150 300,110 304,76 C336,70 374,70 400,77 C404,112 405,152 403,186 C368,191 334,191 300,186 Z"
          />
          <path
            fill="#7C93A0"
            opacity="0.95"
            d="M292,79 C314,58 340,44 354,36 C370,46 394,62 412,78 C374,71 332,72 292,79 Z"
          />
          {/* Maison 3 */}
          <path
            fill="#FAF8F5"
            opacity="0.88"
            d="M560,180 C559,152 561,124 565,102 C596,96 634,96 660,102 C664,128 665,156 663,180 C628,185 594,185 560,180 Z"
          />
          <path
            fill="#7C93A0"
            opacity="0.92"
            d="M552,104 C576,88 604,76 616,70 C630,78 650,90 668,102 C630,97 590,98 552,104 Z"
          />
          {/* Maison 4 */}
          <path
            fill="#FAF8F5"
            opacity="0.9"
            d="M830,184 C829,156 831,128 834,106 C862,101 896,101 920,107 C923,132 924,160 922,184 C890,189 860,189 830,184 Z"
          />
          <path
            fill="#7C93A0"
            opacity="0.94"
            d="M822,108 C844,90 868,76 880,68 C894,78 914,92 930,106 C896,100 858,101 822,108 Z"
          />
          {/* Maison 5 */}
          <path
            fill="#FAF8F5"
            opacity="0.88"
            d="M1046,178 C1045,154 1047,130 1050,112 C1076,107 1108,107 1130,112 C1133,134 1134,158 1132,178 C1102,183 1074,183 1046,178 Z"
          />
          <path
            fill="#7C93A0"
            opacity="0.92"
            d="M1038,114 C1058,96 1080,82 1092,74 C1106,84 1124,98 1138,112 C1106,107 1072,108 1038,114 Z"
          />

          {/* Fenêtres : touches de terracotta posées au pinceau. */}
          <path
            fill="#9A6A44"
            opacity="0.8"
            d="M86,132 C86,126 87,122 89,119 C93,118 98,118 101,120 C102,125 102,130 101,134 C96,136 91,136 86,132 Z"
          />
          <path
            fill="#9A6A44"
            opacity="0.75"
            d="M120,128 C120,123 121,119 123,116 C127,115 131,115 134,117 C135,122 135,127 134,131 C129,133 124,132 120,128 Z"
          />
          <path
            fill="#9A6A44"
            opacity="0.8"
            d="M330,104 C330,98 331,93 333,89 C338,88 343,88 347,90 C348,96 348,102 347,107 C341,109 335,108 330,104 Z"
          />
          <path
            fill="#9A6A44"
            opacity="0.75"
            d="M362,100 C362,95 363,90 365,87 C369,86 374,86 377,88 C378,93 378,99 377,103 C372,105 366,104 362,100 Z"
          />
          <path
            fill="#9A6A44"
            opacity="0.78"
            d="M596,126 C596,121 597,116 599,113 C603,112 608,112 611,114 C612,119 612,124 611,128 C606,130 600,130 596,126 Z"
          />
          <path
            fill="#9A6A44"
            opacity="0.75"
            d="M866,130 C866,124 867,120 869,117 C873,116 878,116 881,118 C882,123 882,128 881,132 C876,134 870,134 866,130 Z"
          />
          <path
            fill="#9A6A44"
            opacity="0.78"
            d="M1080,132 C1080,127 1081,122 1083,119 C1087,118 1092,118 1095,120 C1096,125 1096,130 1095,134 C1090,136 1084,136 1080,132 Z"
          />
        </g>

        {/* Ligne de sol tracée à main levée. */}
        <path
          fill="none"
          stroke="#FAF8F5"
          strokeOpacity="0.35"
          strokeWidth="2.5"
          strokeLinecap="round"
          filter={`url(#${wobbleId})`}
          d="M20,196 C120,190 260,198 400,194 C560,189 700,199 860,195 C980,192 1100,197 1180,193"
        />
       </g>
      </g>
    </svg>
  );
}
