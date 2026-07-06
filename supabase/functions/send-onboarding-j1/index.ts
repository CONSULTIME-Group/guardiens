import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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
    .select('id, email, first_name, profile_completion, role, city')
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
        const [{ data: ctx }, { data: top3 }] = await Promise.all([
          supabase.rpc('get_owner_nurturing_context', { _owner_id: profile.id }),
          supabase.rpc('get_owner_top_3_sitters', { _owner_id: profile.id }),
        ])
        if (ctx && typeof ctx === 'object') {
          const c = ctx as Record<string, unknown>
          if (typeof c.nearby_sitters_count === 'number') {
            nearbySittersCount = c.nearby_sitters_count
          }
        }
        if (Array.isArray(top3)) topSitters = top3
      } catch (e) {
        console.warn(`Context enrichment failed for ${profile.id}:`, e)
      }
    }

    // Send via the transactional email function
    const { error } = await supabase.functions.invoke('send-transactional-email', {
      body: {
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
      },
    })

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
