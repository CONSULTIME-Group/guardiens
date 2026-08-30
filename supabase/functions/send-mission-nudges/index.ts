// send-mission-nudges
// -----------------------------------------------------------------------------
// Envoie 3 types de nudges au propriétaire d'une mission :
//  - `feedback`         : mission completed depuis 48h à 72h, sans feedback de l'auteur
//  - `no_response`      : mission open depuis 7j sans aucune small_mission_responses
//  - `response_waiting` : réponse `pending` depuis plus de 48h, poster jamais relancé pour
//                         cette réponse (dédup par response_id dans metadata)
//  - `close_reminder`   : mission `in_progress` dont la date prévue est passée depuis 3 à 10 jours,
//                         invitation discrète à l'auteur pour clôturer
//  - `feedback_helper`  : mission completed depuis 48h à 72h, relance de l'aidant retenu
//                         qui n'a pas encore laissé de retour
// Anti-spam : chaque nudge ne part qu'une seule fois par cible (dédup via email_send_log).
// Respecte suppression et opt-in `email_preferences.product_emails`.
// Body : { dry_run?: boolean, mission_id?: string, kind?: 'feedback'|'no_response'|'response_waiting'|'close_reminder'|'feedback_helper' }
import { createClient } from 'npm:@supabase/supabase-js@2.45.0'
import { requireCronCaller } from '../_shared/require-cron-caller.ts'
import { startCronRun } from '../_shared/cron-run-log.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface Mission {
  id: string
  user_id: string
  title: string
  status: string
  created_at: string
  updated_at: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const guard = await requireCronCaller(req, corsHeaders, "send-mission-nudges")
  if (guard) return guard

  const run = await startCronRun("send-mission-nudges")

  let body: {
    dry_run?: boolean
    mission_id?: string
    kind?: 'feedback' | 'no_response' | 'response_waiting' | 'close_reminder' | 'feedback_helper'
  } = {}
  try { if (req.body) body = await req.json() } catch { /* noop */ }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
  const now = Date.now()

  const results: Array<{ mission_id: string; nudge_type: string; status: string; reason?: string }> = []

  try {
    // === Nudge 1 : feedback (48-72h après completed) ===
    if (!body.kind || body.kind === 'feedback') {
      const lower = new Date(now - 72 * 3600 * 1000).toISOString()
      const upper = new Date(now - 48 * 3600 * 1000).toISOString()
      let q = admin
        .from('small_missions')
        .select('id, user_id, title, status, created_at, updated_at')
        .eq('status', 'completed')
        .gte('updated_at', lower)
        .lte('updated_at', upper)
        .limit(200)
      if (body.mission_id) q = q.eq('id', body.mission_id)
      const { data: missions, error } = await q
      if (error) throw error

      for (const m of (missions as Mission[]) ?? []) {
        // A) déjà un feedback de l'auteur ?
        const { count: fbCount } = await admin
          .from('mission_feedbacks')
          .select('id', { count: 'exact', head: true })
          .eq('mission_id', m.id)
          .eq('giver_id', m.user_id)
        if ((fbCount ?? 0) > 0) {
          results.push({ mission_id: m.id, nudge_type: 'feedback', status: 'skipped', reason: 'feedback_already_left' })
          continue
        }
        await sendNudge(admin, m, 'feedback', results, body.dry_run)
      }
    }

    // === Nudge 2 : sans réponse (7j+) ===
    if (!body.kind || body.kind === 'no_response') {
      const cutoff = new Date(now - 7 * 86400_000).toISOString()
      let q = admin
        .from('small_missions')
        .select('id, user_id, title, status, created_at, updated_at')
        .eq('status', 'open')
        .lte('created_at', cutoff)
        .limit(200)
      if (body.mission_id) q = q.eq('id', body.mission_id)
      const { data: missions, error } = await q
      if (error) throw error

      for (const m of (missions as Mission[]) ?? []) {
        const { count: respCount } = await admin
          .from('small_mission_responses')
          .select('id', { count: 'exact', head: true })
          .eq('mission_id', m.id)
        if ((respCount ?? 0) > 0) {
          results.push({ mission_id: m.id, nudge_type: 'no_response', status: 'skipped', reason: 'has_responses' })
          continue
        }
        await sendNudge(admin, m, 'no_response', results, body.dry_run)
      }
    }

    // === Nudge 3 : réponse en attente depuis >48h ===
    if (!body.kind || body.kind === 'response_waiting') {
      const cutoff = new Date(now - 48 * 3600 * 1000).toISOString()
      let q = admin
        .from('small_mission_responses')
        .select('id, mission_id, responder_id, status, created_at, message, mission:small_missions(id, user_id, title, status)')
        .eq('status', 'pending')
        .lte('created_at', cutoff)
        .limit(200)
      if (body.mission_id) q = q.eq('mission_id', body.mission_id)
      const { data: rows, error } = await q
      if (error) throw error

      for (const r of (rows as any[]) ?? []) {
        const mission = r.mission
        if (!mission || mission.status !== 'open') {
          results.push({ mission_id: r.mission_id, nudge_type: 'response_waiting', status: 'skipped', reason: 'mission_not_open' })
          continue
        }
        // La mission a-t-elle déjà une réponse acceptée ? Si oui, plus la peine.
        const { count: acceptedCount } = await admin
          .from('small_mission_responses')
          .select('id', { count: 'exact', head: true })
          .eq('mission_id', r.mission_id)
          .eq('status', 'accepted')
        if ((acceptedCount ?? 0) > 0) {
          results.push({ mission_id: r.mission_id, nudge_type: 'response_waiting', status: 'skipped', reason: 'already_accepted' })
          continue
        }

        // Prénom du répondant
        const { data: responderProf } = await admin
          .from('profiles')
          .select('first_name')
          .eq('id', r.responder_id)
          .maybeSingle()
        const responderFirstName = (responderProf?.first_name as string | undefined)?.trim() || 'Un membre'

        await sendResponseWaitingNudge(admin, {
          mission: { id: mission.id, user_id: mission.user_id, title: mission.title, status: mission.status, created_at: '', updated_at: '' },
          responseId: r.id,
          responderFirstName,
        }, results, body.dry_run)
      }
    }

    // === Nudge 4 : invitation à clôturer (date prévue passée depuis 3 à 10 jours) ===
    if (!body.kind || body.kind === 'close_reminder') {
      const iso = (d: Date) => d.toISOString().slice(0, 10)
      const older = iso(new Date(now - 10 * 86400_000))
      const recent = iso(new Date(now - 3 * 86400_000))
      let q = admin
        .from('small_missions')
        .select('id, user_id, title, status, created_at, updated_at, date_needed, end_date')
        .eq('status', 'in_progress')
        .limit(200)
      if (body.mission_id) q = q.eq('id', body.mission_id)
      const { data: missions, error } = await q
      if (error) throw error

      for (const m of (missions as any[]) ?? []) {
        const target = (m.end_date || m.date_needed) as string | null
        if (!target || target > recent || target < older) {
          results.push({ mission_id: m.id, nudge_type: 'close_reminder', status: 'skipped', reason: 'out_of_window' })
          continue
        }
        // Prénom de l'aidant retenu, quand il existe.
        const { data: accepted } = await admin
          .from('small_mission_responses')
          .select('responder_id')
          .eq('mission_id', m.id)
          .eq('status', 'accepted')
          .limit(1)
        let helperFirstName: string | undefined
        if (accepted && accepted.length > 0) {
          const { data: hp } = await admin
            .from('profiles')
            .select('first_name')
            .eq('id', (accepted[0] as any).responder_id)
            .maybeSingle()
          helperFirstName = (hp?.first_name as string | undefined)?.trim() || undefined
        }
        await sendMissionEmail(admin, {
          missionId: m.id,
          recipientUserId: m.user_id,
          templateName: 'mission-nudge-close',
          nudgeType: 'close_reminder',
          extraData: { missionTitle: m.title, missionId: m.id, helperFirstName },
        }, results, body.dry_run)
      }
    }

    // === Nudge 5 : retour de l'aidant après clôture (48-72h) ===
    if (!body.kind || body.kind === 'feedback_helper') {
      const lower = new Date(now - 72 * 3600 * 1000).toISOString()
      const upper = new Date(now - 48 * 3600 * 1000).toISOString()
      let q = admin
        .from('small_missions')
        .select('id, user_id, title, status, created_at, updated_at')
        .eq('status', 'completed')
        .gte('updated_at', lower)
        .lte('updated_at', upper)
        .limit(200)
      if (body.mission_id) q = q.eq('id', body.mission_id)
      const { data: missions, error } = await q
      if (error) throw error

      for (const m of (missions as Mission[]) ?? []) {
        const { data: accepted } = await admin
          .from('small_mission_responses')
          .select('responder_id')
          .eq('mission_id', m.id)
          .eq('status', 'accepted')
          .limit(1)
        if (!accepted || accepted.length === 0) {
          results.push({ mission_id: m.id, nudge_type: 'feedback_helper', status: 'skipped', reason: 'no_accepted_helper' })
          continue
        }
        const helperId = (accepted[0] as any).responder_id as string
        const { count: fbCount } = await admin
          .from('mission_feedbacks')
          .select('id', { count: 'exact', head: true })
          .eq('mission_id', m.id)
          .eq('giver_id', helperId)
        if ((fbCount ?? 0) > 0) {
          results.push({ mission_id: m.id, nudge_type: 'feedback_helper', status: 'skipped', reason: 'feedback_already_left' })
          continue
        }
        const { data: authorProf } = await admin
          .from('profiles')
          .select('first_name')
          .eq('id', m.user_id)
          .maybeSingle()
        await sendMissionEmail(admin, {
          missionId: m.id,
          recipientUserId: helperId,
          templateName: 'mission-nudge-feedback-helper',
          nudgeType: 'feedback_helper',
          extraData: {
            missionTitle: m.title,
            missionId: m.id,
            authorFirstName: (authorProf?.first_name as string | undefined)?.trim() || undefined,
          },
        }, results, body.dry_run)
      }
    }

    const sentCount = results.filter((r) => r.status === 'sent').length
    const sendErrorCount = results.filter((r) => r.status === 'error').length
    await run.finish(sendErrorCount > 0 ? 'partial' : 'success', {
      total: results.length, sent: sentCount, send_errors: sendErrorCount, dry_run: !!body.dry_run,
    })
    return json({ ok: true, dry_run: !!body.dry_run, total: results.length, results })
  } catch (err) {
    console.error('[send-mission-nudges] fatal', err)
    await run.fail(err)
    return json({ error: String(err) }, 500)
  }
})

async function sendNudge(
  admin: ReturnType<typeof createClient>,
  m: Mission,
  kind: 'feedback' | 'no_response',
  results: Array<{ mission_id: string; nudge_type: string; status: string; reason?: string }>,
  dryRun?: boolean,
) {
  const templateName = kind === 'feedback' ? 'mission-nudge-feedback' : 'mission-nudge-no-response'
  const idempotencyKey = `${templateName}-${m.id}`

  // Profil auteur
  const { data: profile } = await admin
    .from('profiles')
    .select('id, email, first_name, account_status')
    .eq('id', m.user_id)
    .maybeSingle()
  if (!profile || profile.account_status !== 'active') {
    results.push({ mission_id: m.id, nudge_type: kind, status: 'skipped', reason: 'author_inactive' })
    return
  }
  let email = (profile.email as string | undefined)?.trim() || null
  if (!email) {
    const { data: authData } = await admin.auth.admin.getUserById(m.user_id)
    email = authData?.user?.email ?? null
  }
  if (!email) {
    results.push({ mission_id: m.id, nudge_type: kind, status: 'skipped', reason: 'email_missing' })
    return
  }

  // Opt-in
  const { data: prefs } = await admin
    .from('email_preferences')
    .select('product_emails')
    .eq('user_id', m.user_id)
    .maybeSingle()
  if (prefs && prefs.product_emails === false) {
    results.push({ mission_id: m.id, nudge_type: kind, status: 'skipped', reason: 'opt_out' })
    return
  }

  // Suppression
  const { data: sup } = await admin
    .from('suppressed_emails')
    .select('email')
    .ilike('email', email)
    .maybeSingle()
  if (sup) {
    results.push({ mission_id: m.id, nudge_type: kind, status: 'skipped', reason: 'suppressed' })
    return
  }

  // Dédup : nudge déjà envoyé pour cette mission ?
  const { data: prev } = await admin
    .from('email_send_log')
    .select('id')
    .eq('template_name', templateName)
    .eq('recipient_email', email)
    .in('status', ['sent', 'pending', 'deferred'])
    .contains('metadata', { mission_id: m.id })
    .limit(1)
  if (prev && prev.length > 0) {
    results.push({ mission_id: m.id, nudge_type: kind, status: 'skipped', reason: 'already_sent' })
    return
  }

  if (dryRun) {
    results.push({ mission_id: m.id, nudge_type: kind, status: 'would_send' })
    return
  }

  const _steRes = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-transactional-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
    body: JSON.stringify({
      templateName,
      recipientEmail: email,
      idempotencyKey,
      templateData: {
        firstName: profile.first_name ?? undefined,
        missionTitle: m.title,
        missionId: m.id,
      },
      logMetadata: { mission_id: m.id, nudge_type: kind },
    }),
  });
  const _steTxt1 = _steRes.ok ? '' : await _steRes.text().catch(() => '');
  if (!_steRes.ok) console.error('send-transactional-email failed', _steRes.status, _steTxt1);
  const sendErr = _steRes.ok ? null : new Error(`send-transactional-email ${_steRes.status}: ${_steTxt1}`);
  if (sendErr) {
    results.push({ mission_id: m.id, nudge_type: kind, status: 'error', reason: String(sendErr) })
    return
  }
  results.push({ mission_id: m.id, nudge_type: kind, status: 'sent' })
}

async function sendResponseWaitingNudge(
  admin: ReturnType<typeof createClient>,
  ctx: { mission: Mission; responseId: string; responderFirstName: string },
  results: Array<{ mission_id: string; nudge_type: string; status: string; reason?: string }>,
  dryRun?: boolean,
) {
  const { mission, responseId, responderFirstName } = ctx
  const templateName = 'mission-response-waiting'
  const idempotencyKey = `${templateName}-${responseId}`

  const { data: profile } = await admin
    .from('profiles')
    .select('id, email, first_name, account_status')
    .eq('id', mission.user_id)
    .maybeSingle()
  if (!profile || profile.account_status !== 'active') {
    results.push({ mission_id: mission.id, nudge_type: 'response_waiting', status: 'skipped', reason: 'author_inactive' })
    return
  }
  let email = (profile.email as string | undefined)?.trim() || null
  if (!email) {
    const { data: authData } = await admin.auth.admin.getUserById(mission.user_id)
    email = authData?.user?.email ?? null
  }
  if (!email) {
    results.push({ mission_id: mission.id, nudge_type: 'response_waiting', status: 'skipped', reason: 'email_missing' })
    return
  }

  const { data: prefs } = await admin
    .from('email_preferences')
    .select('product_emails')
    .eq('user_id', mission.user_id)
    .maybeSingle()
  if (prefs && prefs.product_emails === false) {
    results.push({ mission_id: mission.id, nudge_type: 'response_waiting', status: 'skipped', reason: 'opt_out' })
    return
  }

  const { data: sup } = await admin
    .from('suppressed_emails')
    .select('email')
    .ilike('email', email)
    .maybeSingle()
  if (sup) {
    results.push({ mission_id: mission.id, nudge_type: 'response_waiting', status: 'skipped', reason: 'suppressed' })
    return
  }

  // Dédup strict par response_id
  const { data: prev } = await admin
    .from('email_send_log')
    .select('id')
    .eq('template_name', templateName)
    .eq('recipient_email', email)
    .in('status', ['sent', 'pending', 'deferred'])
    .contains('metadata', { response_id: responseId })
    .limit(1)
  if (prev && prev.length > 0) {
    results.push({ mission_id: mission.id, nudge_type: 'response_waiting', status: 'skipped', reason: 'already_sent' })
    return
  }

  if (dryRun) {
    results.push({ mission_id: mission.id, nudge_type: 'response_waiting', status: 'would_send' })
    return
  }

  const _steRes2 = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-transactional-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
    body: JSON.stringify({
      templateName,
      recipientEmail: email,
      idempotencyKey,
      templateData: {
        responderFirstName,
        missionTitle: mission.title,
        missionId: mission.id,
      },
      logMetadata: { mission_id: mission.id, response_id: responseId, nudge_type: 'response_waiting' },
    }),
  });
  const _steTxt2 = _steRes2.ok ? '' : await _steRes2.text().catch(() => '');
  if (!_steRes2.ok) console.error('send-transactional-email failed', _steRes2.status, _steTxt2);
  const sendErr = _steRes2.ok ? null : new Error(`send-transactional-email ${_steRes2.status}: ${_steTxt2}`);
  if (sendErr) {
    results.push({ mission_id: mission.id, nudge_type: 'response_waiting', status: 'error', reason: String(sendErr) })
    return
  }
  results.push({ mission_id: mission.id, nudge_type: 'response_waiting', status: 'sent' })
}

// Envoi générique d'une relance mission à un destinataire donné (auteur ou aidant).
// Mêmes garde-fous que sendNudge : compte actif, opt-in produit, suppression,
// dédup par template + destinataire + mission_id dans email_send_log.
async function sendMissionEmail(
  admin: ReturnType<typeof createClient>,
  ctx: {
    missionId: string
    recipientUserId: string
    templateName: string
    nudgeType: string
    extraData: Record<string, unknown>
  },
  results: Array<{ mission_id: string; nudge_type: string; status: string; reason?: string }>,
  dryRun?: boolean,
) {
  const { missionId, recipientUserId, templateName, nudgeType, extraData } = ctx
  const push = (status: string, reason?: string) =>
    results.push({ mission_id: missionId, nudge_type: nudgeType, status, reason })

  const { data: profile } = await admin
    .from('profiles')
    .select('id, email, first_name, account_status')
    .eq('id', recipientUserId)
    .maybeSingle()
  if (!profile || profile.account_status !== 'active') return push('skipped', 'recipient_inactive')

  let email = (profile.email as string | undefined)?.trim() || null
  if (!email) {
    const { data: authData } = await admin.auth.admin.getUserById(recipientUserId)
    email = authData?.user?.email ?? null
  }
  if (!email) return push('skipped', 'email_missing')

  const { data: prefs } = await admin
    .from('email_preferences')
    .select('product_emails')
    .eq('user_id', recipientUserId)
    .maybeSingle()
  if (prefs && prefs.product_emails === false) return push('skipped', 'opt_out')

  const { data: sup } = await admin
    .from('suppressed_emails')
    .select('email')
    .ilike('email', email)
    .maybeSingle()
  if (sup) return push('skipped', 'suppressed')

  const { data: prev } = await admin
    .from('email_send_log')
    .select('id')
    .eq('template_name', templateName)
    .eq('recipient_email', email)
    .in('status', ['sent', 'pending', 'deferred'])
    .contains('metadata', { mission_id: missionId })
    .limit(1)
  if (prev && prev.length > 0) return push('skipped', 'already_sent')

  if (dryRun) return push('would_send')

  const res = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-transactional-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
    body: JSON.stringify({
      templateName,
      recipientEmail: email,
      idempotencyKey: `${templateName}-${missionId}-${recipientUserId}`,
      templateData: { firstName: profile.first_name ?? undefined, ...extraData },
      logMetadata: { mission_id: missionId, nudge_type: nudgeType },
    }),
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    console.error('send-transactional-email failed', res.status, txt)
    return push('error', `send-transactional-email ${res.status}: ${txt}`)
  }
  push('sent')
}


function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
