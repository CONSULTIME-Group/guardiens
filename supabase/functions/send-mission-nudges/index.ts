// send-mission-nudges
// -----------------------------------------------------------------------------
// Envoie 2 types de nudges au propriétaire d'une mission :
//  - `feedback` : mission completed depuis 48h à 72h, sans feedback de l'auteur
//  - `no_response` : mission open depuis 7j sans aucune small_mission_responses
// Anti-spam : chaque nudge ne part qu'une seule fois par mission (dédup via email_send_log).
// Respecte suppression et opt-in `email_preferences.product_emails`.
// Body : { dry_run?: boolean, mission_id?: string, kind?: 'feedback'|'no_response' }
import { createClient } from 'npm:@supabase/supabase-js@2.45.0'

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

  let body: { dry_run?: boolean; mission_id?: string; kind?: 'feedback' | 'no_response' } = {}
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

    return json({ ok: true, dry_run: !!body.dry_run, total: results.length, results })
  } catch (err) {
    console.error('[send-mission-nudges] fatal', err)
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
    .in('status', ['sent', 'pending'])
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

  const { error: sendErr } = await admin.functions.invoke('send-transactional-email', {
    body: {
      templateName,
      recipientEmail: email,
      idempotencyKey,
      templateData: {
        firstName: profile.first_name ?? undefined,
        missionTitle: m.title,
        missionId: m.id,
      },
      metadata: { mission_id: m.id, nudge_type: kind },
    },
  })
  if (sendErr) {
    results.push({ mission_id: m.id, nudge_type: kind, status: 'error', reason: String(sendErr) })
    return
  }
  results.push({ mission_id: m.id, nudge_type: kind, status: 'sent' })
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
