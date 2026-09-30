/** Constantes du site sans dépendance (lot P2 : lisibles depuis l'entrée). */
export const SITE_URL = "https://guardiens.fr";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.jpg`;
/** Image de partage de l'accueil (identique à staticRoutes["/"].ogImage, parité testée). */
export const HOME_OG_IMAGE = DEFAULT_OG_IMAGE;
/** Article de presse (Le Progrès, 06/09/2026), partagé par le pied de page et PressQuote. */
export const PRESS_ARTICLE_URL =
  "https://c.leprogres.fr/economie/2026/09/06/apres-avoir-garde-234-animaux-et-37-maisons-ils-lancent-leur-plateforme-de-home-sitting";
/** Fin de la mention presse dans le hero de l'accueil. */
export const PRESS_HIGHLIGHT_UNTIL = new Date("2026-10-06T00:00:00");
