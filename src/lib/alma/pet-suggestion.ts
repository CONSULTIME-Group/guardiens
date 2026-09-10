/**
 * Suggestion contextuelle d'Alma après l'ajout d'un animal (lot 2).
 *
 * Alma propose, elle ne décide pas. Le rapprochement de race passe
 * exclusivement par `resolveBreedFiche` : aucune seconde logique de
 * normalisation, aucun lien mort. Sans fiche résolue, Alma félicite et
 * propose autre chose, SANS JAMAIS nommer ce qui manque.
 */
import { buildBreedEditorialHref } from "../../../supabase/functions/_shared/breeds/breedEditorialHref";

export interface PetSuggestion {
  message: string;
  /** null quand aucune fiche n'est résolue : aucun lien affiché. */
  href: string | null;
  ctaLabel: string | null;
}

export interface BuildPetSuggestionArgs {
  petName: string;
  species: string;
  /** Nom OFFICIEL de la fiche retourné par resolveBreedFiche, ou null. */
  ficheBreed: string | null;
}

export function buildPetSuggestion({
  petName,
  species,
  ficheBreed,
}: BuildPetSuggestionArgs): PetSuggestion {
  const name = petName.trim() || "votre animal";

  if (ficheBreed) {
    return {
      message: `Voilà, ${name} a sa fiche. J'ai un guide sur le ${ficheBreed.toLowerCase()}, avec ses besoins de sortie et ses points de vigilance. Voulez-vous le lire ?`,
      href: buildBreedEditorialHref(species, ficheBreed),
      ctaLabel: "Lire le guide",
    };
  }

  return {
    message: `Voilà, ${name} a sa fiche. Une photo et un mot sur son caractère la rendent tout de suite plus vivante.`,
    href: null,
    ctaLabel: null,
  };
}
