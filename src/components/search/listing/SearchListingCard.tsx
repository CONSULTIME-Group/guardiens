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

  const dateLabel = !isMission && item.start_date
    ? `${formatDate(item.start_date)} → ${formatDate(item.end_date)}`
    : null;

  const cardContent = (
    <div
      className={`group relative bg-card rounded-3xl overflow-hidden border transition-all duration-500 ${isClickable ? "cursor-pointer hover:shadow-2xl hover:-translate-y-1 hover:border-primary/40" : ""} ${isInactive ? "opacity-60 grayscale-[40%]" : ""} ${isDemo ? "border-amber-300/70 border-dashed" : isOutOfZone ? "border-dashed border-muted-foreground/30" : "border-border/50"} ${testDemoMode ? (isDemo ? "card-test-demo" : "card-test-real") : ""}`}
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

      {/* ─── Visual — hero with overlay info ─── */}
      <div className="aspect-[4/3] relative overflow-hidden bg-gradient-to-br from-muted to-muted/60">
        {coverPhoto ? (
          <img
            src={coverPhoto}
            alt=""
            className={`w-full h-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-110 ${isInactive ? "grayscale" : ""} ${isDemo ? "saturate-[0.85]" : ""}`}
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/40">
            <PawPrint className="h-10 w-10" />
          </div>
        )}

        {/* Soft bottom gradient for legible overlay */}
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/75 via-black/30 to-transparent pointer-events-none" />

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

        {/* Top-row meta */}
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2 pointer-events-none">
          <div className="flex flex-wrap gap-1.5 pointer-events-auto">
            {!isInactive && !isDemo && item.owner?.identity_verified && (
              <span className="flex items-center gap-1 bg-background/95 backdrop-blur-md rounded-full px-2.5 py-1 text-[11px] text-primary font-medium shadow-sm">
                <ShieldCheck className="h-3 w-3" /> Vérifié
              </span>
            )}
            {item.isNew && !isDemo && !isInactive && (
              <span className="bg-primary text-primary-foreground rounded-full px-2.5 py-1 text-[11px] font-semibold flex items-center gap-1 shadow-md">
                <Sparkles className="h-3 w-3" /> Nouveau
              </span>
            )}
          </div>
          {!isDemo && !isMission && !isInactive && (
            <span className="pointer-events-auto" onClick={(e) => e.preventDefault()}>
              <FavoriteButton targetType="sit" targetId={item.id} size="sm" />
            </span>
          )}
        </div>

        {/* Bottom-overlay: pets + dates + distance */}
        <div className="absolute inset-x-0 bottom-0 p-3 flex flex-wrap items-center gap-1.5">
          {Object.entries(petGroups).slice(0, 3).map(([species, names]) => {
            const IconComp = speciesIcon[species] || PawPrint;
            return (
              <span
                key={species}
                className="inline-flex items-center gap-1 bg-white/95 text-foreground backdrop-blur-md rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm"
              >
                <IconComp className="h-3.5 w-3.5 text-primary" />
                ×{names.length}
              </span>
            );
          })}
          {dateLabel && (
            <span className="inline-flex items-center gap-1 bg-white/95 text-foreground backdrop-blur-md rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm">
              {dateLabel}
            </span>
          )}
          {isOutOfZone && !isInactive && (
            <span
              className="ml-auto inline-flex items-center gap-1 bg-primary/95 text-primary-foreground backdrop-blur-md rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm"
              title={`Cette annonce est à ${Math.round(item.distance)} km, au-delà de votre rayon de ${radius} km`}
            >
              <MapPin className="h-3 w-3" /> {Math.round(item.distance)} km
            </span>
          )}
        </div>
      </div>

      {/* ─── Body ─── */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="font-heading text-[17px] font-semibold text-foreground leading-tight line-clamp-2 tracking-tight group-hover:text-primary transition-colors">
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
            <span className="text-primary font-semibold inline-flex items-center gap-1 group-hover:gap-2 transition-all">
              Postuler <span aria-hidden>→</span>
            </span>
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
