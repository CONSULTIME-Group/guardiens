/**
 * Règle unique de richesse éditoriale d'une annonce.
 *
 * Utilisée des deux côtés :
 *  - scripts/generate-sitemap.mjs (inclusion dans le sitemap)
 *  - src/pages/PublicSitDetail.tsx (meta robots index / noindex)
 *
 * Le seuil porte sur le CUMUL du contenu rédigé par le propriétaire
 * (titre, message, quotidien, attentes), pas sur un champ isolé :
 * beaucoup de propriétaires décrivent leur quotidien dans owner_message
 * ou specific_expectations plutôt que dans daily_routine.
 */

/** Longueur minimale du titre personnalisé. */
export const MIN_TITLE_LENGTH = 10;

/** Longueur minimale du cumul de contenu rédigé. */
export const MIN_RICH_TEXT_LENGTH = 200;

/** Champs pris en compte dans le cumul. */
export const RICH_TEXT_FIELDS = ["title", "owner_message", "daily_routine", "specific_expectations"];

const len = (v) => (typeof v === "string" ? v.trim().length : 0);

/**
 * Cumul de caractères rédigés par le propriétaire.
 * @param {Record<string, unknown>} sit
 * @returns {number}
 */
export function sitRichTextLength(sit) {
  if (!sit) return 0;
  return RICH_TEXT_FIELDS.reduce((total, field) => total + len(sit[field]), 0);
}

/**
 * Motif de recalage, ou null si l'annonce satisfait la règle de richesse.
 * @param {Record<string, unknown>} sit
 * @returns {"titre_trop_court" | "contenu_insuffisant" | null}
 */
export function sitRichnessRejectionReason(sit) {
  const title = sit && typeof sit.title === "string" ? sit.title.trim() : "";
  if (title.length < MIN_TITLE_LENGTH) return "titre_trop_court";
  if (sitRichTextLength(sit) < MIN_RICH_TEXT_LENGTH) return "contenu_insuffisant";
  return null;
}

/**
 * Vrai si l'annonce est assez riche pour être indexée.
 * @param {Record<string, unknown>} sit
 * @returns {boolean}
 */
export function isSitRichEnough(sit) {
  return sitRichnessRejectionReason(sit) === null;
}

/** Statuts dont la page reste accessible mais jamais indexable. */
export const NON_INDEXABLE_STATUSES = ["confirmed", "archived"];

/**
 * Vrai si le statut interdit l'indexation (garde pourvue ou terminée).
 * @param {string | null | undefined} status
 * @returns {boolean}
 */
export function isClosedSitStatus(status) {
  return NON_INDEXABLE_STATUSES.includes(String(status || ""));
}
