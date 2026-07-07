/**
 * Avatar d'Alma, la narratrice de Guardiens.
 * Rendu principal : image mascotte premium (bichon frisé).
 * Fallback : cercle uni si l'image ne charge pas.
 *
 * Tailles supportées : 24 / 32 / 40 (compact) et 56 / 72 / 96 (grand format
 * réservé aux premiers contacts et dialogs d'accueil).
 *
 * Animations (respectent prefers-reduced-motion via motion-safe:) :
 *  - hover : léger frétillement (`animate-alma-wiggle`)
 *  - `animateIn` : petit rebond d'apparition (`animate-alma-pop-in`)
 *  - `breathe` : souffle très subtil en boucle (`animate-alma-breathe`)
 *  - `mood` : humeur contextuelle (`idle` | `happy` | `sleepy` | `attention`).
 */
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import almaAvatarUrl from "@/assets/alma-avatar.png";

type Size = 24 | 32 | 40 | 56 | 72 | 96;
export type AlmaMood =
  | "idle"
  | "happy"
  | "sleepy"
  | "attention"
  | "attentive"
  | "thinking"
  | "gentle"
  | "playful";


interface AlmaAvatarProps {
  size?: Size;
  className?: string;
  "aria-hidden"?: boolean;
  /** Rebond d'entrée (utile quand l'avatar apparaît dans une bulle). */
  animateIn?: boolean;
  /** Animation « souffle » lente en boucle (topbar). */
  breathe?: boolean;
  /** Humeur contextuelle : « idle » par défaut. */
  mood?: AlmaMood;
}

export function AlmaAvatar({
  size = 32,
  className,
  animateIn = false,
  breathe = false,
  mood = "idle",
  ...rest
}: AlmaAvatarProps) {
  const ariaHidden = rest["aria-hidden"];
  const [failed, setFailed] = useState(false);

  // One-shot moods : replay lorsque la valeur (ré)apparaît.
  const isOneShot =
    mood === "happy" ||
    mood === "attention" ||
    mood === "attentive" ||
    mood === "playful";
  const [oneShotKey, setOneShotKey] = useState(0);
  useEffect(() => {
    if (isOneShot) {
      setOneShotKey((k) => k + 1);
    }
  }, [mood, isOneShot]);

  const moodClass =
    mood === "happy"
      ? "motion-safe:animate-alma-happy"
      : mood === "attention" || mood === "attentive"
      ? "motion-safe:animate-alma-attention"
      : mood === "playful"
      ? "motion-safe:animate-alma-playful"
      : mood === "thinking"
      ? "motion-safe:animate-alma-thinking"
      : mood === "gentle"
      ? "motion-safe:animate-alma-gentle"
      : mood === "sleepy"
      ? "opacity-70 motion-safe:animate-alma-breathe-slow"
      : breathe
      ? "motion-safe:animate-alma-breathe"
      : "";


  const commonClass = cn(
    "inline-block rounded-full object-cover select-none",
    "transition-transform duration-200 ease-out",
    "motion-safe:hover:animate-alma-wiggle",
    animateIn && "motion-safe:animate-alma-pop-in",
    moodClass,
    className,
  );

  const styleWithOrigin = { width: size, height: size, transformOrigin: "bottom center" } as const;

  // Geste idle discret (inclinaison lente) appliqué sur un wrapper afin de
  // pouvoir cumuler avec `alma-breathe` porté par l'image elle-même.
  const idleWrap = mood === "idle" || mood === "gentle";
  const wrapClass = idleWrap
    ? "inline-block motion-safe:animate-alma-idle-gesture"
    : "inline-block";

  if (failed) {
    return (
      <span className={wrapClass} style={{ width: size, height: size }}>
        <span
          key={isOneShot ? oneShotKey : undefined}
          role="img"
          aria-label="Alma"
          aria-hidden={ariaHidden}
          style={styleWithOrigin}
          className={cn(commonClass, "bg-primary/15")}
        />
      </span>
    );
  }

  return (
    <span className={wrapClass} style={{ width: size, height: size, display: "inline-block" }}>
      <img
        key={isOneShot ? oneShotKey : undefined}
        src={almaAvatarUrl}
        alt="Alma"
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        draggable={false}
        aria-label="Alma"
        aria-hidden={ariaHidden}
        onError={() => setFailed(true)}
        style={styleWithOrigin}
        className={commonClass}
      />
    </span>
  );
}

export default AlmaAvatar;
