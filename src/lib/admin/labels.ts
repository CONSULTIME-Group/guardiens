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
};

export const CLOSE_REASON_LABELS: Dict = {
  daily_limit: "Limite quotidienne atteinte",
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
};

const ALL: Dict[] = [
  SIT_STATUS_LABELS, APPLICATION_STATUS_LABELS, MISSION_STATUS_LABELS, MISSION_RESPONSE_STATUS_LABELS,
  REPORT_STATUS_LABELS, REVIEW_STATUS_LABELS, VERIFICATION_STATUS_LABELS, ROLE_LABELS,
  CLOSE_REASON_LABELS, SURFACE_LABELS, CONVERSATION_CONTEXT_LABELS, ALMA_FACT_TYPE_LABELS,
  ALMA_REGISTER_LABELS, ALMA_FREQUENCY_LABELS, ERROR_SEVERITY_LABELS, CRON_STATUS_LABELS,
  EMAIL_STATUS_LABELS, AUDIT_ACTION_LABELS, ARTICLE_CATEGORY_LABELS, SPECIES_LABELS, SEGMENT_LABELS,
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
  return humanizeKey(k);
}

/** Valeur vide unique pour un tableau : « · ». */
export function cellValue(v: unknown): string {
  if (v === null || v === undefined) return EMPTY_TABLE_VALUE;
  const s = String(v).trim();
  if (s === "" || s === "," || s === "—" || s === "–" || s === "-") return EMPTY_TABLE_VALUE;
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
