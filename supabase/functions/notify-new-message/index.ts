/**
 * notify-new-message
 *
 * Déclenché par un trigger DB (pg_net) à chaque INSERT de message non-système.
 * Envoie un email contextualisé au destinataire si :
 *  - il n'a pas déjà reçu un email pour cette conversation depuis 30 min (throttle)
 *  - son email n'est pas suppressed
 *
 * Idempotency : `msg_<message_id>` (+ throttle DB pour la déduplication temporelle)
 */

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface Payload {
  message_id: string
  conversation_id: string
  sender_id: string
  content: string
  is_system: boolean
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  let payload: Payload
  try {
    const body = await req.json()
    // Supporte le format pg_net direct OU le format webhook
    payload = body.record ?? body
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!payload?.message_id || !payload.conversation_id) {
    return new Response(JSON.stringify({ error: 'missing_fields' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (payload.is_system) {
    return new Response(JSON.stringify({ skipped: 'system_message' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

  // 1. Charger la conversation + contexte
  const { data: conv, error: convErr } = await supabase
    .from('conversations')
    .select('id, owner_id, sitter_id, sit_id, small_mission_id, context_type')
    .eq('id', payload.conversation_id)
    .single()

  if (convErr || !conv) {
    console.error('conversation_not_found', { conv_id: payload.conversation_id, err: convErr })
    return new Response(JSON.stringify({ error: 'conversation_not_found' }), {
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // 2. Déterminer le destinataire
  const recipientId = conv.owner_id === payload.sender_id ? conv.sitter_id : conv.owner_id
  if (recipientId === payload.sender_id) {
    return new Response(JSON.stringify({ skipped: 'self_message' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // 3. Throttle 30 min : vérifier qu'on n'a pas déjà notifié pour cette conv récemment
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
  const { data: recentSends } = await supabase
    .from('email_send_log')
    .select('id, created_at')
    .eq('template_name', 'new-message')
    .eq('status', 'sent')
    .filter('metadata->>conversation_id', 'eq', payload.conversation_id)
    .filter('metadata->>recipient_id', 'eq', recipientId)
    .gte('created_at', thirtyMinAgo)
    .limit(1)

  if (recentSends && recentSends.length > 0) {
    console.log('throttled', { conv: payload.conversation_id, recipient: recipientId })
    return new Response(JSON.stringify({ skipped: 'throttled_30min' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // 4. Récupérer profils + email
  const { data: senderProfile } = await supabase
    .from('profiles')
    .select('first_name')
    .eq('id', payload.sender_id)
    .maybeSingle()

  const { data: recipientProfile } = await supabase
    .from('profiles')
    .select('email, first_name')
    .eq('id', recipientId)
    .maybeSingle()

  if (!recipientProfile?.email) {
    console.warn('no_recipient_email', { recipient: recipientId })
    return new Response(JSON.stringify({ skipped: 'no_email' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // 5. Déterminer le rôle du destinataire dans la conv (owner ou sitter)
  //    -> utilisé pour adapter le wording de l'email (ex: "candidate à votre garde"
  //       n'a de sens que pour le owner qui reçoit, pas pour le sitter).
  const recipientRole: 'owner' | 'sitter' = recipientId === conv.owner_id ? 'owner' : 'sitter'

  // 6. Construire le label contextuel enrichi (titre + ville + dates)
  let contextLabel: string | undefined
  let contextTitle: string | undefined
  let contextCity: string | undefined
  let contextDates: string | undefined
  try {
    if (conv.sit_id) {
      const { data: sit } = await supabase
        .from('sits')
        .select('title, start_date, end_date, user_id')
        .eq('id', conv.sit_id)
        .maybeSingle()
      if (sit) {
        contextTitle = sit.title ?? undefined
        if (sit.start_date && sit.end_date) {
          const fmt = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
          contextDates = `${fmt(sit.start_date)} → ${fmt(sit.end_date)}`
        }
        // Ville = ville de l'owner (propriétaire de l'annonce)
        if (sit.user_id) {
          const { data: ownerProfile } = await supabase
            .from('profiles').select('city').eq('id', sit.user_id).maybeSingle()
          if (ownerProfile?.city) contextCity = ownerProfile.city
        }
        if (contextTitle) {
          // Label adapté au destinataire
          const possessive = recipientRole === 'owner' ? 'votre annonce' : 'l\'annonce'
          contextLabel = `${possessive} « ${contextTitle} »`
        }
      }
    } else if (conv.small_mission_id) {
      const { data: m } = await supabase
        .from('small_missions')
        .select('title, city, date_needed')
        .eq('id', conv.small_mission_id)
        .maybeSingle()
      if (m) {
        contextTitle = m.title ?? undefined
        contextCity = m.city ?? undefined
        if (m.date_needed) {
          contextDates = new Date(m.date_needed).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
        }
        if (contextTitle) {
          const possessive = recipientRole === 'owner' ? 'votre mission' : 'la mission'
          contextLabel = `${possessive} « ${contextTitle} »`
        }
      }
    }
  } catch (e) {
    console.warn('context_label_failed', { err: String(e) })
  }

  // 7. Tronquer aperçu
  const preview = (payload.content || '').trim().slice(0, 200)

  // 8. Invoquer send-transactional-email
  const { error: sendErr } = await supabase.functions.invoke('send-transactional-email', {
    body: {
      templateName: 'new-message',
      recipientEmail: recipientProfile.email,
      idempotencyKey: `msg_${payload.message_id}`,
      templateData: {
        senderFirstName: senderProfile?.first_name ?? null,
        conversationId: conv.id,
        contextType: conv.context_type ?? null,
        contextLabel: contextLabel ?? null,
        contextCity: contextCity ?? null,
        contextDates: contextDates ?? null,
        recipientRole,
        messagePreview: preview || null,
      },
    },
  })

  if (sendErr) {
    console.error('send_failed', { err: sendErr.message })
    return new Response(JSON.stringify({ error: 'send_failed' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Log meta pour le throttle (on ré-insère car send-transactional-email log sans conversation_id)
  await supabase.from('email_send_log').insert({
    message_id: crypto.randomUUID(),
    template_name: 'new-message',
    recipient_email: recipientProfile.email,
    status: 'sent',
    metadata: { conversation_id: conv.id, recipient_id: recipientId, source: 'notify-new-message' },
  })

  return new Response(JSON.stringify({ success: true }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
