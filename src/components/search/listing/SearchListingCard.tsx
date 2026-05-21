import { Link } from "react-router-dom";
import FounderBadge from "@/components/badges/FounderBadge";
import EnvironmentPills from "@/components/shared/EnvironmentPills";
import FavoriteButton from "@/components/shared/FavoriteButton";
import { ShieldCheck, Sparkles, MapPin, PawPrint, Cat, Bird } from "lucide-react";

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
}

const SearchListingCard = ({
  item,
  listIndex,
  tab,
  radius,
  hasAccess,
  testDemoMode,
  formatDate,
}: SearchListingCardProps) => {
  const photos: string[] = item.property?.photos || [];
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
  const linkTo = isMission
    ? `/petites-missions/${item.id}`
    : isDemo
    ? `/annonces/demo/${item.slug || item.id}`
    : `/sits/${item.id}`;

  const showCTA = !hasAccess && !isInactive && !isDemo;
  const isClickable = (isDemo || hasAccess) && !isInactive;

  const cardContent = (
    <div
      className={`group relative bg-card rounded-3xl overflow-hidden border transition-all duration-300 ${isClickable ? "cursor-pointer hover:shadow-xl hover:-translate-y-0.5" : ""} ${isInactive ? "opacity-60 grayscale-[40%]" : ""} ${isDemo ? "border-amber-300/70 border-dashed" : isOutOfZone ? "border-dashed border-muted-foreground/30" : "border-border/60"} ${testDemoMode ? (isDemo ? "card-test-demo" : "card-test-real") : ""}`}
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
      {coverPhoto && (
        <div className="aspect-[4/3] relative overflow-hidden">
          <img
            src={coverPhoto}
            alt=""
            className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${isInactive ? "grayscale" : ""} ${isDemo ? "saturate-[0.85]" : ""}`}
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent pointer-events-none" />

          {isDemo && (
            <span
              className="absolute inset-x-0 top-0 bg-amber-400/95 text-amber-950 text-[10px] font-semibold uppercase tracking-wider px-3 py-1.5 text-center backdrop-blur-sm flex items-center justify-center gap-1.5"
              data-testid="demo-example-badge"
            >
              <Sparkles className="h-3 w-3" /> Annonce d'exemple
            </span>
          )}
          {(isAssigned || isCompleted || isPast) && (
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="bg-foreground/85 text-background rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide shadow-md">
                {isPast || isCompleted ? "Annonce passée" : "Gardiennage attribué"}
              </span>
            </span>
          )}

          {!isInactive && !isDemo && item.owner?.identity_verified && (
            <span className="absolute top-3 left-3 flex items-center gap-1 bg-background/95 backdrop-blur-sm rounded-full px-2.5 py-1 text-[11px] text-primary font-medium shadow-sm">
              <ShieldCheck className="h-3 w-3" /> Vérifié
            </span>
          )}
          {!isDemo && !isMission && !isInactive && (
            <span className="absolute top-3 right-3 z-10" onClick={(e) => e.preventDefault()}>
              <FavoriteButton targetType="sit" targetId={item.id} size="sm" />
            </span>
          )}
          {item.isNew && !isDemo && !isInactive && (
            <span className="absolute bottom-3 left-3 bg-primary text-primary-foreground rounded-full px-2.5 py-1 text-[11px] font-medium flex items-center gap-1 shadow-sm">
              <Sparkles className="h-3 w-3" /> Nouveau
            </span>
          )}
          {isOutOfZone && !isInactive && (
            <span
              className="absolute bottom-3 right-3 inline-flex items-center gap-1 bg-background/95 text-foreground backdrop-blur-sm rounded-full px-2.5 py-1 text-[11px] font-medium shadow-sm"
              title={`Cette annonce est à ${Math.round(item.distance)} km, au-delà de votre rayon de ${radius} km`}
            >
              <MapPin className="h-3 w-3" /> {Math.round(item.distance)} km
            </span>
          )}
        </div>
      )}

      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="text-[15px] font-semibold text-foreground leading-snug line-clamp-2 tracking-tight">
            {item.title || "Sans titre"}
          </h3>
          {item.owner?.is_founder && <FounderBadge size="sm" />}
        </div>

        <p className={`text-[13px] mb-3 flex items-center gap-1.5 ${isOutOfZone ? "text-foreground" : "text-muted-foreground"}`}>
          <MapPin className={`h-3.5 w-3.5 shrink-0 ${isOutOfZone ? "text-primary" : ""}`} />
          <span className="truncate">{item.owner?.city || ""}</span>
          {item.distance != null && (
            <span className={`shrink-0 ${isOutOfZone ? "font-semibold text-primary" : "text-muted-foreground/70"}`}>
              · {item.distance < 1 ? "< 1" : Math.round(item.distance).toLocaleString("fr-FR").replace(/\s/g, "\u202F")} km
            </span>
          )}
        </p>

        <div className="flex flex-wrap items-center gap-2 mb-3">
          {Object.entries(petGroups).map(([species, names]) => {
            const IconComp = speciesIcon[species] || PawPrint;
            return (
              <span
                key={species}
                className="inline-flex items-center gap-1 bg-muted/60 text-foreground rounded-full px-2.5 py-1 text-[11px] font-medium"
              >
                <IconComp className="h-3.5 w-3.5 text-primary" />
                ×{names.length}
              </span>
            );
          })}
          {!isMission && item.start_date && (
            <span className="inline-flex items-center gap-1 bg-muted/60 text-foreground rounded-full px-2.5 py-1 text-[11px] font-medium">
              {formatDate(item.start_date)} → {formatDate(item.end_date)}
            </span>
          )}
        </div>

        {(item.environments?.length > 0 || item.ownerEnvironments?.length > 0) && (
          <div className="mb-3">
            <EnvironmentPills selected={item.environments?.length > 0 ? item.environments : item.ownerEnvironments || []} onChange={() => {}} readOnly maxVisible={2} />
          </div>
        )}

        {isMission && item.description && (
          <p className="text-[13px] text-muted-foreground line-clamp-2">{item.description}</p>
        )}

        {isAssigned && (
          <p className="text-xs text-muted-foreground italic mt-2">Cette garde a déjà trouvé son gardien.</p>
        )}
        {isCompleted && (
          <p className="text-xs text-muted-foreground italic mt-2">Garde déjà réalisée — aperçu de l'activité.</p>
        )}
        {isPast && !isCompleted && (
          <p className="text-xs text-muted-foreground italic mt-2">Annonce passée — consultable à titre d'historique.</p>
        )}
        {isDemo && (
          <p className="text-xs text-amber-700 italic mt-2 flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> Exemple — cliquez pour découvrir
          </p>
        )}

        {showCTA && !isDemo && (
          <div className="mt-4 pt-4 border-t border-border/60 flex items-center justify-between text-[13px]">
            <span className="text-muted-foreground">Inscription gratuite</span>
            <span className="text-primary font-semibold">Postuler →</span>
          </div>
        )}
      </div>
    </div>
  );

  if (isClickable) {
    return <Link to={linkTo}>{cardContent}</Link>;
  }
  return <>{cardContent}</>;
};

export default SearchListingCard;
