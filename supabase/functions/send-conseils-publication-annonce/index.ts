import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const FN = 'conseils-publication-annonce'

type SkipReason =
  | 'no_email'
  | 'flag_already_set'
  | 'log_already_sent'
  | 'not_first_sit'
  | 'send_error'
  | 'exception'

function log(runId: string, level: 'info' | 'warn' | 'error', event: string, data: Record<string, unknown> = {}) {
  const payload = {
    fn: FN,
    run_id: runId,
    ts: new Date().toISOString(),
    level,
    event,
    ...data,
  }
  const line = JSON.stringify(payload)
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.log(line)
}

/**
 * Envoie l'email pédagogique J+30min après la publication de la TOUTE PREMIÈRE annonce
 * d'un compte propriétaire.
 *
 * Déclenchement : cron toutes les 5 minutes.
 * Fenêtre : sits publiés entre 28 et 90 min auparavant.
 * Anti-doublon : `profiles.first_sit_email_sent_at` + check `email_send_log`.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const runId = crypto.randomUUID()
  const runStart = performance.now()

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Fenêtre 28-90 min : tolère les retards de cron (5 min) et garantit le >=30min
  const minMinutes = 28
  const maxMinutes = 90
  const now = Date.now()
  const minDate = new Date(now - maxMinutes * 60_000).toISOString()
  const maxDate = new Date(now - minMinutes * 60_000).toISOString()

  log(runId, 'info', 'run_start', { window_min: minMinutes, window_max: maxMinutes, min_date: minDate, max_date: maxDate })

  // 1. Récupérer les sits publiés dans la fenêtre
  const queryStart = performance.now()
  const { data: sits, error: sitsError } = await supabase
    .from('sits')
    .select('id, user_id, title, daily_routine, cover_photo_url, created_at, properties(photos, cover_photo_url, region_highlights)')
    .eq('status', 'published')
    .gte('created_at', minDate)
    .lte('created_at', maxDate)

  const queryMs = Math.round(performance.now() - queryStart)

  if (sitsError) {
    log(runId, 'error', 'sits_query_error', { error: sitsError.message, query_ms: queryMs })
    return new Response(JSON.stringify({ error: sitsError.message, run_id: runId }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  log(runId, 'info', 'sits_fetched', { count: sits?.length ?? 0, query_ms: queryMs })

  if (!sits || sits.length === 0) {
    const duration_ms = Math.round(performance.now() - runStart)
    log(runId, 'info', 'run_end', { sent: 0, skipped: 0, errors: 0, total: 0, duration_ms, empty: true })
    return new Response(JSON.stringify({ sent: 0, skipped: 0, total: 0, run_id: runId, duration_ms }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let sent = 0
  let skipped = 0
  let errors = 0
  const skipReasons: Record<SkipReason, number> = {
    no_email: 0,
    flag_already_set: 0,
    log_already_sent: 0,
    not_first_sit: 0,
    send_error: 0,
    exception: 0,
  }

  for (const sit of sits) {
    const sitStart = performance.now()
    const ageMin = Math.round((Date.now() - new Date(sit.created_at).getTime()) / 60_000)
    try {
      // 2. Charger le profil + vérifier que c'est sa 1ère annonce
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, email, first_name, city, first_sit_email_sent_at')
        .eq('id', sit.user_id)
        .maybeSingle()

      if (!profile?.email) {
        skipped++; skipReasons.no_email++
        log(runId, 'info', 'sit_skipped', { sit_id: sit.id, reason: 'no_email', age_min: ageMin })
        continue
      }

      // ---- IDEMPOTENCE STRICTE (3 verrous) ----
      if (profile.first_sit_email_sent_at) {
        skipped++; skipReasons.flag_already_set++
        log(runId, 'info', 'sit_skipped', { sit_id: sit.id, user_id: sit.user_id, reason: 'flag_already_set', age_min: ageMin })
        continue
      }

      const { count: alreadySentCount } = await supabase
        .from('email_send_log')
        .select('id', { count: 'exact', head: true })
        .eq('template_name', 'conseils-publication-annonce')
        .eq('recipient_email', profile.email)

      if ((alreadySentCount ?? 0) > 0) {
        await supabase
          .from('profiles')
          .update({ first_sit_email_sent_at: new Date().toISOString() })
          .eq('id', sit.user_id)
        skipped++; skipReasons.log_already_sent++
        log(runId, 'warn', 'sit_skipped', { sit_id: sit.id, user_id: sit.user_id, reason: 'log_already_sent', repaired_flag: true, age_min: ageMin })
        continue
      }

      const { count: sitCount } = await supabase
        .from('sits')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', sit.user_id)

      if ((sitCount ?? 0) > 1) {
        skipped++; skipReasons.not_first_sit++
        log(runId, 'info', 'sit_skipped', { sit_id: sit.id, user_id: sit.user_id, reason: 'not_first_sit', sit_count: sitCount, age_min: ageMin })
        continue
      }

      // 3. Vérifier guide de la maison
      const { count: guideCount } = await supabase
        .from('house_guides' as any)
        .select('id', { count: 'exact', head: true })
        .eq('user_id', sit.user_id)

      const property = Array.isArray(sit.properties) ? sit.properties[0] : sit.properties
      const photos = (property as any)?.photos || []
      const hasCoverPhoto = !!(sit.cover_photo_url || (property as any)?.cover_photo_url)
      const hasDailyRoutine = !!(sit.daily_routine && sit.daily_routine.length > 30)
      const hasRegionHighlights = !!((property as any)?.region_highlights && (property as any).region_highlights.length > 30)
      const hasHouseGuide = (guideCount ?? 0) > 0
      const isPerfect = photos.length >= 6 && hasDailyRoutine && hasRegionHighlights && hasHouseGuide

      // 4. Envoi
      const sendStart = performance.now()
      const { error: sendError } = await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'conseils-publication-annonce',
          recipientEmail: profile.email,
          idempotencyKey: `conseils-publication-${sit.id}`,
          templateData: {
            firstName: profile.first_name || '',
            sitTitle: sit.title || '',
            sitId: sit.id,
            city: profile.city || '',
            nbPhotos: photos.length,
            hasDailyRoutine,
            hasRegionHighlights,
            hasHouseGuide,
            hasCoverPhoto,
          },
        },
      })
      const sendMs = Math.round(performance.now() - sendStart)

      if (sendError) {
        errors++; skipReasons.send_error++
        log(runId, 'error', 'send_failed', {
          sit_id: sit.id,
          user_id: sit.user_id,
          recipient: profile.email,
          error: sendError.message,
          send_ms: sendMs,
          age_min: ageMin,
        })
        continue
      }

      // 5. Marquer comme envoyé
      await supabase
        .from('profiles')
        .update({ first_sit_email_sent_at: new Date().toISOString() })
        .eq('id', sit.user_id)

      sent++
      const sitMs = Math.round(performance.now() - sitStart)
      log(runId, 'info', 'send_success', {
        sit_id: sit.id,
        user_id: sit.user_id,
        recipient: profile.email,
        variant: isPerfect ? 'exemplaire' : 'remarques',
        nb_photos: photos.length,
        has_daily_routine: hasDailyRoutine,
        has_region_highlights: hasRegionHighlights,
        has_house_guide: hasHouseGuide,
        has_cover_photo: hasCoverPhoto,
        is_perfect: isPerfect,
        age_min: ageMin,
        send_ms: sendMs,
        sit_ms: sitMs,
      })
    } catch (err) {
      errors++; skipReasons.exception++
      log(runId, 'error', 'sit_exception', {
        sit_id: sit.id,
        user_id: sit.user_id,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        age_min: ageMin,
      })
    }
  }

  const duration_ms = Math.round(performance.now() - runStart)
  log(runId, 'info', 'run_end', {
    sent,
    skipped,
    errors,
    total: sits.length,
    duration_ms,
    skip_reasons: skipReasons,
  })

  return new Response(
    JSON.stringify({ sent, skipped, errors, total: sits.length, run_id: runId, duration_ms, skip_reasons: skipReasons }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})
