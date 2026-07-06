// send-mission-daily-digest
// -------------------------------------------------------------
// Envoie chaque soir un digest quotidien aux "helpers" ayant au moins une
// entrée `queued` dans `mission_notification_queue`. Pour chaque helper :
//  - top 3 par (distance ASC NULLS LAST, queued_at DESC)
//  - anti-doublon : pas de digest dans les 24h (via email_send_log)
//  - vérification suppression, opt-in email_preferences.new_mission_digest
//  - envoi via `send-transactional-email` (template 'mission-daily-digest')
//  - marque les entrées : top 3 → sent, reste → skipped (raison digest_cap_3)
//
// Body accepté : { manual?: boolean, dry_run?: boolean, helper_id?: string }
import { createClient } from 'npm:@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface QueueRow {
  id: string
  helper_id: string
  mission_id: string
  distance_km: number | null
  queued_at: string
}

interface MissionRow {
  id: string
  title: string | null
  city: string | null
  category: string | null
  date_needed: string | null
  duration_estimate: string | null
  exchange_offer: string | null
  status: string
  user_id: string
  mission_type: string | null
}

function formatFrDate(iso?: string | null): string | undefined {
  if (!iso) return undefined
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch { return iso }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  let body: { manual?: boolean; dry_run?: boolean; helper_id?: string } = {}
  try { if (req.body) body = await req.json() } catch { /* empty */ }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  )

  try {
    // 1) Récupère toutes les paires queued
    let q = supabase
      .from('mission_notification_queue')
      .select('id, helper_id, mission_id, distance_km, queued_at')
      .eq('status', 'queued')
    if (body.helper_id) q = q.eq('helper_id', body.helper_id)

    const { data: queued, error: qErr } = await q
    if (qErr) throw qErr
    if (!queued || queued.length === 0) {
      return json({ ok: true, helpers_processed: 0, reason: 'empty_queue' })
    }

    // 2) Regroupe par helper
    const byHelper = new Map<string, QueueRow[]>()
    for (const row of queued as QueueRow[]) {
      const arr = byHelper.get(row.helper_id) ?? []
      arr.push(row)
      byHelper.set(row.helper_id, arr)
    }

    const today = new Date().toISOString().slice(0, 10)
    let helpersSent = 0
    let helpersSkipped = 0
    const errors: Array<{ helper_id: string; reason: string }> = []
    const plan: Array<{ helper_id: string; missions: string[]; skipped: string[] }> = []

    const missionCache = new Map<string, MissionRow>()

    for (const [helperId, rows] of byHelper.entries()) {
      try {
        // 2a) Profil helper
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, first_name, account_status, profile_completion, email')
          .eq('id', helperId)
          .maybeSingle()

        if (!profile || profile.account_status !== 'active' || (profile.profile_completion ?? 0) < 40) {
          await markSkipped(supabase, rows.map(r => r.id), 'helper_not_eligible', body.dry_run)
          helpersSkipped++
          continue
        }

        // 2b) Prefs
        const { data: prefs } = await supabase
          .from('email_preferences')
          .select('new_mission_digest, product_emails')
          .eq('user_id', helperId)
          .maybeSingle()

        if (prefs && (prefs.new_mission_digest === false || prefs.product_emails === false)) {
          await markSkipped(supabase, rows.map(r => r.id), 'digest_opt_out', body.dry_run)
          helpersSkipped++
          continue
        }

        // 2c) Email
        let email = (profile.email as string | undefined)?.trim() || null
        if (!email) {
          const { data: authData } = await supabase.auth.admin.getUserById(helperId)
          email = authData?.user?.email ?? null
        }
        if (!email) {
          errors.push({ helper_id: helperId, reason: 'email_missing' })
          continue
        }

        // 2d) Suppression
        const { data: sup } = await supabase
          .from('suppressed_emails')
          .select('email')
          .ilike('email', email)
          .maybeSingle()
        if (sup) {
          await markSkipped(supabase, rows.map(r => r.id), 'email_suppressed', body.dry_run)
          helpersSkipped++
          continue
        }

        // 2e) Anti-doublon 24h
        if (!body.manual) {
          const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
          const { data: recent } = await supabase
            .from('email_send_log')
            .select('id')
            .eq('template_name', 'mission-daily-digest')
            .eq('recipient_email', email)
            .in('status', ['sent', 'pending'])
            .gte('created_at', since)
            .limit(1)
          if (recent && recent.length > 0) {
            await markSkipped(supabase, rows.map(r => r.id), 'already_sent_24h', body.dry_run)
            helpersSkipped++
            continue
          }
        }

        // 2f) Tri : distance ASC NULLS LAST, puis queued_at DESC
        const sorted = [...rows].sort((a, b) => {
          const aD = a.distance_km ?? Number.POSITIVE_INFINITY
          const bD = b.distance_km ?? Number.POSITIVE_INFINITY
          if (aD !== bD) return aD - bD
          return (b.queued_at ?? '').localeCompare(a.queued_at ?? '')
        })
        const top3 = sorted.slice(0, 3)
        const overflow = sorted.slice(3)

        // 2g) Charge missions
        const items: any[] = []
        for (const qr of top3) {
          let m = missionCache.get(qr.mission_id)
          if (!m) {
            const { data } = await supabase
              .from('small_missions')
              .select('id, title, city, category, date_needed, duration_estimate, exchange_offer, status, user_id, mission_type')
              .eq('id', qr.mission_id)
              .maybeSingle()
            if (data) { m = data as MissionRow; missionCache.set(qr.mission_id, m) }
          }
          if (!m || m.status !== 'open') {
            await markSkipped(supabase, [qr.id], 'mission_not_available', body.dry_run)
            continue
          }

          const { data: owner } = await supabase
            .from('profiles')
            .select('first_name')
            .eq('id', m.user_id)
            .maybeSingle()

          items.push({
            missionId: m.id,
            title: m.title,
            city: m.city,
            category: m.category,
            ownerFirstName: owner?.first_name ?? undefined,
            dateNeeded: formatFrDate(m.date_needed),
            duration: m.duration_estimate,
            exchangeOffer: m.exchange_offer,
            distanceKm: qr.distance_km,
            missionType: m.mission_type,
          })
        }

        if (items.length === 0) { helpersSkipped++; continue }

        plan.push({
          helper_id: helperId,
          missions: items.map(i => i.missionId),
          skipped: overflow.map(o => o.mission_id),
        })

        if (body.dry_run) continue

        const idem = body.manual
          ? `mission-digest-${helperId}-${Date.now()}`
          : `mission-digest-${helperId}-${today}`

        const { error: sendErr } = await supabase.functions.invoke('send-transactional-email', {
          body: {
            templateName: 'mission-daily-digest',
            recipientEmail: email,
            idempotencyKey: idem,
            templateData: {
              helperFirstName: profile.first_name ?? undefined,
              items,
            },
          },
        })
        if (sendErr) {
          errors.push({ helper_id: helperId, reason: `send_failed: ${String(sendErr)}` })
          continue
        }

        const sentIds = top3.filter(qr => items.find(i => i.missionId === qr.mission_id)).map(qr => qr.id)
        if (sentIds.length > 0) {
          await supabase.from('mission_notification_queue')
            .update({ status: 'sent', sent_at: new Date().toISOString() })
            .in('id', sentIds)
        }
        if (overflow.length > 0) {
          await supabase.from('mission_notification_queue')
            .update({ status: 'skipped', skip_reason: 'digest_cap_3' })
            .in('id', overflow.map(o => o.id))
        }
        helpersSent++
      } catch (loopErr) {
        errors.push({ helper_id: helperId, reason: String(loopErr) })
      }
    }

    return json({
      ok: true,
      helpers_processed: byHelper.size,
      helpers_sent: helpersSent,
      helpers_skipped: helpersSkipped,
      errors,
      dry_run: !!body.dry_run,
      plan: body.dry_run ? plan : undefined,
    })
  } catch (err) {
    console.error('send-mission-daily-digest fatal', err)
    return json({ error: String(err) }, 500)
  }
})

async function markSkipped(
  supabase: any,
  ids: string[],
  reason: string,
  dryRun?: boolean,
) {
  if (dryRun || ids.length === 0) return
  await supabase
    .from('mission_notification_queue')
    .update({ status: 'skipped', skip_reason: reason })
    .in('id', ids)
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
