// Public endpoint: returns a 1x1 transparent GIF and logs an "open" event.
// No JWT required. Idempotent thanks to a unique partial index.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'

const GIF_BYTES = new Uint8Array([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00,
  0x00, 0x00, 0x00, 0xff, 0xff, 0xff, 0x21, 0xf9, 0x04, 0x01, 0x00, 0x00, 0x00,
  0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02,
  0x44, 0x01, 0x00, 0x3b,
])

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const isUuid = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)

function anonymizeIp(ip: string | null): string | null {
  if (!ip) return null
  // Take first IP from x-forwarded-for chain
  const first = ip.split(',')[0].trim()
  if (first.includes(':')) {
    // IPv6 → keep first 4 hextets
    return first.split(':').slice(0, 4).join(':') + '::'
  }
  // IPv4 → /16
  const parts = first.split('.')
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.0.0`
  return null
}

/** Jeton de désinscription : lettres, chiffres, tirets, 16 à 128 caractères. */
const isToken = (s: string) => /^[A-Za-z0-9_-]{16,128}$/.test(s)

const gifResponse = () =>
  new Response(GIF_BYTES, {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
    },
  })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const mid = url.searchParams.get('mid') ?? ''
    const campaign = url.searchParams.get('c') ?? ''
    const token = url.searchParams.get('t') ?? ''
    const userId = url.searchParams.get('u') ?? ''

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const now = new Date().toISOString()

    if (isUuid(mid)) {
      const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('cf-connecting-ip')
      const ua = req.headers.get('user-agent')?.slice(0, 500) ?? null

      // Insert; conflict on unique partial index → first open wins
      await supabase.from('email_engagement_events').insert({
        message_id: mid,
        event_type: 'open',
        user_agent: ua,
        ip_prefix: anonymizeIp(ip),
      })
      // Lot MAIL2 : le suivi d'ouverture de Resend est coupé ; le pixel maison
      // tient à jour les colonnes que le webhook alimentait (email_send_log).
      const { data: logRow } = await supabase
        .from('email_send_log')
        .select('id, open_count, first_opened_at')
        .eq('message_id', mid)
        .not('resend_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (logRow) {
        await supabase.from('email_send_log').update({
          last_opened_at: now,
          open_count: (logRow.open_count || 0) + 1,
          ...(logRow.first_opened_at ? {} : { first_opened_at: now }),
        }).eq('id', logRow.id)
      }
    } else if (isUuid(campaign) && (isToken(token) || isUuid(userId))) {
      // Lot MAIL2 : envois groupés, destinataire reconnu par son jeton de
      // désinscription (t) ou son identifiant de profil (u).
      let email: string | null = null
      if (isToken(token)) {
        const { data } = await supabase.from('email_unsubscribe_tokens').select('email').eq('token', token).maybeSingle()
        email = (data as { email?: string } | null)?.email ?? null
      } else {
        const { data } = await supabase.from('profiles').select('email').eq('id', userId).maybeSingle()
        email = (data as { email?: string } | null)?.email ?? null
      }
      if (email) {
        const pattern = email.replace(/[\\%_]/g, (m) => `\\${m}`)
        const { data: send } = await supabase
          .from('mass_email_sends')
          .select('id, status, open_count, first_opened_at')
          .eq('mass_email_id', campaign)
          .ilike('recipient_email', pattern)
          .limit(1)
          .maybeSingle()
        if (send) {
          await supabase.from('mass_email_sends').update({
            last_opened_at: now,
            open_count: (send.open_count || 0) + 1,
            ...(send.first_opened_at ? {} : { first_opened_at: now }),
            ...(send.status === 'sent' || send.status === 'delivered' ? { status: 'opened' } : {}),
          }).eq('id', send.id)
        }
      }
    }
    // Ignore duplicate errors silently
  } catch (err) {
    console.error('track-email-pixel error', err)
  }

  return gifResponse()
})
