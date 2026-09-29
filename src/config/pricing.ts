/**
 * L'accès à Guardiens est ouvert tant que Jérémie considère que le service
 * n'a pas atteint le niveau qu'il veut offrir. Ce flag reste `false`
 * jusqu'à décision explicite. La structure de prix reste en code
 * pour permettre une réactivation propre.
 */
export const PRICING_IS_ACTIVE = false;

/**
 * Date d'entrée en vigueur du payant (ISO, ex. "2027-01-15T00:00:00+01:00").
 * Reste `null` tant que Jérémie n'a pas décidé. Tant qu'elle est null ou
 * dans le futur, l'accès reste complet pour tous, même si PRICING_IS_ACTIVE
 * passe à true.
 */
export const PRICING_ACTIVATION_DATE: string | null = null;

// Constantes conservées pour une réactivation future
// (invisibles en public tant que PRICING_IS_ACTIVE = false).
export const SITTER_PRICE_MONTHLY = 6.99;
export const SITTER_PRICE_YEARLY = 65;
export const SITTER_PRICE_ONESHOT = 10;
export const OWNER_PRICE = 0;

// Prorata prévu pour les inscrits "période gratuite" au moment de la bascule.
export const SITTER_PRICE_MONTHLY_LEGACY_DISCOUNT_RATIO = 0.2;
