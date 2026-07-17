import { Link, useLocation } from "react-router-dom";

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

  // ─── Card « sit » : refonte 2026 (grille éditoriale calme) ───
  // Principes : photo 4:3 propre (pas de badge lourd en overlay), méta sous
  // l'image, badge affinité en pill sémantique ton-sur-ton (« Très compatible »
  // si score ≥ 60 %, silence sinon), ombre 2 couches subtile, bordure 1 px 6 %.
  // Indisponibles : overlay blanc 40 % (jamais grayscale agressif ni noir).
  const cardContent = (
    <article
      className={`group relative flex h-full flex-col ${isClickable ? "cursor-pointer" : ""} ${isInactive ? "opacity-70" : ""} ${testDemoMode ? (isDemo ? "card-test-demo" : "card-test-real") : ""}`}
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

      {/* ─── Photo 4:3, propre, overlays minimalistes ─── */}
      <div
        className={`relative aspect-[4/3] overflow-hidden rounded-2xl bg-muted border border-black/[0.06] shadow-[0_1px_3px_rgba(11,31,26,0.05),0_4px_16px_-4px_rgba(11,31,26,0.06)] transition-all duration-500 ease-out ${
          isClickable ? "group-hover:shadow-[0_4px_12px_rgba(11,31,26,0.08),0_16px_40px_-8px_rgba(11,31,26,0.10)]" : ""
        }`}
      >
        {coverPhoto ? (
          <img
            src={coverPhoto}
            alt=""
            className={`w-full h-full object-cover transition-transform duration-[900ms] ease-out ${isClickable ? "group-hover:scale-[1.03]" : ""}`}
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/40">
            <PawPrint className="h-10 w-10" />
          </div>
        )}

        {/* Favori seul en overlay top-right, discret. */}
        {!isDemo && !isInactive && (
          <div className="absolute top-3 right-3" onClick={(e) => e.preventDefault()}>
            <FavoriteButton targetType="sit" targetId={item.id} size="sm" />
          </div>
        )}

        {/* Badge « Exemple » discret en coin (lin sur lin), pas de saturation cassée. */}
        {isDemo && (
          <span
            className="absolute top-3 left-3 bg-warning/95 text-warning-foreground text-[10px] font-semibold uppercase tracking-[0.16em] px-2 py-0.5 rounded-full shadow-sm"
            data-testid="demo-example-badge"
          >
            Exemple
          </span>
        )}

        {/* Indisponible : overlay blanc doux + pill neutre au centre. */}
        {(isAssigned || isCompleted || isPast) && (
          <div className="absolute inset-0 bg-white/45 backdrop-blur-[1px] flex items-center justify-center">
            <span className="bg-white/95 text-foreground text-[10px] font-semibold uppercase tracking-[0.2em] px-4 py-1.5 rounded-full border border-black/[0.06] shadow-sm">
              {isPast || isCompleted ? "Annonce passée" : "Gardiennage attribué"}
            </span>
          </div>
        )}
      </div>

      {/* ─── Corps de carte sous l'image ─── */}
      <div className="mt-4 px-0.5 flex flex-col flex-1">
        {/* Ligne 1 : ville · distance, en eyebrow sauge discret */}
        <p className={`text-[11px] uppercase tracking-[0.16em] font-medium truncate ${isOutOfZone ? "text-primary" : "text-primary/70"}`}>
          <span className="truncate">{item.owner?.city || "France"}</span>
          {item.distance != null && (
            <span className="ml-1 opacity-70">
              · {item.distance < 1 ? "< 1" : Math.round(item.distance).toLocaleString("fr-FR").replace(/\s/g, "\u202F")} km
            </span>
          )}
        </p>

        {/* Ligne 2 : titre Outfit (font-sans) pour scannabilité, poids medium */}
        <div className="mt-1.5 flex items-start justify-between gap-2">
          <h3 className="font-sans text-[15px] sm:text-[16px] font-medium leading-snug text-foreground line-clamp-2">
            {item.title || "Sans titre"}
          </h3>
        </div>

        {/* Ligne 3 : meta compacte (animaux + dates), petite typo, gris */}
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted-foreground">
          {Object.entries(petGroups).slice(0, 3).map(([species, names], idx) => {
            const IconComp = speciesIcon[species] || PawPrint;
            const count = names.length;
            return (
              <span key={species} className="inline-flex items-center gap-1">
                {idx > 0 && <span aria-hidden className="opacity-40">·</span>}
                <IconComp className="h-3 w-3 opacity-70" aria-hidden />
                {count > 1 && <span>×{count}</span>}
              </span>
            );
          })}
          {dateLabel && (
            <>
              {Object.keys(petGroups).length > 0 && <span aria-hidden className="opacity-40">·</span>}
              <span>{dateLabel}</span>
            </>
          )}
        </div>

        {/* Ligne 4 : badges de confiance / affinité, ton-sur-ton, silence si rien. */}
        {(!isInactive && !isDemo) && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {item.owner?.identity_verified && (
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/[0.06] text-primary text-[11px] font-semibold px-2 py-0.5">
                Vérifié
              </span>
            )}
            {affinity && affinityDisplayed && (
              <AffinityBadge
                result={affinity}
                size="sm"
                variant="numeric"
                trackingContext="search_listing"
                trackingId={item.id}
              />
            )}
            {isOutOfZone && (
              <span className="ml-auto inline-flex items-center rounded-full bg-primary/95 text-primary-foreground text-[10px] font-semibold px-2 py-0.5">
                {Math.round(item.distance)} km
              </span>
            )}
          </div>
        )}

        {/* Bloc de pied de carte : épingle en bas pour aligner les cartes d'une rangée */}
        <div className="mt-auto">
          {isAssigned && (
            <p className="mt-2 text-[11px] text-muted-foreground italic">Cette garde a déjà trouvé son gardien.</p>
          )}
          {isCompleted && (
            <p className="mt-2 text-[11px] text-muted-foreground italic">Garde déjà réalisée, aperçu de l'activité.</p>
          )}
          {isPast && !isCompleted && (
            <p className="mt-2 text-[11px] text-muted-foreground italic">Annonce passée, consultable à titre d'historique.</p>
          )}
          {isDemo && (
            <p className="mt-2 text-[11px] text-warning-foreground/80 italic">Exemple, cliquez pour découvrir</p>
          )}
        </div>
      </div>
    </article>
  );

  if (isClickable) {
    return <Link to={linkTo}>{cardContent}</Link>;
  }
  return <>{cardContent}</>;
};

export default SearchListingCard;
