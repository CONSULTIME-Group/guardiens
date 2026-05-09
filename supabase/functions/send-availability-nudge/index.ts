import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const FN = 'send-availability-nudge'

function log(runId: string, level: 'info' | 'warn' | 'error', event: string, data: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ fn: FN, run_id: runId, ts: new Date().toISOString(), level, event, ...data }))
}

function fmtDate(iso: string | null): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch { return iso }
}

/**
 * Cron quotidien.
 * Pour chaque annonce publiée depuis +24h sans aucune candidature :
 *   - cherche les gardiens du même département (postal_code prefixe)
 *   - envoie 1 email "availability-nudge" (templating idempotent par sit_id+sitter_id)
 *   - marque sits.availability_nudge_sent_at = now() pour ne plus jamais réenvoyer
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const runId = crypto.randomUUID()
  const runStart = performance.now()
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  log(runId, 'info', 'run_start')

  const { data: sits, error: sitsError } = await supabase.rpc('list_sits_needing_availability_nudge')

  if (sitsError) {
    log(runId, 'error', 'list_error', { error: sitsError.message })
    return new Response(JSON.stringify({ error: sitsError.message, run_id: runId }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  log(runId, 'info', 'sits_fetched', { count: sits?.length ?? 0 })

  let totalSent = 0
  let totalSkipped = 0
  let sitsProcessed = 0

  for (const sit of (sits ?? []) as any[]) {
    sitsProcessed++
    if (!sit.department) {
      log(runId, 'info', 'sit_skipped', { sit_id: sit.sit_id, reason: 'no_department' })
      // Marquer quand même pour ne pas re-tenter en boucle
      await supabase.from('sits').update({ availability_nudge_sent_at: new Date().toISOString() }).eq('id', sit.sit_id)
      continue
    }

    // Récupérer le prénom du proprio
    const { data: owner } = await supabase
      .from('profiles')
      .select('first_name')
      .eq('id', sit.owner_id)
      .maybeSingle()

    const { data: sitters, error: sittersErr } = await supabase.rpc('find_available_sitters_for_nudge', {
      p_department: sit.department,
      p_start_date: sit.start_date,
      p_end_date: sit.end_date,
    })

    if (sittersErr) {
      log(runId, 'error', 'sitters_error', { sit_id: sit.sit_id, error: sittersErr.message })
      continue
    }

    const list = (sitters ?? []) as any[]
    log(runId, 'info', 'sitters_found', { sit_id: sit.sit_id, dept: sit.department, count: list.length })

    let sentForSit = 0
    for (const sitter of list) {
      // Anti-doublon supplémentaire via idempotency_key
      const idem = `availability-nudge-${sit.sit_id}-${sitter.user_id}`
      const { error: sendErr } = await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'availability-nudge',
          recipientEmail: sitter.email,
          idempotencyKey: idem,
          templateData: {
            sitterFirstName: sitter.first_name || '',
            sitTitle: sit.title || '',
            city: sit.city || '',
            startDate: fmtDate(sit.start_date),
            endDate: fmtDate(sit.end_date),
            sitId: sit.sit_id,
            ownerFirstName: owner?.first_name || '',
          },
        },
      })
      if (sendErr) {
        totalSkipped++
        log(runId, 'warn', 'send_failed', { sit_id: sit.sit_id, sitter_id: sitter.user_id, error: sendErr.message })
      } else {
        totalSent++; sentForSit++
      }
    }

    // Marquer comme nudgé (même si 0 destinataire, pour ne pas reprocesser)
    await supabase.from('sits').update({ availability_nudge_sent_at: new Date().toISOString() }).eq('id', sit.sit_id)
    log(runId, 'info', 'sit_done', { sit_id: sit.sit_id, sent: sentForSit })
  }

  // Bonus : flag urgent automatique
  let urgentFlagged = 0
  const { data: ufRows } = await supabase.rpc('auto_flag_urgent_sits')
  if (typeof ufRows === 'number') urgentFlagged = ufRows

  const duration_ms = Math.round(performance.now() - runStart)
  log(runId, 'info', 'run_end', { sits_processed: sitsProcessed, total_sent: totalSent, total_skipped: totalSkipped, urgent_flagged: urgentFlagged, duration_ms })

  return new Response(
    JSON.stringify({ sits_processed: sitsProcessed, total_sent: totalSent, total_skipped: totalSkipped, urgent_flagged: urgentFlagged, run_id: runId, duration_ms }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})
