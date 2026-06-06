import { MapPin, Loader2, Bell, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DensityCounts, ZoneMode } from "@/components/search/listing/SearchEmptyState";

interface OutOfZoneBannerProps {
  zoneMode: ZoneMode;
  setZoneMode: (m: ZoneMode) => void;
  densityCounts: DensityCounts;
  radius: number[];
  city: string;
  alertCreated: boolean;
  isCreatingAlert: boolean;
  handleCreateAlert: () => void;
  navigate: (path: string) => void;
  trackEvent: (name: string, payload: any) => void;
}

export const OutOfZoneBanner = ({
  zoneMode,
  setZoneMode,
  densityCounts,
  radius,
  city,
  alertCreated,
  isCreatingAlert,
  handleCreateAlert,
  navigate,
  trackEvent,
}: OutOfZoneBannerProps) => {
  const elsewhere = densityCounts.france - densityCounts.radius;
  const inDeptOnly = Math.max(0, densityCounts.dept - densityCounts.radius);
  const inRegionOnly = Math.max(0, densityCounts.region - densityCounts.dept);
  const outsideRegion = Math.max(0, densityCounts.france - densityCounts.region);
  const hasLocal = densityCounts.radius > 0;

  const containerClass = hasLocal
    ? "mx-6 mt-4 w-[calc(100%-3rem)] text-left rounded-2xl border border-border bg-card shadow-sm hover:shadow-md hover:border-primary/40 transition p-4 sm:p-5 flex items-start sm:items-center gap-4 flex-col sm:flex-row cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    : "mx-6 mt-4 w-[calc(100%-3rem)] text-left rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-primary/15 via-primary/10 to-primary/5 shadow-md hover:shadow-lg hover:border-primary/60 transition p-4 sm:p-5 flex items-start sm:items-center gap-4 flex-col sm:flex-row cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";
  const iconWrapClass = hasLocal
    ? "h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0"
    : "h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-sm relative";
  const iconClass = hasLocal ? "h-5 w-5 sm:h-6 sm:w-6" : "h-6 w-6 sm:h-7 sm:w-7";
  const numberClass = hasLocal
    ? "text-primary text-lg sm:text-xl font-bold"
    : "text-primary text-xl sm:text-2xl font-bold";
  const titleClass = hasLocal
    ? "font-heading font-semibold text-sm sm:text-base text-foreground leading-tight"
    : "font-heading font-semibold text-base sm:text-lg text-foreground leading-tight";

  const handleBannerClick = () => {
    trackEvent("search_outofzone_click", {
      source: "search_outofzone_banner",
      metadata: {
        action: "expand_zone",
        to: "france",
        previous_mode: zoneMode,
        delta: elsewhere,
        count_radius: densityCounts.radius,
        count_region: densityCounts.region,
        count_france: densityCounts.france,
        has_local: hasLocal,
      },
    });
    setZoneMode("france");
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={
        hasLocal
          ? `Voir ${elsewhere} autres annonces hors de votre rayon, passe en recherche France entière`
          : `${elsewhere} annonces existent ailleurs en France, passer en recherche France entière`
      }
      onClick={handleBannerClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleBannerClick();
        }
      }}
      className={containerClass}
    >
      <div className="flex items-start gap-4 flex-1 min-w-0 w-full">
        <div className={iconWrapClass}>
          <MapPin className={iconClass} />
          {!hasLocal && (
            <>
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary animate-ping opacity-75" />
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary" />
            </>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className={titleClass}>
            {hasLocal ? (
              <>
                <span className={numberClass}>+{elsewhere}</span>{" "}
                autre{elsewhere > 1 ? "s" : ""} annonce{elsewhere > 1 ? "s" : ""} hors de votre rayon
              </>
            ) : (
              <>
                <span className={numberClass}>{elsewhere}</span>{" "}
                annonce{elsewhere > 1 ? "s" : ""} hors de votre zone
              </>
            )}
            <span className="ml-2 text-xs font-normal text-primary underline underline-offset-2">
              Voir toute la France →
            </span>
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {hasLocal && densityCounts.radius > 0
              ? `Vous voyez ${densityCounts.radius} annonce${densityCounts.radius > 1 ? "s" : ""} dans ${radius[0]} km. ${
                  [
                    inDeptOnly > 0 ? `${inDeptOnly} ailleurs dans le département` : null,
                    inRegionOnly > 0 ? `${inRegionOnly} dans la région` : null,
                    outsideRegion > 0 ? `${outsideRegion} ailleurs en France` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")
                }.`
              : "Élargissez la recherche pour les voir, ou créez une alerte pour ne rien rater près de chez vous."}
          </p>
        </div>
      </div>
      <div
        className="flex flex-wrap gap-2 shrink-0 w-full sm:w-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {densityCounts.region > densityCounts.radius && (
          <Button size="sm" variant="outline" className="bg-card" onClick={() => {
            trackEvent("search_outofzone_click", { source: "search_outofzone", metadata: { action: "expand_zone", to: "region", previous_mode: zoneMode, delta: elsewhere, count_radius: densityCounts.radius, count_region: densityCounts.region, count_france: densityCounts.france, has_local: hasLocal } });
            setZoneMode("region");
          }}>
            Ma région ({densityCounts.region})
          </Button>
        )}
        <Button size="sm" variant={hasLocal ? "outline" : "default"} className={hasLocal ? "bg-card" : "shadow-sm"} onClick={() => {
          trackEvent("search_outofzone_click", { source: "search_outofzone", metadata: { action: "expand_zone", to: "france", previous_mode: zoneMode, delta: elsewhere, count_radius: densityCounts.radius, count_region: densityCounts.region, count_france: densityCounts.france, has_local: hasLocal } });
          setZoneMode("france");
        }}>
          Toute la France ({densityCounts.france})
        </Button>
        {city && (
          <Button
            size="sm"
            variant={alertCreated ? "secondary" : "outline"}
            className="bg-card gap-1.5"
            disabled={isCreatingAlert || alertCreated}
            onClick={() => {
              trackEvent("search_outofzone_click", { source: "search_outofzone", metadata: { action: "create_alert", previous_mode: zoneMode, city, radius_km: radius[0], delta: elsewhere, has_local: hasLocal } });
              if (alertCreated) navigate("/settings");
              else handleCreateAlert();
            }}
          >
            {isCreatingAlert ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : alertCreated ? (
              <BellRing className="h-4 w-4" />
            ) : (
              <Bell className="h-4 w-4" />
            )}
            {isCreatingAlert ? "Création…" : alertCreated ? "Alerte créée" : `Alerte ${radius[0]} km`}
          </Button>
        )}
      </div>
    </div>
  );
};
