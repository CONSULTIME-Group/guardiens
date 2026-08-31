import { MISSION_CATEGORIES, MISSION_CATEGORY_LABEL, type MissionCategory } from "@/lib/missionCategories";

/** Libellés catégories : miroir strict de la source unique. */
export const CATEGORY_META: Record<string, { label: string }> = Object.fromEntries(
  MISSION_CATEGORIES.map((c) => [c.key, { label: c.label }]),
);

/**
 * Correspondance catégorie de mission vers compétence déclarée par le membre.
 * Les compétences réelles sont : animaux, jardin, competences, coups_de_main.
 * Une catégorie sans compétence équivalente vaut `null` : le bloc
 * d'invitation retombe alors sur une sélection par proximité seule, il ne
 * disparaît jamais silencieusement.
 */
export const MISSION_TO_SKILL: Record<string, string | null> = {
  animals: "animaux",
  garden: "jardin",
  house: "coups_de_main",
  skills: "competences",
  errand: "coups_de_main",
  transport: "coups_de_main",
  company: null,
  other: null,
};

export const SKILL_TO_MISSION: Record<string, string> = {
  animaux: "animals",
  jardin: "garden",
  competences: "skills",
  coups_de_main: "house",
};

/** Pastilles de compétences : clés alignées sur les compétences réelles. */
export const SKILL_PILL_META: Record<string, { label: string }> = {
  jardin: { label: MISSION_CATEGORY_LABEL.garden },
  animaux: { label: MISSION_CATEGORY_LABEL.animals },
  competences: { label: MISSION_CATEGORY_LABEL.skills },
  coups_de_main: { label: MISSION_CATEGORY_LABEL.house },
};


export const DURATION_LABELS: Record<string, string> = {
  "1-2h": "1-2 heures",
  half_day: "Demi-journée",
  full_day: "Journée",
  several: "Plusieurs jours",
  weekend: "Week-end",
  week: "Semaine",
};

export function formatCity(city: string | null | undefined): string {
  if (!city) return "";
  return city.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatDuration(raw: string): string {
  return DURATION_LABELS[raw] || raw;
}

/** Union fermée dérivée de la source unique, plus « Tout » et « Mes missions ». */
export type CategoryFilter = MissionCategory | "all" | "mine";
export type ModeFilter = "need" | "offer";



export const ENTRAIDE_HEADER_URL =
  "https://erhccyqevdyevpyctsjj.supabase.co/storage/v1/object/public/property-photos/misc/entraide-header.webp";
