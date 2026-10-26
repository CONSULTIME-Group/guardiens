/**
 * Fiches de race fusionnées (doublons éditoriaux en base).
 *
 * Deux fiches décrivent parfois le même animal sous deux noms. On garde la
 * fiche la plus riche et on fait pointer l'autre vers elle :
 *   - retirée de la page /races (une seule entrée visible) ;
 *   - retirée du sitemap (scripts/generate-sitemap.mjs et
 *     supabase/functions/sitemap/index.ts, qui recoipent la liste car Deno
 *     et les scripts Node ne partagent pas les imports TS) ;
 *   - l'URL historique redirige vers la fiche conservée (BreedPage) ;
 *   - le rapprochement depuis une saisie libre renvoie la fiche conservée
 *     (breedFicheMatch.ts).
 *
 * Format : clé d'espèce (enum pet_species) -> { slug source : nom officiel
 * de la fiche cible }. La clé source est le slugify() du nom de la fiche
 * absorbée.
 */
export const BREED_FICHE_MERGES = {
  // « gris du gabon » (fiche vide) absorbé par « perroquet gris du gabon »
  // (20 669 caractères de contenu riche).
  bird: { "gris-du-gabon": "perroquet gris du gabon" },
  // « chat des forêts norvégiennes » absorbé par « norvégien », nom LOOF de
  // la race. Les deux fiches décrivaient le même animal (origine nordique,
  // 5 à 9 kg pour les mâles) et aucun animal ne déclarait l'une ou l'autre.
  // Le nom juste prime sur la longueur du contenu (décision du 25/08/2026).
  cat: { "chat-des-forets-norvegiennes": "norvégien" },
  // « jack russel » (coquille, fiche sans contenu riche) absorbé par
  // « jack russell » (fiche complète). L'URL /races/dog-jack-russel redirige.
  // « malinois » (fiche sans image) absorbé par « berger belge malinois »
  // (fiche complète, 23 310 caractères, image présente). L'URL
  // /races/dog-malinois redirige (décision du 21/08/2026).
  dog: { "jack-russel": "jack russell", malinois: "berger belge malinois" },
};

/** slugify() minimal, aligné sur src/lib/normalize.ts. Recopié ici car ce
 *  module est aussi importé par des scripts Node (.mjs) hors du graphe TS. */
const keyOf = (s) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/**
 * Si la fiche (species, breed) est une fiche absorbée, retourne le nom
 * officiel de la fiche cible. Sinon null.
 */
export function mergedBreedTarget(species, breed) {
  const bySpecies = BREED_FICHE_MERGES[(species || "").toLowerCase()];
  if (!bySpecies) return null;
  return bySpecies[keyOf(breed)] || null;
}

/**
 * Comme mergedBreedTarget, mais seulement quand la fiche cible existe bien
 * parmi `rows` (même espèce). Une cible supprimée de la base ne doit jamais
 * emporter la fiche source avec elle : la source reste alors affichée,
 * listée et indexée (constat Search Console du 26/10/2026 : « gris du
 * gabon » redirigeait vers « perroquet gris du gabon », absente, d'où deux
 * URL en 404).
 */
export function liveMergedBreedTarget(species, breed, rows) {
  const target = mergedBreedTarget(species, breed);
  if (!target) return null;
  const sp = (species || "").toLowerCase();
  const key = keyOf(target);
  const exists = (rows || []).some((r) => (r?.species || "").toLowerCase() === sp && keyOf(r?.breed) === key);
  return exists ? target : null;
}
