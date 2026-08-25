/**
 * OwnerSitterSpotlight (25/08/2026) : section unique « gardiens » du
 * dashboard propriétaire, fusion des deux sections historiques.
 *
 *  - Onglet « Pour vous » : classement par affinité (ex OwnerFirstNBAGardiens),
 *    logique inchangée, déportée dans SpotlightForYouPanel.
 *  - Onglet « Près de chez vous » : annuaire de proximité (ex
 *    NearbySittersSection), logique inchangée, déportée dans
 *    SpotlightNearbyPanel.
 *
 * Règles verrouillées par `owner-sitter-spotlight.test.tsx` :
 *  - l'onglet par défaut est « Pour vous », toujours ;
 *  - les deux panneaux sont TOUJOURS montés (attribut `hidden`, jamais de
 *    rendu conditionnel) : les deux hooks partent en parallèle dès le
 *    montage, changer d'onglet est instantané et ne relance aucun réseau ;
 *  - le badge de comptage du vivier proche n'apparaît que sur l'onglet
 *    inactif, jamais pendant le chargement, jamais à zéro ;
 *  - le changement d'onglet est un filtre d'affichage, pas un CTA : un seul
 *    appel à l'action principal par panneau, inchangé.
 */
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNearbyOwnerSitters } from "@/hooks/useNearbyOwnerSitters";
import SpotlightForYouPanel from "./SpotlightForYouPanel";
import SpotlightNearbyPanel from "./SpotlightNearbyPanel";

type TabId = "pour-vous" | "proches";

const tabClass = (active: boolean) =>
  `rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
    active
      ? "bg-card text-foreground shadow-sm"
      : "text-muted-foreground hover:text-foreground"
  }`;

export default function OwnerSitterSpotlight() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("pour-vous");

  // Le compteur du badge vit ici : même hook, même queryKey que le panneau
  // « Près de chez vous », React Query déduplique. Aucun appel réseau
  // supplémentaire, le badge est disponible dès le premier rendu utile.
  const { data: nearbyData, isLoading: nearbyIsLoading } = useNearbyOwnerSitters(user?.id);
  const nearbyTotal = nearbyData?.totalCount ?? 0;
  const showNearbyBadge = activeTab !== "proches" && !nearbyIsLoading && nearbyTotal > 0;

  // Navigation clavier du pattern tabs : flèches gauche/droite.
  const onTabListKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    setActiveTab((t) => (t === "pour-vous" ? "proches" : "pour-vous"));
  };

  return (
    <section aria-label="Les gardiens" className="min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 mb-4">
        <h2 className="text-lg md:text-xl font-serif font-semibold text-foreground">
          Les gardiens
        </h2>
        <div
          role="tablist"
          aria-label="Choisir la sélection de gardiens"
          className="inline-flex rounded-full border border-border bg-muted/40 p-1"
          onKeyDown={onTabListKeyDown}
        >
          <button
            type="button"
            role="tab"
            id="owner-spotlight-tab-pour-vous"
            aria-selected={activeTab === "pour-vous"}
            aria-controls="owner-spotlight-panel-pour-vous"
            tabIndex={activeTab === "pour-vous" ? 0 : -1}
            onClick={() => setActiveTab("pour-vous")}
            className={tabClass(activeTab === "pour-vous")}
          >
            Pour vous
          </button>
          <button
            type="button"
            role="tab"
            id="owner-spotlight-tab-proches"
            aria-selected={activeTab === "proches"}
            aria-controls="owner-spotlight-panel-proches"
            tabIndex={activeTab === "proches" ? 0 : -1}
            onClick={() => setActiveTab("proches")}
            className={tabClass(activeTab === "proches")}
          >
            Près de chez vous
            {showNearbyBadge && (
              <span
                className="ml-1.5 inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground"
                aria-label={`${nearbyTotal} gardiens dans ce vivier`}
              >
                {nearbyTotal}
              </span>
            )}
          </button>
        </div>
      </div>

      <div
        role="tabpanel"
        id="owner-spotlight-panel-pour-vous"
        aria-labelledby="owner-spotlight-tab-pour-vous"
        hidden={activeTab !== "pour-vous"}
      >
        <SpotlightForYouPanel />
      </div>
      <div
        role="tabpanel"
        id="owner-spotlight-panel-proches"
        aria-labelledby="owner-spotlight-tab-proches"
        hidden={activeTab !== "proches"}
      >
        <SpotlightNearbyPanel />
      </div>
    </section>
  );
}
