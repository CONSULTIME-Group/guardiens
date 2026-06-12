/**
 * MobileDashboardTabs
 *
 * Réduit le bruit mobile en regroupant le contenu du dashboard en 3 onglets :
 *   - Aujourd'hui : action prioritaire, à faire maintenant
 *   - Activité    : mon annonce, animaux, candidatures, avis, badges, stats
 *   - Découvrir   : annonces / coup de main / gardiens près de chez vous
 *
 * Desktop ≥ md : tout est rendu en flux normal (zéro changement de layout).
 * Mobile < md  : un seul onglet visible à la fois, bascule via segmented control sticky.
 *
 * On utilise `hidden` (et pas un unmount) pour préserver l'état des sous-composants
 * (carrousels, accordéons ouverts, scroll horizontal) lors d'un changement d'onglet.
 */
import { useState, type ReactNode } from "react";

type TabId = "today" | "activity" | "discover";

interface Props {
  today: ReactNode;
  activity: ReactNode;
  discover: ReactNode;
  badges?: Partial<Record<TabId, number>>;
  defaultTab?: TabId;
}

const TABS: { id: TabId; label: string }[] = [
  { id: "today", label: "Aujourd'hui" },
  { id: "activity", label: "Mon activité" },
  { id: "discover", label: "Découvrir" },
];

export default function MobileDashboardTabs({
  today,
  activity,
  discover,
  badges,
  defaultTab = "today",
}: Props) {
  const [tab, setTab] = useState<TabId>(defaultTab);

  return (
    <div className="md:hidden">
      {/* segmented control sticky sous la top bar mobile (h-12) */}
      <div className="sticky top-12 z-30 px-4 pt-3 pb-2 bg-background/95 backdrop-blur border-b border-border/40">
        <div role="tablist" aria-label="Sections du tableau de bord" className="grid grid-cols-3 gap-1 rounded-xl bg-muted/60 p-1">
          {TABS.map((t) => {
            const isActive = tab === t.id;
            const badge = badges?.[t.id];
            return (
              <button
                key={t.id}
                role="tab"
                type="button"
                aria-selected={isActive}
                aria-controls={`dash-panel-${t.id}`}
                onClick={() => setTab(t.id)}
                className={`relative rounded-lg px-2 py-2 text-xs font-semibold transition-all duration-150 ${
                  isActive
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
                {badge && badge > 0 ? (
                  <span
                    aria-label={`${badge} en attente`}
                    className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center"
                  >
                    {badge > 9 ? "9+" : badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div id="dash-panel-today" role="tabpanel" hidden={tab !== "today"} className="space-y-5 pt-4">
        {today}
      </div>
      <div id="dash-panel-activity" role="tabpanel" hidden={tab !== "activity"} className="space-y-5 pt-4">
        {activity}
      </div>
      <div id="dash-panel-discover" role="tabpanel" hidden={tab !== "discover"} className="space-y-5 pt-4">
        {discover}
      </div>
    </div>
  );
}

