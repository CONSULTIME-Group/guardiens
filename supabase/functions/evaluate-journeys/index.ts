// evaluate-journeys
// Cron worker: enrolls users into nurturing sequences based on declarative
// `enrollment_rule` (signup window, inactivity, behavioural conditions) and
// dispatches due steps via send-transactional-email.
import { createClient } from 'npm:@supabase/supabase-js@2'

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
  | Record<string, never>

type EnrollmentRule =
  | { type: 'signup'; window_days?: number }
  | { type: 'inactivity'; days: number; window_days?: number }
  | { type: 'owner_no_sit'; min_age_days?: number; window_days?: number }
  | { type: 'sitter_no_application'; min_age_days?: number; window_days?: number }

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
  // Restrict to service-role callers (pg_cron / pg_net only).
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (token !== serviceKey) {
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

  const stats = { enrolled: 0, sent: 0, exited: 0, completed: 0, skipped: 0, errors: 0 }

  const { data: sequencesRaw } = await supabase
    .from('nurturing_sequences')
    .select('id, key, audience, active, enrollment_rule, anchor_field')
    .eq('active', true)

  const sequences = (sequencesRaw ?? []) as Sequence[]
  if (!sequences.length) {
    return new Response(JSON.stringify({ ok: true, stats, note: 'no active sequences' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

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

  // 1. ENROLLMENT — dispatched per enrollment_rule
  for (const seq of sequences) {
    try {
      const enrolled = await enrollForSequence(supabase, seq, dryRun)
      stats.enrolled += enrolled
    } catch (e) {
      console.error('[enrollment] failed', seq.key, e)
      stats.errors++
    }
  }

  // 2. EVALUATE active journeys
  const { data: activeJourneys } = await supabase
    .from('user_journeys')
    .select('id, user_id, sequence_key, current_step, started_at, last_step_at')
    .eq('status', 'active')
    .limit(2000)

  const seqByKey = new Map(sequences.map((s) => [s.key, s]))

  for (const j of activeJourneys ?? []) {
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

      // Time check (anchor on started_at, which already reflects anchor_field at enrollment)
      const dueAt = new Date(j.started_at).getTime() + nextStep.delay_hours * 3600_000
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
        continue
      }

      if (dryRun) { stats.sent++; continue }

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
        continue
      }

      const idempotencyKey = `journey-${j.sequence_key}-${j.id}-step-${nextStep.step_order}`
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
          // Distinguish a real send from an idempotent/suppressed/blocked 200 response
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

        // Fallback: if no messageId returned but the email was actually sent,
        // recover it from email_send_log via the idempotency key so engagement
        // events (open/click) can be correlated back to this journey step.
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

      // Always advance the cursor
      await supabase.from('user_journeys').update({
        current_step: nextStep.step_order,
        last_step_at: new Date().toISOString(),
      }).eq('id', j.id)

      if (actuallySent) stats.sent++
      else stats.skipped++
    } catch (err) {
      console.error('Journey eval error', j.id, err)
      stats.errors++
    }
  }

  return new Response(JSON.stringify({ ok: true, dryRun, stats }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})

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
  } else {
    console.warn('[enrollment] unknown rule type', rule)
    return 0
  }

  if (!candidates.length) return 0

  const { data: existing } = await supabase
    .from('user_journeys')
    .select('user_id')
    .eq('sequence_key', seq.key)
    .in('user_id', candidates.map((c) => c.id))
  const existingSet = new Set((existing ?? []).map((e: { user_id: string }) => e.user_id))

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

  const { error } = await supabase.from('user_journeys').insert(toInsert)
  if (error) {
    console.error('[enrollment] insert failed', seq.key, error.message)
    return 0
  }
  return toInsert.length
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
    default:
      return false
  }
}
