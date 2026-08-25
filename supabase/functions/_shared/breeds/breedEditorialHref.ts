/**
 * Construction unique du href d'une fiche de race, partagée entre le client
 * (BreedEditorialLink, PetAdviceSection, rail des dashboards) et les
 * fonctions edge (rappel J-7). Le href est toujours construit sur le nom
 * OFFICIEL de la fiche retourné par `resolveBreedFiche`, jamais sur la
 * saisie libre : c'est ce qui garantit l'absence de soft 404.
 */
import { slugify } from "./normalize.ts";

export const buildBreedEditorialHref = (species: string, breed: string): string =>
  `/races/${species}-${slugify(breed)}`;
