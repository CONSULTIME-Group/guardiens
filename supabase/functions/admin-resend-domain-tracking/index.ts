import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const TARGET_DOMAIN = 'notify.guardiens.fr'
const RESEND_API = 'https://api.resend.com'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  try {
    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!resendKey) return json({ error: 'RESEND_API_KEY is not configured' }, 500)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceKey)

    // --- Admin-only guard (same pattern as send-transactional-email) ---
    const authHeader = req.headers.get('Authorization') ?? ''
    const callerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    const isServiceRole = !!callerToken && callerToken === serviceKey
    const bootstrap = Deno.env.get('ADMIN_TRACKING_BOOTSTRAP')
    const bootstrapOk = !!bootstrap && req.headers.get('X-Admin-Bootstrap') === bootstrap

    if (!isServiceRole && !bootstrapOk) {
      if (!callerToken) return json({ error: 'Unauthorized' }, 401)
      const { data: userData } = await supabase.auth.getUser(callerToken)
      if (!userData?.user) return json({ error: 'Unauthorized' }, 401)
      const { data: adminCheck } = await supabase.rpc('has_role', {
        _user_id: userData.user.id,
        _role: 'admin',
      })
      if (adminCheck !== true) return json({ error: 'Forbidden: admin role required' }, 403)
    }

    let action = 'status'
    try {
      const body = await req.json()
      if (body && typeof body.action === 'string') action = body.action
    } catch {
      // no body -> status
    }

    const resendHeaders = {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    }

    // --- GET /domains ---
    const listRes = await fetch(`${RESEND_API}/domains`, { headers: resendHeaders })
    const listText = await listRes.text()
    if (!listRes.ok) {
      console.error(`[resend] GET /domains failed [${listRes.status}]: ${listText}`)
      return json({ error: 'Resend GET /domains failed', status: listRes.status, details: listText }, listRes.status)
    }

    let listBody: any
    try {
      listBody = JSON.parse(listText)
    } catch {
      return json({ error: 'Unparseable Resend response', details: listText }, 502)
    }

    const domains: any[] = Array.isArray(listBody?.data) ? listBody.data : (listBody?.data?.data ?? [])
    const summary = domains.map((d) => ({ id: d.id, name: d.name, status: d.status }))
    const match = domains.find((d) => d?.name === TARGET_DOMAIN)

    if (!match) {
      console.error('[resend] target domain not found', { target: TARGET_DOMAIN, domains: summary })
      return json({ error: `Domain ${TARGET_DOMAIN} not found in Resend account`, domains: summary }, 404)
    }

    // Full detail GET (list payload can be partial)
    const detail = async () => {
      const res = await fetch(`${RESEND_API}/domains/${match.id}`, { headers: resendHeaders })
      const text = await res.text()
      if (!res.ok) {
        console.error(`[resend] GET /domains/${match.id} failed [${res.status}]: ${text}`)
        return { ok: false, status: res.status, raw: text }
      }
      return { ok: true, status: res.status, body: JSON.parse(text) }
    }

    const before = await detail()
    console.log('[resend] domain BEFORE:', JSON.stringify(before))

    if (action === 'status') {
      return json({ action, domain: before.ok ? before.body : before, domains: summary })
    }

    if (action !== 'enable-open') {
      return json({ error: `Unknown action "${action}". Use "status" or "enable-open".` }, 400)
    }

    // --- PATCH open_tracking only (never click_tracking) ---
    const patchRes = await fetch(`${RESEND_API}/domains/${match.id}`, {
      method: 'PATCH',
      headers: resendHeaders,
      body: JSON.stringify({ open_tracking: true }),
    })
    const patchText = await patchRes.text()
    console.log(`[resend] PATCH open_tracking [${patchRes.status}]: ${patchText}`)

    if (!patchRes.ok) {
      // 401/403 or any error: return raw, no retry
      return json(
        {
          action,
          error: 'Resend PATCH failed',
          status: patchRes.status,
          details: patchText,
          before: before.ok ? before.body : before,
        },
        patchRes.status
      )
    }

    let patchBody: unknown = patchText
    try {
      patchBody = JSON.parse(patchText)
    } catch { /* keep raw */ }

    const after = await detail()
    console.log('[resend] domain AFTER:', JSON.stringify(after))

    return json({
      action,
      domain_id: match.id,
      domain_name: match.name,
      before: before.ok ? before.body : before,
      patch_response: patchBody,
      after: after.ok ? after.body : after,
    })
  } catch (e) {
    console.error('[admin-resend-domain-tracking] unexpected error', e)
    return json({ error: String((e as Error)?.message ?? e) }, 500)
  }
})
