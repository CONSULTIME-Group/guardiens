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
  'application-under-review',
  'application-reopened',
  'application-closed-listing-withdrawn',
  'application-message-restored',
  'new-application',
  'first-application-received',
  // Consequence directe de l'action d'un membre identifie sur l'annonce du
  // destinataire, au meme titre que 'new-application'. Aucun plafond de
  // frequence depuis le 02/08/2026, seules les heures calmes s'appliquent.
  'owner-pending-application-nudge',
  // Relance de confirmation sur une annonce ou la mise en relation a deja eu
  // lieu : consequence directe des echanges reels entre deux membres
  // identifies, meme nature que 'owner-pending-application-nudge'.
  'owner-sit-unconfirmed',
  // Les deux parties se sont deja ecrit (souvent un numero echange) mais la
  // candidature n'est pas confirmee : consequence directe de leur discussion.
  'discussion-stalled-nudge',
  'cancellation-by-owner',
  'cancellation-by-sitter',
  'cancellation-review-published',
  'cancellation-response-published',
  'help-during-sit',
  // Accord de garde (commodat) : consequence directe de la signature de
  // l'autre partie sur une garde confirmee, meme nature que 'sit-confirmed'.
  'accord-ready-for-sitter',
  'accord-signed-by-sitter',
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
  // Relance d'un message reel non lu, d'un membre identifie a un autre :
  // meme nature que 'new-message', jamais plafonnee.
  'unread-messages-reminder',
  // Financial / subscription
  'subscription-expires-30d',
  'subscription-expires-7d',
  'subscription-expired',
  // Reviews received about the user (legitimate interest, expected)
  'review-received',
  // Exercice des droits (droit d'opposition) : doit toujours partir
  'unsubscribe-link',
  // Accusé de traitement d'une demande d'effacement (preuve de traitement CNIL)
  'account-deleted',
  // Interne / opérationnel (destinataire = équipe, pas un membre)
  'admin-delivery-alert',
  'admin-signals-digest',
  'content-quality-digest',
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
  'mission-nudge-close',
  'mission-nudge-feedback-helper',
  // Avis / parrainage
  'review-reminder',
  'referral-boost-monthly',
  'dormant-sitter-nudge',
  'affinity-onboarding-nudge',
  // Message personnel du fondateur aux membres : editorial, avec desinscription.
  'founder-personal-notice',
]


const DIGEST: ReadonlyArray<string> = [
  'mission-daily-digest',
  'nearby-daily-digest',
  'weekly-nearby-digest',
  'mutual-aid-weekly-digest',
  'analysis-requests-digest',
]

// ETAPE 2 (05/08/2026) : la categorie 'alert' regroupe desormais les envois
// explicitement demandes par la personne (zones d'alerte, recap gardien
// quotidien). Ils disposent d'un plafond propre, 1 / jour et 7 / semaine, et
// ne consomment plus le quota des emails produit.
const ALERT: ReadonlyArray<string> = [
  'nearby-sit-alert',
  'sitter-daily-digest',
  'alert-digest',
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
