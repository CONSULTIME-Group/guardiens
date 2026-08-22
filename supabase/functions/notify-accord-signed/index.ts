/**
 * notify-accord-signed
 *
 * Déclenché par le trigger DB `trg_garde_accord_signed` (pg_net) à chaque
 * signature d'un accord de garde (INSERT ou UPDATE accepted false -> true
 * sur garde_accords).
 *
 * Deux directions :
 *  - signer_role = 'proprio' : on prévient le gardien accepté que l'accord
 *    est prêt à signer (in-app + email `accord-ready-for-sitter`).
 *  - signer_role = 'gardien' : on prévient le propriétaire que les deux
 *    signatures sont réunies (in-app + email `accord-signed-by-sitter`).
 *
 * Sans cette notification, le gardien ne savait jamais que l'accord était
 * prêt : mesuré le 22/08/2026, 4 accords signés côté propriétaire, zéro
 * signature gardien.
 *
 * Idempotence : `accord_<garde_id>_<signer_role>` côté send-transactional-email,
 * le trigger ne se déclenche qu'une fois par passage à accepted = true.
 */

import { createClient } from 'npm:@supabase/supabase-js@2'
import { recordDeliveryFailure } from '../_shared/delivery-failure.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface Payload {
  garde_id: string
  signer_id: string
  signer_role: 'proprio' | 'gardien'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Restreint aux appels service-role (trigger DB via pg_net).
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (token !== SERVICE_KEY) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let payload: Payload
  try {
    const body = await req.json()
    payload = body.record ?? body
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!payload?.garde_id || !payload?.signer_id || !payload?.signer_role) {
    return new Response(JSON.stringify({ error: 'missing_fields' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

  // 1. Charger la garde
  const { data: sit, error: sitErr } = await supabase
    .from('sits')
    .select('id, title, user_id')
    .eq('id', payload.garde_id)
    .maybeSingle()

  if (sitErr || !sit) {
    console.error('sit_not_found', { garde_id: payload.garde_id, err: sitErr })
    return new Response(JSON.stringify({ error: 'sit_not_found' }), {
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const sitTitle = sit.title || 'votre garde'
  const sitLink = `/sits/${sit.id}`

  // 2. Déterminer le destinataire (l'autre partie) et le signataire
  let recipientId: string | null = null
  if (payload.signer_role === 'proprio') {
    const { data: acceptedApp } = await supabase
      .from('applications')
      .select('sitter_id')
      .eq('sit_id', sit.id)
      .eq('status', 'accepted')
      .limit(1)
      .maybeSingle()
    recipientId = acceptedApp?.sitter_id ?? null
  } else {
    recipientId = sit.user_id
  }

  if (!recipientId || recipientId === payload.signer_id) {
    return new Response(JSON.stringify({ skipped: 'no_counterparty' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // 3. Profils : prénom du signataire + email du destinataire
  const { data: signerProfile } = await supabase
    .from('profiles')
    .select('first_name')
    .eq('id', payload.signer_id)
    .maybeSingle()

  const { data: recipientProfile } = await supabase
    .from('profiles')
    .select('email, first_name')
    .eq('id', recipientId)
    .maybeSingle()

  const signerName = signerProfile?.first_name
    || (payload.signer_role === 'proprio' ? 'Le propriétaire' : 'Votre gardien')

  // 4. Notification in-app
  const notif = payload.signer_role === 'proprio'
    ? {
        user_id: recipientId,
        type: 'accord_ready_for_sitter',
        title: 'Votre accord de garde vous attend',
        body: `${signerName} a signé l'accord de garde pour « ${sitTitle} ». À vous de le lire et le signer.`,
        link: sitLink,
        actor_name: signerProfile?.first_name ?? null,
      }
    : {
        user_id: recipientId,
        type: 'accord_signed_both',
        title: "L'accord de garde est signé",
        body: `${signerName} a signé l'accord de garde pour « ${sitTitle} ». Les deux signatures sont réunies.`,
        link: sitLink,
        actor_name: signerProfile?.first_name ?? null,
      }

  const { error: notifErr } = await supabase.from('notifications').insert(notif)
  if (notifErr) {
    console.error('notification_insert_failed', { err: notifErr, recipient: recipientId })
  }

  // 5. Email transactionnel
  if (!recipientProfile?.email) {
    console.warn('no_recipient_email', { recipient: recipientId })
    return new Response(JSON.stringify({ success: true, email: 'skipped_no_email' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const templateName = payload.signer_role === 'proprio'
    ? 'accord-ready-for-sitter'
    : 'accord-signed-by-sitter'

  const templateData = payload.signer_role === 'proprio'
    ? { sitTitle, sitId: sit.id, ownerFirstName: signerProfile?.first_name ?? null }
    : { sitTitle, sitId: sit.id, sitterFirstName: signerProfile?.first_name ?? null }

  const callSender = () => fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SERVICE_KEY}` },
    body: JSON.stringify({
      templateName,
      recipientEmail: recipientProfile.email,
      idempotencyKey: `accord_${payload.garde_id}_${payload.signer_role}`,
      templateData,
      logMetadata: {
        garde_id: payload.garde_id,
        recipient_id: recipientId,
        source: 'notify-accord-signed',
      },
    }),
  })

  // Une retentative après une seconde couvre les 429 et 5xx transitoires.
  // L'idempotencyKey empêche tout doublon.
  let steRes = await callSender()
  if (!steRes.ok && (steRes.status === 429 || steRes.status >= 500)) {
    await new Promise((r) => setTimeout(r, 1000))
    steRes = await callSender()
  }
  const steTxt = steRes.ok ? '' : await steRes.text().catch(() => '')

  if (!steRes.ok) {
    console.error('send-transactional-email failed', steRes.status, steTxt)
    await recordDeliveryFailure(supabase, {
      templateName,
      recipientEmail: recipientProfile.email,
      recipientId,
      entityType: 'garde_accord',
      entityId: payload.garde_id,
      source: 'notify-accord-signed',
      errorMessage: `send-transactional-email ${steRes.status}: ${steTxt}`,
    })
    // 200 assumé : l'appelant est un trigger DB, le faire échouer bloquerait
    // la signature. L'échec laisse une trace persistante (email_send_log
    // statut failed + admin_signals notification_delivery_failure).
    return new Response(JSON.stringify({ success: false, error: 'send_failed' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
