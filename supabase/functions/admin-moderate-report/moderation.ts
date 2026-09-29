// Lot A9 : mutations de modération vérifiées une par une.
// Module sans dépendance Deno, testé sous Vitest avec un client factice.

export type Action = 'warn' | 'hide' | 'suspend' | 'delete' | 'none'
export type TargetType = 'profile' | 'listing' | 'review' | 'message' | 'small_mission'

/** Valeur acceptée par le trigger validate_review_fields pour un avis masqué. */
export const REVIEW_HIDDEN_STATUS = 'refuse'

export function cleanText(raw: unknown, max: number): string | null {
  if (typeof raw !== 'string') return null
  const t = raw.trim()
  return t ? t.slice(0, max) : null
}

export interface MutationInput {
  action: Action
  targetType: TargetType
  targetId: string
  adminId: string
  now: string
  ownerUserId: string | null
  adminNote: string | null
  memberMessage: string | null
  reportReason: string | null
  opMeta: Record<string, unknown>
}

type Res = { error: { message: string } | null }

async function check(label: string, p: PromiseLike<Res>): Promise<string | null> {
  const { error } = await p
  return error ? `${label} (${error.message})` : null
}

/** Renvoie null si tout est appliqué, sinon le libellé du premier échec. */
export async function runModerationMutations(service: any, i: MutationInput): Promise<string | null> {
  const { action, targetType, targetId, adminId, now } = i
  if (action === 'none') return null

  if (action === 'hide') {
    switch (targetType) {
      case 'listing': {
        // Même mécanisme que la page Annonces : l'annonce quitte vraiment le site.
        const { data: sit, error } = await service.from('sits').select('status').eq('id', targetId).maybeSingle()
        if (error) return `lecture de l'annonce (${error.message})`
        const prev = sit?.status && sit.status !== 'cancelled' ? sit.status : null
        i.opMeta.status_before_hidden = prev
        return check('masquage de l\'annonce', service.from('sits').update({
          status: 'cancelled',
          status_before_hidden: prev,
          hidden_at: now,
          hidden_by: adminId,
          moderation_hidden_at: now,
          moderation_hidden_by: adminId,
          unpublished_at: now,
          last_unpublished_reason: 'moderation',
          accepting_applications: false,
        }).eq('id', targetId))
      }
      case 'small_mission': {
        const { data: m, error } = await service.from('small_missions').select('status').eq('id', targetId).maybeSingle()
        if (error) return `lecture de la demande (${error.message})`
        return check('masquage de la demande', service.from('small_missions').update({
          status_before_hidden: m?.status && m.status !== 'cancelled' ? m.status : null,
          moderation_hidden_at: now,
          moderation_hidden_by: adminId,
          status: 'cancelled',
          closed_at: now,
          close_reason: 'moderation',
        }).eq('id', targetId))
      }
      case 'review':
        return check('masquage de l\'avis', service.from('reviews').update({
          moderation_status: REVIEW_HIDDEN_STATUS,
          moderation_hidden_at: now,
          moderation_hidden_by: adminId,
          published: false,
        }).eq('id', targetId))
      case 'message':
        return check('masquage du message', service.from('messages').update({
          moderation_hidden_at: now,
          moderation_hidden_by: adminId,
          content: '[Message masqué par la modération]',
        }).eq('id', targetId))
      case 'profile':
        return check('masquage du profil', service.from('profiles').update({ account_status: 'hidden' }).eq('id', targetId))
    }
  }

  if (action === 'suspend') {
    if (!i.ownerUserId) return 'membre introuvable pour la suspension'
    i.opMeta.suspended_user_id = i.ownerUserId
    return check('suspension du compte', service.from('profiles').update({
      account_status: 'suspended',
      suspended_at: now,
      suspended_by: adminId,
      suspension_reason: i.adminNote ?? `Signalement ${i.reportReason ?? ''}`.trim(),
    }).eq('id', i.ownerUserId))
  }

  if (action === 'delete') {
    switch (targetType) {
      case 'listing': return check('suppression de l\'annonce', service.from('sits').delete().eq('id', targetId))
      case 'small_mission': return check('suppression de la demande', service.from('small_missions').delete().eq('id', targetId))
      case 'review': return check('suppression de l\'avis', service.from('reviews').delete().eq('id', targetId))
      case 'message': return check('suppression du message', service.from('messages').delete().eq('id', targetId))
      case 'profile':
        return check('retrait du profil', service.from('profiles').update({
          account_status: 'deleted',
          suspended_at: now,
          suspended_by: adminId,
          suspension_reason: i.adminNote ?? 'Suppression modération',
        }).eq('id', targetId))
    }
  }

  if (action === 'warn' && targetType === 'message') {
    const { data: msg, error } = await service.from('messages').select('conversation_id').eq('id', targetId).maybeSingle()
    if (error) return `lecture du message (${error.message})`
    if (msg?.conversation_id) {
      return check('avertissement dans la conversation', service.from('messages').insert({
        conversation_id: msg.conversation_id,
        sender_id: adminId,
        content: `Avertissement de la modération Guardiens : ${i.memberMessage ?? 'ce message a été signalé et jugé inapproprié.'}`,
        is_system: true,
      }))
    }
  }
  return null
}

/** Données du gabarit moderation-decision : jamais la note interne. */
export function buildModerationEmailData(action: Action, targetType: TargetType, memberMessage: string | null) {
  return { action, targetType, memberMessage: memberMessage ?? undefined }
}

/** Données du gabarit report-resolved : jamais la note interne. */
export function buildReporterEmailData(reason: string | null, memberMessage: string | null) {
  return { reason: reason ?? undefined, status: 'resolved', memberMessage: memberMessage ?? undefined }
}
