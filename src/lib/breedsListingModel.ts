/**
 * Logique pure de la page /races : ordre des sections, extraction du niveau
 * de garde, exclusion des fiches fusionnées, recherche tolérante aux accents.
 *
 * Tout est testé dans src/__tests__/breeds-listing-model.test.ts.
 */
import { normalizeBreedName } from "./breedFicheMatch";
import { mergedBreedTarget } from "./breedFicheMerges";

export interface BreedListingEntry {
  species: string;
  breed: string;
  image_url: string | null;
  image_alt: string | null;
  difficulty_level: string | null;
}

/**
 * Ordre des sections calé sur le volume réel d'animaux gardés sur la
 * plateforme (chats 75, chiens 70, chevaux 10, animaux de ferme 6, rongeurs
 * 4, NAC 2, oiseaux 1). Chiens avant Chats : le catalogue de fiches chien
 * est deux fois plus fourni (49 contre 23), la section est plus riche à
 * l'ouverture. Plus de tri alphabétique d'espèce.
 */
export const SPECIES_ORDER: readonly string[] = [
  "dog",
  "cat",
  "horse",
  "farm_animal",
  "rodent",
  "nac",
  "bird",
];

export type DifficultyBadge = "Facile" | "Modéré" | "Exigeant";

const LEVEL_BY_NORMALIZED: Record<string, DifficultyBadge> = {
  facile: "Facile",
  modere: "Modéré",
  exigeant: "Exigeant",
};

/**
 * difficulty_level est un paragraphe (« Exigeant. La garde d'un Gris du
 * Gabon est exigeante en raison de… », « Modéré, car … »). On n'en extrait
 * que le premier mot, et on ne l'affiche que s'il correspond exactement à
 * un niveau connu. Tout le reste (mot inattendu, champ vide) ne produit
 * aucune pastille : mieux vaut rien qu'une information fausse.
 */
export const extractDifficultyLevel = (
  raw: string | null | undefined,
): DifficultyBadge | null => {
  if (!raw) return null;
  const firstWord = raw.trim().match(/^[^\s.,;:]+/)?.[0];
  if (!firstWord) return null;
  return LEVEL_BY_NORMALIZED[normalizeBreedName(firstWord)] ?? null;
};

/** Fiche absorbée par une autre (doublon) : jamais affichée ni indexée. */
export const isMergedBreedSource = (
  entry: Pick<BreedListingEntry, "species" | "breed">,
): boolean => mergedBreedTarget(entry.species, entry.breed) !== null;

/** Liste publique : les fiches fusionnées en moins. */
export const visibleBreeds = <T extends Pick<BreedListingEntry, "species" | "breed">>(
  list: T[],
): T[] => list.filter((b) => !isMergedBreedSource(b));

/** Recherche par nom, tolérante à la casse, aux accents et aux espaces
 *  superflus (normalisation partagée de breedFicheMatch). */
export const searchBreeds = <T extends Pick<BreedListingEntry, "breed">>(
  list: T[],
  query: string,
): T[] => {
  const q = normalizeBreedName(query);
  if (!q) return list;
  return list.filter((b) => normalizeBreedName(b.breed).includes(q));
};

export interface BreedSection<T> {
  species: string;
  breeds: T[];
}

/**
 * Regroupe par espèce dans l'ordre éditorial SPECIES_ORDER. Une espèce
 * inconnue éventuelle part en fin de page. Races triées en français à
 * l'intérieur de chaque section.
 */
export const groupBreedsBySpecies = <T extends Pick<BreedListingEntry, "species" | "breed">>(
  list: T[],
): BreedSection<T>[] => {
  const bySpecies = new Map<string, T[]>();
  for (const b of list) {
    const arr = bySpecies.get(b.species) ?? [];
    arr.push(b);
    bySpecies.set(b.species, arr);
  }
  const orderedSpecies = [
    ...SPECIES_ORDER,
    ...[...bySpecies.keys()].filter((s) => !SPECIES_ORDER.includes(s)).sort(),
  ];
  return orderedSpecies
    .filter((s) => bySpecies.has(s))
    .map((species) => ({
      species,
      breeds: (bySpecies.get(species) ?? []).sort((a, b) =>
        a.breed.localeCompare(b.breed, "fr"),
      ),
    }));
};
