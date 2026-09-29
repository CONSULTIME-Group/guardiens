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
import { buildModerationEmailData, buildReporterEmailData, cleanText, runModerationMutations } from './moderation.ts'

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
  const adminNote: string | null = cleanText(body.admin_note, 4000)
  // Lot A9 : message au membre, seul texte envoyé par email.
  const memberMessage: string | null = cleanText(body.member_message, 2000)

  if (!reportId || typeof reportId !== 'string') return json({ error: 'report_id required' }, 400)
  if (!VALID_ACTIONS.includes(action)) return json({ error: 'invalid action' }, 400)

  // Charge le signalement
  const { data: report, error: repErr } = await service
    .from('reports')
    .select('id, target_type, target_id, reporter_id, reason, admin_notes, status')
    .eq('id', reportId)
    .maybeSingle()
  if (repErr || !report) return json({ error: 'Report not found' }, 404)

  // La table enregistre « sit » et « user » ; la fonction raisonne en
  // « listing » et « profile ». Correspondance explicite, anciennes valeurs acceptées.
  const TARGET_ALIASES: Record<string, TargetType> = { sit: 'listing', user: 'profile' }
  const rawTarget = String(report.target_type ?? '')
  const targetType = (TARGET_ALIASES[rawTarget] ?? rawTarget) as TargetType
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
  // Lot A9 : chaque mutation est vérifiée. Au premier échec, le signalement
  // reste ouvert et l'erreur remonte à l'écran.
  const opMeta: Record<string, unknown> = { target_label: targetLabel }

  const failure = await runModerationMutations(service, {
    action, targetType, targetId, adminId, now, ownerUserId, adminNote, memberMessage,
    reportReason: report.reason ?? null, opMeta,
  })
  if (failure) {
    console.error('Action execution failed', failure)
    return json({ error: `Action non appliquée : ${failure}` }, 500)
  }

  // Persiste sur le report (vérifié : sans cela, le signalement reste ouvert)
  const { error: updErr } = await service.from('reports').update({
    status: 'resolved',
    resolved_at: now,
    resolved_by: adminId,
    action_taken: action,
    admin_notes: adminNote ?? report.admin_notes ?? null,
    member_message: memberMessage,
  }).eq('id', reportId)
  if (updErr) {
    console.error('report update failed', updErr)
    return json({ error: `Action appliquée mais signalement non clos : ${updErr.message}` }, 500)
  }

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

  // Emails après clôture : le membre concerné (moderation-decision) puis le
  // signaleur (report-resolved). Seul member_message est transmis.
  if (action !== 'none' && ownerUserId) {
    const ownerEmail = await emailOf(service, ownerUserId)
    if (ownerEmail) {
      await sendTemplate('moderation-decision', ownerEmail, `moderation-${reportId}-${action}`,
        buildModerationEmailData(action, targetType, memberMessage))
    }
  }
  const reporterEmail = report.reporter_id ? await emailOf(service, report.reporter_id) : null
  if (reporterEmail) {
    await sendTemplate('report-resolved', reporterEmail, `report-resolved-${reportId}`,
      buildReporterEmailData(report.reason, memberMessage))
  }

  return json({ success: true, action, target_type: targetType, target_id: targetId })
})

async function emailOf(service: any, userId: string): Promise<string | null> {
  const { data } = await service.rpc('get_user_emails_admin', { p_user_ids: [userId] })
  return (data as any[] | null)?.[0]?.email ?? null
}

async function sendTemplate(templateName: string, recipientEmail: string, idempotencyKey: string, templateData: Record<string, unknown>) {
  try {
    const res = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-transactional-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
      body: JSON.stringify({ templateName, recipientEmail, idempotencyKey, templateData }),
    })
    if (!res.ok) console.error('send-transactional-email failed', templateName, res.status, await res.text().catch(() => ''))
  } catch (e) {
    console.warn('email failed', templateName, e)
  }
}

