// Garde de statut d'annonce pour les emails d'alerte de proximité.
//
// Entre l'enfilement d'une alerte et son expédition il peut s'écouler plus de
// 24 h (report par le plafond de fréquence, heures calmes, file différée).
// Une annonce annulée, archivée ou repassée en brouillon ne doit plus produire
// d'email : le contrôle se fait au moment de l'envoi, pas seulement à l'enqueue.

/** Templates dont l'envoi dépend d'une annonce encore publiée. */
export const SIT_STATUS_GUARDED_TEMPLATES = new Set<string>([
  "nearby-sit-alert",
]);

export const PUBLISHED_STATUS = "published";

export interface SitAlertGuardResult {
  block: boolean;
  reason: string | null;
}

export function isSitStatusGuardedTemplate(templateName: string): boolean {
  return SIT_STATUS_GUARDED_TEMPLATES.has(templateName);
}

/**
 * Décide si un email d'alerte doit être abandonné au vu du statut relu en base.
 * `status` vaut null quand l'annonce a disparu.
 */
export function evaluateSitAlert(
  templateName: string,
  status: string | null | undefined,
): SitAlertGuardResult {
  if (!isSitStatusGuardedTemplate(templateName)) {
    return { block: false, reason: null };
  }
  if (status == null) {
    return { block: true, reason: "annonce introuvable au moment de l'envoi" };
  }
  if (status !== PUBLISHED_STATUS) {
    return {
      block: true,
      reason: `annonce non publiée au moment de l'envoi (statut: ${status})`,
    };
  }
  return { block: false, reason: null };
}
