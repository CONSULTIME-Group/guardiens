// send-share-appeal
// -----------------------------------------------------------------------------
// Campagne d'appel au partage (template referral-boost-monthly). Aucun cron :
// appel manuel uniquement, avec garde-fou de confirmation pour l'envoi de masse.
// Body : { dry_run?: boolean, recipient_id?: string, limit?: number, confirm?: string, max_seconds?: number }
import { createClient } from 'npm:@supabase/supabase-js@2.45.0'
import { requireCronCaller } from '../_shared/require-cron-caller.ts'
import { startCronRun } from '../_shared/cron-run-log.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const TEMPLATE = 'referral-boost-monthly'
const CAMPAIGN = 'partage_communaute'
const BATCH_SIZE = 1
const BATCH_PAUSE_MS = 500
const PAGE = 1000

interface PlanRow {
  id: string
  email: string | null
  first_name: string | null
}

Deno.serve(async (req) => {
  const startedAt = Date.now()
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const guard = await requireCronCaller(req, corsHeaders, 'send-share-appeal')
  if (guard) return guard

  let body: {
    dry_run?: boolean
    recipient_id?: string
    limit?: number
    confirm?: string
    max_seconds?: number
  } = {}
  try { if (req.body) body = await req.json() } catch { /* noop */ }
  const maxSeconds = typeof body.max_seconds === 'number' && body.max_seconds > 0
    ? body.max_seconds
    : 110

  // Garde-fou : un envoi de masse reel exige une confirmation explicite.
  if (body.dry_run !== true && !body.recipient_id && body.confirm !== 'ENVOI REEL A TOUS') {
    return json({ error: 'confirm requis pour un envoi de masse' }, 400)
  }

  const run = await startCronRun('send-share-appeal')
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

  try {
    // 1. Profils actifs avec email, pagines explicitement.
    const profiles: PlanRow[] = []
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await admin
        .from('profiles')
        .select('id, email, first_name')
        .eq('account_status', 'active')
        .not('email', 'is', null)
        .order('id', { ascending: true })
        .range(from, from + PAGE - 1)
      if (error) throw error
      const rows = (data ?? []) as unknown as PlanRow[]
      profiles.push(...rows)
      if (rows.length < PAGE) break
    }

    // 2. Opt-out produit.
    const optedOut = new Set<string>()
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await admin
        .from('email_preferences')
        .select('user_id')
        .eq('product_emails', false)
        .order('user_id', { ascending: true })
        .range(from, from + PAGE - 1)
      if (error) throw error
      const rows = (data ?? []) as Array<{ user_id: string }>
      for (const r of rows) optedOut.add(r.user_id)
      if (rows.length < PAGE) break
    }

    // 3. Adresses supprimees.
    const suppressed = new Set<string>()
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await admin
        .from('suppressed_emails')
        .select('email')
        .order('email', { ascending: true })
        .range(from, from + PAGE - 1)
      if (error) throw error
      const rows = (data ?? []) as Array<{ email: string | null }>
      for (const r of rows) if (r.email) suppressed.add(r.email.trim().toLowerCase())
      if (rows.length < PAGE) break
    }

    let planRows = profiles.filter((p) => {
      const email = (p.email ?? '').trim().toLowerCase()
      if (!email) return false
      if (optedOut.has(p.id)) return false
      if (suppressed.has(email)) return false
      return true
    })

    if (body.recipient_id) {
      planRows = planRows.filter((r) => r.id === body.recipient_id)
    }
    if (typeof body.limit === 'number' && body.limit > 0) {
      planRows = planRows.slice(0, body.limit)
    }

    // Dedupication en une seule passe : adresses deja servies par cette campagne.
    const alreadyServed = new Set<string>()
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await admin
        .from('email_send_log')
        .select('recipient_email')
        .eq('template_name', TEMPLATE)
        .eq('metadata->>campaign', CAMPAIGN)
        .in('status', ['sent', 'pending', 'deferred'])
        .order('id', { ascending: true })
        .range(from, from + PAGE - 1)
      if (error) throw error
      const rows = (data ?? []) as Array<{ recipient_email: string | null }>
      for (const r of rows) if (r.recipient_email) alreadyServed.add(r.recipient_email.trim().toLowerCase())
      if (rows.length < PAGE) break
    }

    let skippedBecauseAlreadyServed = 0
    planRows = planRows.filter((p) => {
      const email = (p.email ?? '').trim().toLowerCase()
      if (alreadyServed.has(email)) {
        skippedBecauseAlreadyServed++
        return false
      }
      return true
    })

    const planned = planRows.length
    if (planned === 0) {
      await run.finish('success', { planned: 0, sent: 0, skipped: 0, failed: 0, deja_servis: alreadyServed.size, interrompu: false, restants: 0, campaign: CAMPAIGN, dry_run: !!body.dry_run })
      return json({ ok: true, planned: 0, sent: 0, skipped: 0, failed: 0, deja_servis: alreadyServed.size, interrompu: false, restants: 0, reason: 'no_plan' })
    }

    let sent = 0
    let skipped = 0
    let failed = 0
    let processed = 0
    let interrompu = false
    const errors: Array<{ user_id: string; reason: string; http_status?: number }> = []

    async function processOne(row: PlanRow): Promise<'sent' | 'skipped' | 'failed'> {
      const email = (row.email ?? '').trim()
      if (!email) return 'skipped'

      if (body.dry_run) return 'skipped'

      const requestBody = JSON.stringify({
          templateName: TEMPLATE,
          recipientEmail: email,
          idempotencyKey: `partage-communaute-${row.id}`,
          templateData: { firstName: row.first_name ?? undefined },
          logMetadata: { campaign: CAMPAIGN },
      })
      const send = () => fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SERVICE_KEY}` },
        body: requestBody,
      })

      const res = await send()
      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        console.error('send-transactional-email failed', res.status, txt)
        errors.push({ user_id: row.id, reason: `send-transactional-email ${res.status}: ${txt}`, http_status: res.status })
        return 'failed'
      }
      return 'sent'
    }

    for (let i = 0; i < planRows.length; i += BATCH_SIZE) {
      if ((Date.now() - startedAt) / 1000 > maxSeconds) {
        interrompu = true
        break
      }
      const batch = planRows.slice(i, i + BATCH_SIZE)
      const outcomes = await Promise.all(batch.map(async (row) => {
        try {
          return await processOne(row)
        } catch (e) {
          console.error('[send-share-appeal] recipient failed', row.id, e)
          errors.push({ user_id: row.id, reason: String(e) })
          return 'failed' as const
        }
      }))
      for (const outcome of outcomes) {
        if (outcome === 'sent') sent++
        else if (outcome === 'skipped') skipped++
        else failed++
      }
      processed += batch.length
      if (i + BATCH_SIZE < planRows.length) {
        await new Promise((resolve) => setTimeout(resolve, BATCH_PAUSE_MS))
      }
    }

    const restants = planned - processed
    const status = !body.dry_run && sent < planned * 0.8 ? 'partial' : 'success'

    await run.finish(status, {
      planned,
      sent,
      skipped: skipped + skippedBecauseAlreadyServed,
      failed,
      deja_servis: alreadyServed.size,
      interrompu,
      restants,
      campaign: CAMPAIGN,
      dry_run: !!body.dry_run,
      shortfall_ratio: planned > 0 ? Number((1 - sent / planned).toFixed(2)) : 0,
    })

    return json({
      ok: true,
      planned,
      sent,
      skipped: skipped + skippedBecauseAlreadyServed,
      failed,
      deja_servis: alreadyServed.size,
      interrompu,
      restants,
      campaign: CAMPAIGN,
      dry_run: !!body.dry_run,
      errors: errors.slice(0, 20),
    })
  } catch (err) {
    console.error('[send-share-appeal] fatal', err)
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
