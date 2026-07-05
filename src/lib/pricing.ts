// src/lib/pricing.ts
// Source unique de vérité pour le pricing Guardiens (helpers d'affichage).
// La bascule tarifaire est pilotée par `PRICING_IS_ACTIVE` dans src/config/pricing.ts.
//
// Convention typographique :
// - Espace insécable (\u00A0) AVANT le symbole € et entre nombre et unité.
// - Virgule décimale française pour l'affichage ("6,99"), point décimal pour la valeur JS.

import {
  PRICING_IS_ACTIVE,
  SITTER_PRICE_MONTHLY,
  SITTER_PRICE_YEARLY,
  SITTER_PRICE_ONESHOT as CFG_SITTER_PRICE_ONESHOT,
} from "@/config/pricing";

const NBSP = "\u00A0";

// ── Helpers publics ─────────────────────────────────────────────────────────
export function isPricingActive(): boolean {
  return PRICING_IS_ACTIVE;
}

export function getSitterMonthlyLabel(): string {
  return PRICING_IS_ACTIVE
    ? `${SITTER_PRICE_MONTHLY.toFixed(2).replace(".", ",")}${NBSP}€/mois`
    : "Gratuit";
}

export function getSitterYearlyLabel(): string {
  return PRICING_IS_ACTIVE ? `${SITTER_PRICE_YEARLY}${NBSP}€/an` : "Gratuit";
}

export function getSitterOneshotLabel(): string {
  return PRICING_IS_ACTIVE ? `${CFG_SITTER_PRICE_ONESHOT}${NBSP}€` : "Gratuit";
}

export function getOwnerPriceLabel(): string {
  return "Gratuit";
}

export function getPricingBaseline(): string {
  return "Guardiens reste gratuit tant que nous ne sommes pas satisfaits du service que nous vous offrons. Vous avez accès à tout, sans limite, sans engagement. Vous serez prévenu à l'avance quand cela changera.";
}

export function getPricingBaselineShort(): string {
  return "Gratuit pour vous, sans engagement.";
}

// ── Constantes conservées pour compatibilité (call-sites existants) ─────────
// Tant que PRICING_IS_ACTIVE = false, ces constantes ne doivent PAS être
// affichées publiquement. Passez par les helpers ci-dessus.
export const OWNER_PRICE = "Gratuit";
export const SITTER_PRICE = getSitterMonthlyLabel();
export const SITTER_PRICE_NUMERIC = SITTER_PRICE_MONTHLY;
export const SITTER_PRICE_CURRENCY = "EUR";

export const SITTER_PRICE_ONESHOT = getSitterOneshotLabel();
export const SITTER_PRICE_ONESHOT_NUMERIC = CFG_SITTER_PRICE_ONESHOT;

export const SITTER_PRICE_ANNUAL = getSitterYearlyLabel();
export const SITTER_PRICE_ANNUAL_NUMERIC = SITTER_PRICE_YEARLY;
export const SITTER_PRICE_ANNUAL_MONTHLY_EQUIV = `5,42${NBSP}€/mois`;
export const SITTER_PRICE_ANNUAL_DISCOUNT_PCT = 22;

/**
 * @deprecated Plus de date de bascule fixée. Conservé uniquement pour ne pas
 * casser les imports résiduels. Utilisez `getPricingBaseline()` à la place.
 */
export const SITTER_PRICE_START = "à une date ultérieure";
/**
 * @deprecated Plus de date de bascule fixée.
 */
export const SITTER_PRICE_START_ISO = "";
/**
 * @deprecated Plus de programme Fondateur à échéance.
 */
export const FOUNDER_DEADLINE = "à une date ultérieure";
/**
 * @deprecated
 */
export const FOUNDER_DEADLINE_ISO = "";

// ── Parrainage ───────────────────────────────────────────────────────────────
export const REFERRAL_FREE_MONTHS = 1;
export const REFERRAL_REWARD_LABEL =
  REFERRAL_FREE_MONTHS === 1
    ? `1${NBSP}mois offert`
    : `${REFERRAL_FREE_MONTHS}${NBSP}mois offerts`;

// ── Versions composées prêtes à l'emploi ─────────────────────────────────────
export const PRICING_LONG = getPricingBaseline();
export const PRICING_SHORT = getPricingBaselineShort();
export const PRICING_VERY_SHORT = getPricingBaselineShort();
