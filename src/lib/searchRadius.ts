/**
 * searchRadius — ré-exportation.
 *
 * La logique vit dans `supabase/functions/_shared/search-radius.ts`, partagée
 * entre le client (formulaires, affichages) et les fonctions edge. Une seule
 * source, décision du 20/08/2026 : 30 km est le marqueur de silence (ancien
 * défaut de colonne), lu comme une absence de réponse, soit 100 km effectifs.
 */
export * from "../../supabase/functions/_shared/search-radius.ts";
