/**
 * Lot ADM12 (arène admin du 09/11/2026) : issue d'une étape de nurturing.
 *
 * Une étape non envoyée n'est pas forcément un échec : le plafond de
 * fréquence, une catégorie désactivée par le membre, une adresse bloquée, un
 * compte suspendu ou une condition de saut sont des écarts voulus. Seul un
 * vrai échec (envoi refusé, modèle introuvable, erreur d'évaluation, adresse
 * absente) compte en échec et peut allumer un voyant.
 */
export type NurturingOutcome = "sent" | "exited" | "skipped" | "failed";

/** Écarts voulus : jamais comptés en échec. */
export const VOLUNTARY_SKIP_REASONS: ReadonlySet<string> = new Set([
  "frequency_capped",
  "skip_condition_met",
  "skipped_unsubscribed_category",
  "skipped_email_suppressed",
  "skipped_account_suspended",
  "skipped_ttl_exceeded",
  "user_unsubscribed",
  "already_sent_other_path",
  "owner_never_published",
]);

/** Motifs de saut écrits par evaluate-journeys et journey-defer (préfixe « skipped_ »). */
export const VOLUNTARY_SKIP_PREFIX = "skipped_";

export function nurturingOutcome(l: { sent: boolean; reason: string | null | undefined }): NurturingOutcome {
  if (l.sent) return "sent";
  if (l.reason === "exit_condition_met") return "exited";
  if (l.reason && (VOLUNTARY_SKIP_REASONS.has(l.reason) || l.reason.startsWith(VOLUNTARY_SKIP_PREFIX))) return "skipped";
  return "failed";
}

export function isNurturingFailure(l: { sent: boolean; reason: string | null | undefined }): boolean {
  return nurturingOutcome(l) === "failed";
}

/** Libellés français des motifs (affichés à la place de l'identifiant). */
export const NURTURING_REASON_LABELS: Record<string, string> = {
  exit_condition_met: "Objectif atteint (sortie normale)",
  frequency_capped: "Reporté par le plafond de fréquence",
  skip_condition_met: "Étape sautée (condition remplie)",
  skipped_unsubscribed_category: "Catégorie désactivée par le membre",
  skipped_email_suppressed: "Adresse bloquée",
  skipped_account_suspended: "Compte suspendu",
  skipped_ttl_exceeded: "Envoi trop tardif, annulé",
  eval_error: "Erreur d'évaluation",
  no_email: "Pas d'adresse email",
  send_failed_400: "Erreur 400 à l'envoi",
  send_failed_500: "Erreur 500 à l'envoi",
  send_failed: "Échec d'envoi",
  template_not_found: "Modèle introuvable",
  user_unsubscribed: "Désinscrit",
  user_not_found: "Utilisateur introuvable",
  already_sent_other_path: "Déjà envoyé par une autre voie",
  owner_never_published: "Propriétaire sans annonce publiée",
  unknown: "Raison inconnue",
};

export function nurturingReasonLabel(reason: string | null | undefined): string {
  if (!reason) return NURTURING_REASON_LABELS.unknown;
  if (NURTURING_REASON_LABELS[reason]) return NURTURING_REASON_LABELS[reason];
  if (reason.startsWith("send_transient_failure")) return "Échec passager à l'envoi";
  if (reason.startsWith("send_failed")) return "Échec d'envoi";
  if (reason.startsWith(VOLUNTARY_SKIP_PREFIX)) return "Étape sautée";
  return "Autre motif";
}
