/**
 * Normalisation de chaînes, ré-exportation.
 *
 * La source de vérité vit dans
 * `supabase/functions/_shared/breeds/normalize.ts`, partagée entre le client
 * et les fonctions edge (Deno ne peut pas importer depuis `src/`). Même
 * pattern que le moteur d'affinité : une seule implémentation, deux points
 * d'entrée. Aucun changement de comportement ni de signature.
 */
export * from "../../supabase/functions/_shared/breeds/normalize.ts";
