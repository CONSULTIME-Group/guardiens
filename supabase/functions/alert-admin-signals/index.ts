import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { buildDigestLines, isActionableCritical, sitIdOf, weeklyCoverageLine, type OpenSignal, type SitInfo } from './digest.ts'

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

  try {
    // 1) Réconcilie uniquement hors simulation ; dry_run reste en lecture seule.
    const { data: autoResolved, error: arErr } = dryRun
      ? { data: [], error: null }
      : await admin.rpc('auto_resolve_admin_signals')
    if (arErr) console.error('auto_resolve_admin_signals error', arErr)

    // 2) Signaux restants
    const { data: open, error: openErr } = await admin
      .from('admin_signals')
      .select('signal_type, severity, detected_at, entity_type, entity_id, metadata')
      .is('resolved_at', null)
    if (openErr) throw openErr

    const rows = (open ?? []) as OpenSignal[]
    const actionable = rows.filter(isActionableCritical)
    const sitIds = [...new Set(actionable.map(sitIdOf).filter((x): x is string => !!x))]
    const sits = new Map<string, SitInfo>()
    if (sitIds.length) {
      const { data: sitRows, error: sitErr } = await admin
        .from('sits').select('id, title, start_date').in('id', sitIds)
      if (sitErr) throw sitErr
      for (const r of sitRows ?? []) sits.set(r.id, r as SitInfo)
    }
    const lines = buildDigestLines(rows, sits)
    const coverageLine = weeklyCoverageLine(rows)
    const warningCount = rows.filter((r) => r.severity === 'warning').length
    const staleCount = lines.filter((l) => l.ageDays > 3).length

    // 3) Règle centrale : aucun critique actionnable, aucun email.
    if (lines.length === 0) {
      return new Response(JSON.stringify({
        ok: true, sent: false, reason: 'no_actionable_critical_signal',
        auto_resolved: autoResolved ?? [], warning_open: warningCount,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (dryRun) {
      return new Response(JSON.stringify({
        ok: true, sent: false, dry_run: true,
        auto_resolved: autoResolved ?? [],
        critical_open: lines.length, warning_open: warningCount, stale_count: staleCount,
        coverage_line: coverageLine, lines,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const day = new Date().toISOString().slice(0, 10)
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_ROLE}` },
      body: JSON.stringify({
        templateName: 'admin-signals-digest',
        recipientEmail: RECIPIENT,
        idempotencyKey: typeof body?.trigger === 'string' && body.trigger
          ? `admin-signals-${day}-${String(body.trigger).slice(0, 80)}`
          : `admin-signals-${day}`,
        templateData: {
          criticalCount: lines.length,
          warningCount,
          staleCount,
          coverageLine,
          lines: lines.slice(0, 20),
        },
      }),
    })
    const txt = res.ok ? '' : await res.text().catch(() => '')
    if (!res.ok) console.error('send-transactional-email failed', res.status, txt)

    return new Response(JSON.stringify({
      ok: res.ok, sent: res.ok, recipient: RECIPIENT,
      auto_resolved: autoResolved ?? [],
      critical_open: lines.length, warning_open: warningCount, stale_count: staleCount,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    console.error('alert-admin-signals error', e)
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Erreur inconnue' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
