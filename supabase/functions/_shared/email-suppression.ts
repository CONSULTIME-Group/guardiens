// Source de vérité partagée pour la liste de suppression (`suppressed_emails`).
//
// 1. SUPPRESSION_REASONS reflète exactement la contrainte
//    `suppressed_emails_reason_check` en base. Tout motif écrit par le code
//    doit y figurer, sinon l'insertion échoue silencieusement.
// 2. SUPPRESSION_BYPASS_TEMPLATES est la liste blanche des templates légaux
//    qui franchissent la liste de suppression. Voir docs/email-frequency-cap.md.

export const SUPPRESSION_REASONS = [
  'unsubscribe',
  'bounce',
  'complaint',
  'account_deleted',
] as const

export type SuppressionReason = typeof SUPPRESSION_REASONS[number]

/**
 * Templates envoyés même à une adresse présente dans `suppressed_emails`.
 *
 * Justification : ces deux emails servent l'exercice des droits de la personne
 * (accusé de traitement RGPD, lien de désinscription et de préférences). Les
 * bloquer irait contre l'objectif même de la liste de suppression et priverait
 * la personne de la preuve de traitement attendue par la CNIL.
 *
 * NE JAMAIS y ajouter un email produit, digest, alerte ou marketing.
 */
export const SUPPRESSION_BYPASS_TEMPLATES: ReadonlySet<string> = new Set([
  'account-deleted',
  'unsubscribe-link',
])

export function bypassesSuppression(templateName: string): boolean {
  return SUPPRESSION_BYPASS_TEMPLATES.has(templateName)
}
