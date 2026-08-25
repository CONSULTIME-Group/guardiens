/**
 * Filtre anti non-race, source de vérité unique.
 *
 * Ce module vit dans `_shared` pour être appelé aussi bien par l'écran admin
 * (`src/lib/adminBreedGeneration.ts`, simple ré-exportation) que par la
 * fonction edge `generate-breed-profile`. Le garde-fou est ainsi appliqué à
 * la génération elle même, pas seulement à la liste de suggestions.
 *
 * Invariant central : la notion de « croisement » est définie une seule fois,
 * par la constante `CROISE_PREFIX` exportée par `breedFicheMatch.ts`, celle
 * là même qu'utilise le résolveur. Aucune regex recopiée ici.
 */
import { CROISE_PREFIX, breedFicheKey, normalizeBreedName } from "./breedFicheMatch.ts";

/** Saisies réelles qui ne désignent aucune race (clés normalisées). */
const NON_BREED_TERMS: ReadonlySet<string> = new Set([
  "inconnu",
  "inconnue",
  "sans race",
  "aucune",
  "autre",
  "croise",
  "croisee",
  "batard",
  "mixte",
  "croise dog",
  "x berger",
]);

/**
 * Mots d'espèce génériques : employés seuls, ils ne désignent pas une race.
 * Clés au format `breedFicheKey` (singulier neutralisé), donc « poules » et
 * « chevres » y retombent naturellement.
 */
const GENERIC_SPECIES_KEYS: ReadonlySet<string> = new Set([
  "chien",
  "chienne",
  "chat",
  "chatte",
  "cheval",
  "jument",
  "poney",
  "lapin",
  "poule",
  "chevre",
  "ane",
  "anesse",
]);

/**
 * Robes et motifs employés seuls. La règle produit n'est pas « race au sens
 * taxinomique », mais « la chaîne saisie permet-elle de donner un conseil utile
 * au gardien ? ». "Écaille de tortue" et "poule pondeuse" restent des fiches
 * légitimes, donc elles ne figurent pas ici. Seuls les termes qui ne mènent à
 * aucun conseil exploitable sont rejetés.
 */
const COAT_PATTERN_KEYS: ReadonlySet<string> = new Set([
  "tricolore",
  "bicolore",
  "bringe",
  "tigre",
  "black-smoke",
  "smoke",
  "tabby",
  "roux",
  "noir",
  "blanc",
  "gris",
  "poil-court",
  "poil-long",
  "poils-court",
  "poils-long",
]);

/**
 * La saisie ressemble-t-elle à un nom de race ?
 *
 * Rejette les chiffres (« 16 kgs »), la ponctuation d'énumération ou
 * d'exclamation (« Le plus beau! »), les superlatifs, les saisies trop
 * courtes, les termes génériques, les croisements (même définition que le
 * résolveur) et les robes. Un faux positif restant n'est pas grave : l'admin
 * décide au clic.
 */
export const isPlausibleBreedInput = (raw: string | null | undefined): boolean => {
  const trimmed = (raw ?? "").trim();
  if (trimmed.length < 3) return false;
  if (/[0-9!?,;]/.test(trimmed)) return false;
  const normalized = normalizeBreedName(trimmed);
  if (normalized.length < 3) return false;
  if (/^(le|la|les) plus /.test(normalized)) return false;
  if (/\b et \b/.test(normalized)) return false;
  if (NON_BREED_TERMS.has(normalized)) return false;

  const key = breedFicheKey(trimmed);
  // Croisement : une seule définition, partagée avec resolveBreedFiche.
  if (CROISE_PREFIX.test(key)) return false;
  if (GENERIC_SPECIES_KEYS.has(key)) return false;
  if (COAT_PATTERN_KEYS.has(key)) return false;
  return true;
};

/** Message de refus, identique à l'écran et côté serveur. */
export const invalidBreedMessage = (raw: string): string =>
  `Nom de race non valide : ${raw.trim()}. Les croisements, les robes et les termes génériques ne donnent pas lieu à une fiche.`;
