import { MapPin, Sparkles, Bell, BellRing, Loader2, HandshakeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ILLUSTRATIONS } from "@/components/shared/EmptyState";

export type SearchTab = "sits" | "missions";
export type ZoneMode = "radius" | "dept" | "region" | "france";

export interface DensityCounts {
  radius: number;
  dept: number;
  region: number;
  france: number;
}

export interface NearbyRegion {
  regionCode: string;
  regionName: string;
  count: number;
}

export interface NearbyZone {
  deptCode: string;
  deptName: string;
  regionCode: string;
  regionName: string;
  count: number;
}

interface SearchEmptyStateProps {
  tab: SearchTab;
  setTab: (t: SearchTab) => void;
  zoneMode: ZoneMode;
  setZoneMode: (m: ZoneMode) => void;
  densityCounts: DensityCounts;
  nearbyRegions: NearbyRegion[];
  nearbyZones: NearbyZone[];
  launchModeCount: number | null;
  crossTabCount: number | null;
  city: string;
  alertCreated: boolean;
  isCreatingAlert: boolean;
  handleCreateAlert: () => void;
  sitterProfile: any;
  handleActivateAvailable: () => void;
  trackEvent: (name: string, payload: any) => void;
}

export const SearchEmptyState = ({
  tab,
  setTab,
  zoneMode,
  setZoneMode,
  densityCounts,
  nearbyRegions,
  nearbyZones,
  launchModeCount,
  crossTabCount,
  city,
  alertCreated,
  isCreatingAlert,
  handleCreateAlert,
  sitterProfile,
  handleActivateAvailable,
  trackEvent,
}: SearchEmptyStateProps) => {
  return (
    <div className="max-w-2xl mx-auto py-12 px-4 space-y-6">
      {/* Hero empty state */}
      <div className="text-center space-y-3">
        {(() => { const Illu = tab === "sits" ? ILLUSTRATIONS.emptyCalendar : ILLUSTRATIONS.walkingDog; return <Illu />; })()}
        <h3 className="font-heading font-semibold text-xl text-foreground">
          {tab === "sits" ? "Pas encore d'annonce de garde dans votre zone" : "Pas encore de mission dans votre zone"}
        </h3>

        {/* Compteur clair : 0 dans la zone · X ailleurs */}
        {densityCounts.france > 0 && (
          <div className="inline-flex flex-wrap items-center justify-center gap-2 text-sm">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-foreground/80">
              <span className="font-semibold text-foreground">0</span>
              <span className="text-muted-foreground">dans votre zone</span>
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-primary">
              <span className="font-semibold">{densityCounts.france}</span>
              <span>{tab === "sits" ? (densityCounts.france > 1 ? "annonces" : "annonce") : (densityCounts.france > 1 ? "missions" : "mission")} ailleurs en France</span>
            </span>
          </div>
        )}

        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          {densityCounts.france > 0
            ? "Élargissez la zone, explorez les régions limitrophes ou créez une alerte pour ne rien rater près de chez vous."
            : "La communauté grandit chaque jour. Voici comment ne rien rater et tirer profit de votre temps dès maintenant."}
        </p>
      </div>

      {/* Régions / départements voisins disponibles */}
      {(nearbyRegions.length > 0 || nearbyZones.length > 0) && densityCounts.france > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-foreground mt-0.5 shrink-0" />
            <div className="flex-1 space-y-3">
              <p className="font-medium text-sm text-foreground">
                Disponible ailleurs en France
              </p>

              {nearbyRegions.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Régions où il y en a le plus</p>
                  <div className="flex flex-wrap gap-2">
                    {nearbyRegions.map((r) => (
                      <button
                        key={r.regionCode}
                        type="button"
                        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background hover:border-primary/50 hover:bg-primary/5 px-3 py-1 text-xs text-foreground transition-colors"
                        onClick={() => {
                          trackEvent("search_empty_action", { source: "search_empty", metadata: { action: "browse_region", region: r.regionCode, count: r.count, tab } });
                          setZoneMode("france");
                        }}
                      >
                        <span className="font-medium">{r.regionName}</span>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-primary font-semibold">{r.count}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {nearbyZones.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Départements actifs</p>
                  <div className="flex flex-wrap gap-2">
                    {nearbyZones.map((d) => (
                      <button
                        key={d.deptCode}
                        type="button"
                        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background hover:border-primary/50 hover:bg-primary/5 px-3 py-1 text-xs text-foreground transition-colors"
                        onClick={() => {
                          trackEvent("search_empty_action", { source: "search_empty", metadata: { action: "browse_dept", dept: d.deptCode, count: d.count, tab } });
                          setZoneMode("france");
                        }}
                      >
                        <span className="font-medium">{d.deptCode} · {d.deptName}</span>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-primary font-semibold">{d.count}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Action 0, Mode Lancement (si plateforme globalement vide) */}
      {launchModeCount === 0 && (
        <div className="rounded-xl border border-primary/40 bg-gradient-to-br from-primary/10 to-primary/5 p-5 space-y-2">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-heading font-semibold text-sm text-foreground">Vous êtes parmi les premiers</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Guardiens vient de lancer. Les premières annonces arrivent en ce moment.
                En tant que membre fondateur, vous serez notifié dès qu'une mission près de chez vous est publiée, et vous gardez votre statut de fondateur.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Action 1, Suggestion d'élargir si pertinent */}
      {zoneMode !== "france" && (densityCounts.dept > densityCounts.radius || densityCounts.region > densityCounts.dept || densityCounts.france > 0) && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-2">
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-sm text-foreground">Élargissez votre recherche</p>
              <p className="text-xs text-muted-foreground mt-1">
                {densityCounts.france > 0 && `${densityCounts.france} ${tab === "sits" ? "annonces" : "missions"} disponibles partout en France.`}
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {densityCounts.dept > densityCounts.radius && (
                  <Button size="sm" variant="outline" onClick={() => { trackEvent("search_empty_action", { source: "search_empty", metadata: { action: "expand_zone", to: "dept", tab, zone_mode: zoneMode } }); setZoneMode("dept"); }}>
                    Mon département ({densityCounts.dept})
                  </Button>
                )}
                {densityCounts.region > densityCounts.dept && (
                  <Button size="sm" variant="outline" onClick={() => { trackEvent("search_empty_action", { source: "search_empty", metadata: { action: "expand_zone", to: "region", tab, zone_mode: zoneMode } }); setZoneMode("region"); }}>
                    Ma région ({densityCounts.region})
                  </Button>
                )}
                {densityCounts.france > 0 && (
                  <Button size="sm" variant="outline" onClick={() => { trackEvent("search_empty_action", { source: "search_empty", metadata: { action: "expand_zone", to: "france", tab, zone_mode: zoneMode } }); setZoneMode("france"); }}>
                    Toute la France ({densityCounts.france})
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action 2, Créer une alerte */}
      {city && !alertCreated && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <div className="flex items-start gap-3">
            <Bell className="h-5 w-5 text-foreground mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-sm text-foreground">Soyez prévenu en premier</p>
              <p className="text-xs text-muted-foreground mt-1">
                Créez une alerte sur {city} et recevez un email dès qu'une annonce est publiée.
              </p>
              <Button
                size="sm"
                className="mt-3 gap-2"
                onClick={() => { trackEvent("search_empty_action", { source: "search_empty", metadata: { action: "create_alert", tab, city } }); handleCreateAlert(); }}
                disabled={isCreatingAlert}
              >
                {isCreatingAlert ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4" />}
                Créer mon alerte
              </Button>
            </div>
          </div>
        </div>
      )}
      {alertCreated && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center gap-3">
            <BellRing className="h-5 w-5 text-primary shrink-0" />
            <p className="text-sm text-foreground">Alerte créée. On vous prévient dès qu'une annonce arrive !</p>
          </div>
        </div>
      )}

      {/* Action 3, Cross-sell vers l'autre onglet */}
      {crossTabCount !== null && crossTabCount > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <div className="flex items-start gap-3">
            <HandshakeIcon className="h-5 w-5 text-foreground mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-sm text-foreground">
                {tab === "sits"
                  ? `${crossTabCount} mission${crossTabCount > 1 ? "s" : ""} d'entraide ${crossTabCount > 1 ? "disponibles" : "disponible"}`
                  : `${crossTabCount} annonce${crossTabCount > 1 ? "s" : ""} de garde ${crossTabCount > 1 ? "disponibles" : "disponible"}`}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {tab === "sits"
                  ? "L'entraide entre gens du coin reste libre pour tous : promener un chien, nourrir un chat, arroser des plantes…"
                  : "Découvrez les annonces de garde près de chez vous."}
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-3 gap-2"
                onClick={() => {
                  trackEvent("search_empty_action", { source: "search_empty", metadata: { action: "switch_tab", to: tab === "sits" ? "missions" : "sits", count: crossTabCount } });
                  setTab(tab === "sits" ? "missions" : "sits");
                }}
              >
                {tab === "sits" ? "Voir les petites missions" : "Voir les annonces de garde"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Action 4, Mode disponible */}
      {!sitterProfile?.is_available && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-foreground mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-sm text-foreground">Soyez visible des propriétaires</p>
              <p className="text-xs text-muted-foreground mt-1">
                Activez votre disponibilité pour apparaître en haut des recherches et être contacté directement.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-3 gap-2"
                onClick={() => { trackEvent("search_empty_action", { source: "search_empty", metadata: { action: "activate_availability", tab } }); handleActivateAvailable(); }}
              >
                <Sparkles className="h-4 w-4" /> Activer le mode disponible
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
