import { MISSION_CATEGORIES, MISSION_CATEGORY_LABEL } from "@/lib/missionCategories";

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

export const EXAMPLES = [
  { cat: "animals", title: "Promener Filou 3 fois cette semaine", exchange: "Plateau de fromages maison et une bonne bouteille" },
  { cat: "animals", title: "Nourrir mes 4 chats samedi et dimanche matin", exchange: "Un dîner à mon retour, je cuisine bien !" },
  { cat: "animals", title: "Accompagner mon chien chez le véto mercredi", exchange: "Confitures maison (abricot et figue)" },
  { cat: "animals", title: "Garder mes 3 poules le week-end du 15 juin", exchange: "Les œufs sont pour vous !" },
  { cat: "garden", title: "Arroser le potager pendant 5 jours", exchange: "Servez-vous dans les tomates et les courgettes !" },
  { cat: "garden", title: "Coup de main pour tailler la haie samedi", exchange: "BBQ à midi, je m'occupe de tout" },
  { cat: "garden", title: "Tondre la pelouse une fois par semaine en juillet", exchange: "Profitez du jardin, de la piscine, et du hamac" },
  { cat: "skills", title: "Véto à la retraite, questions sur votre chien", exchange: "Le plaisir de voir des animaux heureux" },
  { cat: "skills", title: "Dog-training : les bases (rappel, marche en laisse)", exchange: "Un bon café et une balade ensemble" },
];

export type CategoryFilter = string;
export type ModeFilter = "need" | "offer";

/** Filtres : les huit catégories de la source unique, encadrées de Tout et Mes missions. */
export const FILTER_PILLS: { key: CategoryFilter; label: string }[] = [
  { key: "all", label: "Tout" },
  ...MISSION_CATEGORIES.map((c) => ({ key: c.key as string, label: c.label })),
  { key: "mine", label: "Mes missions" },
];


export const ENTRAIDE_HEADER_URL =
  "https://erhccyqevdyevpyctsjj.supabase.co/storage/v1/object/public/property-photos/misc/entraide-header.webp";
