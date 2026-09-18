// Remontée hebdomadaire des signaux de qualité de contenu.
//
// Lit directement l'état ACTUEL du détecteur via public.v_content_defects,
// public.content_freeze et public.v_detector_selftest, et envoie un email
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
    // Trois lectures directes en parallèle : défauts détectés, gels actifs,
    // résultats du test interne du détecteur.
    const [defectsRes, freezeRes, selftestRes] = await Promise.all([
      admin.from('v_content_defects').select('source_table, label, rule_code, excerpt'),
      admin.from('content_freeze').select('slug, source_table, frozen_until'),
      admin.from('v_detector_selftest').select('verdict'),
    ])
    if (defectsRes.error) throw defectsRes.error
    if (freezeRes.error) throw freezeRes.error
    if (selftestRes.error) throw selftestRes.error

    const defects = (defectsRes.data ?? []) as Array<{ source_table: string | null; label: string | null; rule_code: string | null; excerpt: unknown }>
    const freezeRows = (freezeRes.data ?? []) as Array<{ slug: string | null; source_table: string | null; frozen_until: string | null }>

    // Quatrième cas : vérification d'absence. Si check_content_quality n'a pas
    // tourné depuis plus de 8 jours (une semaine plus un jour de marge), aucun
    // signal ne peut le dire, seule l'absence de trace le révèle.
    const { data: runRows, error: runErr } = await admin
      .from('cron_run_log')
      .select('started_at, finished_at, status, error_message')
      .eq('edge_name', 'check-content-quality')
      .order('started_at', { ascending: false })
      .limit(1)
    if (runErr) throw runErr

    const lastRun = runRows?.[0] ?? null
    const lastRunAt = lastRun?.finished_at ?? lastRun?.started_at ?? null
    const joursDepuisRun = lastRunAt
      ? Math.floor((Date.now() - new Date(lastRunAt).getTime()) / 86_400_000)
      : null
    const controleArrete = joursDepuisRun === null || joursDepuisRun > 8
    const derniereExecution = lastRunAt
      ? new Date(lastRunAt).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' })
      : null
    const runEnErreur = lastRun?.status === 'error'
    const runErreurMessage = runEnErreur
      ? String(lastRun?.error_message ?? 'erreur sans message')
      : undefined

    // Gels actifs : frozen_until >= aujourd'hui.
    const today = new Date().toISOString().slice(0, 10)
    const activeFreezes = new Set(
      freezeRows
        .filter((f) => f.frozen_until !== null && f.frozen_until >= today)
        .map((f) => `${f.source_table ?? ''}::${f.slug ?? ''}`),
    )

    const alertesOuvertes = defects.length

    const outsideDefects = defects.filter(
      (d) => !activeFreezes.has(`${d.source_table ?? ''}::${d.label ?? ''}`),
    )
    const horsGel = outsideDefects.length

    const cibles = outsideDefects.slice(0, 25).map((d) => ({
      cible: String(d.label ?? 'cible inconnue'),
      regle: String(d.rule_code ?? 'règle inconnue'),
      table: d.source_table ? String(d.source_table) : undefined,
    }))

    const selftestRows = (selftestRes.data ?? []) as Array<{ verdict: string | null }>
    const testsTotal = selftestRows.length
    const testsKo = selftestRows.filter((r) => r.verdict === 'FAIL').length
    const selftest = testsKo > 0
      ? `${testsTotal} cas, ${testsKo} en échec`
      : 'aucun cas en échec'

    const detecteurCasse = testsKo > 0
    const derive = horsGel > 0

    const templateData = {
      alertesOuvertes,
      horsGel,
      selftest,
      detecteurCasse,
      derive,
      cibles,
      controleArrete,
      joursDepuisRun,
      derniereExecution,
      runEnErreur,
      runErreurMessage,
    }

    if (horsGel === 0 && testsKo === 0 && !controleArrete && !runEnErreur) {
      return new Response(JSON.stringify({ ok: true, sent: false, reason: 'no_content_signal' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
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

    // Signaux reconstruits en direct depuis les conditions actuelles.
    const signals: string[] = []
    if (testsKo > 0) signals.push('content_detector_broken')
    if (horsGel > 0) signals.push('content_defect_outside_freeze', 'content_quality_drift')

    return new Response(JSON.stringify({
      ok: res.ok, sent: res.ok, recipient: RECIPIENT,
      signals, ...templateData,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    console.error('alert-content-quality error', e)
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Erreur inconnue' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
