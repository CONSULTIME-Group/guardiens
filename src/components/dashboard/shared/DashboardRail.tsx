/**
 * DashboardRail, rail droit des deux dashboards (refonte rail, août 2026).
 *
 * Règle d'or : JAMAIS de défilement interne au rail. Si le contenu tient
 * dans la hauteur de la fenêtre, le rail reste collant ; sinon il défile
 * avec la page comme le reste. Un seul défilement par écran.
 *
 * Ne pas réintroduire overflow-y-auto ni de hauteur bornée ici : le test
 * `no-sticky-internal-scroll` bloque le build.
 */
import type { ReactNode } from "react";
import { useRailFitsViewport } from "@/hooks/useRailFitsViewport";

interface DashboardRailProps {
  children: ReactNode;
  /** Lot D1 (propriétaire) : colonne fixe 328 px, blocs rapprochés. Défaut inchangé. */
  layout?: "default" | "compact";
}

const DashboardRail = ({ children, layout = "default" }: DashboardRailProps) => {
  const { ref, fits } = useRailFitsViewport<HTMLElement>();
  return (
    <aside
      ref={ref}
      className={`${layout === "compact" ? "space-y-[22px] lg:self-start" : "mt-[52px] lg:mt-0 space-y-[34px] lg:col-span-4 lg:self-start"} ${
        fits ? "lg:sticky lg:top-20" : ""
      }`}
    >
      {children}
    </aside>
  );
};

export default DashboardRail;
