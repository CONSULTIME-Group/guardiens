/**
 * Détermine si la carte rail « Gardien vérifié » (vague 18) doit être montée.
 *
 * Règles :
 *  - flag pricing éteint  → jamais (rien de visible tant que PRICING_IS_ACTIVE=false)
 *  - flag actif + abonné  → jamais (l'écusson est déjà porté)
 *  - flag actif + non abonné → oui
 */
export function shouldShowVerifiedCard(
  pricingActive: boolean,
  hasSubscription: boolean,
): boolean {
  if (!pricingActive) return false;
  if (hasSubscription) return false;
  return true;
}
