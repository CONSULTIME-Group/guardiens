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
 */
import { useState } from "react";
import { cn } from "@/lib/utils";
import almaAvatarUrl from "@/assets/alma-avatar.png";

type Size = 24 | 32 | 40 | 56 | 72 | 96;

interface AlmaAvatarProps {
  size?: Size;
  className?: string;
  "aria-hidden"?: boolean;
  /** Rebond d'entrée (utile quand l'avatar apparaît dans une bulle). */
  animateIn?: boolean;
  /** Animation « souffle » lente en boucle (topbar). */
  breathe?: boolean;
}

export function AlmaAvatar({
  size = 32,
  className,
  animateIn = false,
  breathe = false,
  ...rest
}: AlmaAvatarProps) {
  const ariaHidden = rest["aria-hidden"];
  const [failed, setFailed] = useState(false);

  const commonClass = cn(
    "inline-block rounded-full object-cover select-none",
    "transition-transform duration-200 ease-out",
    "motion-safe:hover:animate-alma-wiggle",
    animateIn && "motion-safe:animate-alma-pop-in",
    breathe && "motion-safe:animate-alma-breathe",
    className,
  );

  if (failed) {
    return (
      <span
        role="img"
        aria-label="Alma"
        aria-hidden={ariaHidden}
        style={{ width: size, height: size }}
        className={cn(commonClass, "bg-primary/15")}
      />
    );
  }

  return (
    <img
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
      style={{ width: size, height: size }}
      className={commonClass}
    />
  );
}

export default AlmaAvatar;
