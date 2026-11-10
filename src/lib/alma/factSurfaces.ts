/**
 * Lot ALMA1 (10/11/2026, arène « Alma vivante », lot L1) : surfaces des
 * faits d'Alma, partagées entre le site et get_alma_cultural_fact
 * (drizzle/migrations/0130_alma1_tiroir_repare.sql).
 *
 * Le site envoie search, race_page, sits_list ; la fonction lit aussi
 * search_page, breed_page, listings. Toute surface passée à
 * useAlmaCulturalFact figure ici (test de contrat src/__tests__/alma1/).
 */

/** Surfaces que le site passe à useAlmaCulturalFact. */
export const FACT_SURFACES = [
  "search",
  "sits_list",
  "sit_detail",
  "sitter_profile",
  "race_page",
  "city_page",
  "favorites",
  "dashboard",
] as const;

export type FactSurface = (typeof FACT_SURFACES)[number];

/** Autre nom lu par la fonction SQL pour une surface du site. */
export const FACT_SURFACE_ALIASES: Readonly<Record<string, string>> = {
  search: "search_page",
  race_page: "breed_page",
  sits_list: "listings",
};

/**
 * Écrans de découverte où une blague peut venir (une fois par visite).
 * La fiche d'une garde (sit_detail, bouton Postuler) est un écran d'action :
 * jamais d'humour.
 */
export const HUMOR_FACT_SURFACES: readonly string[] = [
  "search",
  "sits_list",
  "sitter_profile",
  "city_page",
  "race_page",
  "favorites",
];

export const HUMOR_FACT_TYPE = "animal_humor";

const HUMOR_SESSION_KEY = "alma_humor_shown_visit";

/** Une blague a-t-elle déjà été montrée pendant cette visite (onglet) ? */
export function humorShownThisVisit(): boolean {
  try {
    return sessionStorage.getItem(HUMOR_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

/** Note qu'une blague vient d'être montrée à l'écran. */
export function markHumorShown(): void {
  try {
    sessionStorage.setItem(HUMOR_SESSION_KEY, "1");
  } catch {
    /* sans effet */
  }
}
