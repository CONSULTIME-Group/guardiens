/**
 * notify-mission-event
 *
 * Fan-out serveur centralisé pour les 8 events "petites missions".
 * - verify_jwt = true (défaut Supabase gateway) : caller authentifié requis
 * - Le caller doit être `actor_id` OU un admin (sinon 403)
 * - Idempotence via RPC `claim_mission_event` (clé journalière)
 * - Rate limit : max 3 notifs `mission_*` pour (mission_id, target_id) sur 24h
 *   (bypass sur événements critiques : mission_accepted, mission_cancelled)
 * - Insert `notifications` + invoke `send-transactional-email` (opt-in + suppression)
 *
 * Appel côté client :
 *   supabase.functions.invoke('notify-mission-event', {
 *     body: { event_type, mission_id, actor_id, target_ids?, metadata? }
 *   })
 *
 * Appelable aussi côté PG via net.http_post (triggers feedback / thanks) en passant
 * l'anon key + service key sont NON requis : la fonction agit en service role interne.
 */

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

type EventType =
  | 'mission_proposal'
  | 'mission_accepted'
  | 'mission_declined'
  | 'mission_cancelled'
  | 'mission_completed'
  | 'mission_response_withdrawn'
  | 'mission_feedback_received'
  | 'mission_thanks_received'

const ALLOWED_EVENTS: ReadonlySet<EventType> = new Set([
  'mission_proposal',
  'mission_accepted',
  'mission_declined',
  'mission_cancelled',
  'mission_completed',
  'mission_response_withdrawn',
  'mission_feedback_received',
  'mission_thanks_received',
])

// Bypass rate-limit pour ces événements critiques
const RATE_LIMIT_BYPASS: ReadonlySet<EventType> = new Set([
  'mission_accepted',
  'mission_cancelled',
])

const RATE_LIMIT_MAX = 3
const RATE_LIMIT_WINDOW_HOURS = 24

interface Payload {
  event_type: EventType
  mission_id: string
  actor_id: string
  target_ids?: string[]
  metadata?: Record<string, unknown>
}

interface EventCopy {
  title: string
  body: string
  link: string
  emailTemplate: string | null
}

function buildCopy(
  event: EventType,
  mission: { id: string; title: string; user_id: string },
  actorName: string,
  metadata: Record<string, unknown>,
): EventCopy {
  const missionLink = `/petites-missions/${mission.id}`
  const missionTitle = mission.title || 'Votre mission'
  const meta = metadata ?? {}

  switch (event) {
    case 'mission_proposal':
      return {
        title: 'Nouvelle réponse à votre mission',
        body: `${actorName} vous propose son aide pour "${missionTitle}".`,
        link: missionLink,
        emailTemplate: 'mission-response',
      }
    case 'mission_accepted':
      return {
        title: 'Votre proposition a été acceptée',
        body: `${actorName} a accepté votre aide pour "${missionTitle}".`,
        link: missionLink,
        emailTemplate: 'mission-proposal-accepted',
      }
    case 'mission_declined':
      return {
        title: 'Votre proposition n\'a pas été retenue',
        body: `${actorName} a retenu une autre proposition pour "${missionTitle}".`,
        link: missionLink,
        emailTemplate: 'mission-proposal-declined',
      }
    case 'mission_cancelled':
      return {
        title: 'Une mission a été annulée',
        body: `${actorName} a annulé "${missionTitle}".`,
        link: missionLink,
        emailTemplate: null,
      }
    case 'mission_completed':
      return {
        title: 'Mission terminée',
        body: `"${missionTitle}" est marquée comme terminée.`,
        link: missionLink,
        emailTemplate: null,
      }
    case 'mission_response_withdrawn':
      return {
        title: 'Une proposition a été retirée',
        body: `${actorName} a retiré sa proposition sur "${missionTitle}".`,
        link: missionLink,
        emailTemplate: 'mission-response-withdrawn',
      }
    case 'mission_feedback_received': {
      const positive = meta.positive === true
      return {
        title: positive ? 'Vous avez reçu un retour positif' : 'Vous avez reçu un retour',
        body: `${actorName} vous a laissé un feedback sur "${missionTitle}".`,
        link: '/profil',
        emailTemplate: 'mission-feedback-received',
      }
    }
    case 'mission_thanks_received':
      return {
        title: 'Quelqu\'un vous a remercié',
        body: `${actorName} vous a remercié pour votre proposition sur "${missionTitle}".`,
        link: missionLink,
        emailTemplate: 'mission-thanks-received',
      }
  }
}

interface ResultRow {
  target_id: string
  status: 'sent' | 'skipped'
  reason?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) {
    return json({ error: 'unauthorized' }, 401)
  }

  let payload: Payload
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'invalid_json' }, 400)
  }

  if (!payload?.event_type || !ALLOWED_EVENTS.has(payload.event_type)) {
    return json({ error: 'invalid_event_type' }, 400)
  }
  if (!payload.mission_id || !payload.actor_id) {
    return json({ error: 'missing_fields' }, 400)
  }

  // Bypass service role : les triggers PG appellent avec la service key
  const bearer = authHeader.replace('Bearer ', '').trim()
  const isServiceRoleCall = bearer === SERVICE_KEY

  let callerId: string | null = null
  if (!isServiceRoleCall) {
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData, error: userErr } = await userClient.auth.getUser()
    if (userErr || !userData?.user) return json({ error: 'unauthorized' }, 401)
    callerId = userData.user.id
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY)

  // Le caller doit être l'acteur ou un admin (sauf appel service role interne)
  if (!isServiceRoleCall && callerId && callerId !== payload.actor_id) {
    const { data: isAdmin } = await admin.rpc('has_role', {
      _user_id: callerId,
      _role: 'admin',
    })
    if (!isAdmin) return json({ error: 'forbidden' }, 403)
  }

  // Charger la mission
  const { data: mission, error: missionErr } = await admin
    .from('small_missions')
    .select('id, title, user_id')
    .eq('id', payload.mission_id)
    .maybeSingle()
  if (missionErr || !mission) return json({ error: 'mission_not_found' }, 404)

  // Charger l'acteur (nom lisible)
  const { data: actor } = await admin
    .from('profiles')
    .select('first_name, display_name')
    .eq('id', payload.actor_id)
    .maybeSingle()
  const actorName =
    (actor?.first_name as string | undefined)?.trim() ||
    (actor?.display_name as string | undefined)?.trim() ||
    'Un membre'

  // Résoudre les cibles (défaut : auteur de la mission si non fourni et acteur ≠ auteur)
  let targets = Array.isArray(payload.target_ids) ? [...new Set(payload.target_ids)] : []
  if (targets.length === 0 && payload.actor_id !== mission.user_id) {
    targets = [mission.user_id]
  }
  targets = targets.filter((t) => t && t !== payload.actor_id)

  if (targets.length === 0) {
    return json({ ok: true, event_type: payload.event_type, results: [] }, 200)
  }

  const copy = buildCopy(payload.event_type, mission, actorName, payload.metadata ?? {})
  const results: ResultRow[] = []
  const rateLimitApplies = !RATE_LIMIT_BYPASS.has(payload.event_type)
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_HOURS * 3600 * 1000).toISOString()

  for (const targetId of targets) {
    // 1. Idempotence journalière
    const { data: claimed, error: claimErr } = await admin.rpc('claim_mission_event', {
      _event_type: payload.event_type,
      _mission_id: payload.mission_id,
      _target_id: targetId,
    })
    if (claimErr) {
      results.push({ target_id: targetId, status: 'skipped', reason: 'claim_error' })
      continue
    }
    if (!claimed) {
      results.push({ target_id: targetId, status: 'skipped', reason: 'already_sent_today' })
      continue
    }

    // 2. Rate limit 24h (sauf critiques)
    if (rateLimitApplies) {
      const { count } = await admin
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', targetId)
        .like('type', 'mission_%')
        .eq('link', copy.link)
        .gte('created_at', windowStart)
      if ((count ?? 0) >= RATE_LIMIT_MAX) {
        results.push({ target_id: targetId, status: 'skipped', reason: 'rate_limited' })
        continue
      }
    }

    // 3. Insert notif in-app
    const { error: notifErr } = await admin.from('notifications').insert({
      user_id: targetId,
      type: payload.event_type,
      title: copy.title,
      body: copy.body,
      link: copy.link,
      actor_name: actorName,
    })
    if (notifErr) {
      results.push({ target_id: targetId, status: 'skipped', reason: 'notif_insert_failed' })
      continue
    }

    // 4. Email (si template mappé + opt-in + non suppressed)
    if (copy.emailTemplate) {
      await sendEmailSafely(admin, targetId, copy.emailTemplate, {
        actorName,
        missionTitle: mission.title,
        missionId: mission.id,
        link: copy.link,
        metadata: payload.metadata ?? {},
      }, `${payload.event_type}-${mission.id}-${targetId}`)
    }

    results.push({ target_id: targetId, status: 'sent' })
  }

  return json(
    { ok: true, event_type: payload.event_type, target_count: targets.length, results },
    200,
  )
})

async function sendEmailSafely(
  admin: ReturnType<typeof createClient>,
  userId: string,
  templateName: string,
  templateData: Record<string, unknown>,
  idempotencyKey: string,
) {
  try {
    const { data: profile } = await admin
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .maybeSingle()
    const email = (profile?.email as string | undefined)?.trim()
    if (!email) return

    const { data: prefs } = await admin
      .from('email_preferences')
      .select('product_emails')
      .eq('user_id', userId)
      .maybeSingle()
    if (prefs && prefs.product_emails === false) return

    const { data: suppressed } = await admin
      .from('suppressed_emails')
      .select('email')
      .ilike('email', email)
      .maybeSingle()
    if (suppressed) return

    await admin.functions.invoke('send-transactional-email', {
      body: {
        templateName,
        recipientEmail: email,
        idempotencyKey,
        templateData,
      },
    })
  } catch (err) {
    console.error('[notify-mission-event] email send failed', { userId, templateName, err })
  }
}

function json(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
