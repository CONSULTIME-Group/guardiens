// Lot CPT1 (17/10/2026, décision de Jérémie) : un seul calcul des compteurs
// publics « maisons gardées » et « animaux accompagnés », partout (accueil,
// tableau de bord, profil public, observatoire, llms.txt). Le socle des
// fondateurs (2021-2026) s'additionne aux gardes réalisées sur la plateforme
// (get_public_stats), sans distinction affichée.
// Module pur, importé par le site et par scripts/generate-sitemap.mjs.

/** Maisons gardées par Jérémie et Elisa, 2021-2026 (socle du cumul). */
export const FOUNDERS_HOUSES = 37;
/** Animaux accompagnés par Jérémie et Elisa, 2021-2026 (socle du cumul). */
export const FOUNDERS_ANIMALS = 234;

const n = (v) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);

/**
 * Compteurs cumulés à partir d'une ligne de get_public_stats (ou null pendant
 * le chargement : le socle seul s'affiche, jamais un chiffre inventé).
 * @param {{ maisons_gardees?: number, animaux_accompagnes?: number } | null | undefined} row
 * @returns {{ houses: number, animals: number }}
 */
export function communityTotals(row) {
  return {
    houses: FOUNDERS_HOUSES + n(row?.maisons_gardees),
    animals: FOUNDERS_ANIMALS + n(row?.animaux_accompagnes),
  };
}

/**
 * Ligne de llms.txt, datée (jour de Paris), même cumul que le site.
 * @param {{ houses: number, animals: number }} totals
 * @param {Date} [now]
 */
export function llmsTotalsLine(totals, now = new Date()) {
  const day = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", year: "numeric" }).format(now);
  return `- Gardes réalisées depuis 2021 : ${totals.houses} maisons gardées, ${totals.animals} animaux accompagnés (au ${day}).`;
}

/** Repère de la ligne dans llms.txt (ancienne forme « Données fondateurs » comprise). */
export const LLMS_TOTALS_LINE_RE = /^- (?:Données fondateurs \(2021-2026\)|Gardes réalisées depuis 2021) : .*$/m;
