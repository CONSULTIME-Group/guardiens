// Public endpoint: logs a "click" event then 302-redirects to the target URL.
// Only redirects to whitelisted hosts (guardiens.fr + Lovable preview).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ALLOWED_HOSTS = new Set([
  'guardiens.fr',
  'www.guardiens.fr',
  'guardiens.lovable.app',
])

const FALLBACK_URL = 'https://guardiens.fr'

const isUuid = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)

function anonymizeIp(ip: string | null): string | null {
  if (!ip) return null
  const first = ip.split(',')[0].trim()
  if (first.includes(':')) return first.split(':').slice(0, 4).join(':') + '::'
  const parts = first.split('.')
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.0.0`
  return null
}

function decodeUrl(b64: string): string | null {
  try {
    // base64url-safe decoding
    const normalized = b64.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4)
    return atob(padded)
  } catch {
    return null
  }
}

function safeRedirectUrl(raw: string | null): string {
  if (!raw) return FALLBACK_URL
  try {
    const u = new URL(raw)
    if (!ALLOWED_HOSTS.has(u.hostname)) return FALLBACK_URL
    return u.toString()
  } catch {
    return FALLBACK_URL
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const mid = url.searchParams.get('mid') ?? ''
  const encoded = url.searchParams.get('u')
  const decoded = encoded ? decodeUrl(encoded) : null
  const target = safeRedirectUrl(decoded)

  if (isUuid(mid)) {
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      )

      const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('cf-connecting-ip')
      const ua = req.headers.get('user-agent')?.slice(0, 500) ?? null

      await supabase.from('email_engagement_events').insert({
        message_id: mid,
        event_type: 'click',
        target_url: target.slice(0, 2000),
        user_agent: ua,
        ip_prefix: anonymizeIp(ip),
      })
    } catch (err) {
      console.error('track-email-click error', err)
    }
  }

  return Response.redirect(target, 302)
})
