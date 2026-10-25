/** Constantes du site sans dépendance (lot P2 : lisibles depuis l'entrée). */
export const SITE_URL = "https://guardiens.fr";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.jpg`;
/** Image de partage de l'accueil (identique à staticRoutes["/"].ogImage, parité testée). */
export const HOME_OG_IMAGE = DEFAULT_OG_IMAGE;
/** Texte alternatif de l'image de partage par défaut (accueil et secours de toutes les pages). */
export const DEFAULT_OG_IMAGE_ALT =
  "Un golden retriever assis dans un jardin fleuri devant une maison en pierre, au soleil couchant";
/**
 * Images de partage des rubriques (1200 × 630, JPEG). URL identiques à
 * staticRoutes[].ogImage (parité testée).
 */
export const SECTION_OG_IMAGES = {
  projets: {
    url: `${SITE_URL}/og/og-projets.jpg`,
    alt: "Illustration aquarelle d'une maison en pierre et d'une caisse à outils",
  },
  entraide: {
    url: `${SITE_URL}/og/og-entraide.jpg`,
    alt: "Illustration aquarelle de deux mains qui se passent un pot de terre",
  },
  associations: {
    url: `${SITE_URL}/og/og-associations.jpg`,
    alt: "Illustration aquarelle d'un chien en laisse et d'un chat assis",
  },
} as const;
/** Article de presse (Le Progrès, 06/09/2026), partagé par le pied de page et PressQuote. */
export const PRESS_ARTICLE_URL =
  "https://c.leprogres.fr/economie/2026/09/06/apres-avoir-garde-234-animaux-et-37-maisons-ils-lancent-leur-plateforme-de-home-sitting";
/** Fin de la mention presse dans le hero de l'accueil. */
export const PRESS_HIGHLIGHT_UNTIL = new Date("2026-10-06T00:00:00");
