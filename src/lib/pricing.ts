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

// Formule ponctuelle, paiement unique pour un mois d'accès, sans renouvellement.
export const SITTER_PRICE_ONESHOT = `10${NBSP}€`;
export const SITTER_PRICE_ONESHOT_NUMERIC = 10;

// Formule annuelle, paiement récurrent annuel, équivalent ~5,42 €/mois (-22 % vs mensuel).
export const SITTER_PRICE_ANNUAL = `65${NBSP}€/an`;
export const SITTER_PRICE_ANNUAL_NUMERIC = 65;
export const SITTER_PRICE_ANNUAL_MONTHLY_EQUIV = `5,42${NBSP}€/mois`;
export const SITTER_PRICE_ANNUAL_DISCOUNT_PCT = 22;
export const SITTER_PRICE_START = "14 juillet 2026";
export const SITTER_PRICE_START_ISO = "2026-07-14";
export const FOUNDER_DEADLINE = "14 juillet 2026";
export const FOUNDER_DEADLINE_ISO = "2026-07-14";

// ── Parrainage ───────────────────────────────────────────────────────────────
// Nombre de mois d'abonnement gardien offerts par filleul activé une fois
// que l'abonnement deviendra payant (cf. SITTER_PRICE_START). Source unique.
export const REFERRAL_FREE_MONTHS = 1;
export const REFERRAL_REWARD_LABEL =
  REFERRAL_FREE_MONTHS === 1
    ? `1${NBSP}mois offert`
    : `${REFERRAL_FREE_MONTHS}${NBSP}mois offerts`;

// ── Versions composées prêtes à l'emploi ─────────────────────────────────────
export const PRICING_LONG = `À ${OWNER_PRICE} pour les propriétaires, sans abonnement requis. Abonnement gardien à ${SITTER_PRICE} à partir du ${SITTER_PRICE_START} (accès à ${OWNER_PRICE} jusqu'à cette date). Inscrivez-vous avant le ${FOUNDER_DEADLINE} pour le badge Fondateur.`;

export const PRICING_SHORT = `À ${OWNER_PRICE} pour les propriétaires. ${SITTER_PRICE} pour les gardiens à partir du ${SITTER_PRICE_START}.`;

export const PRICING_VERY_SHORT = `À ${OWNER_PRICE} pour les propriétaires.`;
