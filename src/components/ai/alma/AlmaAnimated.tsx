/**
 * <AlmaAnimated /> — version animée d'Alma (Lottie plein corps).
 *
 * Comportement :
 *  - `prefers-reduced-motion: reduce` → rend la tête premium statique.
 *  - Fichier Lottie absent / erreur de chargement → repli sur la tête premium.
 *  - Sinon → lit `/alma-animated.json` en boucle, autoplay.
 *
 * Prop `mood` : humeur contextuelle appliquée au repli image (Lottie contrôle
 * son propre mouvement).
 *
 * Le fichier Lottie doit être déposé dans `public/alma-animated.json`
 * (servi à l'URL absolue `/alma-animated.json`).
 */
import { useEffect, useState } from "react";
import { Player } from "@lottiefiles/react-lottie-player";
import almaFullUrl from "@/assets/alma-full.png";
import { cn } from "@/lib/utils";
import type { AlmaMood } from "./AlmaAvatar";

interface AlmaAnimatedProps {
  size?: number;
  className?: string;
  mood?: AlmaMood;
}

const LOTTIE_SRC = "/alma-animated.json";

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);
  return reduced;
}

export function AlmaAnimated({ size = 96, className, mood = "idle" }: AlmaAnimatedProps) {
  const reduced = usePrefersReducedMotion();
  const [lottieFailed, setLottieFailed] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  // One-shot moods : replay lorsque la valeur (ré)apparaît.
  const [oneShotKey, setOneShotKey] = useState(0);
  useEffect(() => {
    if (mood === "happy" || mood === "attention") {
      setOneShotKey((k) => k + 1);
    }
  }, [mood]);

  if (reduced || lottieFailed) {
    if (imgFailed) {
      return (
        <span
          role="img"
          aria-label="Alma"
          style={{ width: size, height: size }}
          className={cn(
            "inline-block rounded-full bg-primary/15",
            mood === "sleepy" && "opacity-70",
            className,
          )}
        />
      );
    }

    const moodClass =
      mood === "happy"
        ? "motion-safe:animate-alma-happy"
        : mood === "attention"
        ? "motion-safe:animate-alma-attention"
        : mood === "sleepy"
        ? "opacity-70 motion-safe:animate-alma-breathe-slow"
        : "motion-safe:animate-alma-sway";

    return (
      <img
        key={mood === "happy" || mood === "attention" ? oneShotKey : undefined}
        src={almaFullUrl}
        alt="Alma"
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        draggable={false}
        onError={() => setImgFailed(true)}
        style={{ width: size, height: size, transformOrigin: "bottom center" }}
        className={cn("inline-block object-contain", moodClass, className)}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label="Alma"
      style={{ width: size, height: size }}
      className={cn("inline-block", mood === "sleepy" && "opacity-70", className)}
    >
      <Player
        src={LOTTIE_SRC}
        autoplay
        loop
        keepLastFrame
        style={{ width: size, height: size }}
        onEvent={(event) => {
          if (event === "error") setLottieFailed(true);
        }}
      />
    </div>
  );
}

export default AlmaAnimated;
