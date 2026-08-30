/**
 * Catégories de l'entraide, source unique.
 *
 * Source de vérité : l'enum Postgres `small_mission_category`
 * (animals, garden, house, skills, errand, transport, company, other).
 * Cette liste est la seule référence UI : les chips de l'EntraideHub, du fil
 * mobile, du formulaire, des cartes, des emails et du back-office en
 * découlent. Un seul libellé par catégorie, partout.
 * Le test `missionCategories.test.ts` vérifie l'alignement avec l'enum.
 */
import type { Tables } from "@/integrations/supabase/types";

export type MissionCategory = Tables<"small_missions">["category"];

export const MISSION_CATEGORIES = [
  { key: "animals", label: "Animaux" },
  { key: "garden", label: "Jardin" },
  { key: "house", label: "Maison et bricolage" },
  { key: "errand", label: "Courses et livraisons" },
  { key: "transport", label: "Transport et accompagnement" },
  { key: "company", label: "Présence et compagnie" },
  { key: "skills", label: "Savoir-faire et démarches" },
  { key: "other", label: "Autre" },
] as { key: MissionCategory; label: string }[];

export const MISSION_CATEGORY_LABEL: Record<MissionCategory, string> =
  Object.fromEntries(MISSION_CATEGORIES.map((c) => [c.key, c.label])) as Record<
    MissionCategory,
    string
  >;

/** Libellé sûr pour une valeur venue de la base, y compris inconnue. */
export function missionCategoryLabel(value: string | null | undefined): string {
  if (!value) return "Autre";
  return (MISSION_CATEGORY_LABEL as Record<string, string>)[value] || "Autre";
}


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
