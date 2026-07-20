// evaluate-journeys
// Cron worker: enrolls users into nurturing sequences based on declarative
// `enrollment_rule` (signup window, inactivity, behavioural conditions) and
// dispatches due steps via send-transactional-email.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { startCronRun } from '../_shared/cron-run-log.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type ExitCondition =
  | { type: 'profile_complete'; threshold: number }
  | { type: 'has_application' }
  | { type: 'has_completed_sit' }
  | { type: 'has_published_sit' }
  | { type: 'has_application_received' }
  | { type: 'reactivated'; days?: number }
  | { type: 'sitter_affinity_ready' }
  | { type: 'owner_affinity_ready' }
  | { type: 'has_mutual_aid_activity' }
  | { type: 'has_guard_activity' }
  | Record<string, never>

type EnrollmentRule =
  | { type: 'signup'; window_days?: number; min_age_days?: number }
  | { type: 'inactivity'; days: number; window_days?: number }
  | { type: 'owner_no_sit'; min_age_days?: number; window_days?: number }
  | { type: 'sitter_no_application'; min_age_days?: number; window_days?: number }
  | { type: 'active_referral'; min_age_days?: number; active_within_days?: number; window_days?: number }
  | { type: 'sitter_missing_affinity'; min_age_days?: number }
  | { type: 'owner_missing_affinity'; min_age_days?: number }
  | { type: 'helper_no_guard_activity'; min_age_days?: number; window_days?: number }

interface Step {
  id: string
  sequence_id: string
  step_order: number
  delay_hours: number
  template_name: string
  exit_condition: ExitCondition | null
}

interface Sequence {
  id: string
  key: string
  audience: string
  active: boolean
  enrollment_rule: EnrollmentRule
  anchor_field: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  // Restrict to internal callers (pg_cron / pg_net with service role), or an
  // authenticated admin user (manual trigger from /admin/nurturing).
  // NOTE: never accept the anon key — it's publicly embedded in the client bundle.
  const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
  let authorized = token === serviceKey
  if (!authorized && token) {
    try {
      const adminClient = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey)
      const { data: userData } = await adminClient.auth.getUser(token)
      if (userData?.user) {
        const { data: isAdmin } = await adminClient.rpc('has_role', {
          _user_id: userData.user.id,
          _role: 'admin',
        })
        if (isAdmin) authorized = true
      }
    } catch { /* fallthrough to 401 */ }
  }
  if (!authorized) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }


  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    serviceKey,
  )

  let dryRun = false
  try {
    const body = await req.json()
    dryRun = body?.dryRun === true
  } catch { /* cron */ }

  // Kick off the heavy work in the background so we always respond quickly and
  // never hit the 150s IDLE_TIMEOUT. Trace each run into cron_run_log so
  // /admin/nurturing has a real freshness signal even when 0 emails are due.
  const runWork = async () => {
    const run = dryRun ? null : await startCronRun('evaluate-journeys')
    try {
      const stats = await runEvaluation(supabase, dryRun)
      if (run) {
        await run.finish(stats.errors > 0 ? 'partial' : 'success', {
          enrolled: stats.enrolled,
          sent: stats.sent,
          exited: stats.exited,
          completed: stats.completed,
          skipped: stats.skipped,
          errors: stats.errors,
          capped: stats.capped,
        })
      }
      return stats
    } catch (e) {
      console.error('[evaluate-journeys] background run failed', e)
      if (run) await run.fail(e)
      throw e
    }
  }

  if (dryRun) {
    const stats = await runWork().catch(() => null)
    return new Response(JSON.stringify({ ok: true, dryRun, stats }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const work = runWork().catch(() => {})
  // @ts-ignore EdgeRuntime is provided by Supabase Edge runtime
  try { EdgeRuntime.waitUntil(work) } catch { /* ignore in non-edge env */ }

  return new Response(JSON.stringify({ ok: true, queued: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})

async function runEvaluation(
  supabase: ReturnType<typeof createClient>,
  dryRun: boolean,
) {
  const stats = {
    enrolled: 0, sent: 0, exited: 0, completed: 0, skipped: 0, errors: 0, capped: false,
    bySequence: {} as Record<string, { enrolled: number; sent: number; exited: number; skipped: number }>,
  }
  const bumpSeq = (key: string, field: 'enrolled' | 'sent' | 'exited' | 'skipped', n = 1) => {
    const r = stats.bySequence[key] ?? { enrolled: 0, sent: 0, exited: 0, skipped: 0 }
    r[field] += n
    stats.bySequence[key] = r
  }
  // Hard cap per run + global deadline so we never spin near the edge timeout.
  const MAX_SENDS_PER_RUN = 40
  const SEND_DELAY_MS = 250
  const DEADLINE_MS = Date.now() + 120_000 // stop after 2 min, well under 150s

  const { data: sequencesRaw } = await supabase
    .from('nurturing_sequences')
    .select('id, key, audience, active, enrollment_rule, anchor_field')
    .eq('active', true)

  const sequences = (sequencesRaw ?? []) as Sequence[]
  if (!sequences.length) return stats

  const { data: stepsRaw } = await supabase
    .from('nurturing_steps')
    .select('id, sequence_id, step_order, delay_hours, template_name, exit_condition')
    .order('step_order', { ascending: true })

  const stepsBySeq = new Map<string, Step[]>()
  for (const s of (stepsRaw ?? []) as Step[]) {
    const arr = stepsBySeq.get(s.sequence_id) ?? []
    arr.push(s)
    stepsBySeq.set(s.sequence_id, arr)
  }

  for (const seq of sequences) {
    if (Date.now() > DEADLINE_MS) { stats.capped = true; break }
    try {
      const enrolled = await enrollForSequence(supabase, seq, dryRun)
      stats.enrolled += enrolled
      if (enrolled) bumpSeq(seq.key, 'enrolled', enrolled)
    } catch (e) {
      console.error('[enrollment] failed', seq.key, e)
      stats.errors++
    }
  }

  const { data: activeJourneys } = await supabase
    .from('user_journeys')
    .select('id, user_id, sequence_key, current_step, started_at, last_step_at, created_at')
    .eq('status', 'active')
    .limit(2000)

  const seqByKey = new Map(sequences.map((s) => [s.key, s]))

  // Global frequency cap: at most 1 nurturing email per recipient per 48h,
  // toutes séquences confondues. On construit un set des destinataires déjà
  // servis récemment pour éviter une requête par journey.
  const FREQ_WINDOW_MS = 48 * 3600_000
  const freqSince = new Date(Date.now() - FREQ_WINDOW_MS).toISOString()
  const recentlyServed = new Set<string>()
  try {
    const { data: recent, error: recentErr } = await supabase
      .from('email_send_log')
      .select('recipient_email')
      .eq('status', 'sent')
      .gte('created_at', freqSince)
      .filter('metadata->>source', 'like', 'journey:%')
      .limit(10000)
    if (recentErr) throw recentErr
    for (const r of (recent ?? []) as Array<{ recipient_email: string | null }>) {
      if (r.recipient_email) recentlyServed.add(r.recipient_email.toLowerCase())
    }
  } catch (freqErr) {
    console.warn('[frequency-cap] lookup failed, proceeding without global cap', freqErr)
  }

  for (const j of activeJourneys ?? []) {
    if (stats.sent >= MAX_SENDS_PER_RUN) { stats.capped = true; break }
    if (Date.now() > DEADLINE_MS) { stats.capped = true; break }
    try {
      const seq = seqByKey.get(j.sequence_key)
      if (!seq) continue
      const steps = stepsBySeq.get(seq.id) ?? []
      const nextStep = steps.find((s) => s.step_order === j.current_step + 1)


      // No more steps → completed
      if (!nextStep) {
        if (!dryRun) {
          await supabase.from('user_journeys').update({
            status: 'completed', completed_at: new Date().toISOString(),
          }).eq('id', j.id)
        }
        stats.completed++
        continue
      }

      // Délais RELATIFS entre étapes (évite les rafales à l'enrôlement tardif).
      // Étape 1 : ancrée sur la date d'enrôlement (created_at de user_journeys).
      // Étapes suivantes : last_step_at + max(48h, delay_N - delay_{N-1}).
      const enrolledAtMs = new Date(j.created_at ?? j.started_at).getTime()
      const prevStep = steps.find((s) => s.step_order === j.current_step)
      let dueAt: number
      if (!prevStep) {
        dueAt = enrolledAtMs + Math.max(0, nextStep.delay_hours) * 3600_000
      } else {
        const rawGap = nextStep.delay_hours - prevStep.delay_hours
        const gapHours = Math.max(48, rawGap)
        const refMs = j.last_step_at ? new Date(j.last_step_at).getTime() : enrolledAtMs
        dueAt = refMs + gapHours * 3600_000
      }
      if (Date.now() < dueAt) continue

      // Exit condition check
      const exited = await checkExitCondition(supabase, j.user_id, nextStep.exit_condition)
      if (exited) {
        if (!dryRun) {
          await supabase.from('user_journeys').update({
            status: 'exited',
            exit_reason: `step_${nextStep.step_order}_${nextStep.exit_condition?.type ?? 'goal_met'}`,
            completed_at: new Date().toISOString(),
          }).eq('id', j.id)
          await supabase.from('journey_step_log').insert({
            journey_id: j.id, step_order: nextStep.step_order,
            template_name: nextStep.template_name, sent: false, reason: 'exit_condition_met',
          })
        }
        stats.exited++
        bumpSeq(j.sequence_key, 'exited')
        continue
      }

      if (dryRun) { stats.sent++; bumpSeq(j.sequence_key, 'sent'); continue }

      const { data: profile } = await supabase
        .from('profiles')
        .select('email, first_name, last_seen_at')
        .eq('id', j.user_id)
        .maybeSingle()
      if (!profile?.email) {
        await supabase.from('journey_step_log').insert({
          journey_id: j.id, step_order: nextStep.step_order,
          template_name: nextStep.template_name, sent: false, reason: 'no_email',
        })
        await supabase.from('user_journeys').update({
          status: 'exited', exit_reason: 'no_email', completed_at: new Date().toISOString(),
        }).eq('id', j.id)
        stats.skipped++
        bumpSeq(j.sequence_key, 'skipped')
        continue
      }

      // Garde de fréquence globale : max 1 email de nurturing / 48h / destinataire.
      // On ne fait PAS avancer current_step : l'étape repartira au prochain run éligible.
      if (recentlyServed.has(profile.email.toLowerCase())) {
        await supabase.from('journey_step_log').insert({
          journey_id: j.id, step_order: nextStep.step_order,
          template_name: nextStep.template_name, sent: false, reason: 'frequency_capped',
        })
        stats.skipped++
        bumpSeq(j.sequence_key, 'skipped')
        continue
      }

      const idempotencyKey = `journey-${j.sequence_key}-${j.id}-step-${nextStep.step_order}`

      // Enrichissement contextuel : pour les séquences owner-no-sit-*, on
      // hydrate ville, gardiens à proximité et top 3 prénoms via la RPC PG.
      // Fail-open : si la RPC échoue ou renvoie null, on envoie sans ces champs.
      let ownerContext: Record<string, unknown> = {}
      if (j.sequence_key === 'owner-no-sit-relance') {
        try {
          const { data: ctx } = await supabase.rpc('get_owner_nurturing_context', { _owner_id: j.user_id })
          if (ctx && typeof ctx === 'object') {
            ownerContext = ctx as Record<string, unknown>
          }
        } catch (ctxErr) {
          console.warn('[owner-context] rpc failed, sending without enrichment', ctxErr)
        }
      }

      const sendRes = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-transactional-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({
          templateName: nextStep.template_name,
          recipientEmail: profile.email,
          idempotencyKey,
          templateData: {
            firstName: profile.first_name,
            first_name: profile.first_name,
            journey_id: j.id,
            step: nextStep.step_order,
            daysSinceLastSeen: profile.last_seen_at
              ? Math.floor((Date.now() - new Date(profile.last_seen_at).getTime()) / 86400_000)
              : undefined,
            ...ownerContext,
          },
          metadata: { source: `journey:${j.sequence_key}:${nextStep.step_order}`, user_id: j.user_id },
        }),
      })

      const sendOk = sendRes.ok
      let reason: string | null = null
      let errorDetail: Record<string, unknown> | null = null
      let messageId: string | null = null
      let actuallySent = sendOk
      if (!sendOk) {
        const errBody = await sendRes.text().catch(() => '')
        reason = `send_failed_${sendRes.status}`
        errorDetail = {
          status: sendRes.status,
          body_excerpt: errBody.slice(0, 1000),
          template: nextStep.template_name,
          at: new Date().toISOString(),
        }
        console.error('[ALERT] Journey step send failed', {
          journey_id: j.id,
          sequence: j.sequence_key,
          step: nextStep.step_order,
          ...errorDetail,
        })
      } else {
        try {
          const okBody = await sendRes.json()
          messageId = typeof okBody?.messageId === 'string' ? okBody.messageId : null
          const notReallySent =
            okBody?.skipped === true ||
            okBody?.sent === false ||
            okBody?.success === false
          if (notReallySent) {
            actuallySent = false
            reason = okBody?.reason ? `skipped_${okBody.reason}` : 'skipped'
          }
        } catch {
          messageId = null
        }

        if (actuallySent && !messageId) {
          const { data: logRow } = await supabase
            .from('email_send_log')
            .select('message_id')
            .eq('template_name', nextStep.template_name)
            .eq('recipient_email', profile.email)
            .filter('metadata->>idempotency_key', 'eq', idempotencyKey)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
          if (logRow?.message_id) messageId = logRow.message_id as string
        }
      }

      await supabase.from('journey_step_log').insert({
        journey_id: j.id, step_order: nextStep.step_order,
        template_name: nextStep.template_name, sent: actuallySent, reason, error_detail: errorDetail,
        message_id: messageId,
      })

      await supabase.from('user_journeys').update({
        current_step: nextStep.step_order,
        last_step_at: new Date().toISOString(),
      }).eq('id', j.id)

      if (actuallySent) {
        stats.sent++
        bumpSeq(j.sequence_key, 'sent')
        recentlyServed.add(profile.email.toLowerCase())
        await new Promise((r) => setTimeout(r, SEND_DELAY_MS))
      } else {
        stats.skipped++
        bumpSeq(j.sequence_key, 'skipped')
      }

    } catch (err) {
      console.error('Journey eval error', j.id, err)
      stats.errors++
      // Trace exploitable, plus de defaillance silencieuse. On tente
      // d'insérer une ligne journey_step_log ; si l'insert lui-même casse,
      // on absorbe pour ne pas relancer l'exception dans la boucle.
      try {
        const msg = err instanceof Error ? err.message : String(err)
        await supabase.from('journey_step_log').insert({
          journey_id: j.id,
          step_order: (j.current_step ?? 0) + 1,
          template_name: 'unknown',
          sent: false,
          reason: 'eval_error',
          error_detail: {
            message: msg.slice(0, 500),
            sequence_key: j.sequence_key,
            attempted_step: (j.current_step ?? 0) + 1,
            at: new Date().toISOString(),
          },
        })
      } catch (logErr) {
        console.error('[eval-error] failed to log', logErr)
      }
    }
  }

  // Alerte proactive dans admin_signals si run anormal (erreurs > 10,
  // enrôlements > 100, ou 3 runs consécutifs non-success). Dédup 24h.
  if (!dryRun) {
    try {
      await maybeInsertRunAnomaly(supabase, stats)
    } catch (sigErr) {
      console.warn('[anomaly-signal] insert failed', sigErr)
    }
  }

  return stats
}

// Sentinel UUID pour signaux non attachés à une entité métier.
const CRON_ENTITY_ID = '00000000-0000-0000-0000-000000000000'

async function maybeInsertRunAnomaly(
  supabase: ReturnType<typeof createClient>,
  stats: { enrolled: number; sent: number; exited: number; skipped: number; errors: number; capped: boolean; bySequence: Record<string, unknown> },
) {
  // 3 runs consécutifs non success (partial ou failed)
  const { data: recentRuns } = await supabase
    .from('cron_run_log')
    .select('status')
    .eq('edge_name', 'evaluate-journeys')
    .not('finished_at', 'is', null)
    .order('started_at', { ascending: false })
    .limit(3)
  const threeInARow =
    (recentRuns?.length ?? 0) === 3 &&
    (recentRuns as Array<{ status: string }>).every((r) => r.status !== 'success')

  const trigger =
    stats.errors > 10
      ? `errors=${stats.errors}`
      : stats.enrolled > 100
        ? `enrolled=${stats.enrolled}`
        : threeInARow
          ? '3_runs_non_success'
          : null

  if (!trigger) return

  // Dedup : pas de nouveau signal non résolu du même type dans les 24h.
  const since = new Date(Date.now() - 24 * 3600_000).toISOString()
  const { data: existing } = await supabase
    .from('admin_signals')
    .select('id')
    .eq('signal_type', 'nurturing_run_anomaly')
    .is('resolved_at', null)
    .gte('detected_at', since)
    .limit(1)
  if (existing && existing.length > 0) return

  await supabase.from('admin_signals').insert({
    signal_type: 'nurturing_run_anomaly',
    severity: 'critical',
    entity_type: 'cron_run',
    entity_id: CRON_ENTITY_ID,
    metadata: {
      title: `Nurturing anormal, ${trigger}`,
      trigger,
      enrolled: stats.enrolled,
      sent: stats.sent,
      exited: stats.exited,
      skipped: stats.skipped,
      errors: stats.errors,
      capped: stats.capped,
      by_sequence: stats.bySequence,
    },
  })
}


// ---------------------------------------------------------------------------
// Enrollment dispatch
// ---------------------------------------------------------------------------
async function enrollForSequence(
  supabase: ReturnType<typeof createClient>,
  seq: Sequence,
  dryRun: boolean,
): Promise<number> {
  const audienceFilter =
    seq.audience === 'sitter' ? ['sitter', 'both']
    : seq.audience === 'owner' ? ['owner', 'both']
    : null

  const rule = seq.enrollment_rule ?? { type: 'signup', window_days: 7 }
  const windowDays = rule.window_days ?? 7
  const nowMs = Date.now()

  // Build candidates list according to rule type
  let candidates: Array<{ id: string; anchor_at: string }> = []

  if (rule.type === 'signup') {
    // Optional min_age_days targets users older than N days.
    // Candidates: created between (min_age_days + window_days) and min_age_days ago.
    const minAge = (rule as { min_age_days?: number }).min_age_days ?? 0
    const upperBound = new Date(nowMs - minAge * 86400_000).toISOString()
    const lowerBound = new Date(nowMs - (minAge + windowDays) * 86400_000).toISOString()
    let q = supabase
      .from('profiles')
      .select('id, role, created_at')
      .gte('created_at', lowerBound)
      .lte('created_at', upperBound)
      .not('email', 'is', null)
      .eq('account_status', 'active')
    if (audienceFilter) q = q.in('role', audienceFilter)
    const { data } = await q.limit(500)
    candidates = (data ?? []).map((c: { id: string; created_at: string }) => ({
      id: c.id, anchor_at: c.created_at,
    }))
  } else if (rule.type === 'inactivity') {
    const minAgo = new Date(nowMs - rule.days * 86400_000).toISOString()
    const maxAgo = new Date(nowMs - (rule.days + windowDays) * 86400_000).toISOString()
    let q = supabase
      .from('profiles')
      .select('id, role, last_seen_at')
      .lt('last_seen_at', minAgo)
      .gt('last_seen_at', maxAgo)
      .not('email', 'is', null)
      .eq('account_status', 'active')
    if (audienceFilter) q = q.in('role', audienceFilter)
    const { data } = await q.limit(500)
    candidates = (data ?? [])
      .filter((c: { last_seen_at: string | null }) => !!c.last_seen_at)
      .map((c: { id: string; last_seen_at: string }) => ({ id: c.id, anchor_at: c.last_seen_at }))
  } else if (rule.type === 'owner_no_sit') {
    const minAge = rule.min_age_days ?? 7
    const minAgeAt = new Date(nowMs - minAge * 86400_000).toISOString()
    const windowAt = new Date(nowMs - (minAge + windowDays) * 86400_000).toISOString()
    let q = supabase
      .from('profiles')
      .select('id, role, created_at')
      .lt('created_at', minAgeAt)
      .gt('created_at', windowAt)
      .not('email', 'is', null)
      .eq('account_status', 'active')
      .in('role', ['owner', 'both'])
    const { data } = await q.limit(500)
    const ownerIds = (data ?? []).map((c: { id: string }) => c.id)
    if (ownerIds.length === 0) return 0
    const { data: withSit } = await supabase
      .from('sits').select('user_id').in('user_id', ownerIds)
    const withSitSet = new Set((withSit ?? []).map((s: { user_id: string }) => s.user_id))
    candidates = (data ?? [])
      .filter((c: { id: string }) => !withSitSet.has(c.id))
      .map((c: { id: string; created_at: string }) => ({ id: c.id, anchor_at: c.created_at }))
  } else if (rule.type === 'sitter_no_application') {
    const minAge = rule.min_age_days ?? 14
    const minAgeAt = new Date(nowMs - minAge * 86400_000).toISOString()
    const windowAt = new Date(nowMs - (minAge + windowDays) * 86400_000).toISOString()
    let q = supabase
      .from('profiles')
      .select('id, role, created_at')
      .lt('created_at', minAgeAt)
      .gt('created_at', windowAt)
      .not('email', 'is', null)
      .eq('account_status', 'active')
      .in('role', ['sitter', 'both'])
    const { data } = await q.limit(500)
    const sitterIds = (data ?? []).map((c: { id: string }) => c.id)
    if (sitterIds.length === 0) return 0
    const { data: withApp } = await supabase
      .from('applications').select('sitter_id').in('sitter_id', sitterIds)
    const withAppSet = new Set((withApp ?? []).map((a: { sitter_id: string }) => a.sitter_id))
    candidates = (data ?? [])
      .filter((c: { id: string }) => !withAppSet.has(c.id))
      .map((c: { id: string; created_at: string }) => ({ id: c.id, anchor_at: c.created_at }))
  } else if (rule.type === 'active_referral') {
    // Monthly referral boost: users old enough AND active recently.
    const minAge = rule.min_age_days ?? 30
    const activeWithin = rule.active_within_days ?? 30
    const minAgeAt = new Date(nowMs - minAge * 86400_000).toISOString()
    const activeSince = new Date(nowMs - activeWithin * 86400_000).toISOString()
    const { data } = await supabase
      .from('profiles')
      .select('id, created_at, last_seen_at')
      .lt('created_at', minAgeAt)
      .gte('last_seen_at', activeSince)
      .not('email', 'is', null)
      .eq('account_status', 'active')
      .limit(500)
    candidates = (data ?? []).map((c: { id: string; last_seen_at: string }) => ({
      id: c.id, anchor_at: c.last_seen_at,
    }))
  } else if (rule.type === 'sitter_missing_affinity') {
    // Gardiens inscrits depuis min_age_days jours dont animal_types OU
    // work_during_sit est vide. Chunké par pages de 500 pour rester frugal.
    const minAge = rule.min_age_days ?? 7
    const minAgeAt = new Date(nowMs - minAge * 86400_000).toISOString()
    let q = supabase
      .from('profiles')
      .select('id, role, created_at, sitter_profiles!inner(animal_types, work_during_sit)')
      .lt('created_at', minAgeAt)
      .not('email', 'is', null)
      .eq('account_status', 'active')
      .in('role', ['sitter', 'both'])
    const { data, error } = await q.limit(500)
    if (error) {
      console.error('[enrollment] sitter_missing_affinity failed', error.message)
      return 0
    }
    candidates = (data ?? [])
      .filter((c: any) => {
        const sp = Array.isArray(c.sitter_profiles) ? c.sitter_profiles[0] : c.sitter_profiles
        if (!sp) return false
        const noAnimals = !sp.animal_types || sp.animal_types.length === 0
        const noWork = !sp.work_during_sit || sp.work_during_sit === ''
        return noAnimals || noWork
      })
      .map((c: any) => ({ id: c.id, anchor_at: c.created_at }))
  } else if (rule.type === 'owner_missing_affinity') {
    // Propriétaires inscrits depuis min_age_days jours dont presence_expected est vide.
    const minAge = rule.min_age_days ?? 7
    const minAgeAt = new Date(nowMs - minAge * 86400_000).toISOString()
    let q = supabase
      .from('profiles')
      .select('id, role, created_at, owner_profiles!inner(presence_expected)')
      .lt('created_at', minAgeAt)
      .not('email', 'is', null)
      .eq('account_status', 'active')
      .in('role', ['owner', 'both'])
    const { data, error } = await q.limit(500)
    if (error) {
      console.error('[enrollment] owner_missing_affinity failed', error.message)
      return 0
    }
    candidates = (data ?? [])
      .filter((c: any) => {
        const op = Array.isArray(c.owner_profiles) ? c.owner_profiles[0] : c.owner_profiles
        if (!op) return false
        return !op.presence_expected || op.presence_expected === ''
      })
      .map((c: any) => ({ id: c.id, anchor_at: c.created_at }))
  } else {
    console.warn('[enrollment] unknown rule type', rule)
    return 0
  }

  if (!candidates.length) return 0

  // Onboarding double-enrollment guard : un profil 'both' ne doit pas être
  // enrôlé dans onboarding-owner ET onboarding-sitter. Si l'autre séquence
  // d'onboarding a déjà une journey (tout statut) pour ce user, on skip.
  if (seq.key === 'onboarding-owner' || seq.key === 'onboarding-sitter') {
    const otherKey = seq.key === 'onboarding-owner' ? 'onboarding-sitter' : 'onboarding-owner'
    const alreadyOther = new Set<string>()
    const idsForOnboarding = candidates.map((c) => c.id)
    for (let i = 0; i < idsForOnboarding.length; i += 100) {
      const chunk = idsForOnboarding.slice(i, i + 100)
      const { data, error } = await supabase
        .from('user_journeys')
        .select('user_id')
        .eq('sequence_key', otherKey)
        .in('user_id', chunk)
      if (error) {
        console.error('[enrollment] onboarding cross-check failed', seq.key, error.message)
        return 0
      }
      for (const r of (data ?? []) as Array<{ user_id: string }>) alreadyOther.add(r.user_id)
    }
    candidates = candidates.filter((c) => !alreadyOther.has(c.id))
    if (!candidates.length) return 0
  }

  // Vérification des journeys existantes, chunkée par 100 pour éviter
  // les URL trop longues qui faisaient silencieusement échouer la dédup.
  // Tout échec est fatal : on n'insère rien, plutôt que risquer un ré-enrôlement massif.
  const recurring = rule.type === 'active_referral'
  const recurDays = recurring
    ? ((rule as { active_within_days?: number }).active_within_days ?? 30) +
      ((rule as { window_days?: number }).window_days ?? 30)
    : 0
  const recurThreshold = recurring
    ? new Date(nowMs - recurDays * 86400_000).toISOString()
    : null

  const existingSet = new Set<string>()
  const allIds = candidates.map((c) => c.id)
  for (let i = 0; i < allIds.length; i += 100) {
    const chunk = allIds.slice(i, i + 100)
    // RPC dédiée : renvoie DISTINCT user_id, immunisée contre la troncature
    // PostgREST à 1000 lignes (>100k rows brutes sur discover-mutual-aid).
    const { data, error } = await supabase.rpc('users_with_journey_for_sequence', {
      _sequence_key: seq.key,
      _user_ids: chunk,
      _started_since: recurThreshold,
    })
    if (error) {
      console.error('[enrollment] existing-lookup failed', seq.key, error.message, 'chunk', i)
      return 0
    }
    for (const r of (data ?? []) as Array<{ user_id: string }>) existingSet.add(r.user_id)
  }

  const toInsert = candidates
    .filter((c) => !existingSet.has(c.id))
    .map((c) => ({
      user_id: c.id,
      sequence_key: seq.key,
      started_at: c.anchor_at,
      status: 'active',
      current_step: 0,
    }))

  if (!toInsert.length) return 0
  if (dryRun) return toInsert.length

  // Filet de sécurité : l'index unique partiel (user_id, sequence_key WHERE status='active')
  // rejettera tout doublon résiduel. En cas de violation, on retombe sur un insert
  // individuel row-par-row pour ne perdre que la ligne fautive.
  const { error } = await supabase.from('user_journeys').insert(toInsert)
  if (!error) return toInsert.length

  if (error.code === '23505') {
    console.warn('[enrollment] bulk hit unique index, falling back to per-row', seq.key)
    let ok = 0
    for (const row of toInsert) {
      const { error: rowErr } = await supabase.from('user_journeys').insert(row)
      if (!rowErr) ok++
      else if (rowErr.code !== '23505') {
        console.error('[enrollment] row insert failed', seq.key, rowErr.message)
      }
    }
    return ok
  }

  console.error('[enrollment] insert failed', seq.key, error.message)
  return 0
}

// ---------------------------------------------------------------------------
// Exit condition evaluation
// ---------------------------------------------------------------------------
async function checkExitCondition(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  cond: ExitCondition | null,
): Promise<boolean> {
  if (!cond || !('type' in cond)) return false
  switch (cond.type) {
    case 'profile_complete': {
      const { data } = await supabase.from('profiles')
        .select('profile_completion').eq('id', userId).maybeSingle()
      return (data?.profile_completion ?? 0) >= cond.threshold
    }
    case 'has_application': {
      const { count } = await supabase.from('applications')
        .select('id', { count: 'exact', head: true }).eq('sitter_id', userId)
      return (count ?? 0) > 0
    }
    case 'has_completed_sit': {
      const { data } = await supabase.from('profiles')
        .select('completed_sits_count').eq('id', userId).maybeSingle()
      return (data?.completed_sits_count ?? 0) > 0
    }
    case 'has_published_sit': {
      const { count } = await supabase.from('sits')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('status', ['published', 'confirmed', 'in_progress', 'completed'])
      return (count ?? 0) > 0
    }
    case 'has_application_received': {
      const { count } = await supabase
        .from('applications').select('id, sit:sits!inner(user_id)', { count: 'exact', head: true })
        .eq('sit.user_id', userId)
      return (count ?? 0) > 0
    }
    case 'reactivated': {
      // User came back: last_seen_at within last `days` (default 3)
      const days = cond.days ?? 3
      const { data } = await supabase.from('profiles')
        .select('last_seen_at').eq('id', userId).maybeSingle()
      if (!data?.last_seen_at) return false
      return Date.now() - new Date(data.last_seen_at).getTime() < days * 86400_000
    }
    case 'has_mutual_aid_activity': {
      // User has either posted a small mission OR responded to one
      const [posted, responded] = await Promise.all([
        supabase.from('small_missions')
          .select('id', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('small_mission_responses')
          .select('id', { count: 'exact', head: true }).eq('responder_id', userId),
      ])
      return ((posted.count ?? 0) + (responded.count ?? 0)) > 0
    }
    case 'sitter_affinity_ready': {
      const { data } = await supabase.from('sitter_profiles')
        .select('animal_types, work_during_sit').eq('user_id', userId).maybeSingle()
      if (!data) return false
      const hasAnimals = Array.isArray(data.animal_types) && data.animal_types.length > 0
      const hasWork = !!data.work_during_sit && data.work_during_sit !== ''
      return hasAnimals && hasWork
    }
    case 'owner_affinity_ready': {
      const { data } = await supabase.from('owner_profiles')
        .select('presence_expected').eq('user_id', userId).maybeSingle()
      if (!data) return false
      return !!data.presence_expected && data.presence_expected !== ''
    }
    default:
      return false
  }
}
