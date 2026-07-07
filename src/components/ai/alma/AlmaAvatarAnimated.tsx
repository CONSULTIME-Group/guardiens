/**
 * <AlmaAvatarAnimated /> — Alma en SVG vectoriel dessiné à la main, animée.
 *
 * Itération 2 : mascotte premium inspirée directement de src/assets/alma-avatar.png.
 * Bichon frisé blanc/crème, tête ronde duveteuse, oreilles tombantes larges,
 * grands yeux ronds foncés avec reflets, petit museau court, sourire discret.
 * La silhouette "boule de poils" est suggérée par des grappes de bouclettes
 * (petits cercles crème) déposées le long du pourtour de la tête, des oreilles
 * et du corps, plutôt que par des courbes lisses.
 *
 * Groupes SVG animables : .alma-head, .alma-ear-l, .alma-ear-r, .alma-eyes,
 * .alma-eyelid, .alma-tongue, .alma-body, .alma-tail, .alma-shadow.
 *
 * Toutes les animations sous prefers-reduced-motion: no-preference.
 */
import { CSSProperties, useId } from "react";
import { cn } from "@/lib/utils";

export type AlmaAnimatedMood =
  | "idle"
  | "attentive"
  | "thinking"
  | "happy"
  | "gentle"
  | "playful"
  | "sleepy";

interface Props {
  mood?: AlmaAnimatedMood;
  size?: number;
  className?: string;
  "aria-hidden"?: boolean;
}

const STYLE = `
[data-alma-animated] {
  --alma-fur-hi: #ffffff;
  --alma-fur: #f7f1e6;
  --alma-fur-shadow: #e6dcc8;
  --alma-fur-deep: #cfc2a6;
  --alma-nose: #1a130f;
  --alma-eye: #241812;
  --alma-eye-hi: #ffffff;
  --alma-mouth: #3d1a14;
  --alma-tongue: #f2a6ad;
  --alma-cheek: hsla(var(--primary), 0.16);
  --alma-shadow: rgba(20, 15, 10, 0.22);
}
[data-alma-animated] .alma-part { transform-box: fill-box; transform-origin: center; }
[data-alma-animated] .alma-head    { transform-origin: 50% 62%; }
[data-alma-animated] .alma-body    { transform-origin: 50% 92%; }
[data-alma-animated] .alma-ear-l   { transform-origin: 78% 12%; }
[data-alma-animated] .alma-ear-r   { transform-origin: 22% 12%; }
[data-alma-animated] .alma-tail    { transform-origin: 12% 92%; }
[data-alma-animated] .alma-eyes    { transform-origin: 50% 50%; }
[data-alma-animated] .alma-eyelid  { transform-origin: 50% 0%; transform: scaleY(0); }
[data-alma-animated] .alma-tongue  { transform-origin: 50% 0%; transform: scaleY(0); opacity: 0; }
[data-alma-animated] .alma-shadow  { transform-origin: 50% 50%; }

@media (prefers-reduced-motion: no-preference) {
  [data-alma-animated][data-mood="idle"]    .alma-body,
  [data-alma-animated][data-mood="gentle"]  .alma-body,
  [data-alma-animated][data-mood="sleepy"]  .alma-body {
    animation: alma-a-breathe 4s ease-in-out infinite;
  }
  [data-alma-animated][data-mood="idle"]    .alma-head {
    animation: alma-a-head-bob 5.5s ease-in-out infinite;
  }
  [data-alma-animated][data-mood="idle"]    .alma-eyelid,
  [data-alma-animated][data-mood="gentle"]  .alma-eyelid {
    animation: alma-a-blink 5.2s ease-in-out infinite;
  }
  [data-alma-animated][data-mood="idle"]    .alma-tail {
    animation: alma-a-tail-slow 3.2s ease-in-out infinite;
  }
  [data-alma-animated][data-mood="idle"]    .alma-shadow {
    animation: alma-a-shadow 4s ease-in-out infinite;
  }

  [data-alma-animated][data-mood="gentle"]  .alma-body   { animation-duration: 6s; }
  [data-alma-animated][data-mood="gentle"]  .alma-head   {
    animation: alma-a-head-bob 7s ease-in-out infinite;
  }

  [data-alma-animated][data-mood="attentive"] .alma-head    {
    animation: alma-a-tilt 2.2s ease-in-out infinite;
  }
  [data-alma-animated][data-mood="attentive"] .alma-ear-l   {
    animation: alma-a-ear-perk-l 2.2s ease-in-out infinite;
  }
  [data-alma-animated][data-mood="attentive"] .alma-ear-r   {
    animation: alma-a-ear-perk-r 2.2s ease-in-out infinite;
  }
  [data-alma-animated][data-mood="attentive"] .alma-tail    {
    animation: alma-a-tail-wag 0.7s ease-in-out infinite;
  }

  [data-alma-animated][data-mood="thinking"]  .alma-head   {
    animation: alma-a-tilt-slow 3s ease-in-out infinite;
  }
  [data-alma-animated][data-mood="thinking"]  .alma-eyes   {
    animation: alma-a-eyes-scan 3s ease-in-out infinite;
  }

  [data-alma-animated][data-mood="happy"] .alma-body {
    animation: alma-a-bounce 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) 3;
  }
  [data-alma-animated][data-mood="happy"] .alma-head {
    animation: alma-a-head-happy 0.55s ease-out 3;
  }
  [data-alma-animated][data-mood="happy"] .alma-tail {
    animation: alma-a-tail-wag 0.32s ease-in-out infinite;
  }
  [data-alma-animated][data-mood="happy"] .alma-tongue {
    animation: alma-a-tongue 0.55s ease-out 3 forwards;
  }

  [data-alma-animated][data-mood="playful"] .alma-body {
    animation: alma-a-wiggle 0.6s ease-in-out infinite;
  }
  [data-alma-animated][data-mood="playful"] .alma-tail {
    animation: alma-a-tail-wag 0.28s ease-in-out infinite;
  }
  [data-alma-animated][data-mood="playful"] .alma-head {
    animation: alma-a-head-happy 0.9s ease-in-out infinite;
  }
  [data-alma-animated][data-mood="playful"] .alma-tongue {
    animation: alma-a-tongue 0.9s ease-in-out infinite;
  }

  [data-alma-animated][data-mood="sleepy"] .alma-body    { animation-duration: 7s; }
  [data-alma-animated][data-mood="sleepy"] .alma-eyelid  { transform: scaleY(0.65); }
  [data-alma-animated][data-mood="sleepy"]               { opacity: 0.88; }
}

@keyframes alma-a-breathe {
  0%,100% { transform: scale(1); }
  50%     { transform: scale(1.025, 1.035); }
}
@keyframes alma-a-shadow {
  0%,100% { transform: scaleX(1); opacity: 1; }
  50%     { transform: scaleX(1.05); opacity: 0.85; }
}
@keyframes alma-a-head-bob {
  0%,100% { transform: translateY(0) rotate(0deg); }
  50%     { transform: translateY(-0.6px) rotate(1.2deg); }
}
@keyframes alma-a-tilt {
  0%,100% { transform: rotate(-7deg); }
  50%     { transform: rotate(7deg); }
}
@keyframes alma-a-tilt-slow {
  0%,100% { transform: rotate(-5deg); }
  50%     { transform: rotate(5deg); }
}
@keyframes alma-a-head-happy {
  0%,100% { transform: translateY(0) rotate(0deg); }
  50%     { transform: translateY(-1.5px) rotate(-3deg); }
}
@keyframes alma-a-bounce {
  0%,100% { transform: translateY(0) scale(1); }
  50%     { transform: translateY(-2.5px) scale(1.03); }
}
@keyframes alma-a-wiggle {
  0%,100% { transform: rotate(0deg); }
  25%     { transform: rotate(-3deg); }
  75%     { transform: rotate(3deg); }
}
@keyframes alma-a-tail-wag {
  0%,100% { transform: rotate(-22deg); }
  50%     { transform: rotate(22deg); }
}
@keyframes alma-a-tail-slow {
  0%,100% { transform: rotate(-9deg); }
  50%     { transform: rotate(9deg); }
}
@keyframes alma-a-ear-perk-l {
  0%,100% { transform: rotate(0deg) translateY(0); }
  50%     { transform: rotate(-8deg) translateY(-1px); }
}
@keyframes alma-a-ear-perk-r {
  0%,100% { transform: rotate(0deg) translateY(0); }
  50%     { transform: rotate(8deg) translateY(-1px); }
}
@keyframes alma-a-blink {
  0%, 92%, 100% { transform: scaleY(0); }
  95%, 97%      { transform: scaleY(1); }
}
@keyframes alma-a-eyes-scan {
  0%,100% { transform: translateX(-0.7px); }
  50%     { transform: translateX(0.7px); }
}
@keyframes alma-a-tongue {
  0%      { transform: scaleY(0); opacity: 0; }
  40%,80% { transform: scaleY(1); opacity: 1; }
  100%    { transform: scaleY(0); opacity: 0; }
}
`;

/**
 * Petites bouclettes déposées le long d'un contour pour créer l'effet frisé.
 * `positions` = [x, y, r] en unités du viewBox.
 */
function Curls({
  positions,
  fill = "var(--alma-fur)",
  opacity = 1,
}: {
  positions: Array<[number, number, number]>;
  fill?: string;
  opacity?: number;
}) {
  return (
    <>
      {positions.map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill={fill} opacity={opacity} />
      ))}
    </>
  );
}

// Bouclettes du pourtour de la tête (silhouette festonnée)
const HEAD_OUTER_CURLS: Array<[number, number, number]> = [
  // Sommet du crâne
  [34, 22, 5], [42, 18, 5.5], [50, 16, 6], [58, 18, 5.5], [66, 22, 5],
  // Côtés hauts
  [28, 30, 5], [72, 30, 5],
  // Joues
  [26, 42, 5.5], [74, 42, 5.5],
  [27, 52, 5], [73, 52, 5],
  // Menton
  [34, 62, 5], [42, 65, 5.5], [50, 66, 5.5], [58, 65, 5.5], [66, 62, 5],
];

// Highlights blancs (mèches claires) pour donner du volume
const HEAD_HIGHLIGHTS: Array<[number, number, number]> = [
  [42, 22, 3.5], [50, 20, 4], [58, 22, 3.5],
  [34, 34, 3], [66, 34, 3],
  [30, 46, 2.5], [70, 46, 2.5],
];

// Ombres douces internes
const HEAD_SHADOWS: Array<[number, number, number]> = [
  [30, 50, 4], [70, 50, 4],
  [40, 60, 3], [60, 60, 3],
];

// Bouclettes du pourtour du corps
const BODY_CURLS: Array<[number, number, number]> = [
  [22, 74, 4.5], [26, 82, 5], [30, 90, 4.5],
  [70, 90, 4.5], [74, 82, 5], [78, 74, 4.5],
  [38, 92, 4], [50, 93, 4.5], [62, 92, 4],
];

// Bouclettes des oreilles (droite = x haut, gauche = x bas)
const EAR_R_CURLS: Array<[number, number, number]> = [
  [12, 40, 5], [10, 48, 5], [12, 56, 5], [16, 62, 4.5], [22, 62, 4],
];
const EAR_L_CURLS: Array<[number, number, number]> = [
  [88, 40, 5], [90, 48, 5], [88, 56, 5], [84, 62, 4.5], [78, 62, 4],
];

export function AlmaAvatarAnimated({
  mood = "idle",
  size = 40,
  className,
  ...rest
}: Props) {
  const ariaHidden = rest["aria-hidden"];
  const uid = useId().replace(/:/g, "");
  const gHead = `alma-head-${uid}`;
  const gBody = `alma-body-${uid}`;
  const gMuzzle = `alma-muzzle-${uid}`;

  const style: CSSProperties = { width: size, height: size, display: "inline-block" };

  return (
    <span
      data-alma-animated=""
      data-mood={mood}
      aria-label={ariaHidden ? undefined : "Alma"}
      role={ariaHidden ? undefined : "img"}
      aria-hidden={ariaHidden}
      className={cn("select-none", className)}
      style={style}
    >
      <style>{STYLE}</style>
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        xmlns="http://www.w3.org/2000/svg"
        shapeRendering="geometricPrecision"
      >
        <defs>
          <radialGradient id={gHead} cx="45%" cy="38%" r="65%">
            <stop offset="0%" stopColor="var(--alma-fur-hi)" />
            <stop offset="55%" stopColor="var(--alma-fur)" />
            <stop offset="100%" stopColor="var(--alma-fur-shadow)" />
          </radialGradient>
          <radialGradient id={gBody} cx="50%" cy="35%" r="70%">
            <stop offset="0%" stopColor="var(--alma-fur-hi)" />
            <stop offset="60%" stopColor="var(--alma-fur)" />
            <stop offset="100%" stopColor="var(--alma-fur-shadow)" />
          </radialGradient>
          <radialGradient id={gMuzzle} cx="50%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="var(--alma-fur)" />
          </radialGradient>
        </defs>

        {/* Ombre de contact au sol */}
        <ellipse
          className="alma-part alma-shadow"
          cx="50" cy="95" rx="30" ry="3.2"
          fill="var(--alma-shadow)"
        />

        {/* Corps assis compact */}
        <g className="alma-part alma-body">
          {/* Queue en arrière-plan */}
          <g className="alma-part alma-tail">
            <ellipse cx="14" cy="80" rx="6.5" ry="9" fill="var(--alma-fur)" />
            <Curls positions={[[12, 74, 3.5], [16, 78, 3.5], [12, 86, 3.5]]} />
          </g>

          {/* Silhouette corps (ellipse duveteuse) */}
          <ellipse cx="50" cy="82" rx="30" ry="14" fill={`url(#${gBody})`} />
          {/* Bouclettes de contour */}
          <Curls positions={BODY_CURLS} />
          {/* Petites ombres sous le corps */}
          <ellipse cx="50" cy="90" rx="22" ry="3" fill="var(--alma-fur-shadow)" opacity="0.4" />
          {/* Poitrail clair */}
          <ellipse cx="50" cy="76" rx="14" ry="8" fill="#ffffff" opacity="0.6" />
        </g>

        {/* Oreilles tombantes larges (derrière la tête, dépassent en bas) */}
        <g className="alma-part alma-ear-r">
          <path
            d="M22 30 q-12 6 -12 22 q0 12 10 16 q6 2 10 -2 q0 -18 -2 -34 z"
            fill="var(--alma-fur)"
          />
          <Curls positions={EAR_R_CURLS} />
          <path
            d="M20 34 q-6 6 -6 18"
            stroke="var(--alma-fur-shadow)" strokeWidth="1.2" fill="none" opacity="0.5"
          />
        </g>
        <g className="alma-part alma-ear-l">
          <path
            d="M78 30 q12 6 12 22 q0 12 -10 16 q-6 2 -10 -2 q0 -18 2 -34 z"
            fill="var(--alma-fur)"
          />
          <Curls positions={EAR_L_CURLS} />
          <path
            d="M80 34 q6 6 6 18"
            stroke="var(--alma-fur-shadow)" strokeWidth="1.2" fill="none" opacity="0.5"
          />
        </g>

        {/* Tête */}
        <g className="alma-part alma-head">
          {/* Halo tête */}
          <ellipse cx="50" cy="40" rx="26" ry="24" fill={`url(#${gHead})`} />
          {/* Ombres douces internes */}
          <Curls positions={HEAD_SHADOWS} fill="var(--alma-fur-shadow)" opacity={0.5} />
          {/* Bouclettes du pourtour (silhouette festonnée) */}
          <Curls positions={HEAD_OUTER_CURLS} />
          {/* Highlights blancs (volume duveteux) */}
          <Curls positions={HEAD_HIGHLIGHTS} fill="var(--alma-fur-hi)" opacity={0.9} />

          {/* Toupet ondulé sur le front */}
          <path
            d="M40 22 q4 -4 10 -4 q6 0 10 4 q-3 4 -10 4 q-7 0 -10 -4 z"
            fill="#ffffff"
            opacity="0.85"
          />

          {/* Museau court blanc pour contraste avec la truffe */}
          <ellipse cx="50" cy="53" rx="12" ry="10" fill="#ffffff" opacity="0.85" />
          <ellipse cx="50" cy="53" rx="12" ry="10" fill={`url(#${gMuzzle})`} opacity="0.55" />
          {/* Joues rosées très discrètes */}
          <circle cx="35" cy="51" r="3.2" fill="var(--alma-cheek)" />
          <circle cx="65" cy="51" r="3.2" fill="var(--alma-cheek)" />

          {/* Yeux : grands ronds foncés (bichon), reflets */}
          <g className="alma-part alma-eyes">
            {/* Halo brun léger pour cerner l'œil */}
            <ellipse cx="40" cy="43" rx="4.2" ry="4.6" fill="var(--alma-mouth)" opacity="0.18" />
            <ellipse cx="60" cy="43" rx="4.2" ry="4.6" fill="var(--alma-mouth)" opacity="0.18" />
            {/* Iris foncé qui remplit l'œil */}
            <ellipse cx="40" cy="43" rx="3.6" ry="4.2" fill="var(--alma-eye)" />
            <ellipse cx="60" cy="43" rx="3.6" ry="4.2" fill="var(--alma-eye)" />
            {/* Reflets principaux */}
            <circle cx="41.3" cy="41.5" r="1.2" fill="var(--alma-eye-hi)" />
            <circle cx="61.3" cy="41.5" r="1.2" fill="var(--alma-eye-hi)" />
            {/* Micro-reflets secondaires */}
            <circle cx="38.8" cy="45" r="0.5" fill="var(--alma-eye-hi)" opacity="0.75" />
            <circle cx="58.8" cy="45" r="0.5" fill="var(--alma-eye-hi)" opacity="0.75" />
          </g>
          {/* Paupières (clignement / sleepy) */}
          <rect className="alma-part alma-eyelid" x="36" y="38.5" width="8" height="9" rx="4" fill="var(--alma-fur-shadow)" />
          <rect className="alma-part alma-eyelid" x="56" y="38.5" width="8" height="9" rx="4" fill="var(--alma-fur-shadow)" />

          {/* Nez : truffe arrondie brillante */}
          <ellipse cx="50" cy="52.5" rx="3.2" ry="2.5" fill="var(--alma-nose)" />
          <ellipse cx="49" cy="51.6" rx="1" ry="0.7" fill="#ffffff" opacity="0.55" />

          {/* Sillon vertical sous la truffe */}
          <path d="M50 55 L50 57.5" stroke="var(--alma-mouth)" strokeWidth="1" strokeLinecap="round" />

          {/* Sourire discret plus lisible en petit */}
          <path
            d="M43 58 q3.5 4.5 7 4.5 q3.5 0 7 -4.5"
            fill="none"
            stroke="var(--alma-mouth)"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Langue (apparaît en happy / playful) */}
          <g className="alma-part alma-tongue">
            <ellipse cx="50" cy="60" rx="2.2" ry="1.8" fill="var(--alma-tongue)" />
            <path d="M50 60 L50 62" stroke="#c26f7a" strokeWidth="0.5" />
          </g>
        </g>
      </svg>
    </span>
  );
}

export default AlmaAvatarAnimated;
