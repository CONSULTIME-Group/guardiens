/**
 * <AlmaEmptySearchBubble /> — Alma Pass 2 Tour 3.
 *
 * Bulle d'aide affichée en tête de l'empty state de SearchSitter quand
 * l'utilisateur a au moins un filtre actif OU un rayon restrictif (<100 km).
 *
 * Audience: gardien (tutoiement, contexte "espace gardien").
 * Respecte `profiles.alma_frequency === "silent"` : retourne null.
 */
import { useEffect, useMemo } from "react";
import { AlmaBubble } from "./AlmaBubble";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";
import { useAlmaFrequency } from "@/hooks/useAlmaFrequency";

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
}

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
}: Props) {
  const { frequency } = useAlmaFrequency();
  const restrictive = useMemo(() => pickRestrictiveFilter(activeFilters), [activeFilters]);
  const shouldShow = hasFilters || radius < 100 || zoneMode === "radius";

  useEffect(() => {
    if (!shouldShow || frequency === "silent") return;
    void trackEvent("alma_empty_search_bubble_seen", {
      source: "search_sitter",
      metadata: {
        radius_km: radius,
        zone_mode: zoneMode,
        restrictive_filter: restrictive,
        has_filters: hasFilters,
      },
    });
  }, [shouldShow, frequency, radius, zoneMode, restrictive, hasFilters]);

  if (frequency === "silent" || !shouldShow) return null;

  const click = (action_id: "expand_region" | "activate_alert" | "relax_filter") => {
    void trackEvent("alma_empty_search_action_clicked", {
      source: "search_sitter",
      metadata: {
        action_id,
        restrictive_filter: action_id === "relax_filter" ? restrictive : undefined,
      },
    });
    if (action_id === "expand_region") onExpandToRegion();
    if (action_id === "activate_alert") onOpenAlert();
    if (action_id === "relax_filter" && restrictive) onRelaxFilter(restrictive);
  };

  return (
    <div className="mb-4">
      <AlmaBubble
        audience="sitter"
        variant="inline"
        title="Aucune annonce dans ta zone avec ces critères. Veux-tu que je propose 3 pistes ?"
        actions={
          <>
            <Button size="sm" variant="outline" onClick={() => click("expand_region")}>
              Élargir à la région
            </Button>
            <Button size="sm" variant="outline" onClick={() => click("activate_alert")}>
              Activer une alerte
            </Button>
            {restrictive && (
              <Button size="sm" variant="outline" onClick={() => click("relax_filter")}>
                Relâcher {FILTER_LABEL[restrictive]}
              </Button>
            )}
          </>
        }
      >
        Je cible d'abord la région et je te préviens dès qu'une annonce colle à
        ton profil. Si tu préfères voir plus tout de suite, je peux aussi
        assouplir un critère.
      </AlmaBubble>
    </div>
  );
}

export default AlmaEmptySearchBubble;
