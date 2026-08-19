/**
 * Catégories de l'entraide, source unique.
 *
 * Source de vérité : l'enum Postgres `small_mission_category`
 * (animals, garden, house, skills). Cette liste est la seule référence UI :
 * les chips de l'EntraideHub, du fil mobile et du formulaire en découlent.
 * Le test `missionCategories.test.ts` vérifie l'alignement avec l'enum en base.
 */
import type { Tables } from "@/integrations/supabase/types";

export type MissionCategory = Tables<"small_missions">["category"];

export const MISSION_CATEGORIES: { key: MissionCategory; label: string }[] = [
  { key: "animals", label: "Animaux" },
  { key: "garden", label: "Jardin" },
  { key: "house", label: "Maison" },
  { key: "skills", label: "Compétences" },
];

export const MISSION_CATEGORY_LABEL: Record<MissionCategory, string> =
  Object.fromEntries(MISSION_CATEGORIES.map((c) => [c.key, c.label])) as Record<
    MissionCategory,
    string
  >;

export function isMissionCategory(value: unknown): value is MissionCategory {
  return MISSION_CATEGORIES.some((c) => c.key === value);
}

/** Natures d'une entrée du fil d'entraide. */
export type EntraideNature = "question" | "demande" | "offre";

export const ENTRAIDE_NATURE_LABEL: Record<EntraideNature, string> = {
  question: "Question",
  demande: "Demande",
  offre: "Offre",
};

export function missionNature(missionType: string | null | undefined): EntraideNature {
  return missionType === "offre" ? "offre" : "demande";
}
