// Remontée hebdomadaire des signaux de qualité de contenu.
//
// Lit les admin_signals non résolus de entity_type = 'content' (déposés par
// public.check_content_quality le lundi à 07h00 UTC), et envoie un email
// récapitulatif court à l'adresse d'administration via l'infrastructure
// d'envoi existante (send-transactional-email).
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

interface Signal {
  signal_type: string
  severity: string
  detected_at: string
  metadata: Record<string, unknown> | null
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
    const { data, error } = await admin
      .from('admin_signals')
      .select('signal_type, severity, detected_at, metadata')
      .eq('entity_type', 'content')
      .is('resolved_at', null)
      .order('detected_at', { ascending: false })
    if (error) throw error

    const signals = (data ?? []) as Signal[]
    if (signals.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: false, reason: 'no_content_signal' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const broken = signals.find((s) => s.signal_type === 'content_detector_broken')
    const outside = signals.find((s) => s.signal_type === 'content_defect_outside_freeze')
    const drift = signals.find((s) => s.signal_type === 'content_quality_drift')

    const testsKo = Number(broken?.metadata?.tests_ko ?? 0)
    const testsTotal = Number(broken?.metadata?.tests_total ?? 0)
    const selftest = broken
      ? `${testsTotal} cas, ${testsKo} en échec`
      : 'aucun cas en échec'

    const horsGel = Number(outside?.metadata?.nombre ?? 0)
    const alertesOuvertes = Number(drift?.metadata?.alertes ?? horsGel)

    const details = (outside?.metadata?.details ?? []) as Array<Record<string, unknown>>
    const cibles = details.slice(0, 25).map((d) => ({
      cible: String(d.cible ?? 'cible inconnue'),
      regle: String(d.regle ?? 'règle inconnue'),
      table: d.table ? String(d.table) : undefined,
    }))

    const templateData = {
      alertesOuvertes,
      horsGel,
      selftest,
      detecteurCasse: Boolean(broken),
      derive: Boolean(drift),
      cibles,
    }

    if (dryRun) {
      return new Response(JSON.stringify({ ok: true, sent: false, dry_run: true, templateData }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const day = new Date().toISOString().slice(0, 10)
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_ROLE}` },
      body: JSON.stringify({
        templateName: 'content-quality-digest',
        recipientEmail: RECIPIENT,
        idempotencyKey: `content-quality-${day}`,
        templateData,
      }),
    })
    if (!res.ok) console.error('send-transactional-email failed', res.status, await res.text().catch(() => ''))

    return new Response(JSON.stringify({
      ok: res.ok, sent: res.ok, recipient: RECIPIENT,
      signals: signals.map((s) => s.signal_type), ...templateData,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    console.error('alert-content-quality error', e)
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Erreur inconnue' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
