/**
 * useRailFitsViewport — mesure si le contenu du rail tient dans la hauteur
 * de la fenêtre (correctif « rail à double défilement », août 2026).
 *
 * Règle d'or : le rail n'a JAMAIS son propre défilement.
 *   - le contenu tient dans la fenêtre : le rail reste collant ;
 *   - le contenu dépasse : le rail n'est PAS collant, il défile avec la
 *     page comme le reste. Un seul défilement par écran, tout est
 *     atteignable.
 *
 * Aucune hauteur bornée en pourcentage de la fenêtre : sur un portable en
 * paysage, cela recréerait le même piège.
 */
import { useLayoutEffect, useRef, useState } from "react";

/** Décalage haut du rail collant, identique à la classe lg:top-20 (80px). */
export const RAIL_STICKY_TOP_PX = 80;

/** Point de rupture desktop du rail (lg:). */
const DESKTOP_QUERY = "(min-width: 1024px)";

export const useRailFitsViewport = <T extends HTMLElement>() => {
  const ref = useRef<T | null>(null);
  const [fits, setFits] = useState(true);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof window === "undefined") return;
    const mq =
      typeof window.matchMedia === "function"
        ? window.matchMedia(DESKTOP_QUERY)
        : null;

    const measure = () => {
      if (mq && !mq.matches) {
        // Sous le point de rupture desktop, le rail n'est jamais collant.
        setFits(false);
        return;
      }
      // offsetHeight = hauteur naturelle du contenu : le rail ne porte
      // aucune hauteur bornée, cette mesure ne dépend pas du collage.
      setFits(el.offsetHeight <= window.innerHeight - RAIL_STICKY_TOP_PX);
    };

    // useLayoutEffect : la mesure est synchrone, avant la peinture. Aucun
    // flash d'un rail collant qui ne devrait pas l'être.
    measure();

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver === "function") {
      ro = new ResizeObserver(measure);
      ro.observe(el);
    }
    window.addEventListener("resize", measure);
    mq?.addEventListener("change", measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", measure);
      mq?.removeEventListener("change", measure);
    };
  }, []);

  return { ref, fits };
};
