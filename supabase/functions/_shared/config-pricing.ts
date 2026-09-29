// Mirror Deno-side du flag PRICING_IS_ACTIVE.
// Gardé en synchro manuelle avec src/config/pricing.ts.
export const PRICING_IS_ACTIVE = false;

// Miroir de PRICING_ACTIVATION_DATE (src/config/pricing.ts). null tant que
// Jérémie n'a pas décidé. Synchro manuelle, comme le flag.
export const PRICING_ACTIVATION_DATE: string | null = null;

/** Payant réellement en vigueur : date renseignée, valide et atteinte. */
export function isPaywallInForce(
  activationDate: string | null = PRICING_ACTIVATION_DATE,
  now: Date = new Date(),
): boolean {
  if (!activationDate) return false;
  const d = new Date(activationDate);
  return !Number.isNaN(d.getTime()) && d <= now;
}

/** Même règle que src/lib/pricing.ts : gratuit pour tous tant que le payant n'est pas en vigueur. */
export function isFreeAccessForAll(
  pricingActive: boolean = PRICING_IS_ACTIVE,
  activationDate: string | null = PRICING_ACTIVATION_DATE,
  now: Date = new Date(),
): boolean {
  return !pricingActive || !isPaywallInForce(activationDate, now);
}
