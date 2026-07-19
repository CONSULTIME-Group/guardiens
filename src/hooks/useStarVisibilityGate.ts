/**
 * useStarVisibilityGate — retourne true tant que la section "star" désignée
 * (attribut data-dashboard-star=variant) est visible à l'écran. Utilisé par
 * les sticky CTA mobiles pour éviter de doubler le bouton primaire de la
 * star. Fallback : si aucune star ou observer indisponible, la carte est
 * considérée non visible (le sticky peut s'afficher).
 */
import { useEffect, useState } from "react";

export function useStarVisibilityGate(variant: "owner" | "sitter"): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
      setVisible(false);
      return;
    }

    let observer: IntersectionObserver | null = null;
    let target: Element | null = null;

    const attach = () => {
      const el = document.querySelector<HTMLElement>(
        `[data-dashboard-star="${variant}"]`,
      );
      if (!el || el === target) return;
      if (observer) observer.disconnect();
      target = el;
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            setVisible(entry.isIntersecting && entry.intersectionRatio > 0.1);
          }
        },
        { threshold: [0, 0.1, 0.5, 1] },
      );
      observer.observe(el);
    };

    attach();
    // Retente après le premier paint car la section peut arriver en async
    const t1 = window.setTimeout(attach, 300);
    const t2 = window.setTimeout(attach, 1200);

    const mo = new MutationObserver(attach);
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      if (observer) observer.disconnect();
      mo.disconnect();
    };
  }, [variant]);

  return visible;
}
