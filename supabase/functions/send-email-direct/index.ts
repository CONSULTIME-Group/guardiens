import { createClient } from 'npm:@supabase/supabase-js@2'
import { requireAdminOrServiceRole } from '../_shared/require-admin.ts'
import { resendFetch } from "../_shared/resend-guard.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

// Lot 8 (26/07/2026) : cette fonction reste utile pour l'outillage interne
// (tests de delivrabilite, alertes equipe), mais elle contourne le pipeline
// transactionnel (cap, suppression, opt-out, pied de page). Elle est donc
// restreinte aux destinataires INTERNES, et chaque envoi est journalise.
// Tout envoi vers un membre doit passer par send-transactional-email.
const INTERNAL_DOMAINS = ['guardiens.fr']
const INTERNAL_EMAILS = ['contact.guardiens@gmail.com']

function isInternalRecipient(addr: string): boolean {
  const email = addr.trim().toLowerCase()
  if (INTERNAL_EMAILS.includes(email)) return true
  const domain = email.split('@')[1] ?? ''
  return INTERNAL_DOMAINS.includes(domain)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const authFail = await requireAdminOrServiceRole(req, corsHeaders)
  if (authFail) return authFail

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured')
    }

    const { to, subject, html, text, from, reply_to } = await req.json()

    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, subject, html' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const recipients: string[] = (Array.isArray(to) ? to : [to]).map((r: unknown) => String(r))
    const external = recipients.filter((r) => !isInternalRecipient(r))
    if (external.length > 0) {
      console.error('send-email-direct refused: external recipients', { external })
      return new Response(
        JSON.stringify({
          error: 'send-email-direct est reserve aux destinataires internes. Utilisez send-transactional-email.',
          external_recipients: external,
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const messageId = crypto.randomUUID()
    const payload: Record<string, unknown> = {
      from: from || 'Guardiens <noreply@guardiens.fr>',
      to: recipients,
      subject,
      html,
    }
    if (text) payload.text = text
    if (reply_to) payload.reply_to = reply_to

    const response = await resendFetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(payload),
    }, { functionName: "send-email-direct" })

    const data = await response.json()

    if (!response.ok) {
      console.error('Resend API error:', response.status, JSON.stringify(data))
      const { error: logErr } = await supabase.from('email_send_log').insert({
        message_id: messageId,
        template_name: 'internal-direct',
        recipient_email: recipients[0],
        status: 'failed',
        error_message: `Resend ${response.status}: ${data.message || response.statusText}`,
        metadata: { channel: 'send-email-direct', internal: true, subject, recipients },
      })
      if (logErr) console.error('email_send_log insert failed (internal-direct failed)', logErr)
      return new Response(
        JSON.stringify({ error: `Resend error: ${data.message || response.statusText}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const { error: logErr } = await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: 'internal-direct',
      recipient_email: recipients[0],
      status: 'sent',
      resend_id: data.id ?? null,
      metadata: { channel: 'send-email-direct', internal: true, subject, recipients },
    })
    if (logErr) console.error('email_send_log insert failed (internal-direct sent)', logErr)

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('send-email-direct error:', err)
    return new Response(
      JSON.stringify({ error: (err as Error).message || 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
