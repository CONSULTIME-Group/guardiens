// send-mutual-aid-weekly-digest
// -----------------------------------------------------------------------------
// Digest hebdomadaire "le fil de l'entraide", chaque mardi 8h UTC.
// Le plan d'envoi est calcule entierement en SQL par
// public.mutual_aid_weekly_digest_plan : rayon d'entraide du membre,
// opt-in par defaut, disponibilite pour aider, suppressions, et garde-fou
// "aucune annonce dans le rayon". Cote fonction, on se contente d'envoyer.
// Body : { dry_run?: boolean, recipient_id?: string, manual?: boolean, pass?: 'catch_up' }
// Rattrapage (lot A15) : second passage le mardi 10:00 UTC, meme plan, meme cle
// anti-doublon, meme verification du journal sur 6 jours.
// Lot CRON1 (16/10/2026) : envois un par un, espacés, attente du délai annoncé
// par la limite de débit dans le budget du passage, puis arrêt propre ; le
// reste part au rattrapage (le journal ne contient rien pour ces membres).
// Avant : 30 envois par passage, 15 à 89 membres sans résumé chaque semaine.
import { createClient } from 'npm:@supabase/supabase-js@2.45.0'
import { requireCronCaller } from '../_shared/require-cron-caller.ts'
import { startCronRun } from '../_shared/cron-run-log.ts'
import { DigestErrorCollector, errorStatusKey } from '../_shared/digest-batching.ts'
import { OUTBOUND_SEND_SPACING_MS, sendWithinRateLimit } from '../_shared/outbound-rate-limit.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const TEMPLATE = 'mutual-aid-weekly-digest'

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
  let body: { dry_run?: boolean; recipient_id?: string; manual?: boolean; pass?: string } = {}
  try { if (req.body) body = await req.json() } catch { /* noop */ }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
  const now = Date.now()
  const startedAt = now
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

    const pass = body.pass === 'catch_up' ? 'catch_up' : 'main'
    const planned = planRows.length
    if (planned === 0) {
      await run.finish('success', { planned: 0, sent: 0, skipped: 0, failed: 0, dry_run: !!body.dry_run, pass, duration_ms: Date.now() - startedAt })
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

    // === 3. Envoi un par un, espacé (lot CRON1) ===
    const collector = new DigestErrorCollector()
    const dayKey = new Date().toISOString().slice(0, 10)

    let stopForRateLimit = false
    let deferred = 0

    async function processOne(row: PlanRow): Promise<'sent' | 'skipped' | 'failed' | 'deferred'> {
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

      const sendBody = JSON.stringify({
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
        })
      const outcome = await sendWithinRateLimit(async () => {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SERVICE_KEY}` },
          body: sendBody,
        })
        return { ok: res.ok, status: res.status, body: res.ok ? '' : await res.text().catch(() => '') }
      }, { startedAtMs: startedAt })
      if (outcome.kind === 'rate_limited') {
        stopForRateLimit = true
        return 'deferred'
      }
      if (outcome.kind === 'failed') {
        console.error('send-transactional-email failed', outcome.detail.slice(0, 200))
        collector.add(row.user_id, outcome.detail.slice(0, 3), outcome.detail)
        return 'failed'
      }
      return 'sent'
    }

    let sent = 0
    let skipped = 0
    let failed = 0
    let lastSendAt = 0
    for (let i = 0; i < planRows.length; i++) {
      const row = planRows[i]
      if (stopForRateLimit) {
        deferred += planRows.length - i
        break
      }
      const wait = OUTBOUND_SEND_SPACING_MS - (Date.now() - lastSendAt)
      if (lastSendAt > 0 && wait > 0) await new Promise((r) => setTimeout(r, wait))
      try {
        const o = await processOne(row)
        if (o === 'sent' || o === 'failed') lastSendAt = Date.now()
        if (o === 'sent') sent++
        else if (o === 'skipped') skipped++
        else if (o === 'failed') failed++
        else deferred++
      } catch (e) {
        console.error('[send-mutual-aid-weekly-digest] recipient failed', row.user_id, e)
        collector.add(row.user_id, errorStatusKey(e), e)
        failed++
      }
    }

    // Surveillance : un ecart d'envoi de plus de 20 pour cent remonte en
    // 'partial', pour que les alertes existantes voient le digest mourir.
    const missionCounts = planRows.map((r) => (Array.isArray(r.missions) ? r.missions.length : 0))
    const avgMissions = planned > 0
      ? missionCounts.reduce((a, b) => a + b, 0) / planned
      : 0
    // Lot CRON1 : un reste reporté par la limite de débit au passage principal
    // part au rattrapage sans alerte ; au rattrapage, tout membre non servi,
    // tout vrai échec ou un écart de plus de 20 pour cent passe en 'partial'.
    const served = sent + skipped
    const status = body.dry_run
      ? 'success'
      : failed > 0 || (pass === 'catch_up' && (deferred > 0 || served < planned * 0.8))
        ? 'partial'
        : 'success'

    await run.finish(status, {
      planned,
      sent,
      skipped,
      failed,
      deferred,
      avg_missions: Number(avgMissions.toFixed(2)),
      dry_run: !!body.dry_run,
      shortfall_ratio: planned > 0 ? Number((1 - sent / planned).toFixed(2)) : 0,
      pass,
      errors: collector.errors,
      failed_by_status: collector.byStatus,
      duration_ms: Date.now() - startedAt,
    })

    return json({
      ok: true,
      planned,
      sent,
      skipped,
      failed,
      avg_missions: Number(avgMissions.toFixed(2)),
      dry_run: !!body.dry_run,
      pass,
      errors: collector.errors,
      failed_by_status: collector.byStatus,
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
