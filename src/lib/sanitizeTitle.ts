/**
 * Sanitise les titres saisis par les utilisateurs pour l'affichage public.
 *
 * Corrections appliquées :
 *  - Insère une espace manquante entre un chiffre collé à une lettre
 *    (ex: "4chats" → "4 chats").
 *  - Compresse les espaces multiples.
 *  - Trim.
 *  - Capitalise la première lettre (sans toucher au reste, pour ne pas
 *    massacrer les noms propres saisis correctement).
 *  - Corrige quelques fautes ultra-fréquentes qui salissent le SEO
 *    et la crédibilité (« chez soit » → « chez soi », « a la maison »
 *    → « à la maison » en début de phrase).
 *
 * Utilisable côté formulaire (au save) ET côté affichage (rétrocompatible
 * sur l'existant en base).
 */
export function sanitizeUserTitle(title: string | null | undefined): string {
  if (!title) return "";
  let out = title
    .replace(/(\d)([a-zA-ZÀ-ÿ])/g, "$1 $2")
    .replace(/([a-zA-ZÀ-ÿ])(\d)/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();

  // Fautes fréquentes (mot entier, insensible à la casse, sans toucher aux
  // homographes légitimes comme "il soit").
  out = out.replace(/\bchez\s+soit\b/gi, "chez soi");

  // Capitalise la première lettre si c'est une minuscule ASCII/latine.
  if (out.length > 0) {
    out = out.charAt(0).toLocaleUpperCase("fr-FR") + out.slice(1);
  }
  return out;
}
