// src/lib/pricing.ts
// Source unique de vérité pour le pricing Guardiens.
// Toute modification ici se propage à toutes les pages, meta tags, Schemas, et BDD via les composants.
//
// Convention typographique :
// - Espace insécable (\u00A0) AVANT le symbole € et entre nombre et unité.
// - Virgule décimale française pour l'affichage ("6,99"), point décimal pour la valeur numérique JS.
// - Mois en lettres minuscules.

const NBSP = "\u00A0";

// ── Constantes atomiques ─────────────────────────────────────────────────────
export const OWNER_PRICE = `0${NBSP}€`;
export const SITTER_PRICE = `6,99${NBSP}€/mois`;
export const SITTER_PRICE_NUMERIC = 6.99;
export const SITTER_PRICE_CURRENCY = "EUR";
export const SITTER_PRICE_START = "14 juillet 2026";
export const SITTER_PRICE_START_ISO = "2026-07-14";
export const FOUNDER_DEADLINE = "13 mai 2026";
export const FOUNDER_DEADLINE_ISO = "2026-05-13";
export const TRIAL_DURATION = "7 jours";
export const TRIAL_LABEL = "essai de 7 jours sans frais";

// ── Versions composées prêtes à l'emploi ─────────────────────────────────────
export const PRICING_LONG = `À ${OWNER_PRICE} pour les propriétaires, sans abonnement requis. Abonnement gardien à ${SITTER_PRICE} à partir du ${SITTER_PRICE_START} (accès à ${OWNER_PRICE} jusqu'à cette date). Inscrivez-vous avant le ${FOUNDER_DEADLINE} pour le badge Fondateur.`;

export const PRICING_SHORT = `À ${OWNER_PRICE} pour les propriétaires. ${SITTER_PRICE} pour les gardiens à partir du ${SITTER_PRICE_START}.`;

export const PRICING_VERY_SHORT = `À ${OWNER_PRICE} pour les propriétaires.`;
