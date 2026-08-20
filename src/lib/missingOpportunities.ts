/**
 * missingOpportunities — ré-exportation.
 *
 * La logique vit dans `supabase/functions/_shared/missing-opportunities/`,
 * partagée entre le client (bloc dashboard gardien) et la fonction edge
 * `send-sitter-daily-digest` (appel à l'action « complétez votre profil »).
 * Une seule source, doctrine du 20/08/2026.
 */
export * from "../../supabase/functions/_shared/missing-opportunities/index.ts";
