/**
 * Lot Z : types de notification réellement créés (base, triggers, fonctions
 * edge, écrans admin), leur pastille de couleur dans la cloche et la page
 * /notifications, et leur famille pour le résumé d'Alma.
 *
 * Source : SELECT type, count(*) FROM notifications (60 jours, 13/10/2026),
 * complétée par les créateurs encore actifs (pg_proc, supabase/functions,
 * src/pages/admin). Un type absent retombe sur « muted » et « other ».
 */

export type NotificationTone = "success" | "info" | "warning" | "destructive" | "muted";

/**
 * Familles lues par Alma :
 * - applications : candidatures de garde et propositions d'aide à trier ou suivre ;
 * - messages : messages et réponses reçues ;
 * - social : avis, reconnaissance, vérifications réussies ;
 * - garde : vie d'une garde (rappels, accord, début, fin) ;
 * - entraide : besoins proches, vie d'un besoin ;
 * - annonces : nouvelles annonces proches ;
 * - compte : vérification d'identité, modération, informations de l'équipe.
 */
export type NotificationCategory =
  | "applications"
  | "messages"
  | "social"
  | "garde"
  | "entraide"
  | "annonces"
  | "compte"
  | "other";

export interface NotificationKind {
  tone: NotificationTone;
  category: NotificationCategory;
}

export const NOTIFICATION_KINDS: Readonly<Record<string, NotificationKind>> = {
  // Candidatures de garde
  new_application: { tone: "info", category: "applications" },
  application_accepted: { tone: "success", category: "applications" },
  application_rejected: { tone: "warning", category: "applications" },
  application_cancelled: { tone: "muted", category: "applications" },
  application_closed: { tone: "muted", category: "applications" },
  application_reopened: { tone: "info", category: "applications" },
  long_stay_application_rejected: { tone: "warning", category: "applications" },
  long_stay_application_cancelled: { tone: "muted", category: "applications" },
  sit_invitation: { tone: "info", category: "applications" },
  reinvitation: { tone: "info", category: "applications" },
  sit_proposal_declined: { tone: "muted", category: "applications" },
  sit_proposal_closed: { tone: "muted", category: "applications" },

  // Propositions d'aide (entraide) à trier
  mission_response_received: { tone: "info", category: "applications" },
  mission_accepted: { tone: "success", category: "applications" },
  mission_declined: { tone: "muted", category: "applications" },
  mission_invitation: { tone: "info", category: "applications" },

  // Messages
  new_message: { tone: "info", category: "messages" },
  question_answer_received: { tone: "info", category: "messages" },

  // Garde
  sit_confirmed: { tone: "success", category: "garde" },
  sit_started: { tone: "success", category: "garde" },
  sit_completed: { tone: "success", category: "garde" },
  sit_cancelled: { tone: "destructive", category: "garde" },
  sit_unconfirmed: { tone: "warning", category: "garde" },
  sit_expired: { tone: "muted", category: "garde" },
  sit_republished: { tone: "info", category: "garde" },
  // Lot Z2 : nouvelles dates d'une garde confirmée ou en cours (trigger serveur).
  sit_dates_changed: { tone: "warning", category: "garde" },
  reminder_7days: { tone: "info", category: "garde" },
  reminder_48h: { tone: "warning", category: "garde" },
  review_reminder_j1: { tone: "info", category: "garde" },
  review_reminder_j5: { tone: "info", category: "garde" },
  accord_ready_for_sitter: { tone: "info", category: "garde" },
  accord_signed_both: { tone: "success", category: "garde" },
  emergency_alert: { tone: "destructive", category: "garde" },

  // Annonces proches
  new_sit_nearby: { tone: "info", category: "annonces" },

  // Entraide, vie d'un besoin
  mission_help_needed: { tone: "info", category: "entraide" },
  mission_wave_relaunch: { tone: "info", category: "entraide" },
  mission_wave_empty: { tone: "muted", category: "entraide" },
  mission_cancelled: { tone: "muted", category: "entraide" },
  mission_completed: { tone: "success", category: "entraide" },
  mission_auto_closed: { tone: "muted", category: "entraide" },
  mission_auto_completed: { tone: "success", category: "entraide" },
  mission_place_missing: { tone: "warning", category: "entraide" },
  mission_meetup_prompt: { tone: "info", category: "entraide" },
  mission_response_withdrawn: { tone: "muted", category: "entraide" },

  // Social
  review_published: { tone: "info", category: "social" },
  mission_feedback_received: { tone: "success", category: "social" },
  mission_thanks_received: { tone: "success", category: "social" },
  mission_first_help_badge: { tone: "success", category: "social" },
  identity_verified: { tone: "success", category: "social" },
  experience_verified: { tone: "success", category: "social" },

  // Compte, modération, équipe
  identity_pending: { tone: "info", category: "compte" },
  identity_rejected: { tone: "warning", category: "compte" },
  identity_remind_complete: { tone: "info", category: "compte" },
  identity_remind_review: { tone: "info", category: "compte" },
  identity_resend_request: { tone: "warning", category: "compte" },
  experience_rejected: { tone: "warning", category: "compte" },
  experience_complement: { tone: "info", category: "compte" },
  review_dispute: { tone: "warning", category: "compte" },
  dispute_resolved: { tone: "info", category: "compte" },
  listing_hidden: { tone: "warning", category: "compte" },
  listing_deleted: { tone: "destructive", category: "compte" },
  admin_contact: { tone: "info", category: "compte" },
  subscription_offered: { tone: "success", category: "compte" },
  info: { tone: "muted", category: "compte" },
};

/**
 * Notifications qui attendent une réponse du membre : une candidature reçue,
 * une proposition d'aide reçue, une aide acceptée, un message.
 */
export const URGENT_NOTIFICATION_TYPES: ReadonlySet<string> = new Set([
  "new_application",
  "mission_response_received",
  "mission_accepted",
  "new_message",
]);

export function notificationTone(type: string): NotificationTone {
  return NOTIFICATION_KINDS[type]?.tone ?? "muted";
}

export function notificationCategory(type: string): NotificationCategory {
  return NOTIFICATION_KINDS[type]?.category ?? "other";
}

export function isUrgentNotification(type: string): boolean {
  return URGENT_NOTIFICATION_TYPES.has(type);
}
