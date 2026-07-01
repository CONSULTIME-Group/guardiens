import { Link, useLocation } from "react-router-dom";
import FounderBadge from "@/components/badges/FounderBadge";
import EnvironmentPills from "@/components/shared/EnvironmentPills";
import FavoriteButton from "@/components/shared/FavoriteButton";
import AffinityBadge from "@/components/matching/AffinityBadge";
import { useAffinityWithShadow } from "@/hooks/useAffinityWithShadow";


import { PawPrint, Cat, Bird } from "lucide-react";

const speciesIcon: Record<string, typeof PawPrint> = {
  dog: PawPrint, cat: Cat, horse: PawPrint, bird: Bird, rodent: PawPrint,
  fish: PawPrint, reptile: PawPrint, farm_animal: Bird, nac: PawPrint,
};

export interface SearchListingCardProps {
  item: any;
  listIndex?: number;
  tab: "sits" | "missions";
  radius: number;
  hasAccess: boolean;
  testDemoMode: boolean;
  formatDate: (d: string | null) => string;
  viewerSitterProfile?: any;
}


const SearchListingCard = ({
  item,
  listIndex,
  tab,
  radius,
  hasAccess,
  testDemoMode,
  formatDate,
  viewerSitterProfile,
}: SearchListingCardProps) => {

  const missionPhotos = Array.isArray((item as any).photos) ? (item as any).photos.filter(Boolean) : [];
  const photos: string[] = item.property?.photos || missionPhotos;
  const coverPhoto = (item as any).cover_photo_url || item.property?.cover_photo_url || photos[0] || (item as any).ownerGalleryFirstPhoto || null;
  const petGroups: Record<string, string[]> = {};
  (item.pets || []).forEach((p: any) => {
    if (!petGroups[p.species]) petGroups[p.species] = [];
    petGroups[p.species].push(p.name);
  });
  const isMission = tab === "missions";
  const isDemo = !!item.is_demo;
  const isAssigned = !isMission && !!item.isAssigned;
  const isCompleted = !isMission && !!item.isCompleted;
  const isPast = !isMission && !!item.isPast;
  const isInactive = isAssigned || isCompleted || isPast;
  const isOutOfZone =
    !isMission &&
    !isDemo &&
    typeof item.distance === "number" &&
    item.distance > radius;
  const { full: affinity, displayed: affinityDisplayed } = useAffinityWithShadow(
    item.ownerMatch ? { ...item.ownerMatch, pets: item.pets || [] } : null,
    viewerSitterProfile ?? null,
    {
      context: "search_listing",
      targetId: item.id,
      enabled: !isMission && !isDemo && !isInactive,
    },
  );



  const location = useLocation();
  const isPublicContext = location.pathname.startsWith("/annonces") || location.pathname.startsWith("/petites-missions") || location.pathname.startsWith("/search");
  const linkTo = isMission
    ? `/petites-missions/${item.id}`
    : isDemo
    ? `/annonces/demo/${item.slug || item.id}`
    : isPublicContext
    ? `/annonces/${item.id}`
    : `/sits/${item.id}`;

  const isClickable = (isDemo || hasAccess || isPublicContext) && !isInactive;

  const dateLabel = !isMission && item.start_date
    ? `${formatDate(item.start_date)} → ${formatDate(item.end_date)}`
    : null;

  const missionCategoryLabel: Record<string, string> = {
    garden: "Jardin",
    animals: "Animaux",
    skills: "Compétences",
    house: "Maison",
    errand: "Courses",
    tech: "Technique",
    company: "Compagnie",
    home: "Maison",
    other: "Autre",
  };

  if (isMission) {
    const categoryGradient: Record<string, string> = {
      garden: "from-[hsl(95_35%_88%)] to-[hsl(95_30%_78%)]",
      animals: "from-[hsl(28_55%_88%)] to-[hsl(28_50%_78%)]",
      skills: "from-[hsl(210_45%_90%)] to-[hsl(210_40%_80%)]",
      house: "from-[hsl(35_45%_90%)] to-[hsl(35_40%_80%)]",
      home: "from-[hsl(35_45%_90%)] to-[hsl(35_40%_80%)]",
      errand: "from-[hsl(265_35%_90%)] to-[hsl(265_30%_82%)]",
      tech: "from-[hsl(200_35%_90%)] to-[hsl(200_30%_80%)]",
      company: "from-[hsl(340_40%_92%)] to-[hsl(340_35%_84%)]",
      other: "from-muted to-muted",
    };
    const catLabel = missionCategoryLabel[item.category] || "Petite mission";

    const missionCard = (
      <article
        className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:border-primary/40 hover:shadow-lg ${isClickable ? "cursor-pointer" : ""} ${testDemoMode ? (isDemo ? "card-test-demo" : "card-test-real") : ""}`}
        data-testid={isDemo ? "search-card-demo" : "search-card-real"}
        data-demo={isDemo ? "true" : "false"}
        data-list-index={typeof listIndex === "number" ? listIndex + 1 : undefined}
      >
        {testDemoMode && typeof listIndex === "number" && (
          <span
            className={`absolute z-20 top-2 left-2 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full shadow ${isDemo ? "bg-amber-500 text-amber-50" : "bg-sky-500 text-sky-50"}`}
            data-testid="search-card-position"
          >
            #{listIndex + 1} {isDemo ? "DEMO" : "REAL"}
          </span>
        )}

        <div className="relative aspect-square w-full overflow-hidden bg-muted">
          {coverPhoto ? (
            <img
              src={coverPhoto}
              alt=""
              className={`h-full w-full object-cover transition-transform duration-500 ${isClickable ? "group-hover:scale-105" : ""}`}
              loading="lazy"
            />
          ) : (
            <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${categoryGradient[item.category] || categoryGradient.other}`}>
              <span className="font-heading text-xs font-semibold uppercase tracking-[0.16em] text-foreground/55">
                {catLabel}
              </span>
            </div>
          )}
          {isDemo && (
            <span className="absolute top-1.5 left-1.5 rounded-full bg-warning px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.14em] text-warning-foreground shadow-sm">
              Ex.
            </span>
          )}
          {item.owner?.is_founder && (
            <div className="absolute top-1.5 right-1.5"><FounderBadge size="sm" /></div>
          )}
        </div>

        <div className="flex flex-1 flex-col p-2.5">
          <p className="mb-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-primary">
            {catLabel}
          </p>
          <h3 className="font-heading text-[13px] font-semibold leading-snug text-foreground line-clamp-2">
            {item.title || "Sans titre"}
          </h3>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 text-[11px] text-muted-foreground">
            <span className="truncate">{item.owner?.city || item.city || "France"}</span>
            {item.distance != null && (
              <span>· {item.distance < 1 ? "<1" : Math.round(item.distance)} km</span>
            )}
          </div>

          {item.exchange_offer && (
            <div className="mt-1.5 rounded-md bg-muted/70 px-2 py-1 text-[11px] leading-snug text-foreground line-clamp-2">
              <span className="font-semibold text-foreground">Échange : </span>
              {item.exchange_offer}
            </div>
          )}

          <div className="mt-auto flex items-center justify-end pt-2">
            <span className="text-[11px] font-semibold text-primary transition-transform group-hover:translate-x-0.5">
              Voir →
            </span>
          </div>
        </div>
      </article>
    );

    return isClickable ? <Link to={linkTo} className="block h-full">{missionCard}</Link> : <>{missionCard}</>;
  }

  const cardContent = (
    <article
      className={`group relative ${isClickable ? "cursor-pointer" : ""} ${isInactive ? "opacity-60" : ""} ${testDemoMode ? (isDemo ? "card-test-demo" : "card-test-real") : ""}`}
      aria-disabled={isInactive || undefined}
      data-testid={isDemo ? "search-card-demo" : "search-card-real"}
      data-demo={isDemo ? "true" : "false"}
      data-out-of-zone={isOutOfZone ? "true" : undefined}
      data-list-index={typeof listIndex === "number" ? listIndex + 1 : undefined}
    >
      {testDemoMode && typeof listIndex === "number" && (
        <span
          className={`absolute z-20 top-2 left-2 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full shadow ${isDemo ? "bg-amber-500 text-amber-50" : "bg-sky-500 text-sky-50"}`}
          data-testid="search-card-position"
        >
          #{listIndex + 1} {isDemo ? "DEMO" : "REAL"}
        </span>
      )}

      {/* ─── Hero visual ─── */}
      <div
        className={`relative aspect-[4/3] overflow-hidden rounded-xl bg-muted transition-all duration-500 ease-out ${
          isClickable ? "group-hover:shadow-2xl group-hover:-translate-y-2" : ""
        } ${isDemo ? "ring-1 ring-amber-300/70" : ""}`}
      >
        {coverPhoto ? (
          <img
            src={coverPhoto}
            alt=""
            className={`w-full h-full object-cover transition-transform duration-[1000ms] ease-out ${isClickable ? "group-hover:scale-105" : ""} ${isInactive ? "grayscale" : ""} ${isDemo ? "saturate-[0.85]" : ""}`}
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/40">
            <PawPrint className="h-10 w-10" />
          </div>
        )}

        {/* Soft bottom gradient for legible overlay chips */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/55 via-black/15 to-transparent pointer-events-none" />

        {isDemo && (
          <span
            className="absolute top-3 left-3 bg-amber-400/95 text-amber-950 text-[9px] font-semibold uppercase tracking-[0.15em] px-2 py-0.5 rounded-sm backdrop-blur-sm shadow-sm"
            data-testid="demo-example-badge"
          >
            Exemple
          </span>
        )}
        {(isAssigned || isCompleted || isPast) && (
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="bg-foreground/85 text-background px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] shadow-md">
              {isPast || isCompleted ? "Annonce passée" : "Gardiennage attribué"}
            </span>
          </span>
        )}

        {/* Top-left stacked badges */}
        <div className="absolute top-5 left-5 flex flex-col gap-1.5 pointer-events-none">
          {!isInactive && !isDemo && item.owner?.identity_verified && (
            <span className="w-fit px-2.5 py-1 bg-primary text-primary-foreground text-[10px] font-bold tracking-[0.2em] uppercase shadow-lg">
              Vérifié
            </span>
          )}
          {item.isNew && !isDemo && !isInactive && (
            <span className="w-fit px-2.5 py-1 bg-white/95 backdrop-blur-sm text-foreground text-[10px] font-bold tracking-[0.2em] uppercase shadow-lg">
              Nouveau
            </span>
          )}
        </div>

        {/* Top-right favorite + affinity */}
        {!isDemo && !isMission && !isInactive && (
          <div className="absolute top-4 right-4 flex items-center gap-2" onClick={(e) => e.preventDefault()}>
            {affinity && affinityDisplayed && (
              <div className="rounded-full bg-white/95 backdrop-blur-md shadow-sm">
                <AffinityBadge
                  result={affinity}
                  size="sm"
                  trackingContext="search_listing"
                  trackingId={item.id}
                />
              </div>
            )}
            <FavoriteButton targetType="sit" targetId={item.id} size="sm" />
          </div>

        )}


        {/* Bottom-left glassy chips: pets + dates */}
        <div className="absolute bottom-5 left-5 right-5 flex flex-wrap items-end gap-1.5">
          {Object.entries(petGroups).slice(0, 3).map(([species, names]) => {
            const IconComp = speciesIcon[species] || PawPrint;
            const count = names.length;
            return (
              <span
                key={species}
                className="inline-flex items-center gap-1 px-2 py-1 bg-white/10 backdrop-blur-md border border-white/25 rounded-full text-white text-[11px] font-medium"
              >
                <IconComp className="h-3 w-3 opacity-80" />
                {count > 1 && <span>×{count}</span>}
              </span>
            );
          })}
          {dateLabel && (
            <span className="inline-flex items-center px-2.5 py-1.5 bg-white/10 backdrop-blur-md border border-white/25 rounded-full text-white text-[11px] font-medium">
              {dateLabel}
            </span>
          )}
          {isOutOfZone && !isInactive && (
            <span
              className="ml-auto inline-flex items-center px-2.5 py-1.5 bg-primary/95 backdrop-blur-md text-primary-foreground rounded-full text-[11px] font-semibold"
              title={`Cette annonce est à ${Math.round(item.distance)} km, au-delà de votre rayon de ${radius} km`}
            >
              {Math.round(item.distance)} km
            </span>
          )}
        </div>
      </div>

      {/* ─── Body, editorial ─── */}
      <div className="mt-3 sm:mt-6 px-1">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-heading text-[17px] sm:text-xl md:text-[26px] font-medium leading-[1.2] text-foreground tracking-tight line-clamp-2">
            {item.title || "Sans titre"}
          </h3>
          {item.owner?.is_founder && <div className="shrink-0 pt-1"><FounderBadge size="sm" /></div>}
        </div>

        <div className="mt-2 sm:mt-3 flex items-center justify-between gap-3">
          <p className={`text-[11px] uppercase tracking-[0.18em] font-light truncate ${isOutOfZone ? "text-foreground" : "text-muted-foreground"}`}>
            <span className="truncate">{item.owner?.city || ""}</span>
            {item.distance != null && (
              <span className={`ml-1 ${isOutOfZone ? "font-medium text-primary" : ""}`}>
                · {item.distance < 1 ? "< 1" : Math.round(item.distance).toLocaleString("fr-FR").replace(/\s/g, "\u202F")} km
              </span>
            )}
          </p>

          {!isInactive && !isDemo && (
            <span className="relative inline-flex items-center gap-1.5 text-primary font-semibold text-sm shrink-0">
              <span>Postuler</span>
              <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1.5">→</span>
              <span className="absolute -bottom-1 left-0 h-[1px] w-0 bg-primary transition-all duration-300 group-hover:w-[calc(100%-1rem)]" />
            </span>
          )}
        </div>

        {(item.environments?.length > 0 || item.ownerEnvironments?.length > 0) && (
          <div className="mt-4">
            <EnvironmentPills selected={item.environments?.length > 0 ? item.environments : item.ownerEnvironments || []} onChange={() => {}} readOnly maxVisible={2} />
          </div>
        )}

        {isMission && item.description && (
          <p className="mt-3 text-sm text-muted-foreground line-clamp-2 leading-relaxed">{item.description}</p>
        )}

        {isAssigned && (
          <p className="mt-3 text-xs text-muted-foreground italic">Cette garde a déjà trouvé son gardien.</p>
        )}
        {isCompleted && (
          <p className="mt-3 text-xs text-muted-foreground italic">Garde déjà réalisée, aperçu de l'activité.</p>
        )}
        {isPast && !isCompleted && (
          <p className="mt-3 text-xs text-muted-foreground italic">Annonce passée, consultable à titre d'historique.</p>
        )}
        {isDemo && (
          <p className="mt-3 text-xs text-amber-700 italic">Exemple, cliquez pour découvrir</p>
        )}
      </div>
    </article>
  );

  if (isClickable) {
    return <Link to={linkTo}>{cardContent}</Link>;
  }
  return <>{cardContent}</>;
};

export default SearchListingCard;
