/**
 * La page du jour d'Alma, générateur déterministe (lot Y).
 *
 * Alma n'attend plus la question : à l'ouverture du panneau elle a déjà écrit
 * ce qu'elle a remarqué sur le dossier. Aucune génération par modèle, aucune
 * requête ici : la fonction est pure, les faits lui sont fournis.
 *
 * Verrous produit, non négociables :
 *  - Alma ne compte jamais l'absence de la personne, seulement les jours d'une
 *    annonce ou d'une candidature.
 *  - Aucune culpabilisation, on dit ce qui est.
 *  - Ses envies sont des offres sans échéance.
 *  - Elle ne réclame jamais rien pour elle.
 *  - Jamais de fausse entrée pour remplir : deux à quatre entrées, ou rien.
 */

export const ALMA_JOURNAL_RULE_KEYS = [
  "candidatures_non_lues",
  "photos_logement",
  "annonce_sans_candidature",
  "alentours",
  "annonce_brouillon",
  "profil",
  "candidature_en_attente",
  "profil_gardien",
  "envie_benevolat",
] as const;

export type AlmaJournalRuleKey = (typeof ALMA_JOURNAL_RULE_KEYS)[number];

export interface AlmaJournalAction {
  /** Nom de section tel qu'il est écrit dans le menu. Jamais un chemin. */
  label: string;
  href: string;
}

export interface AlmaJournalEntry {
  ruleKey: AlmaJournalRuleKey;
  /** Label de type affiché en majuscules au dessus de l'entrée. */
  typeLabel: string;
  text: string;
  action: AlmaJournalAction | null;
}

export interface AlmaJournalInvitation {
  question: string;
  replies: string[];
}

export interface AlmaJournalPage {
  entries: AlmaJournalEntry[];
  invitation: AlmaJournalInvitation | null;
}

export interface AlmaJournalFacts {
  activeRole: "owner" | "sitter";
  /** Candidatures reçues jamais ouvertes. */
  unreadApplications?: number;
  /** Nombre de photos du logement rattaché à une annonce. */
  propertyPhotoCount?: number | null;
  /** Jours depuis la publication d'une annonce restée sans candidature. */
  publishedSitWithoutApplicationDays?: number | null;
  /** Longueur du texte des alentours du logement. */
  regionHighlightsLength?: number | null;
  /** Jour de la semaine du dépôt du brouillon, quand il dort depuis plus de trois jours. */
  draftSitWeekday?: string | null;
  /** Premier élément manquant du barème de complétion du rôle actif. */
  topMissing?: { label: string; points: number; href: string } | null;
  /** Candidature envoyée, toujours en attente depuis plus de cinq jours. */
  pendingApplication?: { city: string | null; days: number } | null;
  /** Association publiée dans le département, si la déclaration de bénévolat manque. */
  association?: { name: string; slug: string } | null;
  /** Règles déjà montrées dans les trois derniers jours. */
  shownRecently?: AlmaJournalRuleKey[];
  /** Règles dont l'action a été suivie. */
  actedKeys?: AlmaJournalRuleKey[];
  /** Nombre de fois où l'envie a été montrée sans suite. */
  envieIgnoredCount?: number;
  /** Jours depuis la dernière apparition de l'envie. */
  envieDaysSinceLastShown?: number | null;
  /** Graine de variation des formulations, stable sur la journée. */
  variantSeed?: number;
}

const MAX_ENTRIES = 4;

/** Trois formulations par règle, pour que la même observation change de mots. */
type Writer = (facts: AlmaJournalFacts) => string[];

const plural = (n: number, one: string, many: string) => (n > 1 ? many : one);

const NUMBER_WORDS = [
  "Aucune",
  "Une",
  "Deux",
  "Trois",
  "Quatre",
  "Cinq",
  "Six",
  "Sept",
  "Huit",
  "Neuf",
  "Dix",
];

const spell = (n: number): string => (n < NUMBER_WORDS.length ? NUMBER_WORDS[n] : String(n));

const WRITERS: Record<AlmaJournalRuleKey, Writer> = {
  candidatures_non_lues: (f) => {
    const n = f.unreadApplications ?? 0;
    const attend = plural(n, "attend", "attendent");
    const lue = plural(n, "candidature", "candidatures");
    return [
      `${spell(n)} ${lue} ${attend} que vous les ouvriez.`,
      `${spell(n)} ${lue} ${plural(n, "est arrivée", "sont arrivées")} et ${plural(n, "reste fermée", "restent fermées")}.`,
      `Vous avez ${spell(n).toLocaleLowerCase("fr-FR")} ${lue} à découvrir.`,
    ];
  },
  photos_logement: () => [
    "Personne ne sait encore à quoi ressemble votre salon. C'est chez vous qu'un gardien va vivre, il aimerait voir la pièce de vie, et les alentours où il se promènera.",
    "Votre logement se devine sans se voir. Une pièce de vie, une chambre, la vue depuis la porte, et le tableau se complète.",
    "Un gardien choisit une maison autant qu'une garde. Quelques photos de la pièce de vie et des alentours suffisent à la rendre réelle.",
  ],
  annonce_sans_candidature: (f) => {
    const d = f.publishedSitWithoutApplicationDays ?? 0;
    return [
      `Votre annonce est en ligne depuis ${spell(d).toLocaleLowerCase("fr-FR")} jours et personne n'a encore écrit.`,
      `${spell(d)} jours en ligne, et votre annonce attend toujours sa première candidature.`,
      `Votre annonce vit sa ${spell(d).toLocaleLowerCase("fr-FR")}ème journée en ligne, sans candidature pour l'instant.`,
    ];
  },
  alentours: () => [
    "Vos alentours ne sont racontés nulle part. Deux lignes sur les balades et le village, et un gardien sait où il arrive.",
    "On lit votre annonce sans savoir ce qu'il y a autour. Les chemins, le marché, le café du coin, cela se raconte en deux lignes.",
    "Ce qui entoure votre maison reste invisible. Une balade préférée et le nom du village en disent déjà beaucoup.",
  ],
  annonce_brouillon: (f) => {
    const day = f.draftSitWeekday ?? "";
    return [
      `Votre annonce dort en brouillon depuis ${day}.`,
      `Un brouillon d'annonce vous attend, il date de ${day}.`,
      `Votre annonce est écrite depuis ${day} et reste en brouillon.`,
    ];
  },
  profil: (f) => profilLines(f),
  candidature_en_attente: (f) => {
    const p = f.pendingApplication;
    const days = p?.days ?? 0;
    const where = p?.city ? `pour la garde à ${p.city}` : "pour une garde";
    return [
      `Votre candidature ${where} attend depuis ${spell(days).toLocaleLowerCase("fr-FR")} jours.`,
      `${spell(days)} jours que votre candidature ${where} est posée, sans réponse pour l'instant.`,
      `La personne qui a reçu votre candidature ${where} ne l'a pas encore traitée, cela fait ${spell(days).toLocaleLowerCase("fr-FR")} jours.`,
    ];
  },
  profil_gardien: (f) => profilLines(f),
  envie_benevolat: (f) => {
    const name = f.association?.name ?? "un refuge";
    return [
      `Il y a ${name} à vingt minutes de chez vous. J'irais bien voir, même de loin.`,
      `${name} existe tout près. J'aime savoir que ces endroits sont là.`,
      `${name} accueille des animaux dans votre département. Je regarde leur page de temps en temps.`,
    ];
  },
};

function profilLines(f: AlmaJournalFacts): string[] {
  const label = (f.topMissing?.label ?? "").toLocaleLowerCase("fr-FR");
  const points = f.topMissing?.points ?? 0;
  return [
    `Il ne vous manque que ${label}. ${spell(points)} points, et vous êtes au bout.`,
    `${spell(points)} points vous séparent du profil complet, il s'agit de ${label}.`,
    `Votre profil tient debout, ${label} reste à renseigner pour ${spell(points).toLocaleLowerCase("fr-FR")} points.`,
  ];
}

const TYPE_LABELS: Record<AlmaJournalRuleKey, string> = {
  candidatures_non_lues: "CANDIDATURES REÇUES",
  photos_logement: "VOTRE LOGEMENT",
  annonce_sans_candidature: "VOTRE ANNONCE",
  alentours: "LES ALENTOURS",
  annonce_brouillon: "VOTRE BROUILLON",
  profil: "VOTRE PROFIL",
  candidature_en_attente: "VOTRE CANDIDATURE",
  profil_gardien: "VOTRE PROFIL",
  envie_benevolat: "UNE ENVIE D'ALMA",
};

const INVITATIONS: Record<AlmaJournalRuleKey, AlmaJournalInvitation> = {
  candidatures_non_lues: {
    question: "Vous voulez que je vous dise qui a écrit ?",
    replies: ["Oui, résumez moi", "J'y vais moi même"],
  },
  photos_logement: {
    question: "Vous avez des photos quelque part, ou il faut les faire ?",
    replies: ["J'en ai, je les ajoute", "Il faut que je les prenne", "Montrez moi ce qui manque"],
  },
  annonce_sans_candidature: {
    question: "Vous voulez qu'on regarde ensemble ce qui retient les candidats ?",
    replies: ["Oui, regardons", "Relisez mon annonce", "Je préfère attendre"],
  },
  alentours: {
    question: "Vous me racontez vos alentours, et j'en fais deux lignes ?",
    replies: ["Je vous raconte", "Proposez moi un texte", "Je l'écris moi même"],
  },
  annonce_brouillon: {
    question: "On reprend ce brouillon ensemble ?",
    replies: ["Oui, reprenons", "Dites moi ce qui manque", "Plus tard"],
  },
  profil: {
    question: "Je vous accompagne, ou vous préférez le faire seul ?",
    replies: ["Accompagnez moi", "Je m'en occupe"],
  },
  profil_gardien: {
    question: "Je vous accompagne, ou vous préférez le faire seul ?",
    replies: ["Accompagnez moi", "Je m'en occupe"],
  },
  candidature_en_attente: {
    question: "Vous voulez que je vous aide à relancer ?",
    replies: ["Aidez moi à relancer", "Je patiente encore"],
  },
  envie_benevolat: {
    question: "Cela vous dit d'en savoir plus sur ce refuge ?",
    replies: ["Racontez moi", "Une autre fois"],
  },
};

const OWNER_ORDER: AlmaJournalRuleKey[] = [
  "candidatures_non_lues",
  "photos_logement",
  "annonce_sans_candidature",
  "alentours",
  "annonce_brouillon",
  "profil",
];

const SITTER_ORDER: AlmaJournalRuleKey[] = ["candidature_en_attente", "profil_gardien"];

/** La règle s'applique-t-elle au dossier fourni. */
function applies(ruleKey: AlmaJournalRuleKey, f: AlmaJournalFacts): boolean {
  switch (ruleKey) {
    case "candidatures_non_lues":
      return (f.unreadApplications ?? 0) > 0;
    case "photos_logement":
      return f.propertyPhotoCount !== null && f.propertyPhotoCount !== undefined && f.propertyPhotoCount < 3;
    case "annonce_sans_candidature":
      return (f.publishedSitWithoutApplicationDays ?? 0) > 7;
    case "alentours":
      return f.regionHighlightsLength !== null && f.regionHighlightsLength !== undefined && f.regionHighlightsLength < 30;
    case "annonce_brouillon":
      return !!f.draftSitWeekday;
    case "profil":
    case "profil_gardien":
      return !!f.topMissing;
    case "candidature_en_attente":
      return !!f.pendingApplication && f.pendingApplication.days > 5;
    case "envie_benevolat":
      return !!f.association;
    default:
      return false;
  }
}

function actionFor(ruleKey: AlmaJournalRuleKey, f: AlmaJournalFacts): AlmaJournalAction | null {
  switch (ruleKey) {
    case "candidatures_non_lues":
    case "photos_logement":
    case "annonce_sans_candidature":
    case "alentours":
    case "annonce_brouillon":
      return { label: "Mes annonces", href: "/sits" };
    case "candidature_en_attente":
      return { label: "Mes candidatures", href: "/mes-candidatures" };
    case "profil":
      return { label: "Mon profil propriétaire", href: f.topMissing?.href ?? "/owner-profile" };
    case "profil_gardien":
      return { label: "Mon profil gardien", href: f.topMissing?.href ?? "/profile" };
    case "envie_benevolat":
      return f.association
        ? { label: f.association.name, href: `/associations/${f.association.slug}` }
        : null;
    default:
      return null;
  }
}

/** L'envie revient au plus tôt un mois après deux passages sans suite. */
function envieAllowed(f: AlmaJournalFacts): boolean {
  if ((f.envieIgnoredCount ?? 0) < 2) return true;
  const days = f.envieDaysSinceLastShown;
  return days !== null && days !== undefined && days >= 30;
}

function buildEntry(ruleKey: AlmaJournalRuleKey, f: AlmaJournalFacts): AlmaJournalEntry {
  const lines = WRITERS[ruleKey](f);
  const seed = Math.abs(Math.trunc(f.variantSeed ?? 0));
  return {
    ruleKey,
    typeLabel: TYPE_LABELS[ruleKey],
    text: lines[seed % lines.length],
    action: actionFor(ruleKey, f),
  };
}

/** Deux à quatre entrées, classées par utilité décroissante, ou rien. */
export function buildAlmaJournal(facts: AlmaJournalFacts): AlmaJournalPage {
  const order = facts.activeRole === "owner" ? OWNER_ORDER : SITTER_ORDER;
  const acted = new Set(facts.actedKeys ?? []);
  const recent = new Set(facts.shownRecently ?? []);

  const candidates = order.filter((key) => applies(key, facts) && !acted.has(key));
  const fresh = candidates.filter((key) => !recent.has(key));
  // Une règle vue récemment ne ressort que si rien d'autre ne s'applique.
  let keys = fresh.length > 0 ? fresh : candidates;
  keys = keys.slice(0, MAX_ENTRIES);

  if (
    keys.length < MAX_ENTRIES &&
    applies("envie_benevolat", facts) &&
    !acted.has("envie_benevolat") &&
    envieAllowed(facts) &&
    (!recent.has("envie_benevolat") || keys.length === 0)
  ) {
    keys = [...keys, "envie_benevolat"];
  }

  const entries = keys.map((key) => buildEntry(key, facts));
  const invitation = entries.length > 0 ? INVITATIONS[entries[0].ruleKey] : null;
  return { entries, invitation };
}
