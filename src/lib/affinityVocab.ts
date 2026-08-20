/**
 * Vocabulaire d'affinité — ré-exportation.
 *
 * La source unique vit dans `supabase/functions/_shared/affinity/vocab.ts`,
 * partagée entre le client et les fonctions edge. Ne rien ajouter ici :
 * toute évolution se fait dans le module partagé.
 */
export * from "../../supabase/functions/_shared/affinity/vocab.ts";
