/**
 * notify-mission-invitation
 *
 * Invoqué côté client juste après la RPC `invite_helper_to_mission`.
 * Envoie un email transactionnel à l'aidant invité.
 *
 * - verify_jwt = true : la gateway Supabase valide le JWT du caller
 * - Le caller DOIT être l'auteur de la mission (re-vérifié ici en service-role)
 * - Idempotency stable : `mission_invite_<missionId>_<helperId>` (cap 7j naturel
 *   via la RPC qui dédoublonne déjà la notification en base)
 */

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

interface Payload {
  mission_id: string
  helper_id: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let payload: Payload
  try {
    payload = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!payload?.mission_id || !payload?.helper_id) {
    return new Response(JSON.stringify({ error: 'missing_fields' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // 1. Identifier le caller via son JWT
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: userData, error: userErr } = await userClient.auth.getUser()
  if (userErr || !userData.user) {
    return new Response(JSON.stringify({ error: 'auth_failed' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  const callerId = userData.user.id

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

  // 2. Vérifier ownership et charger contexte mission
  const { data: mission, error: missionErr } = await supabase
    .from('small_missions')
    .select('id, user_id, title, city, status')
    .eq('id', payload.mission_id)
    .maybeSingle()

  if (missionErr || !mission) {
    return new Response(JSON.stringify({ error: 'mission_not_found' }), {
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  if (mission.user_id !== callerId) {
    return new Response(JSON.stringify({ error: 'forbidden' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  if (mission.status !== 'open' && mission.status !== 'in_progress') {
    return new Response(JSON.stringify({ skipped: 'mission_closed' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  if (payload.helper_id === callerId) {
    return new Response(JSON.stringify({ skipped: 'self_invite' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // 3. Charger helper (email + prénom) et owner (prénom)
  const [{ data: helper }, { data: owner }] = await Promise.all([
    supabase.from('profiles').select('email, first_name').eq('id', payload.helper_id).maybeSingle(),
    supabase.from('profiles').select('first_name').eq('id', callerId).maybeSingle(),
  ])

  if (!helper?.email) {
    return new Response(JSON.stringify({ skipped: 'no_email' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // 4. Envoyer l'email transactionnel
  const { error: sendErr } = await supabase.functions.invoke('send-transactional-email', {
    body: {
      templateName: 'mission-invitation',
      recipientEmail: helper.email,
      idempotencyKey: `mission_invite_${payload.mission_id}_${payload.helper_id}`,
      templateData: {
        helperFirstName: helper.first_name ?? null,
        ownerFirstName: owner?.first_name ?? null,
        missionTitle: mission.title ?? null,
        missionCity: mission.city ?? null,
        missionId: mission.id,
      },
    },
  })

  if (sendErr) {
    console.error('send_failed', { err: sendErr.message })
    return new Response(JSON.stringify({ error: 'send_failed' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
