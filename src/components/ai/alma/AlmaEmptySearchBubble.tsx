/**
 * <AlmaEmptySearchBubble />, Alma Pass 2 Tour 3.
 *
 * Bulle d'aide affichée en tête de l'empty state de SearchSitter quand
 * l'utilisateur a au moins un filtre actif OU un rayon restrictif (<100 km).
 *
 * Audience: gardien (vouvoiement, contexte "espace gardien").
 * Respecte `profiles.alma_frequency === "silent"` : retourne null.
 *
 * Lot A6 (14/10/2026) : pour un visiteur, « Recevoir les annonces de ce
 * secteur » mène à l'inscription gardien avec retour à la recherche, et
 * « Vous partez ? Publiez votre annonce » à l'inscription propriétaire vers
 * /sits/create. Aucune alerte n'est tentée pour un visiteur. « Élargir à la
 * région » n'apparaît que pour un rayon ou un département.
 */
import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { AlmaBubble } from "./AlmaBubble";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";
import { useAlmaFrequency } from "@/hooks/useAlmaFrequency";
import {
  canExpandToRegion,
  visitorSectorSignupUrl,
  VISITOR_OWNER_PUBLISH_SIGNUP_URL,
} from "@/lib/almaVisitorSearch";

export type RestrictiveFilter =
  | "emergencyOnly"
  | "verifiedOnly"
  | "withPhotosOnly"
  | "minExperience"
  | "environments"
  | "housingType"
  | "animalTypes"
  | "dates"
  | "duration"
  | null;

interface Props {
  hasFilters: boolean;
  radius: number;
  zoneMode: "radius" | "dept" | "region" | "france";
  activeFilters: {
    emergencyOnly?: boolean;
    verifiedOnly?: boolean;
    withPhotosOnly?: boolean;
    minExperience?: string;
    environments?: string[];
    housingTypes?: string[];
    animalTypes?: string[];
    startDate?: string;
    endDate?: string;
    duration?: string;
  };
  onExpandToRegion: () => void;
  onOpenAlert: () => void;
  onRelaxFilter: (filter: Exclude<RestrictiveFilter, null>) => void;
  /** Lot A6 : visiteur non connecté, actions d'inscription à la place de l'alerte. */
  isVisitor?: boolean;
  /** Lot A6 : recherche courante à retrouver après l'inscription (visitorSearchRedirect). */
  visitorSearchPath?: string;
}

type BubbleAction =
  | "expand_region"
  | "activate_alert"
  | "relax_filter"
  | "signup_sector_alerts"
  | "signup_publish";

/**
 * Détermine le filtre le plus restrictif à relâcher en priorité.
 * Ordre décroissant de restrictivité observée dans le vivier.
 */
function pickRestrictiveFilter(f: Props["activeFilters"]): RestrictiveFilter {
  if (f.emergencyOnly) return "emergencyOnly";
  if (f.verifiedOnly) return "verifiedOnly";
  if (f.withPhotosOnly) return "withPhotosOnly";
  if (f.minExperience && f.minExperience !== "all") return "minExperience";
  if (f.environments && f.environments.length > 0) return "environments";
  if (f.housingTypes && f.housingTypes.length > 0) return "housingType";
  if (f.animalTypes && f.animalTypes.length > 0) return "animalTypes";
  if (f.startDate || f.endDate) return "dates";
  if (f.duration && f.duration !== "all") return "duration";
  return null;
}

const FILTER_LABEL: Record<Exclude<RestrictiveFilter, null>, string> = {
  emergencyOnly: "le filtre Urgence",
  verifiedOnly: "le filtre Vérifié uniquement",
  withPhotosOnly: "le filtre Avec photos",
  minExperience: "l'expérience minimum requise",
  environments: "les environnements sélectionnés",
  housingType: "le type de logement",
  animalTypes: "les animaux sélectionnés",
  dates: "les dates",
  duration: "la durée",
};

export function AlmaEmptySearchBubble({
  hasFilters,
  radius,
  zoneMode,
  activeFilters,
  onExpandToRegion,
  onOpenAlert,
  onRelaxFilter,
  isVisitor = false,
  visitorSearchPath = "/annonces",
}: Props) {
  const { frequency } = useAlmaFrequency();
  const restrictive = useMemo(() => pickRestrictiveFilter(activeFilters), [activeFilters]);
  const shouldShow = hasFilters || radius < 100 || zoneMode === "radius";
  const showExpand = canExpandToRegion(zoneMode);

  useEffect(() => {
    if (!shouldShow || frequency === "silent") return;
    void trackEvent("alma_empty_search_bubble_seen", {
      source: "search_sitter",
      metadata: {
        radius_km: radius,
        zone_mode: zoneMode,
        restrictive_filter: restrictive,
        has_filters: hasFilters,
        is_visitor: isVisitor,
      },
    });
  }, [shouldShow, frequency, radius, zoneMode, restrictive, hasFilters, isVisitor]);

  if (frequency === "silent" || !shouldShow) return null;

  const click = (action_id: BubbleAction) => {
    void trackEvent("alma_empty_search_action_clicked", {
      source: "search_sitter",
      metadata: {
        action_id,
        restrictive_filter: action_id === "relax_filter" ? restrictive : undefined,
        zone_mode: zoneMode,
        is_visitor: isVisitor,
      },
    });
    if (action_id === "expand_region") onExpandToRegion();
    // Un visiteur ne déclenche jamais la création d'alerte (fonctions refusées à anon).
    if (action_id === "activate_alert" && !isVisitor) onOpenAlert();
    if (action_id === "relax_filter" && restrictive) onRelaxFilter(restrictive);
  };

  const expandButton = showExpand ? (
    <Button size="sm" variant={isVisitor ? "outline" : "default"} onClick={() => click("expand_region")}>
      Élargir à la région
    </Button>
  ) : null;
  const relaxButton = restrictive ? (
    <Button size="sm" variant="ghost" onClick={() => click("relax_filter")}>
      Retirer {FILTER_LABEL[restrictive]}
    </Button>
  ) : null;

  if (isVisitor) {
    return (
      <div className="mb-4">
        <AlmaBubble
          audience="sitter"
          variant="inline"
          title="Aucune annonce ne correspond à votre recherche pour le moment."
          actions={
            <>
              <Button size="sm" variant="default" asChild>
                <Link to={visitorSectorSignupUrl(visitorSearchPath)} onClick={() => click("signup_sector_alerts")}>
                  Recevoir les annonces de ce secteur
                </Link>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link to={VISITOR_OWNER_PUBLISH_SIGNUP_URL} onClick={() => click("signup_publish")}>
                  Vous partez ? Publiez votre annonce
                </Link>
              </Button>
              {expandButton}
              {relaxButton}
            </>
          }
        >
          Avec un compte gardien, les nouvelles annonces de ce secteur vous
          parviennent par email. Vous partez bientôt ? Votre annonce prévient
          les gardiens à proximité.
        </AlmaBubble>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <AlmaBubble
        audience="sitter"
        variant="inline"
        title="Aucune annonce ne correspond à votre recherche pour le moment."
        actions={
          <>
            {expandButton}
            <Button size="sm" variant={showExpand ? "outline" : "default"} onClick={() => click("activate_alert")}>
              Créer une alerte
            </Button>
            {relaxButton}
          </>
        }
      >
        {showExpand
          ? "Je vous propose d'élargir votre zone pour voir davantage d'annonces, ou de créer une alerte pour être prévenu(e) dès qu'une annonce colle à votre profil. Vous pouvez aussi retirer un filtre restrictif."
          : "Je vous propose de créer une alerte pour être prévenu(e) dès qu'une annonce colle à votre profil. Vous pouvez aussi retirer un filtre restrictif."}
      </AlmaBubble>
    </div>
  );
}


export default AlmaEmptySearchBubble;
