// auto-close-small-missions
// -----------------------------------------------------------------------------
// Ferme automatiquement les missions dormantes :
//  - status='open' AND date_needed IS NOT NULL AND date_needed + 3j < now()
//  - OR    status='open' AND created_at + 45j < now() AND aucune small_mission_responses pending
// -> status='cancelled', closed_at=now(), close_reason='expired'
// Envoie l'événement `mission_auto_closed` via notify-mission-event (fanout notif + email).
//
// Idempotence : filtre `status='open'` déjà exclusif.
// Body accepté : { dry_run?: boolean, mission_id?: string }
import { createClient } from 'npm:@supabase/supabase-js@2.45.0'

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
  const now = new Date()
  const nowIso = now.toISOString()
  const dateNeededCutoff = new Date(now.getTime() - 3 * 86400_000).toISOString().slice(0, 10)
  const createdAtCutoff = new Date(now.getTime() - 45 * 86400_000).toISOString()

  try {
    // Sélection : status='open' AND (date_needed < cutoff OR created_at < 45j)
    const { data: candidates, error } = await admin
      .from('small_missions')
      .select('id, user_id, title, date_needed, created_at')
      .eq('status', 'open')
      .or(`date_needed.lt.${dateNeededCutoff},created_at.lt.${createdAtCutoff}`)
      .order('created_at', { ascending: true })
      .limit(500)

    if (error) throw error

    let filtered = candidates ?? []
    if (body.mission_id) filtered = filtered.filter((m) => m.id === body.mission_id)

    const toClose: Array<{ id: string; user_id: string; title: string; ageDays: number }> = []

    for (const m of filtered) {
      // Si mission datée expirée : on ferme sans vérifier réponses pending
      const dateNeededExpired = m.date_needed && m.date_needed < dateNeededCutoff
      if (dateNeededExpired) {
        toClose.push({
          id: m.id, user_id: m.user_id, title: m.title || 'Votre mission',
          ageDays: Math.floor((now.getTime() - new Date(m.created_at).getTime()) / 86400_000),
        })
        continue
      }

      // Sinon (créée >45j) : vérifier absence de réponses pending
      const { count } = await admin
        .from('small_mission_responses')
        .select('id', { count: 'exact', head: true })
        .eq('mission_id', m.id)
        .eq('status', 'pending')
      if ((count ?? 0) === 0) {
        toClose.push({
          id: m.id, user_id: m.user_id, title: m.title || 'Votre mission',
          ageDays: Math.floor((now.getTime() - new Date(m.created_at).getTime()) / 86400_000),
        })
      }
    }

    if (body.dry_run) {
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

      // Notifie l'auteur (best effort)
      try {
        await admin.functions.invoke('notify-mission-event', {
          body: {
            event_type: 'mission_auto_closed',
            mission_id: m.id,
            actor_id: m.user_id, // système : agit au nom de l'auteur (self-target ignoré, on force target_ids)
            target_ids: [m.user_id],
            metadata: { close_reason: 'expired', age_days: m.ageDays },
          },
        })
      } catch (e) {
        console.warn('[auto-close] notify failed', m.id, e)
      }
    }

    return json({ ok: true, closed: closedCount, errors, examined: filtered.length })
  } catch (err) {
    console.error('[auto-close-small-missions] fatal', err)
    return json({ error: String(err) }, 500)
  }
})

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
