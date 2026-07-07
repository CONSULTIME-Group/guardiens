/**
 * <AlmaAnimated /> — version animée d'Alma (Lottie plein corps).
 *
 * Comportement :
 *  - `prefers-reduced-motion: reduce` → rend la tête premium statique.
 *  - Fichier Lottie absent / erreur de chargement → repli sur la tête premium.
 *  - Sinon → lit `/alma-animated.json` en boucle, autoplay.
 *
 * Le fichier Lottie doit être déposé dans `public/alma-animated.json`
 * (servi à l'URL absolue `/alma-animated.json`).
 */
import { useEffect, useState } from "react";
import { Player } from "@lottiefiles/react-lottie-player";
import almaFullUrl from "@/assets/alma-full.png";
import { cn } from "@/lib/utils";

interface AlmaAnimatedProps {
  size?: number;
  className?: string;
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

export function AlmaAnimated({ size = 96, className }: AlmaAnimatedProps) {
  const reduced = usePrefersReducedMotion();
  const [lottieFailed, setLottieFailed] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  if (reduced || lottieFailed) {
    if (imgFailed) {
      return (
        <span
          role="img"
          aria-label="Alma"
          style={{ width: size, height: size }}
          className={cn("inline-block rounded-full bg-primary/15", className)}
        />
      );
    }

    return (
      <img
        src={almaFullUrl}
        alt="Alma"
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        draggable={false}
        onError={() => setImgFailed(true)}
        style={{ width: size, height: size }}
        className={cn("inline-block object-contain", className)}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label="Alma"
      style={{ width: size, height: size }}
      className={cn("inline-block", className)}
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
