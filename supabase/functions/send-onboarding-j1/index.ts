import { createClient } from 'npm:@supabase/supabase-js@2'
import { computeAffinityResultFull } from '../_shared/affinity/score.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Colonnes lues pour le moteur unique : même projection que le digest.
const SITTER_AFFINITY_COLUMNS = 'user_id, experience_years, life_pace, lifestyle, availability_during, languages, interests, work_during_sit, meeting_preference, handover_preference, sensitivities, animal_types, sitter_type, special_animal_skills, travels_with_children, travels_with_own_animals, has_vehicle, has_license, farm_animals_ok'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Optional: allow manual trigger with custom window (default 23-25h ago)
  let minHours = 23
  let maxHours = 25
  try {
    const body = await req.json()
    if (body.minHours) minHours = body.minHours
    if (body.maxHours) maxHours = body.maxHours
  } catch {
    // No body = cron trigger, use defaults
  }

  // Find users with profile_completion < 60 who signed up in the window
  const { data: eligibleProfiles, error: queryError } = await supabase
    .from('profiles')
    .select('id, email, first_name, profile_completion, role, city, latitude, longitude')
    .lt('profile_completion', 60)
    .gte('created_at', new Date(Date.now() - maxHours * 3600_000).toISOString())
    .lte('created_at', new Date(Date.now() - minHours * 3600_000).toISOString())
    .not('email', 'is', null)

  if (queryError) {
    console.error('Query error:', queryError)
    return new Response(JSON.stringify({ error: queryError.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!eligibleProfiles || eligibleProfiles.length === 0) {
    return new Response(JSON.stringify({ sent: 0, message: 'No eligible profiles' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let sent = 0
  let skipped = 0

  for (const profile of eligibleProfiles) {
    // Anti-duplicate: check if onboarding-j1 already sent to this user
    const { data: alreadySent } = await supabase
      .from('email_send_log')
      .select('id')
      .eq('template_name', 'onboarding-j1')
      .eq('recipient_email', profile.email)
      .limit(1)

    if (alreadySent && alreadySent.length > 0) {
      skipped++
      continue
    }

    // Enrich for owners: nearby sitter count + top 3 affinity sitters
    const isOwner = profile.role === 'owner' || profile.role === 'both'
    let nearbySittersCount: number | null = null
    let topSitters: unknown[] = []

    if (isOwner) {
      try {
        const { data: ctx } = await supabase.rpc('get_owner_nurturing_context', { _owner_id: profile.id })
        if (ctx && typeof ctx === 'object') {
          const c = ctx as Record<string, unknown>
          if (typeof c.nearby_sitters_count === 'number') {
            nearbySittersCount = c.nearby_sitters_count
          }
        }

        // Top 3 via le MOTEUR UNIQUE partagé (le même calcul que
        // l'affichage dans l'app et que le digest), mode distribution :
        // seuls les refus explicitement déclarés par le gardien excluent,
        // jamais un score bas. La fonction SQL get_owner_top_3_sitters
        // n'est plus appelée ici (dépréciée, conservée en base).
        const [{ data: ownerPrefs }, { data: ownerProps }, { data: pool }] = await Promise.all([
          supabase.from('owner_profiles')
            .select('preferred_sitter_types, home_ambiance, languages, interests, life_pace, presence_expected')
            .eq('user_id', profile.id)
            .maybeSingle(),
          supabase.from('properties')
            .select('id, car_required, pets(species, special_needs, breed)')
            .eq('user_id', profile.id),
          supabase.from('profiles')
            .select('id, first_name, avatar_url, city, latitude, longitude, identity_verified, account_status')
            .in('role', ['sitter', 'both'])
            .neq('id', profile.id)
            .limit(1000),
        ])

        const poolRows = (pool ?? []).filter(
          (p: any) => (p.account_status ?? 'active') === 'active'
        )
        const { data: sitterRows } = poolRows.length
          ? await supabase.from('sitter_profiles').select(SITTER_AFFINITY_COLUMNS)
              .in('user_id', poolRows.map((p: any) => p.id))
          : { data: [] as any[] }
        const sitterByUser = new Map((sitterRows ?? []).map((s: any) => [s.user_id, s]))

        const ownerPets = (ownerProps ?? []).flatMap(
          (p: any) => Array.isArray(p.pets) ? p.pets : []
        )
        const ownerInput = {
          preferred_sitter_types: (ownerPrefs as any)?.preferred_sitter_types ?? null,
          home_ambiance: (ownerPrefs as any)?.home_ambiance ?? null,
          languages: (ownerPrefs as any)?.languages ?? null,
          interests: (ownerPrefs as any)?.interests ?? null,
          life_pace: (ownerPrefs as any)?.life_pace ?? null,
          presence_expected: (ownerPrefs as any)?.presence_expected ?? null,
          car_required: (ownerProps ?? []).some((p: any) => p.car_required === true),
          // Pas d'annonce cible à J+1 : les politiques accompagnants ne sont
          // pas évaluables. null explicite, neutre dans le moteur.
          accepts_sitter_pets: null,
          accepts_sitter_children: null,
          pets: ownerPets.map((p: any) => ({
            species: p.species,
            special_needs: p.special_needs,
            breed: p.breed ?? null,
          })),
        }

        const meLat = (profile as any).latitude as number | null
        const meLng = (profile as any).longitude as number | null

        const scored = poolRows.map((p: any) => {
          // Un gardien sans ligne sitter_profiles est scoré avec une entrée
          // vide (critères non évaluables, neutres), jamais écarté.
          const result = computeAffinityResultFull(
            ownerInput as any,
            (sitterByUser.get(p.id) ?? {}) as any,
            { mode: 'distribution' },
          )
          const distance = (meLat != null && meLng != null && p.latitude != null && p.longitude != null)
            ? Math.round(haversineKm(meLat, meLng, p.latitude, p.longitude) * 10) / 10
            : null
          return { p, result, distance }
        }).filter((x) => x.result.distributable)

        // Tri : score de tri (pondéré par la confiance, 20/08/2026) d'abord,
        // identité vérifiée en départage, distance. Le score brut reste
        // celui affiché dans l'email.
        scored.sort((a, b) =>
          (b.result.sortScore - a.result.sortScore)
          || (Number(b.p.identity_verified === true) - Number(a.p.identity_verified === true))
          || ((a.distance ?? Number.POSITIVE_INFINITY) - (b.distance ?? Number.POSITIVE_INFINITY))
        )

        topSitters = scored.slice(0, 3).map(({ p, result, distance }) => ({
          first_name: p.first_name,
          city: p.city,
          avatar_url: p.avatar_url,
          affinity_score: result.score,
          distance_km: distance,
        }))
      } catch (e) {
        console.warn(`Context enrichment failed for ${profile.id}:`, e)
      }
    }

    // Send via the transactional email function
    const _steRes = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-transactional-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
      body: JSON.stringify({
        templateName: 'onboarding-j1',
        recipientEmail: profile.email,
        idempotencyKey: `onboarding-j1-${profile.id}`,
        templateData: {
          firstName: profile.first_name || '',
          isOwner,
          city: profile.city ?? null,
          nearbySittersCount,
          topSitters,
        },
      }),
    });
    const _steTxt1 = _steRes.ok ? '' : await _steRes.text().catch(() => '');
    if (!_steRes.ok) console.error('send-transactional-email failed', _steRes.status, _steTxt1);
    const error = _steRes.ok ? null : new Error(`send-transactional-email ${_steRes.status}: ${_steTxt1}`);

    if (error) {
      console.error(`Failed to send to ${profile.email}:`, error)
    } else {
      sent++
    }
  }

  console.log(`Onboarding J+1: sent=${sent}, skipped=${skipped}, total=${eligibleProfiles.length}`)

  return new Response(
    JSON.stringify({ sent, skipped, total: eligibleProfiles.length }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
