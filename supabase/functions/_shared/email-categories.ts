// Email category mapping — shared between the sender and the preferences UI.
// 4 categories:
//   - 'transactional' : critical service emails, ALWAYS sent (no opt-out, only global suppression)
//   - 'product'       : nurturing, tips, activation, profile/listing reminders (opt-out OK)
//   - 'digest'        : periodic recaps (opt-out OK)
//   - 'alert'         : new-listing alerts based on user-defined zones (opt-out OK)
//
// CONFORMITÉ : tout template NON listé ci-dessous retombe désormais en 'product'
// (donc AVEC lien de désinscription et en-tête List-Unsubscribe) et déclenche un
// console.warn. Objectif : plus jamais un email marketing sans voie de sortie.

export type EmailCategory = 'transactional' | 'product' | 'digest' | 'alert'

const TRANSACTIONAL: ReadonlyArray<string> = [
  // Sit lifecycle (time-critical)
  'sit-confirmed',
  'sit-invitation',
  'sit-reminder-j7',
  'sit-reminder-j48',
  'application-accepted',
  'application-declined',
  'application-reopened',
  'application-message-restored',
  'new-application',
  'first-application-received',
  'cancellation-by-owner',
  'cancellation-by-sitter',
  'cancellation-review-published',
  'cancellation-response-published',
  'help-during-sit',
  // Mutual aid, interactions directes liées à une action d'un membre identifié
  'mission-response',
  'mission-response-received',
  'mission-response-waiting',
  'mission-response-withdrawn',
  'mission-invitation',
  'mission-proposal-accepted',
  'mission-proposal-declined',
  'mission-feedback-received',
  'mission-thanks-received',
  'mission-auto-closed',
  'question-answer-received',
  // Identity / trust / safety
  'identity-verified',
  'identity-rejected',
  'relance-piece-identite',
  'dispute-resolved',
  'report-resolved',
  'pro-profile-approved',
  'pro-profile-rejected',
  // Direct human reply / messaging
  'contact-reply',
  'new-message',
  // Financial / subscription
  'subscription-expires-30d',
  'subscription-expires-7d',
  'subscription-expired',
  // Reviews received about the user (legitimate interest, expected)
  'review-received',
  // Exercice des droits (droit d'opposition) : doit toujours partir
  'unsubscribe-link',
  // Interne / opérationnel (destinataire = équipe, pas un membre)
  'admin-delivery-alert',
]

const PRODUCT: ReadonlyArray<string> = [
  // Onboarding / activation
  'onboarding-j1',
  'owner-activation-nudge',
  'owner-no-sit-j3',
  'owner-no-sit-j10',
  'owner-no-sit-j21',
  'reactivation-d30',
  'sitter-encourage-candidature',
  // Conseils annonce / profil
  'conseils-publication-annonce',
  'conseils-annonce-personnalises',
  'relance-cp-manquant',
  'relance-profil-incomplet',
  'nudge-missing-photo',
  'availability-nudge',
  'sit-draft-reminder',
  'summer-listing-reminder',
  'listing-unpublished-feedback',
  // Affinité
  'affinity-completion-owner',
  'affinity-completion-sitter',
  // Entraide, découverte et ponts
  'discover-mutual-aid-0',
  'discover-mutual-aid-1',
  'discover-mutual-aid-2',
  'sitter-mutual-aid-invite',
  'helper-to-guard',
  'mission-nudge-no-response',
  'mission-nudge-feedback',
  // Avis / parrainage
  'review-reminder',
  'referral-boost-monthly',
  'unread-messages-reminder',
  'dormant-sitter-nudge',
  'affinity-onboarding-nudge',
]

const DIGEST: ReadonlyArray<string> = [
  'mission-daily-digest',
  'sitter-daily-digest',
  'nearby-daily-digest',
  'mutual-aid-weekly-digest',
  'alert-digest',
  'analysis-requests-digest',
]

const ALERT: ReadonlyArray<string> = [
  'nearby-sit-alert',
]

export const EMAIL_CATEGORY_MAP: Record<string, EmailCategory> = (() => {
  const m: Record<string, EmailCategory> = {}
  for (const t of TRANSACTIONAL) m[t] = 'transactional'
  for (const t of PRODUCT) m[t] = 'product'
  for (const t of DIGEST) m[t] = 'digest'
  for (const t of ALERT) m[t] = 'alert'
  return m
})()

export function getEmailCategory(templateName: string): EmailCategory {
  const known = EMAIL_CATEGORY_MAP[templateName]
  if (known) return known
  console.warn(
    `[email-categories] Template non catégorisé : "${templateName}". Fallback sur "product" (avec désinscription). Ajoutez-le à supabase/functions/_shared/email-categories.ts.`,
  )
  return 'product'
}

export const CATEGORY_LABELS: Record<EmailCategory, { title: string; description: string }> = {
  transactional: {
    title: 'Emails essentiels',
    description: 'Confirmations de garde, identité, sécurité, annulations, réponses directes. Ces emails sont indispensables au bon fonctionnement de votre compte et ne peuvent pas être désactivés.',
  },
  product: {
    title: 'Conseils & accompagnement',
    description: 'Conseils pour publier votre annonce, complétion de profil, rappels d’avis, suggestions d’amélioration.',
  },
  digest: {
    title: 'Récapitulatifs',
    description: 'Synthèses périodiques de votre activité : entraide, annonces proches, alertes regroupées.',
  },
  alert: {
    title: 'Alertes nouvelles annonces',
    description: 'Notifications dès qu’une nouvelle garde apparaît dans une de vos zones d’alerte.',
  },
}
