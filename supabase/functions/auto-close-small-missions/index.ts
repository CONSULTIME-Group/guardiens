// auto-close-small-missions
// -----------------------------------------------------------------------------
// Ferme automatiquement les missions dormantes selon la nature du poste :
//   - besoin : status='open' AND
//              (end_date IS NOT NULL AND end_date < today) OR
//              (end_date IS NULL AND date_needed IS NOT NULL AND date_needed + 3j < today) OR
//              (créée depuis > 45j sans réponse pending)
//   - offre  : JAMAIS péremption automatique par date. La clôture d'une offre
//              se fait manuellement (statut completed/cancelled côté auteur).
// -> status='cancelled', closed_at=now(), close_reason='expired'
//
// Idempotence : filtre status='open' exclusif.
// Body accepté : { dry_run?: boolean, mission_id?: string }
import { createClient } from 'npm:@supabase/supabase-js@2.45.0'
import { startCronRun } from '../_shared/cron-run-log.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  let body: { dry_run?: boolean; mission_id?: string } = {}
  try { if (req.body) body = await req.json() } catch { /* noop */ }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
  const run = await startCronRun('auto-close-small-missions')
  const now = new Date()
  const nowIso = now.toISOString()
  const today = nowIso.slice(0, 10)
  const dateNeededCutoff = new Date(now.getTime() - 3 * 86400_000).toISOString().slice(0, 10)
  const createdAtCutoff = new Date(now.getTime() - 45 * 86400_000).toISOString()

  try {
    // Sélection large, on filtre besoin vs offre en mémoire.
    const { data: candidates, error } = await admin
      .from('small_missions')
      .select('id, user_id, title, mission_type, date_needed, end_date, created_at')
      .eq('status', 'open')
      .or(`end_date.lt.${today},date_needed.lt.${dateNeededCutoff},created_at.lt.${createdAtCutoff}`)
      .order('created_at', { ascending: true })
      .limit(500)

    if (error) throw error

    let filtered = candidates ?? []
    if (body.mission_id) filtered = filtered.filter((m) => m.id === body.mission_id)

    const toClose: Array<{ id: string; user_id: string; title: string; ageDays: number; reason: string }> = []

    for (const m of filtered) {
      // Les OFFRES ne périment jamais par date : clôture uniquement manuelle.
      if (m.mission_type === 'offre') continue

      const ageDays = Math.floor((now.getTime() - new Date(m.created_at).getTime()) / 86400_000)
      const push = (reason: string) => toClose.push({
        id: m.id, user_id: m.user_id, title: m.title || 'Votre mission', ageDays, reason,
      })

      // BESOIN daté : end_date d'abord, sinon date_needed (+ 3 jours de grâce)
      if (m.end_date && m.end_date < today) { push('end_date_past'); continue }
      if (!m.end_date && m.date_needed && m.date_needed < dateNeededCutoff) { push('date_needed_past'); continue }

      // Dormance : créée > 45 jours et aucune réponse pending
      if (m.created_at < createdAtCutoff) {
        const { count } = await admin
          .from('small_mission_responses')
          .select('id', { count: 'exact', head: true })
          .eq('mission_id', m.id)
          .eq('status', 'pending')
        if ((count ?? 0) === 0) push('dormant_45d')
      }
    }

    if (body.dry_run) {
      await run.finish('success', { dry_run: true, candidates: toClose.length })
      return json({ ok: true, dry_run: true, candidates: toClose.length, missions: toClose })
    }

    let closedCount = 0
    const errors: Array<{ mission_id: string; reason: string }> = []
    for (const m of toClose) {
      const { error: updErr } = await admin
        .from('small_missions')
        .update({ status: 'cancelled', closed_at: nowIso, close_reason: 'expired' })
        .eq('id', m.id)
        .eq('status', 'open')
      if (updErr) { errors.push({ mission_id: m.id, reason: updErr.message }); continue }
      closedCount++

      try {
        await admin.from('notifications').insert({
          user_id: m.user_id,
          type: 'mission_auto_closed',
          title: 'Votre mission a été clôturée automatiquement',
          body: `« ${m.title} » a été clôturée après ${m.ageDays} jours sans activité. Vous pouvez la republier.`,
          link: `/petites-missions/${m.id}`,
          actor_name: 'Système',
        })

        const { data: profile } = await admin
          .from('profiles')
          .select('email, first_name, account_status')
          .eq('id', m.user_id)
          .maybeSingle()
        let email = (profile?.email as string | undefined)?.trim() || null
        if (!email) {
          const { data: authData } = await admin.auth.admin.getUserById(m.user_id)
          email = authData?.user?.email ?? null
        }
        if (!email || profile?.account_status !== 'active') continue

        const { data: prefs } = await admin
          .from('email_preferences')
          .select('product_emails')
          .eq('user_id', m.user_id)
          .maybeSingle()
        if (prefs && prefs.product_emails === false) continue

        const { data: sup } = await admin
          .from('suppressed_emails')
          .select('email')
          .ilike('email', email)
          .maybeSingle()
        if (sup) continue

        await admin.functions.invoke('send-transactional-email', {
          body: {
            templateName: 'mission-auto-closed',
            recipientEmail: email,
            idempotencyKey: `mission-auto-closed-${m.id}`,
            templateData: {
              firstName: profile?.first_name ?? undefined,
              missionTitle: m.title,
              missionId: m.id,
              ageDays: m.ageDays,
            },
            metadata: { mission_id: m.id, close_reason: 'expired', age_days: m.ageDays, reason: m.reason },
          },
        })
      } catch (e) {
        console.warn('[auto-close] notify/email failed', m.id, e)
      }
    }

    await run.finish('success', { closed: closedCount, examined: filtered.length, errors: errors.length })
    return json({ ok: true, closed: closedCount, errors, examined: filtered.length })
  } catch (err) {
    console.error('[auto-close-small-missions] fatal', err)
    await run.fail(err)
    return json({ error: String(err) }, 500)
  }
})

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
