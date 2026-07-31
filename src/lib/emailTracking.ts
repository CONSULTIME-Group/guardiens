/**
 * Bornes et exclusions pour les statistiques d'engagement email.
 *
 * Pourquoi une borne basse : le webhook Resend n'a commencé à remonter les
 * événements (delivered, opened, clicked, bounced, complained) que le
 * 22 juillet 2026. Tout envoi antérieur existe en base sans aucune donnée de
 * livraison, non parce qu'il n'a pas été délivré, mais parce que personne
 * n'écoutait. Les inclure écrase mécaniquement le taux de livraison affiché
 * (32 % observé, contre 99,8 % réels sur la période instrumentée) et conduit
 * à un mauvais diagnostic. On refuse donc de calculer un taux sur cette zone
 * aveugle.
 */
export const EMAIL_TRACKING_START = new Date("2026-07-22T00:00:00.000Z");

/**
 * Templates non instrumentés : les emails d'authentification transitent par le
 * hook auth et la file auth_emails, sans passage par le tuyau qui enregistre le
 * resend_id. Aucun événement webhook ne peut donc leur être rattaché. Ils sont
 * exclus des taux et comptés à part, pour ne jamais être confondus avec des
 * non-délivrances.
 */
export const UNINSTRUMENTED_TEMPLATES = [
  "signup",
  "magiclink",
  "recovery",
  "invite",
  "email_change",
  "reauthentication",
  "auth_emails",
] as const;

export function isUninstrumentedTemplate(template: string | null | undefined): boolean {
  if (!template) return false;
  return (UNINSTRUMENTED_TEMPLATES as readonly string[]).includes(template);
}

/** Retourne la borne de début effective, jamais antérieure à la mise en service du webhook. */
export function clampToTrackingStart(start: Date): Date {
  return start < EMAIL_TRACKING_START ? EMAIL_TRACKING_START : start;
}
