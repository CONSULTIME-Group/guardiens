import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Threshold {
  bounce_pct_max: number
  open_pct_min: number
  complaint_pct_max: number
  min_sends: number
  window_days: number
  alert_enabled: boolean
  alert_recipient: string | null
}

interface Breach { metric: string; value: number; threshold: number; detail?: string }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceKey)

  const body = await req.json().catch(() => ({}))
  const dryRun: boolean = body?.dry_run === true

  const { data: th } = await supabase
    .from('email_delivery_thresholds')
    .select('*')
    .eq('id', 1)
    .maybeSingle()

  const t: Threshold = th ?? {
    bounce_pct_max: 5, open_pct_min: 15, complaint_pct_max: 0.1,
    min_sends: 10, window_days: 7, alert_enabled: true, alert_recipient: null,
  }

  const since = new Date(Date.now() - t.window_days * 86400_000).toISOString()

  const { data: rows, error } = await supabase
    .from('email_send_log')
    .select('template_name, status, delivered_at, first_opened_at, first_clicked_at, bounced_at, complained_at, message_id')
    .gte('created_at', since)
    .limit(100000)

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Dedup by message_id keeping "sent" rows
  const seen = new Set<string>()
  let sent = 0, delivered = 0, opened = 0, clicked = 0, bounced = 0, complained = 0
  const perTpl = new Map<string, { sent: number; delivered: number; opened: number; clicked: number; bounced: number; complained: number }>()

  for (const r of rows || []) {
    const key = (r as any).message_id || crypto.randomUUID()
    if (seen.has(key)) continue
    seen.add(key)
    const tpl = (r as any).template_name || 'unknown'
    if (!perTpl.has(tpl)) perTpl.set(tpl, { sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, complained: 0 })
    const p = perTpl.get(tpl)!
    if ((r as any).status === 'sent') { sent++; p.sent++ }
    if ((r as any).delivered_at) { delivered++; p.delivered++ }
    if ((r as any).first_opened_at) { opened++; p.opened++ }
    if ((r as any).first_clicked_at) { clicked++; p.clicked++ }
    if ((r as any).bounced_at) { bounced++; p.bounced++ }
    if ((r as any).complained_at) { complained++; p.complained++ }
  }

  const denom = delivered || sent || 1
  const bounce_rate = (bounced / (sent || 1)) * 100
  const open_rate = (opened / denom) * 100
  const click_rate = (clicked / denom) * 100
  const complaint_rate = (complained / (sent || 1)) * 100

  const breaches: Breach[] = []
  if (bounce_rate > t.bounce_pct_max) breaches.push({ metric: 'bounce', value: bounce_rate, threshold: t.bounce_pct_max })
  if (sent > t.min_sends && open_rate < t.open_pct_min) breaches.push({ metric: 'open', value: open_rate, threshold: t.open_pct_min, detail: `${sent} envois` })
  if (complaint_rate > t.complaint_pct_max) breaches.push({ metric: 'complaint', value: complaint_rate, threshold: t.complaint_pct_max })

  const per_template = Array.from(perTpl.entries()).map(([k, v]) => ({ template: k, ...v }))
  const snapshotDate = new Date().toISOString().slice(0, 10)

  if (!dryRun) {
    await supabase.from('email_delivery_snapshots').upsert({
      snapshot_date: snapshotDate,
      window_days: t.window_days,
      total_sent: sent, total_delivered: delivered, total_opened: opened,
      total_clicked: clicked, total_bounced: bounced, total_complained: complained,
      bounce_rate, open_rate, click_rate, complaint_rate,
      breaches, per_template,
    }, { onConflict: 'snapshot_date,window_days' })
  }

  let alertSent = false
  if (!dryRun && t.alert_enabled && breaches.length > 0) {
    // find recipient
    let recipient = t.alert_recipient
    if (!recipient) {
      const { data: admins } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin')
        .limit(1)
      if (admins?.[0]) {
        const { data: u } = await supabase.auth.admin.getUserById((admins[0] as any).user_id)
        recipient = u?.user?.email ?? null
      }
    }
    if (recipient) {
      const res = await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'admin-delivery-alert',
          recipientEmail: recipient,
          idempotencyKey: `delivery-alert-${snapshotDate}-${t.window_days}d`,
          templateData: {
            windowDays: t.window_days,
            totalSent: sent,
            bounceRate: bounce_rate,
            openRate: open_rate,
            complaintRate: complaint_rate,
            breaches,
            dashboardUrl: 'https://guardiens.fr/admin/emails?tab=delivery',
          },
        },
      })
      alertSent = !res.error
    }
  }

  return new Response(JSON.stringify({
    ok: true, dry_run: dryRun,
    snapshot: { snapshotDate, window_days: t.window_days, sent, delivered, opened, clicked, bounced, complained, bounce_rate, open_rate, click_rate, complaint_rate },
    breaches, alert_sent: alertSent,
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})
