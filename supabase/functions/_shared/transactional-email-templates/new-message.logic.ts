/**
 * Logique pure (sans React / sans dépendance npm) du template `new-message`.
 * Extraite pour être unit-testable rapidement et sans tirer @react-email/components.
 *
 * Toute modification ici DOIT préserver l'invariant clé :
 *   le wording envoyé à un destinataire doit refléter SON rôle dans la
 *   conversation (owner vs sitter), jamais celui de l'expéditeur.
 */

export type Context =
  | 'sit_application'
  | 'sitter_inquiry'
  | 'mission_help'
  | 'helper_inquiry'
  | 'owner_pitch'
  | undefined

export type RecipientRole = 'owner' | 'sitter' | undefined

export interface NewMessageData {
  senderFirstName?: string
  contextType?: Context
  recipientRole?: RecipientRole
  contextLabel?: string
}

/**
 * Header (titre + emoji) adapté au CONTEXTE et au RÔLE du destinataire.
 */
export const labelByContext = (
  ctx: Context,
  role: RecipientRole,
): { emoji: string; title: string } => {
  switch (ctx) {
    case 'sit_application':
      return role === 'sitter'
        ? { emoji: '✉️', title: 'Réponse à votre candidature' }
        : { emoji: '🏡', title: 'Nouvelle candidature' }
    case 'sitter_inquiry':
      return role === 'sitter'
        ? { emoji: '💬', title: 'Un propriétaire vous contacte' }
        : { emoji: '💬', title: 'Demande de disponibilité' }
    case 'mission_help':
      return role === 'owner'
        ? { emoji: '🤝', title: "Proposition d'entraide" }
        : { emoji: '🤝', title: 'Réponse à votre proposition' }
    case 'helper_inquiry':
      return { emoji: '💬', title: "Nouveau message d'entraide" }
    case 'owner_pitch':
      return role === 'owner'
        ? { emoji: '✋', title: 'Un gardien vous contacte' }
        : { emoji: '✉️', title: 'Réponse à votre message' }
    default:
      return { emoji: '💬', title: 'Nouveau message' }
  }
}

/**
 * Phrase d'accroche adaptée au rôle. Évite les formulations comme
 * "candidate à votre garde" envoyées au CANDIDAT lui-même.
 */
export const buildLeadSentence = (
  sender: string,
  ctx: Context,
  role: RecipientRole,
  contextLabel: string | undefined,
): string => {
  const ctxSuffix = contextLabel ? ` au sujet de ${contextLabel}` : ''
  if (ctx === 'sit_application') {
    return role === 'sitter'
      ? `${sender} vous a répondu${ctxSuffix}.`
      : `${sender} a candidaté${ctxSuffix}.`
  }
  if (ctx === 'mission_help') {
    return role === 'owner'
      ? `${sender} vous propose son aide${ctxSuffix}.`
      : `${sender} vous a répondu${ctxSuffix}.`
  }
  return `${sender} vous a envoyé un message${ctxSuffix}.`
}

/**
 * Construit le sujet de l'email selon (contextType, recipientRole).
 * Identique à `template.subject` du fichier .tsx — gardé synchronisé pour
 * pouvoir tester sans monter le template React.
 */
export const buildSubject = (data: NewMessageData): string => {
  const sender = data.senderFirstName || 'Un membre'
  const role = data.recipientRole
  switch (data.contextType) {
    case 'sit_application':
      return role === 'sitter'
        ? `${sender} a répondu à votre candidature`
        : `${sender} candidate à votre garde`
    case 'sitter_inquiry':
      return role === 'sitter'
        ? `${sender} souhaite connaître vos disponibilités`
        : `${sender} vous a répondu`
    case 'mission_help':
      return role === 'owner'
        ? `${sender} propose son aide pour votre mission`
        : `${sender} a répondu à votre proposition`
    case 'helper_inquiry':
      return `${sender} vous a envoyé un message`
    case 'owner_pitch':
      return role === 'owner'
        ? `${sender} souhaite vous proposer ses services`
        : `${sender} vous a répondu`
    default:
      return `Vous avez un nouveau message de ${sender}`
  }
}
