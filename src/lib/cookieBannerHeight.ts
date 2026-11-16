/**
 * Lots BAS1 et BAS2 (16/11/2026) : hauteur réelle du bandeau cookies ouvert,
 * publiée sur <html> pour que les éléments fixés en bas d'écran et le bas des
 * pages se placent au-dessus de lui. Vaut 0px dès que le bandeau est fermé.
 * Module sans dépendance, lisible par la carte des annonces sans charger le
 * bandeau.
 */
export const COOKIE_BANNER_HEIGHT_VAR = "--cookie-banner-h";

/** Prévient les éléments qui mesurent leur place quand la hauteur change. */
export const COOKIE_BANNER_HEIGHT_EVENT = "guardiens:cookie-banner-height";
