// evaluate-journeys
// Cron worker: enrolls new users in onboarding sequences and dispatches due steps.
// Triggered hourly by pg_cron.
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
  | Record<string, never>

interface Step {
  id: string
  step_order: number
  delay_hours: number
  template_name: string
  exit_condition: ExitCondition | null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  let dryRun = false
  try {
    const body = await req.json()
    dryRun = body?.dryRun === true
  } catch { /* cron */ }

  const stats = { enrolled: 0, sent: 0, exited: 0, completed: 0, skipped: 0, errors: 0 }

  // 1. Load active sequences + steps
  const { data: sequences } = await supabase
    .from('nurturing_sequences')
    .select('id, key, audience, active')
    .eq('active', true)

  if (!sequences?.length) {
    return new Response(JSON.stringify({ ok: true, stats, note: 'no active sequences' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const { data: stepsRaw } = await supabase
    .from('nurturing_steps')
    .select('id, sequence_id, step_order, delay_hours, template_name, exit_condition')
    .order('step_order', { ascending: true })

  const stepsBySeq = new Map<string, Step[]>()
  for (const s of stepsRaw ?? []) {
    const arr = stepsBySeq.get(s.sequence_id) ?? []
    arr.push(s as Step)
    stepsBySeq.set(s.sequence_id, arr)
  }

  // 2. AUTO-ENROLLMENT — users created in last 7 days not yet enrolled
  for (const seq of sequences) {
    const audienceFilter =
      seq.audience === 'sitter' ? ['sitter', 'both']
      : seq.audience === 'owner' ? ['owner', 'both']
      : null

    let q = supabase
      .from('profiles')
      .select('id, role, created_at')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 3600_000).toISOString())
      .not('email', 'is', null)
      .eq('account_status', 'active')

    if (audienceFilter) q = q.in('role', audienceFilter)

    const { data: candidates } = await q.limit(500)
    if (!candidates?.length) continue

    // Existing journeys for this sequence
    const { data: existing } = await supabase
      .from('user_journeys')
      .select('user_id')
      .eq('sequence_key', seq.key)
      .in('user_id', candidates.map((c) => c.id))
    const existingSet = new Set((existing ?? []).map((e) => e.user_id))

    const toInsert = candidates
      .filter((c) => !existingSet.has(c.id))
      .map((c) => ({
        user_id: c.id,
        sequence_key: seq.key,
        started_at: c.created_at, // anchor delays on signup, not on enrollment
        status: 'active',
        current_step: 0,
      }))

    if (toInsert.length && !dryRun) {
      const { error } = await supabase.from('user_journeys').insert(toInsert)
      if (!error) stats.enrolled += toInsert.length
      else stats.errors++
    } else if (dryRun) {
      stats.enrolled += toInsert.length
    }
  }

  // 3. EVALUATE active journeys
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

      // Time check
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

      // Send via send-transactional-email (centralized: handles prefs, freq cap, quiet hours)
      if (dryRun) { stats.sent++; continue }

      // Fetch user email
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, first_name')
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
          },
          metadata: { source: `journey:${j.sequence_key}:${nextStep.step_order}`, user_id: j.user_id },
        }),
      })

      const sendOk = sendRes.ok
      let reason: string | null = null
      if (!sendOk) {
        const errBody = await sendRes.text().catch(() => '')
        reason = `send_failed_${sendRes.status}`
        console.error('[ALERT] Journey step send failed', {
          journey_id: j.id,
          sequence: j.sequence_key,
          step: nextStep.step_order,
          template: nextStep.template_name,
          status: sendRes.status,
          body: errBody.slice(0, 500),
        })
      }

      await supabase.from('journey_step_log').insert({
        journey_id: j.id, step_order: nextStep.step_order,
        template_name: nextStep.template_name, sent: sendOk, reason,
      })

      // Always advance the cursor (even if email was suppressed by prefs/freq cap),
      // so the journey progresses in time. Suppressions are logged centrally.
      await supabase.from('user_journeys').update({
        current_step: nextStep.step_order,
        last_step_at: new Date().toISOString(),
      }).eq('id', j.id)

      if (sendOk) stats.sent++
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
    default:
      return false
  }
}
