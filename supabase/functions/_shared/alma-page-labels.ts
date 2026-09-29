/**
 * Lot J4 : nom lisible de chaque page citée par Alma, source unique pour le
 * serveur et l'écran de conversation. Règle de nommage vérifiée par test :
 * un formulaire de création se nomme par la demande (« Demander un coup de
 * main »), une liste à parcourir se nomme par l'offre (« Proposer un coup de
 * main »).
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
  "/alma": "Mon parcours avec Alma",
  "/petites-missions/creer": "Demander un coup de main",
  "/petites-missions": "Proposer un coup de main",
  "/projets/publier": "Lancer un projet",
  "/projets": "Les projets",
  "/contact": "Écrire à Jérémie et Elisa",
};

/** Libellé d'un chemin (requête et ancre ignorées), null s'il est inconnu. */
export function almaPageLabel(path: string): string | null {
  const base = path.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  return ALMA_PAGE_LABELS[base] ?? null;
}
