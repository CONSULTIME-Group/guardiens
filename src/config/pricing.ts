/**
 * Guardiens reste gratuit tant que Jérémie considère que le service
 * n'a pas atteint le niveau qu'il veut offrir. Ce flag reste `false`
 * jusqu'à décision explicite. La structure de prix reste en code
 * pour permettre une réactivation propre.
 */
export const PRICING_IS_ACTIVE = false;

// Constantes conservées pour une réactivation future
// (invisibles en public tant que PRICING_IS_ACTIVE = false).
export const SITTER_PRICE_MONTHLY = 6.99;
export const SITTER_PRICE_YEARLY = 65;
export const SITTER_PRICE_ONESHOT = 10;
export const OWNER_PRICE = 0;

// Prorata prévu pour les inscrits "période gratuite" au moment de la bascule.
export const SITTER_PRICE_MONTHLY_LEGACY_DISCOUNT_RATIO = 0.2;
