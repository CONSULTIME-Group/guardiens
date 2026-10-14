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
  // Lot A5 (audit Alma du 14/10/2026) : chaque chemin de la carte du site a
  // son libellé ; avant, AlmaConversation fabriquait un nom depuis l'adresse
  // (« Le journal · Gardiennage maison quebec », « Mon abonnement »).
  "/annonces/:id": "Fiche d'une annonce",
  "/annonces/demo/:slug": "Exemple d'annonce",
  "/sits/:id": "Fiche d'une annonce",
  "/sits/:id/edit": "Modifier une annonce",
  "/recherche": "Rechercher une garde",
  "/search": "Rechercher une garde",
  "/petites-missions/:id": "Fiche d'un besoin d'entraide",
  "/petites-missions/lyon": "L'entraide à Lyon",
  "/entraide/je-peux": "Je peux aider",
  "/entraide/choisir": "Choisir la personne qui aide",
  "/questions/:id": "Question de l'entraide",
  "/questions/nouvelle": "Poser une question",
  "/projets/:slug": "Fiche d'un projet",
  "/associations": "Les associations",
  "/associations/:slug": "Fiche d'une association",
  "/gardien-urgence": "Gardien d'urgence",
  "/house-guide/:propertyId": "Guide de la maison",
  "/review/:sitId": "Laisser un avis",
  "/planche-badges": "La planche des écussons",
  "/onboarding/affinity": "Affinité",
  "/ma-periode": "Ma période de départ",
  "/ma-periode/:token": "Ma période de départ",
  "/parrainage": "Parrainage",
  "/messages/:conversationId": "Messagerie",
  "/gardiens/:id": "Fiche d'un gardien",
  "/profil/:id": "Fiche d'un membre",
  "/proprietaires/:id": "Fiche d'un propriétaire",
  "/conseils": "Les conseils d'Alma",
  "/actualites": "Le journal",
  "/actualites/:slug": "Le journal",
  "/actualites/page/:page": "Le journal",
  "/actualites/inventaire-guardiens-france": "L'inventaire de Guardiens",
  "/auteurs/:slug": "Page d'un auteur",
  "/guides": "Les guides locaux",
  "/guides/:slug": "Guide local",
  "/house-sitting": "Villes et départements",
  "/house-sitting/:slug": "Page d'une ville",
  "/departement": "Les départements",
  "/departement/:slug": "Page d'un département",
  "/races": "Les fiches de race",
  "/races/:slug": "Fiche de race",
  "/faq": "La FAQ",
  "/devenir-home-sitter": "Devenir gardien",
  "/gardiennage-maison-quebec": "Gardiennage de maison au Québec",
  "/observatoire-garde-animaux": "L'observatoire de la garde d'animaux",
  "/mon-abonnement": "Mon accès",
  "/tarifs": "Guardiens est gratuit",
  "/ma-ligne": "Ma carte d'entraide",
  "/ma-ligne/:token": "Ma carte d'entraide",
  "/a-propos": "À propos",
};

/**
 * Libellé d'un chemin, null s'il est inconnu. Lot A2 : la rubrique exacte
 * (chemin et ?section=) d'abord, puis le chemin seul (requête et ancre ignorées).
 * Un modèle de chemin (« /annonces/:id ») ne répond pas ici : une adresse
 * réelle d'annonce ou d'article garde son titre propre (almaPageKindLabel).
 */
export function almaPageLabel(path: string): string | null {
  const withSection = path.split("#")[0];
  const section = withSection.match(/^([^?]*)\?(?:.*&)?(section=[^&]+)/);
  if (section) {
    const exact = ALMA_PAGE_LABELS[`${section[1].replace(/\/+$/, "")}?${section[2]}`];
    if (exact) return exact;
  }
  const base = path.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  if (base.includes("/:")) return null;
  return ALMA_PAGE_LABELS[base] ?? null;
}

/**
 * Lot A5 : nature d'une page réelle d'après les modèles de chemin
 * (« /annonces/garde-a-lyon » donne « Fiche d'une annonce »), null si aucun
 * modèle ne correspond. Sert d'étiquette aux liens qui gardent leur titre.
 */
export function almaPageKindLabel(path: string): string | null {
  const exact = almaPageLabel(path);
  if (exact) return exact;
  const segs = (path.split(/[?#]/)[0].replace(/\/+$/, "") || "/").split("/");
  let best: { label: string; statics: number } | null = null;
  for (const [pattern, label] of Object.entries(ALMA_PAGE_LABELS)) {
    if (!pattern.includes("/:")) continue;
    const ps = pattern.split("/");
    if (ps.length !== segs.length) continue;
    let statics = 0;
    const fits = ps.every((p, i) => (p.startsWith(":") ? segs[i].length > 0 : (statics++, p === segs[i])));
    if (fits && (!best || statics > best.statics)) best = { label, statics };
  }
  return best?.label ?? null;
}
