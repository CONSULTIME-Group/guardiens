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
      className={`relative bg-card rounded-2xl overflow-hidden border transition-shadow ${isClickable ? "cursor-pointer hover:shadow-md" : ""} ${isInactive ? "opacity-60 grayscale-[40%]" : ""} ${isDemo ? "border-amber-400 border-dashed ring-1 ring-amber-200/60" : isOutOfZone ? "border-dashed border-muted-foreground/40" : "border-border"} ${testDemoMode ? (isDemo ? "card-test-demo" : "card-test-real") : ""}`}
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
        <div className="h-52 relative">
          <img src={coverPhoto} alt="" className={`w-full h-full object-cover ${isInactive ? "grayscale" : ""} ${isDemo ? "saturate-[0.85]" : ""}`} loading="lazy" />
          {isDemo && (
            <span
              className="absolute inset-x-0 top-0 bg-amber-400 text-amber-950 text-[11px] font-semibold uppercase tracking-wide px-3 py-1.5 text-center shadow-sm flex items-center justify-center gap-1.5"
              data-testid="demo-example-badge"
            >
              <Sparkles className="h-3 w-3" /> Annonce d'exemple — pour illustrer la plateforme
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
            <span className="absolute top-3 left-3 flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 text-xs text-primary font-medium">
              <ShieldCheck className="h-3 w-3" /> Vérifié
            </span>
          )}
          {!isDemo && !isMission && !isInactive && (
            <span className="absolute top-3 right-3 z-10" onClick={(e) => e.preventDefault()}>
              <FavoriteButton targetType="sit" targetId={item.id} size="sm" />
            </span>
          )}
          {item.isNew && !isDemo && !isInactive && (
            <span className="absolute top-3 left-3 mt-8 bg-primary text-primary-foreground rounded-full px-2 py-1 text-xs flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Nouveau
            </span>
          )}
          {isOutOfZone && !isInactive && (
            <span
              className="absolute bottom-3 left-3 inline-flex items-center gap-1 bg-foreground/85 text-background backdrop-blur-sm rounded-full px-2.5 py-1 text-[11px] font-medium shadow-sm"
              title={`Cette annonce est à ${Math.round(item.distance)} km, au-delà de votre rayon de ${radius} km`}
            >
              <MapPin className="h-3 w-3" /> Hors zone · {Math.round(item.distance)} km
            </span>
          )}
        </div>
      )}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-base font-semibold text-foreground leading-snug line-clamp-2">
            {item.title || "Sans titre"}
          </h3>
          {item.owner?.is_founder && <FounderBadge size="sm" />}
        </div>
        <p className={`text-sm mb-2 flex items-center gap-1 ${isOutOfZone ? "text-foreground" : "text-muted-foreground"}`}>
          <MapPin className={`h-3.5 w-3.5 ${isOutOfZone ? "text-primary" : ""}`} />
          {item.owner?.city || ""}
          {item.distance != null && (
            <span className={isOutOfZone ? "font-semibold text-primary" : ""}>
              {" · "}
              {item.distance < 1 ? "< 1" : Math.round(item.distance).toLocaleString("fr-FR").replace(/\s/g, "\u202F")} km
            </span>
          )}
        </p>
        {Object.keys(petGroups).length > 0 && (
          <div className="flex flex-wrap items-center gap-3 mb-2">
            {Object.entries(petGroups).map(([species, names]) => {
              const IconComp = speciesIcon[species] || PawPrint;
              return (
                <span key={species} className="flex items-center gap-0.5 text-amber-700 text-sm">
                  <IconComp className="h-4 w-4" /> ×{names.length}
                </span>
              );
            })}
          </div>
        )}
        {(item.environments?.length > 0 || item.ownerEnvironments?.length > 0) && (
          <div className="mb-2">
            <EnvironmentPills selected={item.environments?.length > 0 ? item.environments : item.ownerEnvironments || []} onChange={() => {}} readOnly maxVisible={2} />
          </div>
        )}
        {!isMission && item.start_date && (
          <p className="text-xs text-muted-foreground">
            {formatDate(item.start_date)} → {formatDate(item.end_date)}
          </p>
        )}
        {isMission && item.description && (
          <p className="text-sm text-muted-foreground truncate">{item.description}</p>
        )}
        {isAssigned && (
          <p className="text-xs text-muted-foreground italic mt-3">
            Cette garde a déjà trouvé son gardien.
          </p>
        )}
        {isCompleted && (
          <p className="text-xs text-muted-foreground italic mt-3">
            Garde déjà réalisée — pour donner un aperçu de l'activité.
          </p>
        )}
        {isPast && !isCompleted && (
          <p className="text-xs text-muted-foreground italic mt-3">
            Annonce passée — consultable à titre d'historique.
          </p>
        )}
        {isDemo && (
          <p className="text-xs text-amber-700 italic mt-3 flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> Exemple — cliquez pour découvrir l'expérience complète
          </p>
        )}
        {showCTA && !isDemo && (
          <Link
            to="/mon-abonnement"
            className="block w-full py-2 text-sm text-center text-primary bg-primary/10 rounded-xl font-medium mt-3 hover:bg-primary/20 transition-colors"
          >
            S'abonner pour postuler
          </Link>
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
