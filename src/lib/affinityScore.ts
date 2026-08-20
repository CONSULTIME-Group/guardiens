/**
 * Score d'affinité owner ↔ gardien — ré-exportation.
 *
 * Le MOTEUR UNIQUE vit dans `supabase/functions/_shared/affinity/score.ts`,
 * partagé entre le client et les fonctions edge (distribution des gardes).
 * L'ancien moteur SQL `calculate_affinity_score_pg` est déprécié mais
 * conservé en base (aucune suppression sans validation explicite de
 * Jérémie) : il n'est plus lu nulle part, un même couple produit le même
 * score dans l'app et dans les emails.
 *
 * DOCTRINE : ON TRIE PAR PERTINENCE, ON N'ÉLIMINE JAMAIS.
 * `computeAffinityResultFull` retourne toujours un résultat. Utiliser
 * `result.scoreReliable` pour décider d'afficher le chiffre,
 * `result.distributable` pour la distribution (notifications, emails),
 * et jamais `null` pour retirer un gardien d'une liste.
 */
export * from "../../supabase/functions/_shared/affinity/score.ts";
