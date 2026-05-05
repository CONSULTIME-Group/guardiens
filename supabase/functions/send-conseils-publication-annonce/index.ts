import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

  // 1. Récupérer les sits publiés dans la fenêtre
  const { data: sits, error: sitsError } = await supabase
    .from('sits')
    .select('id, user_id, title, daily_routine, cover_photo_url, created_at, properties(photos, cover_photo_url, region_highlights)')
    .eq('status', 'published')
    .gte('created_at', minDate)
    .lte('created_at', maxDate)

  if (sitsError) {
    console.error('[conseils-publication-annonce] sits query error:', sitsError)
    return new Response(JSON.stringify({ error: sitsError.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!sits || sits.length === 0) {
    return new Response(JSON.stringify({ sent: 0, message: 'Aucun sit dans la fenêtre' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let sent = 0
  let skipped = 0

  for (const sit of sits) {
    try {
      // 2. Charger le profil + vérifier que c'est sa 1ère annonce
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, email, first_name, city, first_sit_email_sent_at')
        .eq('id', sit.user_id)
        .maybeSingle()

      if (!profile?.email) { skipped++; continue }
      if (profile.first_sit_email_sent_at) { skipped++; continue }

      // Vérification stricte : ne doit avoir QU'UNE seule annonce (celle-ci)
      const { count: sitCount } = await supabase
        .from('sits')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', sit.user_id)

      if ((sitCount ?? 0) > 1) { skipped++; continue }

      // 3. Vérifier guide de la maison
      const { count: guideCount } = await supabase
        .from('house_guides' as any)
        .select('id', { count: 'exact', head: true })
        .eq('user_id', sit.user_id)

      const property = Array.isArray(sit.properties) ? sit.properties[0] : sit.properties
      const photos = (property as any)?.photos || []
      const hasCoverPhoto = !!(sit.cover_photo_url || (property as any)?.cover_photo_url)

      // 4. Envoi
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
            hasDailyRoutine: !!(sit.daily_routine && sit.daily_routine.length > 30),
            hasRegionHighlights: !!((property as any)?.region_highlights && (property as any).region_highlights.length > 30),
            hasHouseGuide: (guideCount ?? 0) > 0,
            hasCoverPhoto,
          },
        },
      })

      if (sendError) {
        console.error(`[conseils-publication-annonce] send failed for sit ${sit.id}:`, sendError)
        continue
      }

      // 5. Marquer comme envoyé
      await supabase
        .from('profiles')
        .update({ first_sit_email_sent_at: new Date().toISOString() })
        .eq('id', sit.user_id)

      sent++
    } catch (err) {
      console.error(`[conseils-publication-annonce] error processing sit ${sit.id}:`, err)
    }
  }

  console.log(`[conseils-publication-annonce] sent=${sent}, skipped=${skipped}, total=${sits.length}`)

  return new Response(
    JSON.stringify({ sent, skipped, total: sits.length }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})
