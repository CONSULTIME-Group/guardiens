/**
 * Liens de préparation d'une garde, poussés au GARDIEN uniquement (rappel
 * J-7). Même règle que le rail du dashboard gardien : la fiche de race n'est
 * liée que si `resolveBreedFiche` retourne une correspondance, le guide de
 * ville que si `city_guides.published` vaut vrai. Jamais de lien mort, jamais
 * de contenu sans rapport avec cette garde.
 *
 * Les chemins retournés sont relatifs : c'est le gabarit d'email qui les
 * préfixe par https://guardiens.fr.
 */
import { resolveBreedFiche, type BreedFicheCandidate } from "./breedFicheMatch.ts";
import { buildBreedEditorialHref } from "./breedEditorialHref.ts";

export interface SitPrepPet {
  species?: string | null;
  breed?: string | null;
}

export interface PublishedCityGuide {
  slug: string;
  city: string;
}

export interface SitPrepLinks {
  breedGuidePath?: string;
  breedGuideName?: string;
  cityGuidePath?: string;
  cityGuideName?: string;
}

export const resolveSitPrepLinks = (
  pets: SitPrepPet[] | null | undefined,
  candidates: BreedFicheCandidate[],
  cityGuide: PublishedCityGuide | null,
): SitPrepLinks => {
  const prep: SitPrepLinks = {};
  for (const pet of pets ?? []) {
    if (!pet.species || !pet.breed) continue;
    const match = resolveBreedFiche(pet.species, pet.breed, candidates);
    if (!match) continue;
    prep.breedGuidePath = buildBreedEditorialHref(match.species, match.breed);
    prep.breedGuideName = match.breed;
    break;
  }
  if (cityGuide) {
    prep.cityGuidePath = `/guides/${cityGuide.slug}`;
    prep.cityGuideName = cityGuide.city;
  }
  return prep;
};
