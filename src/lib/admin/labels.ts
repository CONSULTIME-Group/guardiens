/**
 * Lot A11 : dictionnaire unique des libellés de l'espace admin.
 * Toute clé technique affichée à l'écran passe par `adminLabel`, qui ne
 * renvoie jamais la clé brute : une clé inconnue devient une phrase lisible.
 */

export const EMPTY_TABLE_VALUE = "·";
export const EMPTY_FIELD_VALUE = "Non renseigné";

type Dict = Record<string, string>;

export const SIT_STATUS_LABELS: Dict = {
  draft: "Brouillon",
  published: "Publiée",
  confirmed: "Confirmée",
  in_progress: "En cours",
  completed: "Terminée",
  cancelled: "Annulée",
  archived: "Archivée",
  expired: "Expirée",
};

export const APPLICATION_STATUS_LABELS: Dict = {
  pending: "En attente",
  viewed: "Vue",
  discussing: "En discussion",
  accepted: "Acceptée",
  rejected: "Refusée",
  cancelled: "Annulée",
};

export const MISSION_STATUS_LABELS: Dict = {
  open: "Ouverte",
  in_progress: "En cours",
  completed: "Terminée",
  cancelled: "Annulée",
};

export const MISSION_RESPONSE_STATUS_LABELS: Dict = {
  pending: "En attente",
  accepted: "Acceptée",
  declined: "Déclinée",
  withdrawn: "Retirée",
};

export const REPORT_STATUS_LABELS: Dict = {
  new: "Nouveau",
  pending: "Non traité",
  in_progress: "En cours",
  resolved: "Traité",
  dismissed: "Classé sans suite",
};

export const REVIEW_STATUS_LABELS: Dict = {
  pending: "En attente",
  published: "Publié",
  approved: "Validé",
  rejected: "Refusé",
  hidden: "Masqué",
  en_attente: "En attente",
};

export const VERIFICATION_STATUS_LABELS: Dict = {
  not_submitted: "Non soumise",
  pending: "En attente",
  verified: "Vérifiée",
  rejected: "Refusée",
  needs_review: "À revoir",
};

export const ANALYSIS_REQUEST_STATUS_LABELS: Dict = {
  new: "Nouvelle",
  in_progress: "En cours",
  done: "Traitée",
  archived: "Archivée",
};

export const ANALYSIS_REQUEST_TYPE_LABELS: Dict = {
  city: "Ville",
  breed: "Race",
  places: "Lieux",
  other: "Autre",
};

export const ROLE_LABELS: Dict = {
  owner: "Propriétaire",
  sitter: "Gardien",
  both: "Propriétaire et gardien",
  admin: "Administrateur",
  moderator: "Modérateur",
  user: "Membre",
  pro_directory: "Annuaire des pros",
  pro: "Professionnel",
  competence: "Compétence",
};

export const CLOSE_REASON_LABELS: Dict = {
  daily_limit: "Limite quotidienne atteinte",
  below_threshold: "Sous le seuil (40 %)",
  too_few_criteria: "Moins de 3 critères communs",
  disqualified: "Disqualification (allergie, refus)",
  off_topic: "Hors sujet",
  rate_limited: "Trop de messages rapprochés",
  unsafe: "Contenu inapproprié",
  unknown: "Motif inconnu",
  no_hard_criterion: "Aucun critère bloquant déclaré",
  sitter_children_not_accepted: "Enfants non acceptés par le gardien",
  sitter_pets_not_accepted: "Animaux accompagnants non acceptés",
  species_refused: "Espèce refusée par le gardien",
  allergy: "Allergie déclarée",
  migrated_to_profile: "Transférée vers le profil",
  auto_completed_after_date: "Clôturée après la date",
  expired: "Expirée",
  cancelled_by_owner: "Annulée par le propriétaire",
  found_elsewhere: "Solution trouvée ailleurs",
  other: "Autre motif",
};

export const SURFACE_LABELS: Dict = {
  owner_dashboard: "Tableau de bord propriétaire",
  sitter_dashboard: "Tableau de bord gardien",
  search_listing: "Recherche d'annonces",
  search_sitters: "Recherche de gardiens",
  sit_detail: "Fiche d'annonce",
  sit_detail_alma: "Fiche d'annonce, encart Alma",
  applications: "Candidatures reçues",
  public_profile: "Profil public",
  messages: "Messagerie",
};

export const CONVERSATION_CONTEXT_LABELS: Dict = {
  sit_application: "Candidature",
  sitter_inquiry: "Question à un gardien",
  mission_help: "Aide entraide",
  owner_pitch: "Proposition à un propriétaire",
  helper_inquiry: "Question à un membre entraide",
};

export const ALMA_FACT_TYPE_LABELS: Dict = {
  breed: "Race",
  species: "Espèce",
  city: "Ville",
  culture: "Culture",
  history: "Histoire",
  season: "Saison",
  tip: "Conseil",
};

export const ALMA_REGISTER_LABELS: Dict = {
  warm: "Chaleureux",
  playful: "Enjoué",
  calm: "Posé",
  informative: "Informatif",
  encouraging: "Encourageant",
};

export const ALMA_FREQUENCY_LABELS: Dict = {
  silent: "Silencieuse",
  low: "Discrète",
  balanced: "Équilibrée",
  talkative: "Bavarde",
};

export const ERROR_SEVERITY_LABELS: Dict = {
  critical: "Critique",
  error: "Erreur",
  warning: "Alerte",
  info: "Information",
  low: "Faible",
  medium: "Moyenne",
  high: "Haute",
};

export const CRON_STATUS_LABELS: Dict = {
  ok: "Normal",
  degraded: "Ralenti",
  critical: "En panne",
  succeeded: "Réussi",
  failed: "Échoué",
  running: "En cours",
};

export const EMAIL_STATUS_LABELS: Dict = {
  pending: "En attente",
  sent: "Envoyé",
  failed: "Échoué",
  dlq: "Abandonné après essais",
  expired: "Expiré",
  deferred: "Différé",
  suppressed: "Bloqué (liste de suppression)",
  bounced: "Rejeté",
  cancelled: "Annulé",
  unsubscribed_category: "Désabonné de cette catégorie",
  delivered: "Livré",
  opened: "Ouvert",
  clicked: "Cliqué",
  complained: "Plainte spam",
};

export const AUDIT_ACTION_LABELS: Dict = {
  suspend_user: "Suspension de compte",
  unsuspend_user: "Levée de suspension",
  delete_user: "Suppression de compte",
  change_role: "Changement de rôle",
  verify_identity: "Vérification d'identité",
  reject_identity: "Refus d'identité",
  moderate_report: "Traitement de signalement",
  delete_listing: "Suppression d'annonce",
  resolve_dispute: "Traitement de contestation",
  send_message: "Message envoyé",
  unblock_email: "Déblocage d'adresse",
  small_mission_hide: "Masquage d'une demande d'entraide",
  small_mission_delete: "Suppression d'une demande d'entraide",
  hide_duplicate_mission: "Masquage d'un doublon d'entraide",
  gdpr_account_erasure: "Effacement de compte (RGPD)",
  llm_refusal_cleanup: "Nettoyage des refus de l'assistant",
  content_ai_generate: "Génération de contenu assistée",
  content_ai_image_repatriate: "Rapatriement d'images générées",
  coordinate_backfill: "Complément des coordonnées",
  owner_notification_backfill: "Rattrapage des notifications propriétaires",
  email_apology_sent: "Email d'excuse envoyé",
  feature_flag_toggle: "Changement de réglage",
  setting_update: "Modification d'un paramètre",
};

export const AUDIT_ENTITY_LABELS: Dict = {
  small_mission: "Demande d'entraide",
  profiles_bulk: "Profils (lot)",
  profile: "Profil",
  application: "Candidature",
  breed: "Race",
  sit: "Annonce",
  review: "Avis",
  report: "Signalement",
  article: "Article",
  feature_flag: "Réglage",
  email: "Email",
  user: "Membre",
};

export const ARTICLE_CATEGORY_LABELS: Dict = {
  thematique: "Thématique",
  guide_ville: "Guide de ville",
  guide_central: "Guide central",
};

export const SPECIES_LABELS: Dict = {
  dog: "Chiens",
  cat: "Chats",
  horse: "Chevaux",
  bird: "Oiseaux",
  rodent: "Rongeurs",
  fish: "Poissons",
  reptile: "Reptiles",
  farm_animal: "Animaux de ferme",
  nac: "NAC",
};

export const SEGMENT_LABELS: Dict = {
  listing_proximity: "Annonces à proximité",
  owner_activation: "Activation des propriétaires",
  sitter_activation: "Activation des gardiens",
  reactivation: "Réactivation",
  mutual_aid: "Entraide",
  proximity: "Proximité",
  tous: "Tous les membres",
  proprios: "Propriétaires",
  gardiens: "Gardiens",
};

export const CAMPAIGN_LABELS: Dict = {
  listing_proximity: "Annonces à proximité",
  owner_activation: "Activation des propriétaires",
  entraide_ligne: "Phrase d'entraide",
  entraide_ligne_relance: "Relance de la phrase d'entraide",
  sitter_daily_digest: "Résumé quotidien gardiens",
  mission_daily_digest: "Résumé quotidien entraide",
  mutual_aid_weekly_digest: "Résumé hebdomadaire entraide",
  discover_mutual_aid: "Découverte de l'entraide",
  onboarding_j1: "Accueil, premier jour",
  seasonal_nurture: "Relance saisonnière",
  owner_no_sit: "Propriétaires sans annonce",
  partage_communaute: "Partage à la communauté",
  mission_nudge_feedback: "Relance retour d'entraide",
  mission_nudge_no_response: "Relance entraide sans réponse",
  dormant_sitter: "Gardiens inactifs",
};

export const EVENT_LABELS: Dict = {
  signup_started: "Inscription commencée",
  signup_form_viewed: "Formulaire d'inscription vu",
  signup_form_submitted: "Formulaire d'inscription envoyé",
  signup_form_blocked: "Formulaire d'inscription bloqué",
  signup_email_confirmed: "Email d'inscription confirmé",
  signup_failed: "Inscription échouée",
  signup_completed: "Inscription terminée",
  onboarding_completed: "Accueil terminé",
  first_login: "Première connexion",
  page_view: "Page vue",
  sit_viewed: "Annonce vue",
  sit_published: "Annonce publiée",
  application_sent: "Candidature envoyée",
  dashboard_star_seen: "Carte vedette vue",
  dashboard_star_cta_clicked: "Bouton de la carte vedette cliqué",
  alma_opened: "Alma ouverte",
  alma_bubble_shown: "Bulle d'Alma affichée",
  alma_bubble_clicked: "Bulle d'Alma cliquée",
};

export const PROFILE_FIELD_LABELS: Dict = {
  animal_types: "Espèces acceptées",
  work_during_sit: "Présence pendant la garde",
  availability_during: "Disponibilité pendant la garde",
  presence_expected: "Présence attendue",
  lifestyle: "Rythme et ambiance",
  life_pace: "Rythme de vie",
  has_vehicle: "Véhicule",
  has_license: "Permis de conduire",
  car_required: "Véhicule nécessaire",
  languages: "Langues",
  bio: "Présentation",
  avatar_url: "Photo de profil",
  postal_code: "Code postal",
  city: "Ville",
  identity_verified: "Identité vérifiée",
  profile_completion: "Complétion du profil",
  search_radius_km: "Rayon de recherche",
  interests: "Centres d'intérêt",
  competences: "Compétences",
  experience_years: "Années d'expérience",
  children_ok: "Enfants acceptés",
  sitter_pets_ok: "Animaux accompagnants",
  allergies: "Allergies",
  gallery: "Galerie",
  created_at: "Date d'inscription",
  last_seen_at: "Dernière visite",
};

export const SETTING_LABELS: Dict = {
  applies_since: "Date de bascule",
  flag_off: "Réglage désactivé",
  admin_dashboard_snapshot: "Synthèse du tableau de bord",
  admin_action_logs: "Journal d'audit",
  admin_signals_active: "Signaux du tableau de bord",
  admin_signal_city_seo_tension: "Signal de tension SEO par ville",
  affinity_min_common_criteria: "Affinité, critères communs minimum",
  affinity_min_score_percent: "Affinité, score minimum",
  close_orphan_emails: "Emails de clôture des candidatures orphelines",
  cp_relance_max: "Relances du code postal, maximum",
  mandatory_affinity_onboarding: "Questionnaire d'affinité obligatoire",
  species_filter_blocking: "Filtre d'espèces bloquant",
  enabled: "Activé",
  skipped: "Ignoré",
};

export const COLUMN_LABELS: Dict = {
  sit_id: "Annonce",
  user_id: "Membre",
  owner_id: "Propriétaire",
  sitter_id: "Gardien",
  mission_id: "Demande d'entraide",
  created_at: "Créé le",
  updated_at: "Modifié le",
  status: "Statut",
  count: "Nombre",
  surface: "Surface",
  species: "Espèce",
  role: "Rôle",
  season: "Saison",
  month: "Mois",
};

const ALL: Dict[] = [
  SIT_STATUS_LABELS, APPLICATION_STATUS_LABELS, MISSION_STATUS_LABELS, MISSION_RESPONSE_STATUS_LABELS,
  REPORT_STATUS_LABELS, REVIEW_STATUS_LABELS, VERIFICATION_STATUS_LABELS, ROLE_LABELS,
  CLOSE_REASON_LABELS, SURFACE_LABELS, CONVERSATION_CONTEXT_LABELS, ALMA_FACT_TYPE_LABELS,
  ALMA_REGISTER_LABELS, ALMA_FREQUENCY_LABELS, ERROR_SEVERITY_LABELS, CRON_STATUS_LABELS,
  EMAIL_STATUS_LABELS, AUDIT_ACTION_LABELS, ARTICLE_CATEGORY_LABELS, SPECIES_LABELS, SEGMENT_LABELS,
  AUDIT_ENTITY_LABELS, CAMPAIGN_LABELS, EVENT_LABELS, PROFILE_FIELD_LABELS, SETTING_LABELS, COLUMN_LABELS,
];

/** Rend lisible une clé inconnue : « no_hard_criterion » devient « No hard criterion ». */
export function humanizeKey(key: string): string {
  const s = key.replace(/[_\-.]+/g, " ").replace(/\s+/g, " ").trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : EMPTY_TABLE_VALUE;
}

/**
 * Libellé français d'une clé technique. Cherche d'abord dans le dictionnaire
 * indiqué, puis dans tous, puis humanise. Jamais de clé brute à l'écran.
 */
export function adminLabel(key: string | null | undefined, dict?: Dict): string {
  if (key === null || key === undefined || String(key).trim() === "") return EMPTY_TABLE_VALUE;
  const k = String(key).trim();
  const low = k.toLowerCase();
  if (dict) {
    if (dict[k]) return dict[k];
    if (dict[low]) return dict[low];
  }
  for (const d of ALL) {
    if (d[k]) return d[k];
    if (d[low]) return d[low];
  }
  warnUnknown(k);
  return humanizeKey(k);
}

const warned = new Set<string>();
function warnUnknown(k: string) {
  if (!import.meta.env?.DEV || import.meta.env?.MODE === "test" || warned.has(k)) return;
  warned.add(k);
  // eslint-disable-next-line no-console
  console.warn(`[admin/labels] clé sans libellé : ${k}`);
}

/** Libellés par famille : dictionnaire propre d'abord, puis repli commun. */
const family = (dict: Dict) => (key: string | null | undefined) => adminLabel(key, dict);
export const eventLabel = family(EVENT_LABELS);
export const reasonLabel = family(CLOSE_REASON_LABELS);
export const conversationTypeLabel = family(CONVERSATION_CONTEXT_LABELS);
export const profileFieldLabel = family(PROFILE_FIELD_LABELS);
export const segmentLabel = family(SEGMENT_LABELS);
export const campaignLabel = family(CAMPAIGN_LABELS);
export const settingLabel = family(SETTING_LABELS);
export const auditActionLabel = family(AUDIT_ACTION_LABELS);
export const auditEntityLabel = family(AUDIT_ENTITY_LABELS);
export const columnLabel = family(COLUMN_LABELS);

/** Valeur vide unique pour un tableau : « · ». */
export function cellValue(v: unknown): string {
  if (v === null || v === undefined) return EMPTY_TABLE_VALUE;
  const s = String(v).trim();
  if (s === "" || s === "," || s === "\u2014" || s === "\u2013" || s === "-") return EMPTY_TABLE_VALUE;
  return s;
}

/** Valeur vide unique pour une fiche : « Non renseigné ». */
export function fieldValue(v: unknown): string {
  const c = cellValue(v);
  return c === EMPTY_TABLE_VALUE ? EMPTY_FIELD_VALUE : c;
}

/** Nom d'un membre renvoyé par une RPC : un tiret seul devient « Membre ». */
export function memberName(v: string | null | undefined): string {
  const c = cellValue(v);
  return c === EMPTY_TABLE_VALUE ? "Membre" : c;
}

const WORDS: Array<[RegExp, string]> = [
  [/\bDigests?\b/g, "Résumé quotidien"],
  [/\bdigests?\b/g, "résumé quotidien"],
  [/\bFeedback\b/g, "Retour"],
  [/\bfeedback\b/g, "retour"],
  [/\bBounces?\b/g, "Rebond"],
  [/\bbounces?\b/g, "rebond"],
  [/\bFunnel\b/g, "Entonnoir"],
  [/\bfunnel\b/g, "entonnoir"],
  [/\bCTA\b/g, "bouton d'action"],
];

/** Texte venu de la base (nom de tâche, sujet prérempli) : mots anglais traduits. */
export function displayText(v: string | null | undefined): string {
  const c = cellValue(v);
  if (c === EMPTY_TABLE_VALUE) return c;
  const translated = WORDS.reduce((acc, [re, fr]) => acc.replace(re, fr), c);
  // Clés techniques glissées dans un texte (« dont animal_types est vide ») :
  // remplacées par leur libellé, en minuscule, entre guillemets français.
  return translated.replace(/\b[a-z]+(?:_[a-z0-9]+)+\b/g, (k) => {
    const l = adminLabel(k);
    return `« ${l.charAt(0).toLocaleLowerCase("fr-FR")}${l.slice(1)} »`;
  });
}
