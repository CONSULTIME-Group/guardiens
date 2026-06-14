import { useEffect, useState } from "react";

/**
 * Détecte la direction de scroll vertical du document.
 * - "up"   : l'utilisateur scrolle vers le haut (ou est en haut de page)
 * - "down" : l'utilisateur scrolle vers le bas
 *
 * Utilisé pour cacher des éléments d'UI flottants (bottom nav) au scroll bas
 * et les ramener au scroll haut. Pattern 2026 (Twitter, Spotify, Medium).
 */
export function useScrollDirection(threshold = 8): "up" | "down" {
  const [direction, setDirection] = useState<"up" | "down">("up");

  useEffect(() => {
    let lastY = typeof window !== "undefined" ? window.scrollY : 0;
    let ticking = false;

    const update = () => {
      const y = window.scrollY;
      const delta = y - lastY;
      // Toujours visible en haut de page (évite le bug "nav cachée au reload")
      if (y < 32) {
        setDirection("up");
      } else if (Math.abs(delta) > threshold) {
        setDirection(delta > 0 ? "down" : "up");
      }
      lastY = y;
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return direction;
}
