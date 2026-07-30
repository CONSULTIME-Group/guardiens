import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const RECIPIENT = 'contact@guardiens.fr'

const admin = createClient(SUPABASE_URL, SERVICE_ROLE)

const isServiceRoleRequest = (req: Request): boolean => {
  const raw = req.headers.get('Authorization') ?? ''
  if (!raw.startsWith('Bearer ')) return false
  const token = raw.slice(7)
  if (token && token === SERVICE_ROLE) return true
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return false
    const pad = parts[1].length % 4 === 0 ? '' : '='.repeat(4 - (parts[1].length % 4))
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/') + pad
    return JSON.parse(atob(b64))?.role === 'service_role'
  } catch {
    return false
  }
}

const ADMIN_LINKS: Record<string, string> = {
  identity_orphan_documents: 'https://guardiens.fr/admin/verifications',
  stale_verification: 'https://guardiens.fr/admin/verifications',
  stale_draft: 'https://guardiens.fr/admin/listings',
  no_applications: 'https://guardiens.fr/admin/listings',
  pending_application: 'https://guardiens.fr/admin/listings',
  suspicious_account: 'https://guardiens.fr/admin/users',
  owner_missing_coordinates: 'https://guardiens.fr/admin/users',
  dormant_sitter: 'https://guardiens.fr/admin/users',
  notification_delivery_failed: 'https://guardiens.fr/admin/emails',
  nurturing_run_anomaly: 'https://guardiens.fr/admin/emails',
  email_delivery_anomaly: 'https://guardiens.fr/admin/emails',
}

const linkFor = (type: string) => ADMIN_LINKS[type] ?? 'https://guardiens.fr/admin'

const buildDetail = (metadata: Record<string, unknown>): string => {
  const m = metadata ?? {}
  const parts: string[] = []
  const title = (m.sit_title ?? m.title) as string | undefined
  if (title) parts.push(`Annonce : ${title}`)
  const email = (m.owner_email ?? m.email ?? m.recipient_email) as string | undefined
  if (email) parts.push(`Membre : ${email}`)
  const err = (m.error ?? m.error_message ?? m.trigger) as string | undefined
  if (err) parts.push(`Erreur : ${err}`)
  const detail = m.detail as string | undefined
  if (!parts.length && detail) parts.push(detail)
  return parts.join(', ').replace(/[—–]/g, ',')
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
    // 1) Referme d'abord les signaux dont la cause a disparu
    const { data: autoResolved, error: arErr } = await admin.rpc('auto_resolve_admin_signals')
    if (arErr) console.error('auto_resolve_admin_signals error', arErr)

    // 2) Signaux restants
    const { data: open, error: openErr } = await admin
      .from('admin_signals')
      .select('signal_type, severity, detected_at, metadata')
      .is('resolved_at', null)
    if (openErr) throw openErr

    const rows = open ?? []
    const now = Date.now()
    const criticals = rows
      .filter((r) => r.severity === 'critical')
      .map((r) => ({
        signalType: r.signal_type,
        ageDays: Math.floor((now - new Date(r.detected_at).getTime()) / 86_400_000),
        detail: buildDetail((r.metadata ?? {}) as Record<string, unknown>),
        link: linkFor(r.signal_type),
      }))
      .sort((a, b) => b.ageDays - a.ageDays)

    const warningCount = rows.filter((r) => r.severity === 'warning').length
    const staleCount = criticals.filter((s) => s.ageDays > 3).length

    // 3) Règle centrale : silence total sans signal critique ouvert
    if (criticals.length === 0) {
      return new Response(JSON.stringify({
        ok: true, sent: false, reason: 'no_critical_signal',
        auto_resolved: autoResolved ?? [], warning_open: warningCount,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (dryRun) {
      return new Response(JSON.stringify({
        ok: true, sent: false, dry_run: true,
        auto_resolved: autoResolved ?? [],
        critical_open: criticals.length, warning_open: warningCount, stale_count: staleCount,
        signals: criticals,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const day = new Date().toISOString().slice(0, 10)
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_ROLE}` },
      body: JSON.stringify({
        templateName: 'admin-signals-digest',
        recipientEmail: RECIPIENT,
        idempotencyKey: `admin-signals-${day}`,
        templateData: {
          criticalCount: criticals.length,
          warningCount,
          staleCount,
          signals: criticals.slice(0, 15),
        },
      }),
    })
    const txt = res.ok ? '' : await res.text().catch(() => '')
    if (!res.ok) console.error('send-transactional-email failed', res.status, txt)

    return new Response(JSON.stringify({
      ok: res.ok, sent: res.ok, recipient: RECIPIENT,
      auto_resolved: autoResolved ?? [],
      critical_open: criticals.length, warning_open: warningCount, stale_count: staleCount,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    console.error('alert-admin-signals error', e)
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Erreur inconnue' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
