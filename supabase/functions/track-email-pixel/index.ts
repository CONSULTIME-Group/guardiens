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
    if (!isUuid(mid)) {
      // Always return GIF to avoid breaking email rendering
      return gifResponse()
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('cf-connecting-ip')
    const ua = req.headers.get('user-agent')?.slice(0, 500) ?? null

    // Insert; conflict on unique partial index → first open wins
    await supabase.from('email_engagement_events').insert({
      message_id: mid,
      event_type: 'open',
      user_agent: ua,
      ip_prefix: anonymizeIp(ip),
    })
    // Ignore duplicate errors silently
  } catch (err) {
    console.error('track-email-pixel error', err)
  }

  return gifResponse()
})
