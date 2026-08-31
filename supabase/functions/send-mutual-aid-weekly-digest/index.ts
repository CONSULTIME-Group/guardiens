// send-mutual-aid-weekly-digest
// -----------------------------------------------------------------------------
// Digest hebdomadaire "le fil de l'entraide", chaque mardi 8h UTC.
// Le plan d'envoi est calcule entierement en SQL par
// public.mutual_aid_weekly_digest_plan : rayon d'entraide du membre,
// opt-in par defaut, disponibilite pour aider, suppressions, et garde-fou
// "aucune annonce dans le rayon". Cote fonction, on se contente d'envoyer.
// Body : { dry_run?: boolean, recipient_id?: string, manual?: boolean }
import { createClient } from 'npm:@supabase/supabase-js@2.45.0'
import { requireCronCaller } from '../_shared/require-cron-caller.ts'
import { startCronRun } from '../_shared/cron-run-log.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const TEMPLATE = 'mutual-aid-weekly-digest'
const BATCH_SIZE = 20

interface PlanRow {
  user_id: string
  email: string | null
  first_name: string | null
  city: string | null
  radius_km: number | null
  nb_nouvelles: number | null
  missions: unknown
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const guard = await requireCronCaller(req, corsHeaders, 'send-mutual-aid-weekly-digest')
  if (guard) return guard

  const run = await startCronRun('send-mutual-aid-weekly-digest')
  let body: { dry_run?: boolean; recipient_id?: string; manual?: boolean } = {}
  try { if (req.body) body = await req.json() } catch { /* noop */ }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
  const now = Date.now()
  const weekAgoIso = new Date(now - 7 * 86400_000).toISOString()
  const dedupWindowIso = new Date(now - 6 * 86400_000).toISOString()

  try {
    // === 1. Plan d'envoi, une seule requete ===
    const { data: planData, error: planErr } = await admin.rpc(
      'mutual_aid_weekly_digest_plan',
      { p_max_radius_km: 30, p_new_since_days: 7, p_max_missions: 5 },
    )
    if (planErr) throw planErr

    let planRows = (planData ?? []) as unknown as PlanRow[]
    if (body.recipient_id) {
      planRows = planRows.filter((r) => r.user_id === body.recipient_id)
    }
    planRows = planRows.filter((r) => !!r.email)

    const planned = planRows.length
    if (planned === 0) {
      await run.finish('success', { planned: 0, sent: 0, skipped: 0, failed: 0, dry_run: !!body.dry_run })
      return json({ ok: true, planned: 0, sent: 0, skipped: 0, failed: 0, reason: 'no_plan' })
    }

    // === 2. Contenu decoratif, charge une seule fois. Il ne declenche jamais
    // un envoi a lui seul : seul le plan decide qui recoit le mail. ===
    const { data: recentFeedbacks } = await admin
      .from('mission_feedbacks')
      .select('receiver_id, badge_key, created_at')
      .not('badge_key', 'is', null)
      .gte('created_at', weekAgoIso)
      .limit(2000)

    const badgeCount = new Map<string, number>()
    for (const f of recentFeedbacks ?? []) {
      badgeCount.set(f.receiver_id, (badgeCount.get(f.receiver_id) ?? 0) + 1)
    }
    const topMemberIds = [...badgeCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id, count]) => ({ id, count }))

    let topMembers: Array<{ userId: string; firstName?: string; city?: string | null; badgesCount: number }> = []
    if (topMemberIds.length > 0) {
      const { data: profs } = await admin
        .from('profiles')
        .select('id, first_name, city')
        .in('id', topMemberIds.map((t) => t.id))
      const byId = new Map((profs ?? []).map((p) => [p.id, p]))
      topMembers = topMemberIds.map((t) => ({
        userId: t.id,
        firstName: byId.get(t.id)?.first_name ?? undefined,
        city: byId.get(t.id)?.city ?? null,
        badgesCount: t.count,
      }))
    }

    const { data: recentQuestions } = await admin
      .from('community_questions')
      .select('id, title, city, answers_count, created_at')
      .eq('is_hidden', false)
      .gte('created_at', weekAgoIso)
      .order('answers_count', { ascending: false })
      .limit(3)
    const questions = (recentQuestions ?? []).map((q) => ({
      id: q.id,
      title: q.title,
      city: q.city,
      answersCount: q.answers_count ?? 0,
    }))

    // === 3. Envoi par lots de 20 en parallele ===
    let sent = 0
    let skipped = 0
    let failed = 0
    const errors: Array<{ user_id: string; reason: string }> = []
    const dayKey = new Date().toISOString().slice(0, 10)

    async function processOne(row: PlanRow): Promise<'sent' | 'skipped' | 'failed'> {
      const email = (row.email ?? '').trim()
      if (!email) return 'skipped'

      if (!body.manual) {
        const { data: prev } = await admin
          .from('email_send_log')
          .select('id')
          .eq('template_name', TEMPLATE)
          .eq('recipient_email', email)
          .in('status', ['sent', 'pending', 'deferred'])
          .gte('created_at', dedupWindowIso)
          .limit(1)
        if (prev && prev.length > 0) return 'skipped'
      }

      if (body.dry_run) return 'skipped'

      const idem = body.manual
        ? `${TEMPLATE}-${row.user_id}-${Date.now()}`
        : `${TEMPLATE}-${row.user_id}-${dayKey}`

      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SERVICE_KEY}` },
        body: JSON.stringify({
          templateName: TEMPLATE,
          recipientEmail: email,
          idempotencyKey: idem,
          templateData: {
            firstName: row.first_name ?? undefined,
            city: row.city ?? null,
            radiusKm: row.radius_km ?? null,
            newCount: Number(row.nb_nouvelles ?? 0),
            missions: Array.isArray(row.missions) ? row.missions : [],
            questions,
            topMembers,
          },
          logMetadata: { digest: 'mutual_aid_weekly' },
        }),
      })
      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        console.error('send-transactional-email failed', res.status, txt)
        errors.push({ user_id: row.user_id, reason: `send-transactional-email ${res.status}: ${txt}` })
        return 'failed'
      }
      return 'sent'
    }

    for (let i = 0; i < planRows.length; i += BATCH_SIZE) {
      const batch = planRows.slice(i, i + BATCH_SIZE)
      const outcomes = await Promise.all(batch.map(async (row) => {
        try {
          return await processOne(row)
        } catch (e) {
          console.error('[send-mutual-aid-weekly-digest] recipient failed', row.user_id, e)
          errors.push({ user_id: row.user_id, reason: String(e) })
          return 'failed' as const
        }
      }))
      for (const outcome of outcomes) {
        if (outcome === 'sent') sent++
        else if (outcome === 'skipped') skipped++
        else failed++
      }
    }

    // Surveillance : un ecart d'envoi de plus de 20 pour cent remonte en
    // 'partial', pour que les alertes existantes voient le digest mourir.
    const missionCounts = planRows.map((r) => (Array.isArray(r.missions) ? r.missions.length : 0))
    const avgMissions = planned > 0
      ? missionCounts.reduce((a, b) => a + b, 0) / planned
      : 0
    const status = !body.dry_run && sent < planned * 0.8 ? 'partial' : 'success'

    await run.finish(status, {
      planned,
      sent,
      skipped,
      failed,
      avg_missions: Number(avgMissions.toFixed(2)),
      dry_run: !!body.dry_run,
      shortfall_ratio: planned > 0 ? Number((1 - sent / planned).toFixed(2)) : 0,
    })

    return json({
      ok: true,
      planned,
      sent,
      skipped,
      failed,
      avg_missions: Number(avgMissions.toFixed(2)),
      dry_run: !!body.dry_run,
      errors: errors.slice(0, 20),
    })
  } catch (err) {
    console.error('[send-mutual-aid-weekly-digest] fatal', err)
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
