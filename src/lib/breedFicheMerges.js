/**
 * Fiches de race fusionnées, ré-exportation.
 *
 * La source de vérité vit dans
 * `supabase/functions/_shared/breeds/breedFicheMerges.js`. Ce fichier reste
 * un `.js` pour rester importable par les scripts Node (`.mjs`) hors du
 * graphe TypeScript.
 */
export {
  BREED_FICHE_MERGES,
  mergedBreedTarget,
} from "../../supabase/functions/_shared/breeds/breedFicheMerges.js";
