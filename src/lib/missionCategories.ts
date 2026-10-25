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
  { key: "projet", label: "Projet participatif" },
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


/**
 * Catégories proposées en filtre dans le fil d'entraide.
 * Le fil exclut les projets participatifs par construction, la catégorie
 * `projet` resterait donc à zéro. L'administration, elle, continue de lire
 * MISSION_CATEGORIES pour filtrer sur la valeur réelle.
 */
export const ENTRAIDE_FILTER_CATEGORIES = MISSION_CATEGORIES.filter(
  (c) => c.key !== "projet",
);

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

/**
 * Lot E6 (11/10/2026) : catégorie déduite du titre et de la description, sans
 * rien demander de plus dans le formulaire. Ordre de priorité : animaux,
 * jardin, transport, maison, courses, compagnie, savoir-faire ; sinon « other ».
 */
const CATEGORY_RULES: Array<{ key: MissionCategory; rx: RegExp }> = [
  { key: "animals", rx: /\b(chiens?|chienne|chats?|chatons?|chevaux|cheval|poules?|lapins?|animal|animaux|litiere|veterinaire|teckel|anes?|chevres?|moutons?|nourrir (le|la|les|mon|ma|mes) (chien|chat|chevaux|poules|animaux))\b/ },
  { key: "garden", rx: /\b(jardin|potager|arros\w*|tomates?|tondre|tonte|haies?|pelouse|semis|recolte\w*|legumes|plantations?|desherb\w*|rempot\w*|monsteras?|plantes? d.interieur)\b/ },
  { key: "transport", rx: /\b(transport\w*|trajets?|covoiturage|gare|aeroport|conduire|emmener|vehicule|camion\w*)\b/ },
  { key: "house", rx: /\b(meubles?|monter|bricol\w*|repar\w*|peindre|peinture|etageres?|bibliotheque|demenag\w*|cartons?|poncer|ponceuse|perceuse|menage|fuite|plomberie|coiffeuse|canape)\b/ },
  { key: "errand", rx: /\b(courses|livraisons?|colis|pharmacie|supermarche|boulangerie)\b/ },
  { key: "company", rx: /\b(jeux?|belote|cartes|scrabble|compagnie|discuter|promenade|balade|lecture|visite)\b/ },
  { key: "skills", rx: /\b(informatique|ordinateur|smartphone|telephone|administrati\w*|formulaires?|impots|anglais|cours|coudre|couture|rideaux|traduction)\b/ },
];

const fold = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** Le titre décide d'abord ; la description ne sert que si le titre ne dit rien. */
export function inferMissionCategory(title: string | null | undefined, description?: string | null): MissionCategory {
  const texts = [fold(title ?? ""), fold(`${title ?? ""} ${description ?? ""}`)];
  for (const text of texts) {
    for (const rule of CATEGORY_RULES) if (rule.rx.test(text)) return rule.key;
  }
  return "other";
}
