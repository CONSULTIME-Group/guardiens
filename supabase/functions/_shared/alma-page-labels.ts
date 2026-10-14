/**
 * Lot J4 : nom lisible de chaque page citée par Alma, source unique pour le
 * serveur et l'écran de conversation. Règle de nommage vérifiée par test :
 * un formulaire de création se nomme par la demande (« Demander un coup de
 * main »), jamais par l'offre. Lot E5 (11/10/2026) : la page Entraide sert
 * d'abord à demander, elle se nomme par son lieu (« L'entraide près de chez
 * vous »).
 */
export const ALMA_PAGE_LABELS: Record<string, string> = {
  "/dashboard": "Tableau de bord",
  "/profile": "Mon profil gardien",
  "/owner-profile": "Mon profil propriétaire",
  "/sits": "Mes annonces",
  "/sits/create": "Créer une annonce de garde",
  "/annonces": "Les annonces de garde",
  "/annonces/international": "Les gardes à l'international",
  "/recherche-gardiens": "Rechercher un gardien",
  "/messages": "Messagerie",
  "/favoris": "Mes favoris",
  "/mes-candidatures": "Mes candidatures",
  "/mes-avis": "Mes avis",
  "/mon-secteur": "Mon secteur",
  "/notifications": "Mes notifications",
  "/settings": "Réglages",
  // Lot A2 : rubriques des réglages et du profil, nommées par leur titre à l'écran.
  "/settings?section=spaces": "Mes espaces",
  "/settings?section=alerts": "Alertes annonces",
  "/settings?section=notifications": "Notifications email",
  "/profile?section=savoir-faire": "Mes savoir-faire",
  "/alma": "Mon parcours avec Alma",
  "/petites-missions/creer": "Demander un coup de main",
  "/petites-missions": "L'entraide près de chez vous",
  "/projets/publier": "Lancer un projet",
  "/projets": "Les projets",
  "/contact": "Écrire à Jérémie et Elisa",
};

/**
 * Libellé d'un chemin, null s'il est inconnu. Lot A2 : la rubrique exacte
 * (chemin et ?section=) d'abord, puis le chemin seul (requête et ancre ignorées).
 */
export function almaPageLabel(path: string): string | null {
  const withSection = path.split("#")[0];
  const section = withSection.match(/^([^?]*)\?(?:.*&)?(section=[^&]+)/);
  if (section) {
    const exact = ALMA_PAGE_LABELS[`${section[1].replace(/\/+$/, "")}?${section[2]}`];
    if (exact) return exact;
  }
  const base = path.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  return ALMA_PAGE_LABELS[base] ?? null;
}
