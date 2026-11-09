import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { almaWeeklyLines, weeklySummaryLines, workListDigestLines, workListNotices, type AlmaWeeklyStats, type OpenSignal } from './digest.ts'
import { buildWorkList, type WorkListRaw } from '../_shared/admin-work-list.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const RECIPIENT = 'contact@guardiens.fr'

const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

const isServiceRoleRequest = (req: Request): boolean => {
  const raw = req.headers.get('Authorization') ?? ''
  if (!raw.startsWith('Bearer ')) return false
  const token = raw.slice(7)
  return Boolean(SERVICE_ROLE) && token === SERVICE_ROLE
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  if (!isServiceRoleRequest(req)) {
    return new Response(JSON.stringify({ error: 'Non autorisé' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const body = await req.json().catch(() => ({}))
  const dryRun = body?.dry_run === true
  // Appel ponctuel (ex. cron-failure-alert) : jamais compté comme le passage du matin.
  const trigger = typeof body?.trigger === 'string' && body.trigger ? String(body.trigger).slice(0, 80) : null

  // Lot ADM2 : chaque passage réel laisse une ligne dans cron_run_log, lue par
  // la carte Santé des crons (« Email admin du matin »). Une panne se voit.
  let runId: string | null = null
  const finishRun = async (status: 'success' | 'partial' | 'failed', metrics: Record<string, unknown>, error?: string) => {
    if (!runId) return
    const { error: upErr } = await admin.from('cron_run_log').update({
      finished_at: new Date().toISOString(), status, metrics, error_message: error ?? null,
    }).eq('id', runId)
    if (upErr) console.error('cron_run_log update error', upErr)
  }
  if (!dryRun && !trigger) {
    const { data: runRow, error: runErr } = await admin.from('cron_run_log')
      .insert({ edge_name: 'alert-admin-signals', started_at: new Date().toISOString() })
      .select('id').maybeSingle()
    if (runErr) console.error('cron_run_log insert error', runErr)
    runId = (runRow as { id?: string } | null)?.id ?? null
  }

  try {
    // 1) Réconcilie uniquement hors simulation ; dry_run reste en lecture seule.
    const { data: autoResolved, error: arErr } = dryRun
      ? { data: [], error: null }
      : await admin.rpc('auto_resolve_admin_signals')
    if (arErr) console.error('auto_resolve_admin_signals error', arErr)

    // Lot ADM2 : ce qui empêche l'email de dire vrai est écrit dans l'email
    // (jamais de « rien à traiter » quand une lecture a échoué).
    const notices: string[] = []
    if (arErr) notices.push('Clôtures automatiques en échec ce matin : certains signaux réglés restent affichés.')
    const { data: flag, error: flagErr } = await admin
      .from('feature_flags').select('enabled').eq('key', 'admin_signals_active').maybeSingle()
    if (flagErr) console.error('feature_flags error', flagErr)
    else if (flag && flag.enabled === false) {
      notices.push('Signaux désactivés dans Paramètres : aucun nouveau signal ni relance automatique depuis la coupure.')
    }

    // 2) Lot ADM13 : une lecture (public.admin_work_list), une liste, celle
    // de la vue d'ensemble. Une source illisible est écrite en tête de l'email.
    const { data: raw, error: wlErr } = await admin.rpc('admin_work_list')
    if (wlErr) throw wlErr
    const now = Date.now()
    const model = buildWorkList(raw as WorkListRaw, now)
    notices.push(...workListNotices(model))
    const rows = ((raw as WorkListRaw | null)?.signals ?? []) as OpenSignal[]
    const lines = workListDigestLines(model, now)
    // Lundi : couverture, qualité éditoriale, À animer, dans le paragraphe de synthèse existant.
    // Lot J2-B : section Alma du lundi, lue en lecture seule.
    let almaStats: AlmaWeeklyStats | null = null
    if (new Date().getUTCDay() === 1) {
      const { data: aw, error: awErr } = await admin.rpc('alma_weekly_summary')
      if (awErr) console.error('alma_weekly_summary error', awErr)
      else almaStats = aw as AlmaWeeklyStats
    }
    const coverageLine = [...weeklySummaryLines(rows), ...almaWeeklyLines(almaStats)].join(' ') || null
    // Situations que le site relance seul, hors liste : dites en bas de l'email.
    const warningCount = model.autoTotal
    const staleCount = lines.filter((l) => (l.ageDays ?? 0) > 3).length

    // 3) Lot ADM2 : l'email part chaque matin, « Rien à traiter » compris
    // (décision de Jérémie du 18/10/2026) : son arrivée prouve que l'alerte vit.
    // Un appel ponctuel sans rien à signaler reste silencieux.
    if (trigger && lines.length === 0) {
      return new Response(JSON.stringify({
        ok: true, sent: false, reason: 'no_actionable_critical_signal',
        auto_resolved: autoResolved ?? [], warning_open: warningCount,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (dryRun) {
      return new Response(JSON.stringify({
        ok: true, sent: false, dry_run: true,
        auto_resolved: autoResolved ?? [],
        critical_open: lines.length, families: lines.map((l) => l.key.split(':')[0]),
        warning_open: warningCount, stale_count: staleCount,
        coverage_line: coverageLine, notices, lines,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const day = new Date().toISOString().slice(0, 10)
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_ROLE}` },
      body: JSON.stringify({
        templateName: 'admin-signals-digest',
        recipientEmail: RECIPIENT,
        idempotencyKey: trigger ? `admin-signals-${day}-${trigger}` : `admin-signals-${day}`,
        templateData: {
          criticalCount: lines.length,
          warningCount,
          staleCount,
          coverageLine,
          notices,
          lines,
        },
      }),
    })
    const txt = res.ok ? '' : await res.text().catch(() => '')
    if (!res.ok) console.error('send-transactional-email failed', res.status, txt)

    const metrics = { sent: res.ok, lines: lines.length, warning_open: warningCount, notices }
    await finishRun(
      !res.ok ? 'failed' : notices.length ? 'partial' : 'success',
      metrics,
      res.ok ? (notices.length ? notices.join(' ') : undefined) : `send-transactional-email ${res.status}`,
    )

    return new Response(JSON.stringify({
      ok: res.ok, sent: res.ok, recipient: RECIPIENT,
      auto_resolved: autoResolved ?? [],
      critical_open: lines.length,
      warning_open: warningCount, stale_count: staleCount,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    console.error('alert-admin-signals error', e)
    await finishRun('failed', {}, e instanceof Error ? e.message : 'Erreur inconnue')
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Erreur inconnue' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
