/**
 * Hook centralisant les valeurs dérivées d'un sit affichées dans les vues
 * Owner et Sitter. Évite la duplication entre OwnerSitView et SitterSitView.
 *
 * Renvoie :
 * - `avgRating` — moyenne des `overall_rating`, formatée avec 1 décimale (string),
 *   ou `null` si pas d'avis.
 * - `formatDate` — formateur date français court ("d MMMM yyyy"), tolérant aux nulls.
 * - `matchingBadges` — badges affichés au gardien (compatibilité animaux, proximité).
 */
import { useMemo, useCallback } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface UseSitDerivedArgs {
  reviews: any[];
  pets?: any[];
  sitterProfile?: any;
  owner?: any;
  /** Pour décider si on calcule les badges de matching */
  context: "owner" | "sitter";
  /** Rôle actif courant de l'utilisateur connecté (pour les badges sitter) */
  activeRole?: string | null;
  /** Rôle stocké en profil ('owner' | 'sitter' | 'both') */
  userRole?: string | null;
  /** Prénom — utilisé comme proxy "user a renseigné son profil" */
  userFirstName?: string | null;
}

export function useSitDerived({
  reviews,
  pets = [],
  sitterProfile,
  owner,
  context,
  activeRole,
  userRole,
  userFirstName,
}: UseSitDerivedArgs) {
  const avgRating = useMemo(() => {
    if (!reviews || reviews.length === 0) return null;
    const sum = reviews.reduce(
      (acc: number, r: any) => acc + (r.overall_rating ?? 0),
      0,
    );
    return (sum / reviews.length).toFixed(1);
  }, [reviews]);

  const formatDate = useCallback(
    (d: string | null) =>
      d ? format(new Date(d), "d MMMM yyyy", { locale: fr }) : "",
    [],
  );

  const matchingBadges = useMemo<string[]>(() => {
    if (context !== "sitter") return [];
    if (!sitterProfile) return [];
    const isSitter =
      activeRole === "sitter" || userRole === "sitter" || userRole === "both";
    if (!isSitter) return [];

    const badges: string[] = [];
    const sitterAnimals: string[] = sitterProfile.animal_types || [];
    const petSpecies = pets.map((p: any) => p.species);
    const matchAnimal = petSpecies.some((s: string) =>
      sitterAnimals.includes(s),
    );
    if (matchAnimal) badges.push("Correspond à votre expérience animaux");
    if (sitterProfile.geographic_radius && owner?.city && userFirstName) {
      badges.push("Proche de chez vous");
    }
    return badges;
  }, [context, sitterProfile, activeRole, userRole, pets, owner, userFirstName]);

  return { avgRating, formatDate, matchingBadges };
}
