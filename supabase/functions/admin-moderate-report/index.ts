// Edge function : exécute réellement une action de modération suite à un
// signalement (reports). Admin-only. Utilise le service_role pour muter les
// tables cibles et trace chaque action dans admin_action_logs.
//
// Payload attendu :
//   { report_id: string,
//     action: 'warn' | 'hide' | 'suspend' | 'delete' | 'none',
//     admin_note?: string }
//
// Sécurité : verify_jwt = true par défaut. On revérifie explicitement en
// interne que l'appelant est admin via has_role. Le service_role côté client
// est strictement interdit.

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

type Action = 'warn' | 'hide' | 'suspend' | 'delete' | 'none'
type TargetType = 'profile' | 'listing' | 'review' | 'message' | 'small_mission'

const VALID_ACTIONS: Action[] = ['warn', 'hide', 'suspend', 'delete', 'none']
const VALID_TARGETS: TargetType[] = ['profile', 'listing', 'review', 'message', 'small_mission']

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')
  if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) {
    return json({ error: 'Server configuration error' }, 500)
  }

  // Auth : récupère l'appelant via son JWT
  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401)
  const callerToken = authHeader.slice(7)

  const service = createClient(SUPABASE_URL, SERVICE_KEY)
  const { data: userData, error: userErr } = await service.auth.getUser(callerToken)
  if (userErr || !userData?.user) return json({ error: 'Unauthorized' }, 401)
  const adminId = userData.user.id

  // Vérifie le rôle admin
  const { data: isAdmin, error: roleErr } = await service.rpc('has_role', {
    _user_id: adminId,
    _role: 'admin',
  })
  if (roleErr || isAdmin !== true) return json({ error: 'Forbidden: admin only' }, 403)

  // Parse body
  let body: any
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

  const reportId: string = body.report_id
  const action: Action = body.action
  const adminNote: string | null = (body.admin_note ?? null) || null

  if (!reportId || typeof reportId !== 'string') return json({ error: 'report_id required' }, 400)
  if (!VALID_ACTIONS.includes(action)) return json({ error: 'invalid action' }, 400)

  // Charge le signalement
  const { data: report, error: repErr } = await service
    .from('reports')
    .select('id, target_type, target_id, reporter_id, reason, admin_notes, status')
    .eq('id', reportId)
    .maybeSingle()
  if (repErr || !report) return json({ error: 'Report not found' }, 404)

  const targetType = report.target_type as TargetType
  const targetId = report.target_id as string | null
  if (!VALID_TARGETS.includes(targetType)) {
    return json({ error: `Unknown target_type: ${targetType}` }, 400)
  }
  if (!targetId) return json({ error: 'Report has no target_id' }, 400)

  // Résout l'owner de la cible et charge la ressource
  const now = new Date().toISOString()
  let ownerUserId: string | null = null
  let targetLabel = ''
  let targetExists = false

  switch (targetType) {
    case 'profile': {
      const { data } = await service.from('profiles')
        .select('id, first_name, last_name').eq('id', targetId).maybeSingle()
      if (data) {
        targetExists = true
        ownerUserId = data.id
        targetLabel = `${data.first_name ?? ''} ${data.last_name ?? ''}`.trim() || 'profil'
      }
      break
    }
    case 'listing': {
      const { data } = await service.from('sits')
        .select('id, user_id, title').eq('id', targetId).maybeSingle()
      if (data) { targetExists = true; ownerUserId = data.user_id; targetLabel = data.title ?? 'annonce' }
      break
    }
    case 'review': {
      const { data } = await service.from('reviews')
        .select('id, reviewer_id').eq('id', targetId).maybeSingle()
      if (data) { targetExists = true; ownerUserId = data.reviewer_id; targetLabel = 'avis' }
      break
    }
    case 'small_mission': {
      const { data } = await service.from('small_missions')
        .select('id, user_id, title').eq('id', targetId).maybeSingle()
      if (data) { targetExists = true; ownerUserId = data.user_id; targetLabel = data.title ?? 'petite mission' }
      break
    }
    case 'message': {
      const { data } = await service.from('messages')
        .select('id, sender_id, conversation_id, content').eq('id', targetId).maybeSingle()
      if (data) { targetExists = true; ownerUserId = data.sender_id; targetLabel = 'message' }
      break
    }
  }

  if (!targetExists && action !== 'delete') {
    return json({ error: 'Target not found' }, 404)
  }

  // === Exécution de l'action ===
  const opMeta: Record<string, unknown> = { target_label: targetLabel }

  try {
    if (action === 'hide') {
      switch (targetType) {
        case 'listing':
          await service.from('sits').update({
            moderation_hidden_at: now,
            moderation_hidden_by: adminId,
            unpublished_at: now,
            last_unpublished_reason: 'moderation',
            accepting_applications: false,
          }).eq('id', targetId)
          break
        case 'small_mission':
          await service.from('small_missions').update({
            moderation_hidden_at: now,
            moderation_hidden_by: adminId,
            status: 'cancelled',
            closed_at: now,
            close_reason: 'moderation',
          }).eq('id', targetId)
          break
        case 'review':
          await service.from('reviews').update({
            moderation_status: 'hidden',
            moderation_hidden_at: now,
            moderation_hidden_by: adminId,
            published: false,
          }).eq('id', targetId)
          break
        case 'message':
          await service.from('messages').update({
            moderation_hidden_at: now,
            moderation_hidden_by: adminId,
            content: '[Message masqué par la modération]',
          }).eq('id', targetId)
          break
        case 'profile':
          await service.from('profiles').update({
            account_status: 'hidden',
          }).eq('id', targetId)
          break
      }
    } else if (action === 'suspend') {
      if (!ownerUserId) return json({ error: 'Cannot resolve owner to suspend' }, 400)
      await service.from('profiles').update({
        account_status: 'suspended',
        suspended_at: now,
        suspended_by: adminId,
        suspension_reason: adminNote ?? `Signalement ${report.reason ?? ''}`.trim(),
      }).eq('id', ownerUserId)
      opMeta.suspended_user_id = ownerUserId
    } else if (action === 'delete') {
      switch (targetType) {
        case 'listing':
          await service.from('sits').delete().eq('id', targetId); break
        case 'small_mission':
          await service.from('small_missions').delete().eq('id', targetId); break
        case 'review':
          await service.from('reviews').delete().eq('id', targetId); break
        case 'message':
          await service.from('messages').delete().eq('id', targetId); break
        case 'profile':
          // Suppression d'un profil = passage en account_status='deleted'
          // (la suppression réelle du compte auth passe par le flux dédié).
          await service.from('profiles').update({
            account_status: 'deleted',
            suspended_at: now,
            suspended_by: adminId,
            suspension_reason: adminNote ?? 'Suppression modération',
          }).eq('id', targetId)
          break
      }
    } else if (action === 'warn') {
      // Warn : email + éventuellement message système dans la conversation
      // (pour target=message). Le contenu reste visible.
      if (targetType === 'message') {
        const { data: msg } = await service.from('messages')
          .select('conversation_id').eq('id', targetId).maybeSingle()
        if (msg?.conversation_id) {
          await service.from('messages').insert({
            conversation_id: msg.conversation_id,
            sender_id: adminId,
            content: `Avertissement de la modération Guardiens : ${adminNote ?? 'ce message a été signalé et jugé inapproprié.'}`,
            is_system: true,
          })
        }
      }
    }
    // action === 'none' : aucune mutation de la cible

    // Envoi email d'avertissement au propriétaire (warn / hide / suspend / delete)
    if (action !== 'none' && ownerUserId) {
      const { data: emailRows } = await service.rpc('get_user_emails_admin', {
        p_user_ids: [ownerUserId],
      })
      const ownerEmail = (emailRows as any[] | null)?.[0]?.email
      if (ownerEmail) {
        try {
          await service.functions.invoke('send-transactional-email', {
            body: {
              templateName: 'contact-reply',
              recipientEmail: ownerEmail,
              idempotencyKey: `moderation-${reportId}-${action}`,
              templateData: {
                subject: 'Décision de modération Guardiens',
                message: buildOwnerMessage(action, targetType, adminNote),
              },
            },
          })
        } catch (e) {
          console.warn('owner email failed', e)
        }
      }
    }
  } catch (e) {
    console.error('Action execution failed', e)
    return json({ error: 'Action execution failed', details: String(e) }, 500)
  }

  // Persiste sur le report
  const { error: updErr } = await service.from('reports').update({
    status: 'resolved',
    resolved_at: now,
    resolved_by: adminId,
    action_taken: action,
    admin_notes: adminNote ?? report.admin_notes ?? null,
  }).eq('id', reportId)
  if (updErr) console.error('report update failed', updErr)

  // Audit
  const { error: logErr } = await service.from('admin_action_logs').insert({
    admin_id: adminId,
    action,
    target_type: targetType,
    target_id: targetId,
    report_id: reportId,
    note: adminNote,
    metadata: opMeta,
  })
  if (logErr) console.error('audit log failed', logErr)

  // Email au signaleur (préservé)
  try {
    const { data: repEmails } = await service.rpc('get_user_emails_admin', {
      p_user_ids: [report.reporter_id],
    })
    const reporterEmail = (repEmails as any[] | null)?.[0]?.email
    if (reporterEmail) {
      await service.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'report-resolved',
          recipientEmail: reporterEmail,
          idempotencyKey: `report-resolved-${reportId}`,
          templateData: {
            reason: report.reason,
            status: 'resolved',
            adminNotes: adminNote ?? report.admin_notes ?? undefined,
          },
        },
      })
    }
  } catch (e) {
    console.warn('reporter email failed', e)
  }

  return json({ success: true, action, target_type: targetType, target_id: targetId })
})

function buildOwnerMessage(action: Action, targetType: TargetType, note: string | null): string {
  const targetLabel: Record<TargetType, string> = {
    profile: 'votre profil',
    listing: 'votre annonce',
    review: 'votre avis',
    message: 'un de vos messages',
    small_mission: 'votre petite mission',
  }
  const lead: Record<Action, string> = {
    warn: `Un avertissement de modération concerne ${targetLabel[targetType]}.`,
    hide: `${targetLabel[targetType].charAt(0).toUpperCase() + targetLabel[targetType].slice(1)} a été masquée par la modération.`,
    suspend: 'Votre compte a été suspendu par la modération.',
    delete: `${targetLabel[targetType].charAt(0).toUpperCase() + targetLabel[targetType].slice(1)} a été supprimée par la modération.`,
    none: '',
  }
  const base = lead[action]
  const details = note ? `\n\nMotif : ${note}` : ''
  return `${base}${details}\n\nSi vous pensez qu'il s'agit d'une erreur, répondez à cet email.`
}
