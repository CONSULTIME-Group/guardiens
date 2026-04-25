/**
 * Sanitise les titres saisis par les utilisateurs pour l'affichage public.
 *
 * Corrections appliquées :
 *  - Insère une espace manquante entre un chiffre collé à une lettre
 *    (ex: "4chats" → "4 chats", "2perroquets" → "2 perroquets").
 *  - Compresse les espaces multiples.
 *  - Trim aux bords.
 *
 * On ne touche PAS à la base : c'est purement présentationnel. Le formulaire
 * d'édition d'annonce devrait à terme appliquer la même règle au save pour
 * normaliser la donnée à la source — mais ici on garantit déjà un affichage
 * propre rétroactivement sur l'existant.
 */
export function sanitizeUserTitle(title: string | null | undefined): string {
  if (!title) return "";
  return title
    .replace(/(\d)([a-zA-ZÀ-ÿ])/g, "$1 $2")
    .replace(/([a-zA-ZÀ-ÿ])(\d)/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
}
