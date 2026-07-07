/**
 * <AlmaAvatarAnimated /> — Alma en SVG vectoriel dessiné à la main, animée.
 *
 * Bichon frisé blanc/crème vu assis de face. Chaque partie (corps, tête,
 * oreilles, yeux, queue) est un groupe SVG animable indépendamment via
 * CSS keyframes ciblés par un `data-mood` sur le root.
 *
 * Toutes les animations sont sous `@media (prefers-reduced-motion: no-preference)`.
 * En reduced-motion, Alma prend une pose statique douce.
 *
 * Ne remplace pas AlmaAvatar (PNG) : utilisé pour l'instant seulement dans le
 * dock, comme présence vivante.
 */
import { CSSProperties } from "react";
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

// Styles inline scoped via [data-alma-animated] — évite un fichier CSS global.
const STYLE = `
[data-alma-animated] {
  --alma-fur: #fbf7f1;
  --alma-fur-shadow: #ebe4d7;
  --alma-fur-deep: #d9cfbd;
  --alma-nose: #2a2018;
  --alma-eye: #2a2018;
  --alma-mouth: #5b3a2e;
  --alma-cheek: hsla(var(--primary), 0.18);
  --alma-shadow: rgba(20, 15, 10, 0.22);
}
[data-alma-animated] .alma-part { transform-box: fill-box; transform-origin: center; }
[data-alma-animated] .alma-head { transform-origin: 50% 62%; }
[data-alma-animated] .alma-body { transform-origin: 50% 90%; }
[data-alma-animated] .alma-ear-l { transform-origin: 70% 20%; }
[data-alma-animated] .alma-ear-r { transform-origin: 30% 20%; }
[data-alma-animated] .alma-tail  { transform-origin: 20% 90%; }
[data-alma-animated] .alma-eyes  { transform-origin: 50% 50%; }
[data-alma-animated] .alma-eyelid { transform-origin: 50% 0%; transform: scaleY(0); }

@media (prefers-reduced-motion: no-preference) {
  /* Idle : respiration + bob tête + clignement */
  [data-alma-animated][data-mood="idle"] .alma-body,
  [data-alma-animated][data-mood="gentle"] .alma-body,
  [data-alma-animated][data-mood="sleepy"] .alma-body {
    animation: alma-a-breathe 4s ease-in-out infinite;
  }
  [data-alma-animated][data-mood="idle"] .alma-head {
    animation: alma-a-head-bob 5.5s ease-in-out infinite;
  }
  [data-alma-animated][data-mood="idle"] .alma-eyelid,
  [data-alma-animated][data-mood="gentle"] .alma-eyelid {
    animation: alma-a-blink 5.2s ease-in-out infinite;
  }
  [data-alma-animated][data-mood="idle"] .alma-tail {
    animation: alma-a-tail-slow 3.2s ease-in-out infinite;
  }

  /* Gentle : respiration lente calme */
  [data-alma-animated][data-mood="gentle"] .alma-body {
    animation-duration: 6s;
  }

  /* Attentive : oreilles relevées, tête inclinée, regard vif */
  [data-alma-animated][data-mood="attentive"] .alma-head {
    animation: alma-a-tilt 2.2s ease-in-out infinite;
  }
  [data-alma-animated][data-mood="attentive"] .alma-ear-l {
    animation: alma-a-ear-perk-l 2.2s ease-in-out infinite;
  }
  [data-alma-animated][data-mood="attentive"] .alma-ear-r {
    animation: alma-a-ear-perk-r 2.2s ease-in-out infinite;
  }
  [data-alma-animated][data-mood="attentive"] .alma-tail {
    animation: alma-a-tail-wag 0.7s ease-in-out infinite;
  }

  /* Thinking : inclinaison de tête + regard qui cherche */
  [data-alma-animated][data-mood="thinking"] .alma-head {
    animation: alma-a-tilt-slow 3s ease-in-out infinite;
  }
  [data-alma-animated][data-mood="thinking"] .alma-eyes {
    animation: alma-a-eyes-scan 3s ease-in-out infinite;
  }

  /* Happy : rebond + queue vive */
  [data-alma-animated][data-mood="happy"] .alma-body {
    animation: alma-a-bounce 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) 2;
  }
  [data-alma-animated][data-mood="happy"] .alma-head {
    animation: alma-a-head-happy 0.55s ease-out 2;
  }
  [data-alma-animated][data-mood="happy"] .alma-tail {
    animation: alma-a-tail-wag 0.35s ease-in-out infinite;
  }

  /* Playful : frétillement vif */
  [data-alma-animated][data-mood="playful"] .alma-body {
    animation: alma-a-wiggle 0.6s ease-in-out infinite;
  }
  [data-alma-animated][data-mood="playful"] .alma-tail {
    animation: alma-a-tail-wag 0.28s ease-in-out infinite;
  }
  [data-alma-animated][data-mood="playful"] .alma-head {
    animation: alma-a-head-happy 0.9s ease-in-out infinite;
  }

  /* Sleepy : respiration lente + yeux mi-clos permanents */
  [data-alma-animated][data-mood="sleepy"] .alma-body {
    animation-duration: 7s;
  }
  [data-alma-animated][data-mood="sleepy"] .alma-eyelid {
    transform: scaleY(0.55);
  }
  [data-alma-animated][data-mood="sleepy"] { opacity: 0.85; }
}

@keyframes alma-a-breathe {
  0%,100% { transform: scale(1); }
  50%     { transform: scale(1.025, 1.035); }
}
@keyframes alma-a-head-bob {
  0%,100% { transform: translateY(0) rotate(0deg); }
  50%     { transform: translateY(-0.5px) rotate(1.2deg); }
}
@keyframes alma-a-tilt {
  0%,100% { transform: rotate(-6deg); }
  50%     { transform: rotate(6deg); }
}
@keyframes alma-a-tilt-slow {
  0%,100% { transform: rotate(-4deg); }
  50%     { transform: rotate(4deg); }
}
@keyframes alma-a-head-happy {
  0%,100% { transform: translateY(0) rotate(0deg); }
  50%     { transform: translateY(-1.2px) rotate(-3deg); }
}
@keyframes alma-a-bounce {
  0%,100% { transform: translateY(0) scale(1); }
  50%     { transform: translateY(-2px) scale(1.03); }
}
@keyframes alma-a-wiggle {
  0%,100% { transform: rotate(0deg); }
  25%     { transform: rotate(-3deg); }
  75%     { transform: rotate(3deg); }
}
@keyframes alma-a-tail-wag {
  0%,100% { transform: rotate(-18deg); }
  50%     { transform: rotate(18deg); }
}
@keyframes alma-a-tail-slow {
  0%,100% { transform: rotate(-8deg); }
  50%     { transform: rotate(8deg); }
}
@keyframes alma-a-ear-perk-l {
  0%,100% { transform: rotate(0deg) translateY(0); }
  50%     { transform: rotate(-6deg) translateY(-0.5px); }
}
@keyframes alma-a-ear-perk-r {
  0%,100% { transform: rotate(0deg) translateY(0); }
  50%     { transform: rotate(6deg) translateY(-0.5px); }
}
@keyframes alma-a-blink {
  0%, 92%, 100% { transform: scaleY(0); }
  95%, 97%      { transform: scaleY(1); }
}
@keyframes alma-a-eyes-scan {
  0%,100% { transform: translateX(-0.6px); }
  50%     { transform: translateX(0.6px); }
}
`;

export function AlmaAvatarAnimated({
  mood = "idle",
  size = 40,
  className,
  ...rest
}: Props) {
  const ariaHidden = rest["aria-hidden"];

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
      >
        <defs>
          <radialGradient id="alma-body-grad" cx="50%" cy="45%" r="60%">
            <stop offset="0%" stopColor="var(--alma-fur)" />
            <stop offset="70%" stopColor="var(--alma-fur)" />
            <stop offset="100%" stopColor="var(--alma-fur-shadow)" />
          </radialGradient>
          <radialGradient id="alma-head-grad" cx="50%" cy="40%" r="65%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="60%" stopColor="var(--alma-fur)" />
            <stop offset="100%" stopColor="var(--alma-fur-shadow)" />
          </radialGradient>
        </defs>

        {/* Ombre de contact au sol */}
        <ellipse cx="50" cy="94" rx="26" ry="3.2" fill="var(--alma-shadow)" />

        {/* Corps duveteux (assis) + queue à droite */}
        <g className="alma-part alma-body">
          {/* Queue (à gauche visuellement pour ne pas gêner la face) */}
          <g className="alma-part alma-tail">
            <path
              d="M22 78 q-8 -2 -10 -12 q-1 -6 4 -9 q5 -2 8 3 q3 5 2 10 q-1 5 -4 8 z"
              fill="var(--alma-fur)"
              stroke="var(--alma-fur-deep)"
              strokeWidth="0.8"
            />
          </g>

          {/* Corps */}
          <path
            d="M50 55
               c -20 0 -30 14 -30 26
               c 0 8 6 12 12 12
               l 36 0
               c 6 0 12 -4 12 -12
               c 0 -12 -10 -26 -30 -26 z"
            fill="url(#alma-body-grad)"
            stroke="var(--alma-fur-deep)"
            strokeWidth="0.9"
          />

          {/* Petits pieds avant */}
          <ellipse cx="40" cy="90" rx="6" ry="4" fill="var(--alma-fur)" stroke="var(--alma-fur-deep)" strokeWidth="0.8" />
          <ellipse cx="60" cy="90" rx="6" ry="4" fill="var(--alma-fur)" stroke="var(--alma-fur-deep)" strokeWidth="0.8" />

          {/* Poitrail plus clair */}
          <path
            d="M50 58 q-8 8 -6 22 q6 4 12 0 q2 -14 -6 -22 z"
            fill="#ffffff"
            opacity="0.7"
          />
        </g>

        {/* Tête */}
        <g className="alma-part alma-head">
          {/* Oreilles tombantes duveteuses */}
          <g className="alma-part alma-ear-r">
            <path
              d="M28 40 q-6 0 -10 8 q-2 8 2 14 q6 4 12 -2 q4 -6 2 -14 q-2 -6 -6 -6 z"
              fill="var(--alma-fur)"
              stroke="var(--alma-fur-deep)"
              strokeWidth="0.9"
            />
          </g>
          <g className="alma-part alma-ear-l">
            <path
              d="M72 40 q6 0 10 8 q2 8 -2 14 q-6 4 -12 -2 q-4 -6 -2 -14 q2 -6 6 -6 z"
              fill="var(--alma-fur)"
              stroke="var(--alma-fur-deep)"
              strokeWidth="0.9"
            />
          </g>

          {/* Crâne rond duveteux — contours ondulés pour l'effet frisé */}
          <path
            d="M50 22
               c -14 0 -24 10 -24 22
               c 0 3 1 6 3 9
               q -2 3 1 5
               q 4 2 6 -1
               q 6 5 14 5
               q 8 0 14 -5
               q 2 3 6 1
               q 3 -2 1 -5
               c 2 -3 3 -6 3 -9
               c 0 -12 -10 -22 -24 -22 z"
            fill="url(#alma-head-grad)"
            stroke="var(--alma-fur-deep)"
            strokeWidth="1"
          />

          {/* Toupet ondulé sur le front */}
          <path
            d="M42 26 q3 -4 8 -4 q5 0 8 4 q-2 3 -8 3 q-6 0 -8 -3 z"
            fill="#ffffff"
            opacity="0.85"
          />

          {/* Museau clair */}
          <ellipse cx="50" cy="50" rx="10" ry="8" fill="#ffffff" opacity="0.9" />

          {/* Joues rosées, très discrètes */}
          <circle cx="38" cy="49" r="3.2" fill="var(--alma-cheek)" />
          <circle cx="62" cy="49" r="3.2" fill="var(--alma-cheek)" />

          {/* Yeux */}
          <g className="alma-part alma-eyes">
            <ellipse cx="42" cy="42" rx="2.4" ry="3" fill="var(--alma-eye)" />
            <ellipse cx="58" cy="42" rx="2.4" ry="3" fill="var(--alma-eye)" />
            {/* Reflets */}
            <circle cx="42.9" cy="41" r="0.7" fill="#ffffff" />
            <circle cx="58.9" cy="41" r="0.7" fill="#ffffff" />
          </g>
          {/* Paupières qui descendent (clignement / sleepy) */}
          <g>
            <rect className="alma-part alma-eyelid" x="39" y="39" width="6" height="6" rx="2" fill="var(--alma-fur-shadow)" />
            <rect className="alma-part alma-eyelid" x="55" y="39" width="6" height="6" rx="2" fill="var(--alma-fur-shadow)" />
          </g>

          {/* Nez */}
          <ellipse cx="50" cy="50" rx="2.2" ry="1.6" fill="var(--alma-nose)" />
          {/* Bouche : petit sourire discret */}
          <path
            d="M47 54 q3 3 6 0"
            fill="none"
            stroke="var(--alma-mouth)"
            strokeWidth="1"
            strokeLinecap="round"
          />
        </g>
      </svg>
    </span>
  );
}

export default AlmaAvatarAnimated;
