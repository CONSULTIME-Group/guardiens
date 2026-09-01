// send-seasonal-nurture
// -----------------------------------------------------------------------------
// Rappel avant une periode de vacances scolaires. Le plan d'envoi est calcule
// en SQL par public.seasonal_nurture_plan. Aucun cron : appel manuel uniquement.
// Body : { period_key: string, active_days?: number | null, dry_run?: boolean,
//          recipient_id?: string, limit?: number }
import { createClient } from 'npm:@supabase/supabase-js@2.45.0'
import { requireCronCaller } from '../_shared/require-cron-caller.ts'
import { startCronRun } from '../_shared/cron-run-log.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const TEMPLATE = 'seasonal-nurture'
const BATCH_SIZE = 20

interface PlanRow {
  user_id: string
  email: string | null
  first_name: string | null
  city: string | null
  zone: string | null
  period_key: string
  period_label: string | null
  period_start: string | null
  period_end: string | null
  suggested_end: string | null
  date_certaine: boolean | null
  jours_avant: number | null
  derniere_visite: string | null
  a_deja_publie: boolean | null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const guard = await requireCronCaller(req, corsHeaders, 'send-seasonal-nurture')
  if (guard) return guard

  let body: {
    period_key?: string
    active_days?: number | null
    dry_run?: boolean
    recipient_id?: string
    limit?: number
  } = {}
  try { if (req.body) body = await req.json() } catch { /* noop */ }

  // period_key est obligatoire : on refuse avant meme d'ouvrir un cron run.
  if (!body.period_key || typeof body.period_key !== 'string') {
    return json({ error: 'period_key requis' }, 400)
  }
  const periodKey = body.period_key

  const run = await startCronRun('send-seasonal-nurture')
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

  try {
    const { data: planData, error: planErr } = await admin.rpc('seasonal_nurture_plan', {
      p_period_key: periodKey,
      p_active_days: body.active_days ?? null,
    })
    if (planErr) throw planErr

    let planRows = (planData ?? []) as unknown as PlanRow[]
    if (body.recipient_id) {
      planRows = planRows.filter((r) => r.user_id === body.recipient_id)
    }
    planRows = planRows.filter((r) => !!r.email)
    if (typeof body.limit === 'number' && body.limit > 0) {
      planRows = planRows.slice(0, body.limit)
    }

    const planned = planRows.length
    if (planned === 0) {
      await run.finish('success', { planned: 0, sent: 0, skipped: 0, failed: 0, period_key: periodKey, dry_run: !!body.dry_run })
      return json({ ok: true, planned: 0, sent: 0, skipped: 0, failed: 0, reason: 'no_plan' })
    }

    let sent = 0
    let skipped = 0
    let failed = 0
    const errors: Array<{ user_id: string; reason: string }> = []

    async function processOne(row: PlanRow): Promise<'sent' | 'skipped' | 'failed'> {
      const email = (row.email ?? '').trim()
      if (!email) return 'skipped'

      // Deduplication definitive : jamais deux fois la meme periode a la meme
      // adresse, quelle que soit l'anciennete de l'envoi.
      const { data: prev } = await admin
        .from('email_send_log')
        .select('id')
        .eq('template_name', TEMPLATE)
        .eq('recipient_email', email)
        .in('status', ['sent', 'pending', 'deferred'])
        .eq('metadata->>period_key', periodKey)
        .limit(1)
      if (prev && prev.length > 0) return 'skipped'

      if (body.dry_run) return 'skipped'

      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SERVICE_KEY}` },
        body: JSON.stringify({
          templateName: TEMPLATE,
          recipientEmail: email,
          idempotencyKey: `seasonal-nurture-${row.user_id}-${periodKey}`,
          templateData: {
            firstName: row.first_name ?? undefined,
            city: row.city ?? null,
            periodLabel: row.period_label,
            periodKey: row.period_key,
            periodStart: row.period_start,
            suggestedStart: row.period_start,
            suggestedEnd: row.suggested_end,
            dateCertaine: row.date_certaine,
            alreadyPublished: row.a_deja_publie,
          },
          logMetadata: { campaign: 'seasonal_nurture', period_key: periodKey, zone: row.zone },
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
          console.error('[send-seasonal-nurture] recipient failed', row.user_id, e)
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

    const status = !body.dry_run && sent < planned * 0.8 ? 'partial' : 'success'

    await run.finish(status, {
      planned,
      sent,
      skipped,
      failed,
      period_key: periodKey,
      dry_run: !!body.dry_run,
      shortfall_ratio: planned > 0 ? Number((1 - sent / planned).toFixed(2)) : 0,
    })

    return json({
      ok: true,
      planned,
      sent,
      skipped,
      failed,
      period_key: periodKey,
      dry_run: !!body.dry_run,
      errors: errors.slice(0, 20),
    })
  } catch (err) {
    console.error('[send-seasonal-nurture] fatal', err)
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
