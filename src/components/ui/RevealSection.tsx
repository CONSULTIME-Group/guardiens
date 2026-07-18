import React from "react";

/* ── Reveal purement CSS ──
 * Règle absolue : le contenu est TOUJOURS visible. L'animation d'entrée
 * (`animate-fade-in`) est un bonus décoratif joué une fois au mount, sans
 * aucun IntersectionObserver ni état React qui puisse laisser une section
 * bloquée à opacity-0. `prefers-reduced-motion` désactive l'animation.
 */
export const RevealSection = React.forwardRef<
  HTMLDivElement,
  { children: React.ReactNode; className?: string; delay?: number }
>(({ children, className = "", delay = 0 }, forwardedRef) => {
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const animClass = prefersReduced ? "" : "motion-safe:animate-fade-in";
  return (
    <div
      ref={forwardedRef}
      className={`${animClass} ${className}`}
      style={delay && !prefersReduced ? { animationDelay: `${delay}s`, animationFillMode: "both" } : undefined}
    >
      {children}
    </div>
  );
});
RevealSection.displayName = "RevealSection";
