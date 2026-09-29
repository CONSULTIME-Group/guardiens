/**
 * Lot J2-A : base de connaissance du site pour Alma.
 *
 * Une entrée par fonctionnalité, écrite d'après le code réel de chaque page.
 * Remplace l'ancienne liste de chemins (`ALMA_CARTE`), qui disait où aller
 * sans dire à quoi sert la page, pour qui, ni quand la proposer.
 *
 * Le prompt ne reçoit que les entrées pertinentes du tour (`selectKnowledge`).
 * Le test `src/__tests__/alma-site-knowledge.test.ts` vérifie que chaque
 * chemin existe dans `src/App.tsx`, et que chaque route publique ou membre y
 * figure, ou dans `ALMA_KNOWLEDGE_EXCLUDED_ROUTES`.
 */

export type AlmaAudience = "owner" | "sitter" | "all";

export interface AlmaKnowledgeEntry {
  /** Identifiant stable. */
  key: string;
  /** Chemin réel du site (route de App.tsx, paramètres au format :id). */
  path: string;
  /** Autres routes décrites par cette entrée. */
  aliases?: string[];
  /** Nom court affiché dans la carte. */
  label: string;
  /** À quoi sert la page, une phrase. */
  purpose: string;
  audience: AlmaAudience;
  /** Mots qui déclenchent la proposition (minuscules, sans accents). */
  triggers: string[];
  /** Phrase d'amorce type, dans la voix d'Alma. */
  opener: string;
  /** Remonte en premier quand rien d'autre ne correspond. */
  core?: boolean;
}

export const ALMA_SITE_KNOWLEDGE: AlmaKnowledgeEntry[] = [
  {
    key: "annonces",
    path: "/annonces",
    label: "Annonces de garde",
    purpose: "Liste des gardes publiées par les propriétaires, avec carte, dates et ville ; un gardien y choisit une garde et envoie sa candidature.",
    audience: "sitter",
    triggers: ["annonce", "garde", "postuler", "candidater", "trouver une garde", "chercher une garde"],
    opener: "Les gardes ouvertes près de chez vous sont sur /annonces.",
    core: true,
  },
  {
    key: "annonce_fiche",
    path: "/annonces/:id",
    aliases: ["/sits/:id", "/annonces/demo/:slug"],
    label: "Fiche d'une annonce",
    purpose: "Détail d'une garde : logement, animaux, dates, attentes du propriétaire ; le bouton de candidature ouvre le formulaire, profil à 60 % minimum.",
    audience: "sitter",
    triggers: ["je postule", "candidature", "cette garde", "cette annonce"],
    opener: "Le bouton de candidature est sur la fiche de l'annonce.",
  },
  {
    key: "annonce_creer",
    path: "/sits/create",
    aliases: ["/sits/:id/edit"],
    label: "Publier une annonce de garde",
    purpose: "Formulaire de création d'une garde : dates, logement, animaux, message d'accueil, photo ; le brouillon s'enregistre tout seul et la publication est immédiate.",
    audience: "owner",
    triggers: ["publier une annonce", "je pars", "partir", "vacances", "faire garder", "garder mes animaux", "garder ma maison", "trouver un gardien", "garde de maison", "chevaux", "poneys", "troupeau"],
    opener: "Votre annonce se publie sur /sits/create, je vous propose le titre.",
    core: true,
  },
  {
    key: "mes_annonces",
    path: "/sits",
    label: "Mes annonces et candidatures reçues",
    purpose: "Les annonces du propriétaire, leurs brouillons, les candidatures reçues à ouvrir, accepter ou décliner, puis l'accord de garde signé des deux côtés.",
    audience: "owner",
    triggers: ["mes annonces", "candidatures recues", "brouillon", "accepter", "accord de garde", "accord"],
    opener: "Vos annonces et les candidatures reçues sont sur /sits.",
  },
  {
    key: "recherche_gardiens",
    path: "/recherche-gardiens",
    label: "Recherche de gardiens",
    purpose: "Carte et liste des gardiens autour d'une ville, triés par affinité avec vos animaux, filtres zone, animaux, disponibilité et identité vérifiée.",
    audience: "owner",
    triggers: ["chercher un gardien", "trouver un gardien", "gardiens pres", "qui peut garder"],
    opener: "Les gardiens autour de chez vous sont sur /recherche-gardiens.",
  },
  {
    key: "recherche_gardes",
    path: "/recherche",
    aliases: ["/search"],
    label: "Recherche de gardes",
    purpose: "Recherche des gardes par ville, rayon, dates et animaux, avec carte.",
    audience: "sitter",
    triggers: ["rechercher", "rayon", "autour de", "pres de"],
    opener: "La recherche par ville et rayon est sur /recherche.",
  },
  {
    key: "international",
    path: "/annonces/international",
    label: "Annonces à l'international",
    purpose: "Gardes publiées hors de France, carte mondiale et pays affiché sur chaque carte.",
    audience: "all",
    triggers: ["etranger", "international", "belgique", "suisse", "espagne", "italie", "canada", "portugal", "allemagne", "hors de france", "pays"],
    opener: "Les gardes hors de France sont réunies sur /annonces/international.",
  },
  {
    key: "candidatures",
    path: "/mes-candidatures",
    label: "Mes candidatures",
    purpose: "Suivi des candidatures envoyées par le gardien : en attente, vue, en discussion, acceptée, déclinée.",
    audience: "sitter",
    triggers: ["mes candidatures", "reponse", "sans reponse", "relancer"],
    opener: "Où en sont vos candidatures : /mes-candidatures.",
  },
  {
    key: "entraide",
    path: "/petites-missions",
    aliases: ["/petites-missions/:id", "/entraide/je-peux", "/entraide/choisir"],
    label: "Entraide près de chez vous",
    purpose: "Les demandes de coup de main des gens du coin (besoin) et les offres de savoir-faire (offre), catégories animaux, jardin, maison, compétences, courses, trajets, compagnie ; un « je peux » suffit pour répondre, profil à 40 % minimum.",
    audience: "all",
    triggers: ["entraide", "coup de main", "aider", "rendre service", "petite mission", "jardin", "potager", "courses", "marche", "trajet", "voiture", "echecs", "scrabble", "belote", "jeux de societe", "compagnie"],
    opener: "Les coups de main demandés autour de vous sont sur /petites-missions.",
    core: true,
  },
  {
    key: "entraide_creer",
    path: "/petites-missions/creer",
    label: "Demander un coup de main",
    purpose: "Formulaire d'une demande d'entraide : un titre (100 caractères), une description, le lieu et la date ; aucune condition de profil pour publier. Exemples : partie d'échecs, Scrabble ou belote, aide au jardin, légumes du potager à partager, courses au marché, trajet en voiture.",
    audience: "all",
    triggers: ["j'ai besoin", "besoin d'aide", "je cherche de l'aide", "demander", "publier une demande", "quelqu'un pour"],
    opener: "Je vous propose le titre, la demande se publie sur /petites-missions/creer.",
    core: true,
  },
  {
    key: "questions",
    path: "/questions/:id",
    aliases: ["/questions/nouvelle"],
    label: "Questions de l'entraide",
    purpose: "Questions posées par les membres (animaux, jardin, maison, garde) ; chacun peut répondre, l'auteur choisit la réponse qui l'aide.",
    audience: "all",
    triggers: ["question", "conseil", "quelqu'un sait", "avis"],
    opener: "Une question attend une réponse près de chez vous.",
  },
  {
    key: "projets",
    path: "/projets",
    aliases: ["/projets/:slug"],
    label: "Projets participatifs",
    purpose: "Chantiers à plusieurs : jardin et potager, construction et bricolage, low tech et récupération, rénovation écologique, abris pour animaux, événement. Charte : participation libre, lieu non commercial, porteur présent, aucun échange d'argent, on donne du temps et on transmet un savoir-faire (permaculture, pierre sèche, charpente, réparation, poulailler, cuisine et conserves).",
    audience: "all",
    triggers: ["projet", "chantier", "a plusieurs", "haie", "abri", "poulailler", "potager", "construire", "renovation", "permaculture"],
    opener: "Les chantiers à plusieurs sont sur /projets.",
  },
  {
    key: "projets_publier",
    path: "/projets/publier",
    label: "Lancer un projet",
    purpose: "Formulaire en trois étapes : titre (10 caractères minimum), description (150 minimum), nature du chantier, période, savoir-faire attendus et transmis, hébergement ; les déclarations de la charte se cochent par le porteur.",
    audience: "all",
    triggers: ["lancer un projet", "publier un projet", "organiser un chantier"],
    opener: "Un projet se lance sur /projets/publier, je vous propose le titre.",
  },
  {
    key: "associations",
    path: "/associations",
    aliases: ["/associations/:slug"],
    label: "Associations et refuges",
    purpose: "Associations de protection animale qui cherchent des bénévoles, avec ville et besoins.",
    audience: "all",
    triggers: ["association", "refuge", "benevole", "benevolat", "spa"],
    opener: "Les associations qui cherchent des bras sont sur /associations.",
  },
  {
    key: "urgence",
    path: "/gardien-urgence",
    label: "Gardien d'urgence",
    purpose: "Un propriétaire avec un imprévu alerte les gardiens d'urgence dans un rayon de 35 km ; un gardien peut s'y déclarer disponible.",
    audience: "all",
    triggers: ["urgence", "imprevu", "derniere minute", "annulation", "demain"],
    opener: "Pour un imprévu, le gardien d'urgence est expliqué sur /gardien-urgence.",
  },
  {
    key: "guide_maison",
    path: "/house-guide/:propertyId",
    label: "Guide de la maison",
    purpose: "Consignes du logement en cinq volets (accès, animaux, maison, contacts, alentours), lisibles par le gardien pendant les dates de la garde.",
    audience: "owner",
    triggers: ["guide de la maison", "consignes", "cles", "wifi", "routine"],
    opener: "Les consignes se rangent dans le guide de la maison.",
  },
  {
    key: "avis",
    path: "/mes-avis",
    aliases: ["/review/:sitId"],
    label: "Avis",
    purpose: "Avis croisés après chaque garde, publiés quand les deux côtés ont écrit ou après le délai.",
    audience: "all",
    triggers: ["avis", "laisser un avis", "note", "evaluation"],
    opener: "Vos avis sont réunis sur /mes-avis.",
  },
  {
    key: "ecussons",
    path: "/planche-badges",
    label: "Écussons",
    purpose: "Planche des écussons qui se gagnent par les gardes, l'entraide et les avis.",
    audience: "all",
    triggers: ["ecusson", "badge", "recompense"],
    opener: "La planche des écussons est sur /planche-badges.",
  },
  {
    key: "affinite",
    path: "/onboarding/affinity",
    label: "Affinité",
    purpose: "Questions sur vos animaux, votre rythme et votre maison, qui servent à trier les gardiens et les gardes par compatibilité.",
    audience: "all",
    triggers: ["affinite", "compatibilite", "score d'affinite"],
    opener: "Les questions d'affinité sont sur /onboarding/affinity.",
  },
  {
    key: "secteur",
    path: "/mon-secteur",
    label: "Mon secteur et alertes",
    purpose: "Code postal et rayon de déplacement ; enregistre la zone des alertes et affiche aussitôt les gardes ouvertes dans ce rayon.",
    audience: "all",
    triggers: ["alerte", "secteur", "rayon", "prevenir", "code postal", "rien pres"],
    opener: "Votre secteur et vos alertes se règlent sur /mon-secteur.",
  },
  {
    key: "ma_periode",
    path: "/ma-periode",
    aliases: ["/ma-periode/:token"],
    label: "Ma période de départ",
    purpose: "Le propriétaire indique quand il part (Noël, hiver, printemps, été, plus tard) pour préparer son annonce au bon moment.",
    audience: "owner",
    triggers: ["quand je pars", "periode", "noel", "ete", "hiver", "printemps"],
    opener: "Dites nous quand vous partez sur /ma-periode.",
  },
  {
    key: "parrainage",
    path: "/parrainage",
    label: "Parrainage",
    purpose: "Lien personnel pour inviter des proches et des gens du coin à rejoindre Guardiens.",
    audience: "all",
    triggers: ["parrainage", "inviter", "parrain", "filleul", "ami"],
    opener: "Votre lien d'invitation est sur /parrainage.",
  },
  {
    key: "identite",
    path: "/settings",
    label: "Réglages et vérification d'identité",
    purpose: "Réglages du compte, préférences d'email et vérification d'identité, qui ajoute l'écusson Identité vérifiée sur le profil.",
    audience: "all",
    triggers: ["identite", "verification", "piece d'identite", "reglages", "parametres", "email", "mot de passe"],
    opener: "La vérification d'identité est dans /settings.",
  },
  {
    key: "suppression",
    path: "/settings",
    label: "Suppression du compte",
    purpose: "Dans les réglages, la suppression du compte est immédiate et irréversible : le profil est anonymisé sur-le-champ, avis et messages restent sous forme anonyme.",
    audience: "all",
    triggers: ["supprimer mon compte", "suppression", "desinscrire", "effacer"],
    opener: "La suppression du compte se demande dans /settings.",
  },
  {
    key: "messagerie",
    path: "/messages",
    aliases: ["/messages/:conversationId"],
    label: "Messagerie",
    purpose: "Conversations avec les propriétaires, les gardiens et les gens du coin qui répondent à une demande.",
    audience: "all",
    triggers: ["message", "messagerie", "ecrire", "repondre", "conversation"],
    opener: "Vos échanges sont sur /messages.",
  },
  {
    key: "favoris",
    path: "/favoris",
    label: "Favoris",
    purpose: "Gardiens et annonces mis de côté, en deux onglets.",
    audience: "all",
    triggers: ["favori", "mettre de cote", "sauvegarder"],
    opener: "Ce que vous avez mis de côté est sur /favoris.",
  },
  {
    key: "notifications",
    path: "/notifications",
    label: "Notifications",
    purpose: "Toutes les alertes du compte : candidatures, messages, gardes proches, réponses d'entraide.",
    audience: "all",
    triggers: ["notification", "alerte recue"],
    opener: "Vos notifications sont sur /notifications.",
  },
  {
    key: "tableau_de_bord",
    path: "/dashboard",
    label: "Tableau de bord",
    purpose: "Point de départ du membre : prochaine action, gardes, candidatures, entraide autour de chez soi.",
    audience: "all",
    triggers: ["tableau de bord", "accueil", "par ou commencer"],
    opener: "Tout part du tableau de bord, /dashboard.",
  },
  {
    key: "profil_gardien",
    path: "/profile",
    label: "Profil gardien",
    purpose: "Profil publié par défaut : présentation, expérience, animaux, photo ; 40 % de complétion pour apparaître dans la recherche, 60 % pour postuler.",
    audience: "sitter",
    triggers: ["mon profil", "profil", "completion", "presentation", "photo de profil"],
    opener: "Votre profil gardien se complète sur /profile.",
  },
  {
    key: "profil_proprietaire",
    path: "/owner-profile",
    label: "Profil propriétaire",
    purpose: "Présentation du propriétaire, de sa maison et de ses animaux, lue par les gardiens avant de postuler.",
    audience: "owner",
    triggers: ["profil proprietaire", "mes animaux", "ma maison"],
    opener: "Votre maison et vos animaux se présentent sur /owner-profile.",
  },
  {
    key: "fiche_gardien",
    path: "/gardiens/:id",
    aliases: ["/profil/:id", "/proprietaires/:id"],
    label: "Fiche publique d'un membre",
    purpose: "Profil public d'un gardien : présentation, avis, écussons, galerie pour les membres connectés.",
    audience: "owner",
    triggers: ["ce gardien", "fiche du gardien", "profil public"],
    opener: "La fiche du gardien montre ses avis et ses écussons.",
  },
  {
    key: "conseils",
    path: "/conseils",
    aliases: ["/actualites/:slug", "/actualites/inventaire-guardiens-france", "/auteurs/:slug"],
    label: "Conseils",
    purpose: "Conseils d'Alma et articles pratiques sur la garde, les animaux et l'entraide.",
    audience: "all",
    triggers: ["conseil", "astuce", "comment faire", "preparer"],
    opener: "Les conseils pratiques sont sur /conseils.",
  },
  {
    key: "journal",
    path: "/actualites",
    label: "Le journal",
    purpose: "Articles et nouvelles de Guardiens.",
    audience: "all",
    triggers: ["article", "journal", "actualite"],
    opener: "Le journal de Guardiens est sur /actualites.",
  },
  {
    key: "guides_locaux",
    path: "/guides",
    aliases: ["/guides/:slug"],
    label: "Guides locaux",
    purpose: "Balades, parcs, vétérinaires et lieux qui acceptent les chiens, ville par ville.",
    audience: "all",
    triggers: ["balade", "parc", "veterinaire", "promenade", "guide local"],
    opener: "Les bons coins pour les chiens sont dans /guides.",
  },
  {
    key: "villes",
    path: "/house-sitting",
    aliases: ["/house-sitting/:slug", "/departement", "/departement/:slug", "/petites-missions/lyon"],
    label: "Villes et départements",
    purpose: "Pages de ville et de département : gardes, gardiens et entraide du secteur.",
    audience: "all",
    triggers: ["ville", "departement", "region", "ma commune"],
    opener: "Votre ville a sa page sur /house-sitting.",
  },
  {
    key: "races",
    path: "/races",
    aliases: ["/races/:slug"],
    label: "Fiches de race",
    purpose: "Caractère, besoins et conseils de garde par race.",
    audience: "all",
    triggers: ["race", "berger", "labrador", "chat de race"],
    opener: "Les fiches de race sont sur /races.",
  },
  {
    key: "faq",
    path: "/faq",
    label: "Questions fréquentes",
    purpose: "Réponses sur le fonctionnement, la confiance, l'entraide et les gardes.",
    audience: "all",
    triggers: ["comment ca marche", "fonctionnement", "faq", "confiance"],
    opener: "Le fonctionnement est détaillé sur /faq.",
  },
  {
    key: "contact",
    path: "/contact",
    label: "Contact",
    purpose: "Écrire directement à Jérémie et Elisa, qui répondent à chaque message.",
    audience: "all",
    triggers: ["contact", "parler a quelqu'un", "humain", "jeremie", "elisa", "probleme", "bug"],
    opener: "Jérémie et Elisa vous répondent sur /contact.",
  },
  {
    key: "alma",
    path: "/alma",
    label: "Le parcours d'Alma",
    purpose: "Qui est Alma, son histoire et comment elle accompagne sur le site.",
    audience: "all",
    triggers: ["alma", "qui es tu", "ton histoire"],
    opener: "Mon histoire est racontée sur /alma.",
  },
  {
    key: "devenir_gardien",
    path: "/devenir-home-sitter",
    label: "Devenir gardien",
    purpose: "Ce que fait un gardien, comment se passe une garde et comment commencer.",
    audience: "sitter",
    triggers: ["devenir gardien", "home sitter", "comment commencer"],
    opener: "Le parcours de gardien est expliqué sur /devenir-home-sitter.",
  },
  {
    key: "observatoire",
    path: "/observatoire-garde-animaux",
    label: "Observatoire",
    purpose: "Données publiques sur la garde d'animaux en France.",
    audience: "all",
    triggers: ["observatoire", "statistiques", "etude"],
    opener: "Les données publiques sont sur /observatoire-garde-animaux.",
  },
  {
    key: "abonnement",
    path: "/mon-abonnement",
    aliases: ["/tarifs"],
    label: "Accès gardien",
    purpose: "État de l'accès gardien du compte.",
    audience: "sitter",
    triggers: ["abonnement", "acces gardien"],
    opener: "L'état de votre accès est sur /mon-abonnement.",
  },
  {
    key: "ma_ligne",
    path: "/ma-ligne",
    aliases: ["/ma-ligne/:token"],
    label: "Ma carte d'entraide",
    purpose: "Ce que la personne peut offrir aux gens du coin, en une ligne, pour être sollicitée sur ce qu'elle aime faire.",
    audience: "all",
    triggers: ["ce que je peux offrir", "ma ligne", "ma carte"],
    opener: "Ce que vous aimez faire pour les autres tient en une ligne sur /ma-ligne.",
  },
  {
    key: "a_propos",
    path: "/a-propos",
    label: "À propos",
    purpose: "Pourquoi Guardiens existe et qui le fait.",
    audience: "all",
    triggers: ["qui etes vous", "pourquoi guardiens", "a propos"],
    opener: "L'histoire de Guardiens est sur /a-propos.",
  },
];

/**
 * Routes de App.tsx volontairement absentes de la base : pages légales,
 * authentification, liens à jeton d'email, accueil, écrans de service.
 * Toute nouvelle route doit être décrite ci dessus ou rangée ici.
 */
export const ALMA_KNOWLEDGE_EXCLUDED_ROUTES: string[] = [
  "/", // accueil, Alma y est déjà
  "*", // page introuvable
  // Légal
  "/cgu", "/cgs", "/confidentialite", "/mentions-legales", "/cookies",
  // Authentification
  "/inscription", "/register", "/login", "/auth/confirm", "/forgot-password", "/reset-password",
  // Liens à jeton ou de service ouverts depuis un email
  "/go", "/acces", "/unsubscribe", "/email-preferences", "/candidature/reponse",
  // Pages de ville entraide, décrites par l'entrée villes
  "/petites-missions/annecy", "/petites-missions/bordeaux", "/petites-missions/grenoble",
  "/petites-missions/lille", "/petites-missions/marseille", "/petites-missions/montpellier",
  "/petites-missions/nantes", "/petites-missions/nice", "/petites-missions/paris",
  "/petites-missions/rennes", "/petites-missions/saint-etienne", "/petites-missions/strasbourg",
  "/petites-missions/toulouse",
];

/** Minuscules sans accents, pour comparer des mots. */
export function foldText(s: string): string {
  return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[’]/g, "'");
}

export interface KnowledgeSelectInput {
  question: string;
  role: "owner" | "sitter";
  /** Membre polyvalent : les deux publics comptent. */
  both?: boolean;
  register?: string;
  max?: number;
}

/** Entrées pertinentes du tour : mots de la question, puis public, puis socle. */
export function selectKnowledge(input: KnowledgeSelectInput): AlmaKnowledgeEntry[] {
  const q = foldText(input.question);
  const max = input.max ?? 6;
  const fits = (e: AlmaKnowledgeEntry) =>
    e.audience === "all" || input.both || e.audience === input.role;
  const scored = ALMA_SITE_KNOWLEDGE.map((e, i) => {
    const hits = e.triggers.filter((t) => q.includes(foldText(t))).length;
    return { e, i, score: hits * 10 + (fits(e) ? 2 : 0) + (e.core ? 1 : 0) };
  });
  const matched = scored.filter((s) => s.score >= 10).sort((a, b) => b.score - a.score || a.i - b.i);
  const out: AlmaKnowledgeEntry[] = [];
  const seen = new Set<string>();
  for (const s of matched) {
    if (out.length >= max) break;
    out.push(s.e);
    seen.add(s.e.key);
  }
  for (const s of scored.filter((x) => x.e.core && fits(x.e))) {
    if (out.length >= max) break;
    if (!seen.has(s.e.key)) {
      out.push(s.e);
      seen.add(s.e.key);
    }
  }
  return out;
}

const AUDIENCE_LABEL: Record<AlmaAudience, string> = {
  owner: "propriétaire",
  sitter: "gardien",
  all: "tous",
};

/** Bloc envoyé au modèle pour ce tour. */
export function formatKnowledge(entries: AlmaKnowledgeEntry[]): string {
  return [
    "PAGES DU SITE UTILES POUR CE TOUR (chemin, à quoi ça sert, pour qui, phrase d'amorce)",
    ...entries.map(
      (e) => `${e.path} : ${e.purpose} Pour : ${AUDIENCE_LABEL[e.audience]}. Amorce : « ${e.opener} »`,
    ),
  ].join("\n");
}

/** Carte compacte de toutes les pages, pour le socle. */
export function compactSiteMap(): string {
  const seen = new Set<string>();
  const parts: string[] = [];
  for (const e of ALMA_SITE_KNOWLEDGE) {
    const id = `${e.label}|${e.path}`;
    if (seen.has(id)) continue;
    seen.add(id);
    parts.push(`${e.label} (${e.path})`);
  }
  return parts.join(", ");
}
