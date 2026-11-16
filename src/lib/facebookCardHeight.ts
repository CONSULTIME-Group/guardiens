/**
 * Lot BAS3 (16/11/2026) : place occupée en bas d'écran par la carte « Vous
 * venez de Facebook ? » tant qu'elle est affichée (sa hauteur plus son écart
 * de 1rem au-dessus du bandeau cookies), publiée sur <html>. Vaut 0px dès que
 * la carte est fermée. Le bouton « Carte » de la recherche l'ajoute à sa
 * position basse pour se poser juste au-dessus d'elle.
 */
export const FB_CARD_HEIGHT_VAR = "--fb-card-h";

/** Écart entre le bas de l'écran (ou le haut du bandeau cookies) et la carte. */
export const FB_CARD_BOTTOM_GAP_PX = 16;
