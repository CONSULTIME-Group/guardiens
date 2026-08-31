import type { MissionCategory } from "@/lib/missionCategories";

export type CommunityCategory = "animaux" | "jardin" | "maison" | "garde" | "autre";

export const COMMUNITY_CATEGORIES: { key: CommunityCategory; label: string; hint: string }[] = [
  { key: "animaux", label: "Animaux", hint: "Comportement, santé, garde" },
  { key: "jardin", label: "Jardin", hint: "Plantes, potager, arrosage" },
  { key: "maison", label: "Maison", hint: "Bricolage, entretien" },
  { key: "garde", label: "Garde de maison", hint: "Vie pratique entre gardiens et propriétaires" },
  { key: "autre", label: "Autre", hint: "Tout le reste" },
];

export const CATEGORY_LABEL: Record<CommunityCategory, string> = COMMUNITY_CATEGORIES.reduce(
  (acc, c) => ({ ...acc, [c.key]: c.label }),
  {} as Record<CommunityCategory, string>,
);

/** Libellé sûr pour une valeur venue de la base, y compris inconnue. */
export function questionCategoryLabel(value: string | null | undefined): string {
  if (!value) return "Autre";
  return (CATEGORY_LABEL as Record<string, string>)[value] || "Autre";
}

/**
 * Pont total entre l'enum `community_question_category` (français, cinq
 * valeurs) et l'enum `small_mission_category` (anglais, huit valeurs).
 * « garde » et « autre » rejoignent « other » : ranger la garde de maison
 * sous « Maison et bricolage » tromperait le lecteur.
 * Fonction totale : une valeur inconnue renvoie "other", jamais undefined.
 */
export function questionCategoryToMissionCategory(
  value: string | null | undefined,
): MissionCategory {
  switch (value) {
    case "animaux":
      return "animals";
    case "jardin":
      return "garden";
    case "maison":
      return "house";
    default:
      return "other";
  }
}
