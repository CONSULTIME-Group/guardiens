// Email category mapping — shared between the sender and the preferences UI.
// 4 categories:
//   - 'transactional' : critical, ALWAYS sent (no opt-out, only global suppression)
//   - 'product'       : nurturing, tips, profile/listing reminders (opt-out OK)
//   - 'digest'        : periodic recaps (opt-out OK)
//   - 'alert'         : new-listing alerts based on user-defined zones (opt-out OK)
//
// Any template name not listed below defaults to 'transactional' (safer fallback —
// will keep sending until explicitly categorized).

export type EmailCategory = 'transactional' | 'product' | 'digest' | 'alert'

const TRANSACTIONAL: ReadonlyArray<string> = [
  // Sit lifecycle (time-critical)
  'sit-confirmed',
  'application-accepted',
  'application-declined',
  'new-application',
  'cancellation-by-owner',
  'cancellation-by-sitter',
  'cancellation-review-published',
  'cancellation-response-published',
  'mission-response',
  'mission-invitation',
  // Identity / trust / safety
  'identity-verified',
  'identity-rejected',
  'relance-piece-identite',
  'dispute-resolved',
  'report-resolved',
  // Direct human reply / messaging
  'contact-reply',
  'new-message',
  // Financial / subscription
  'subscription-expires-30d',
  'subscription-expires-7d',
  'subscription-expired',
  // Reviews received about the user (legitimate interest, expected)
  'review-received',
]

const PRODUCT: ReadonlyArray<string> = [
  'onboarding-j1',
  'conseils-publication-annonce',
  'conseils-annonce-personnalises',
  'relance-cp-manquant',
  'relance-profil-incomplet',
  'availability-nudge',
  'review-reminder',
]

const DIGEST: ReadonlyArray<string> = [
  // Reserved for future digest emails (e.g., weekly recap)
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
  return EMAIL_CATEGORY_MAP[templateName] ?? 'transactional'
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
    description: 'Synthèses périodiques de votre activité (à venir).',
  },
  alert: {
    title: 'Alertes nouvelles annonces',
    description: 'Notifications dès qu’une nouvelle garde apparaît dans une de vos zones d’alerte.',
  },
}
