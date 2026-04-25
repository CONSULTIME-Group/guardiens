/**
 * SVG fallbacks ultra-légers pour les états vides.
 * Affichés uniquement si le WebP gouache échoue à charger (réseau, 404, blocage).
 * Style : trait simple, palette sémantique du site (currentColor + tons crème/sapin/terre).
 * Pas de dégradés complexes — l'objectif est d'éviter le blanc, pas de remplacer la peinture.
 */

import type { IllustrationKey } from "./EmptyState";
// Note : import type pur — n'introduit pas de cycle runtime.

/* Couleurs alignées sur la palette gouache : sapin, terre, crème.
   Utilise des HSL fixes (pas de tokens) car les SVG inline doivent rester
   stables même si le thème change — l'opacité s'adapte via mix-blend-multiply. */
const INK = "hsl(150, 47%, 23%)"; // vert sapin profond
const WARM = "hsl(28, 42%, 41%)"; // terre brune
const SOFT = "hsl(35, 45%, 92%)"; // crème
const ACCENT = "hsl(355, 65%, 58%)"; // rouge gouache (cœur, accents)

const baseProps = {
  viewBox: "0 0 200 200",
  xmlns: "http://www.w3.org/2000/svg",
  fill: "none",
  stroke: INK,
  strokeWidth: 2.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const SleepingCatSvg = () => (
  <svg {...baseProps}>
    <ellipse cx="100" cy="140" rx="70" ry="14" fill={SOFT} stroke="none" />
    <path d="M40 130 Q40 95 75 90 Q100 70 130 90 Q160 95 160 130 Z" fill={WARM} fillOpacity="0.25" />
    <path d="M55 105 L65 80 L78 100" />
    <path d="M145 105 L135 80 L122 100" />
    <path d="M85 115 q5 -4 10 0" />
    <path d="M105 115 q5 -4 10 0" />
    <path d="M95 125 q5 4 10 0" />
    <path d="M70 130 Q100 145 130 130" />
  </svg>
);

const EmptyMailboxSvg = () => (
  <svg {...baseProps}>
    <rect x="55" y="70" width="90" height="70" rx="8" fill={SOFT} />
    <path d="M55 80 L100 110 L145 80" />
    <line x1="100" y1="140" x2="100" y2="170" />
    <rect x="85" y="170" width="30" height="6" fill={WARM} stroke="none" />
    <circle cx="160" cy="55" r="8" fill={ACCENT} fillOpacity="0.35" stroke={ACCENT} />
  </svg>
);

const WalkingDogSvg = () => (
  <svg {...baseProps}>
    <ellipse cx="100" cy="155" rx="65" ry="10" fill={SOFT} stroke="none" />
    <path d="M55 120 Q55 95 80 95 L120 95 Q145 95 145 120 L140 145 L120 145 L120 130 L80 130 L80 145 L60 145 Z" fill={WARM} fillOpacity="0.3" />
    <circle cx="55" cy="100" r="14" fill={WARM} fillOpacity="0.3" />
    <path d="M48 90 L42 80" />
    <path d="M55 96 L52 100" />
    <path d="M145 110 Q160 105 165 90" />
  </svg>
);

const EmptyCalendarSvg = () => (
  <svg {...baseProps}>
    <rect x="45" y="55" width="110" height="105" rx="8" fill={SOFT} />
    <line x1="45" y1="80" x2="155" y2="80" />
    <line x1="70" y1="45" x2="70" y2="65" />
    <line x1="130" y1="45" x2="130" y2="65" />
    <circle cx="75" cy="105" r="3" fill={INK} stroke="none" />
    <circle cx="100" cy="105" r="3" fill={INK} stroke="none" />
    <circle cx="125" cy="105" r="3" fill={INK} stroke="none" />
    <circle cx="75" cy="130" r="3" fill={INK} stroke="none" />
    <circle cx="100" cy="130" r="6" fill={ACCENT} stroke="none" />
    <circle cx="125" cy="130" r="3" fill={INK} stroke="none" />
  </svg>
);

const HeartBookmarkSvg = () => (
  <svg {...baseProps}>
    <path d="M70 50 L130 50 L130 165 L100 145 L70 165 Z" fill={SOFT} />
    <path
      d="M100 110 Q85 95 85 85 Q85 75 95 75 Q100 75 100 82 Q100 75 105 75 Q115 75 115 85 Q115 95 100 110 Z"
      fill={ACCENT}
      fillOpacity="0.55"
      stroke={ACCENT}
    />
  </svg>
);

/* SitterReady : sac de voyage avec plaid plié + petite étiquette = gardien prêt à partir */
const SitterReadySvg = () => (
  <svg {...baseProps}>
    <ellipse cx="100" cy="160" rx="70" ry="8" fill={SOFT} stroke="none" />
    {/* Plaid plié */}
    <path d="M55 95 L145 95 L145 110 L55 110 Z" fill={WARM} fillOpacity="0.25" />
    <line x1="80" y1="95" x2="80" y2="110" stroke={WARM} strokeWidth="1.5" />
    <line x1="120" y1="95" x2="120" y2="110" stroke={WARM} strokeWidth="1.5" />
    {/* Sac */}
    <path d="M55 110 L145 110 L140 155 L60 155 Z" fill={WARM} fillOpacity="0.4" />
    <path d="M85 110 Q85 95 100 95 Q115 95 115 110" stroke={INK} fill="none" />
    {/* Étiquette */}
    <line x1="100" y1="135" x2="115" y2="148" stroke={INK} strokeWidth="1.5" />
    <rect x="113" y="146" width="14" height="10" rx="1.5" fill={ACCENT} fillOpacity="0.5" stroke={ACCENT} />
  </svg>
);

export const SVG_FALLBACKS: Record<IllustrationKey, () => JSX.Element> = {
  sleepingCat: SleepingCatSvg,
  emptyMailbox: EmptyMailboxSvg,
  walkingDog: WalkingDogSvg,
  emptyCalendar: EmptyCalendarSvg,
  heartBookmark: HeartBookmarkSvg,
  sitterReady: SitterReadySvg,
};
  heartBookmark: HeartBookmarkSvg,
};
