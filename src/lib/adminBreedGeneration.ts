/**
 * Logique pure de la génération de fiches de race à la demande (admin).
 *
 * Trois responsabilités :
 * 1. Valider la saisie du formulaire (espèce + race non vides).
 * 2. Détecter un doublon AVANT génération, avec la normalisation partagée
 *    de breedFicheMatch (exact, alias, préfixe, fiches fusionnées). Jamais
 *    de seconde logique de normalisation : on réutilise resolveBreedFiche.
 * 3. Construire la liste des races réellement déclarées par des
 *    propriétaires qui n'ont AUCUNE fiche, avec volume d'animaux et
 *    d'annonces en ligne, en excluant les saisies parasites.
 *
 * Tout est testé dans src/__tests__/admin-breed-generation.test.ts.
 */
import {
  breedFicheKey,
  normalizeBreedName,
  resolveBreedFiche,
  type BreedFicheCandidate,
} from "./breedFicheMatch";

// ---------------------------------------------------------------------------
// 1. Validation du formulaire
// ---------------------------------------------------------------------------

/**
 * Forme plate volontaire (pas d'union discriminée) : le projet compile sans
 * strictNullChecks et le narrowing par discriminant n'y est pas fiable.
 */
export interface GenerationInputResult {
  ok: boolean;
  /** Message d'erreur si ok = false, null sinon. */
  reason: string | null;
  species: string;
  breed: string;
}

/** La race saisie est trimmée, l'espèce doit être non vide. */
export const validateGenerationInput = (
  species: string | null | undefined,
  breed: string | null | undefined,
): GenerationInputResult => {
  const trimmedBreed = (breed ?? "").trim();
  const trimmedSpecies = (species ?? "").trim();
  const fail = (reason: string): GenerationInputResult => ({
    ok: false,
    reason,
    species: trimmedSpecies,
    breed: trimmedBreed,
  });
  if (!trimmedSpecies) return fail("Choisissez une espèce.");
  if (!trimmedBreed) return fail("Saisissez un nom de race.");
  if (normalizeBreedName(trimmedBreed).length < 2) {
    return fail("Le nom de race est trop court.");
  }
  return { ok: true, reason: null, species: trimmedSpecies, breed: trimmedBreed };
};

// ---------------------------------------------------------------------------
// 2. Détection de doublon (normalisation partagée, jamais de logique bis)
// ---------------------------------------------------------------------------

/**
 * Fiche existante couvrant déjà ce couple espèce + race après
 * normalisation (exact, alias, préfixe, fusion), ou null.
 * Ex. (« bird », « Gris du Gabon ») détecte la fiche « perroquet gris du
 * gabon » : pas de doublon silencieux.
 */
export const findDuplicateFiche = <T extends BreedFicheCandidate>(
  species: string,
  breed: string,
  fiches: T[],
): T | null => resolveBreedFiche(species, breed, fiches);

// ---------------------------------------------------------------------------
// 3. Races déclarées sans fiche
// ---------------------------------------------------------------------------

/**
 * Filtre de bon sens : la saisie ressemble-t-elle à un nom de race ?
 * Rejette les chiffres (« 16 kgs »), la ponctuation d'énumération ou
 * d'exclamation (« Le plus beau! », « une caniche, un shitsu »), les
 * superlatifs (« la plus belle »), les saisies trop courtes et quelques
 * termes génériques qui ne sont pas des races. Un faux positif restant
 * n'est pas grave : l'admin décide au clic.
 */
export const isPlausibleBreedInput = (raw: string | null | undefined): boolean => {
  const trimmed = (raw ?? "").trim();
  if (trimmed.length < 3) return false;
  if (/[0-9!?,;]/.test(trimmed)) return false;
  const normalized = normalizeBreedName(trimmed);
  if (normalized.length < 3) return false;
  if (/^(le|la|les) plus /.test(normalized)) return false;
  if (/\b et \b/.test(normalized)) return false;
  return !NON_BREED_TERMS.has(normalized);
};

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

export interface DeclaredPetRow {
  species: string;
  breed: string | null;
  property_id: string | null;
}

export interface MissingBreedRow {
  species: string;
  /** Graphie la plus fréquente telle que déclarée (trimmée). */
  displayBreed: string;
  /** Clé de regroupement normalisée (espèce exclue). */
  key: string;
  animals: number;
  liveSits: number;
}

/**
 * Agrège les animaux dont la race déclarée ne résout sur AUCUNE fiche
 * (resolveBreedFiche → null). Regroupe par espèce + clé normalisée
 * (« Beldi » et « BELDI » forment une seule ligne). `livePropertyIds`
 * contient les property_id des annonces en ligne : une ligne ne compte
 * chaque logement en ligne qu'une fois, même avec plusieurs animaux de la
 * même race. Tri : annonces en ligne décroissant, puis animaux, puis nom.
 */
export const computeMissingBreeds = <T extends BreedFicheCandidate>(
  pets: DeclaredPetRow[],
  fiches: T[],
  livePropertyIds: ReadonlySet<string>,
): MissingBreedRow[] => {
  interface Acc {
    species: string;
    key: string;
    animals: number;
    spellings: Map<string, number>;
    liveProperties: Set<string>;
  }
  const groups = new Map<string, Acc>();

  for (const pet of pets) {
    const raw = (pet.breed ?? "").trim();
    if (!isPlausibleBreedInput(raw)) continue;
    if (resolveBreedFiche(pet.species, raw, fiches)) continue;

    const key = breedFicheKey(raw);
    if (key.length < 2) continue;
    const groupId = `${pet.species}:${key}`;
    const acc = groups.get(groupId) ?? {
      species: pet.species,
      key,
      animals: 0,
      spellings: new Map<string, number>(),
      liveProperties: new Set<string>(),
    };
    acc.animals += 1;
    acc.spellings.set(raw, (acc.spellings.get(raw) ?? 0) + 1);
    if (pet.property_id && livePropertyIds.has(pet.property_id)) {
      acc.liveProperties.add(pet.property_id);
    }
    groups.set(groupId, acc);
  }

  return [...groups.values()]
    .map((acc) => {
      let displayBreed = "";
      let best = -1;
      for (const [spelling, count] of acc.spellings) {
        if (count > best) {
          best = count;
          displayBreed = spelling;
        }
      }
      return {
        species: acc.species,
        key: acc.key,
        displayBreed,
        animals: acc.animals,
        liveSits: acc.liveProperties.size,
      };
    })
    .sort(
      (a, b) =>
        b.liveSits - a.liveSits ||
        b.animals - a.animals ||
        a.displayBreed.localeCompare(b.displayBreed, "fr"),
    );
};
