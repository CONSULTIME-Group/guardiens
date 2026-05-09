import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseServiceKey) {
    return jsonResponse({ error: 'Server configuration error' }, 500)
  }

  // Extract token from query params (GET) or body (POST)
  const url = new URL(req.url)
  let token: string | null = url.searchParams.get('token')
  let category: string | null = url.searchParams.get('category')
  let categoriesPayload: { product?: boolean; digest?: boolean; alert?: boolean } | null = null
  let unsubscribeAll = false

  if (req.method === 'POST') {
    const contentType = req.headers.get('content-type') ?? ''
    if (contentType.includes('application/x-www-form-urlencoded')) {
      // RFC 8058 one-click → suppress entirely
      unsubscribeAll = true
    } else {
      try {
        const body = await req.json()
        if (body.token) token = body.token
        if (body.category) category = body.category
        if (body.all === true) unsubscribeAll = true
        if (body.categories && typeof body.categories === 'object') {
          categoriesPayload = body.categories
        }
      } catch { /* ignore */ }
    }
  }

  if (!token) return jsonResponse({ error: 'Token is required' }, 400)

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const { data: tokenRecord, error: lookupError } = await supabase
    .from('email_unsubscribe_tokens')
    .select('*')
    .eq('token', token)
    .maybeSingle()

  if (lookupError || !tokenRecord) {
    return jsonResponse({ error: 'Invalid or expired token' }, 404)
  }

  // GET: validate (also returns current preferences if user is linked)
  if (req.method === 'GET') {
    const { data: prefs } = await supabase
      .rpc('get_email_preferences_by_email', { p_email: tokenRecord.email.toLowerCase() })
      .maybeSingle()
    return jsonResponse({
      valid: !tokenRecord.used_at,
      already_unsubscribed: !!tokenRecord.used_at,
      email: tokenRecord.email,
      preferences: prefs ?? null,
    })
  }

  // === POST branches ===

  // Branch A: Category-only opt-out (token NOT consumed — user can still tweak more)
  if (!unsubscribeAll && (category || categoriesPayload)) {
    // Build patch
    const patch: { product: boolean | null; digest: boolean | null; alert: boolean | null } = {
      product: null, digest: null, alert: null,
    }
    if (categoriesPayload) {
      if (typeof categoriesPayload.product === 'boolean') patch.product = categoriesPayload.product
      if (typeof categoriesPayload.digest === 'boolean') patch.digest = categoriesPayload.digest
      if (typeof categoriesPayload.alert === 'boolean') patch.alert = categoriesPayload.alert
    }
    if (category && ['product', 'digest', 'alert'].includes(category)) {
      ;(patch as any)[category] = false
    }

    // Need current values to fill nulls (otherwise we'd reset to true)
    const { data: current } = await supabase
      .rpc('get_email_preferences_by_email', { p_email: tokenRecord.email.toLowerCase() })
      .maybeSingle()
    const cur = (current ?? {}) as any
    const finalProduct = patch.product ?? cur.product_emails ?? true
    const finalDigest = patch.digest ?? cur.digest_emails ?? true
    const finalAlert = patch.alert ?? cur.alert_emails ?? true

    const { data: ok, error: rpcErr } = await supabase.rpc('set_email_preferences_by_token', {
      p_token: token,
      p_product: finalProduct,
      p_digest: finalDigest,
      p_alert: finalAlert,
    })
    if (rpcErr || !ok) {
      console.error('Category preference update failed', rpcErr)
      return jsonResponse({ error: 'Could not update preferences' }, 500)
    }
    return jsonResponse({
      success: true,
      mode: 'category',
      preferences: { product_emails: finalProduct, digest_emails: finalDigest, alert_emails: finalAlert },
    })
  }

  // Branch B: full unsubscribe (legacy / one-click) → suppress + consume token
  if (tokenRecord.used_at) {
    return jsonResponse({ success: false, reason: 'already_unsubscribed' })
  }

  const { data: updated, error: updateError } = await supabase
    .from('email_unsubscribe_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('token', token)
    .is('used_at', null)
    .select()
    .maybeSingle()

  if (updateError) {
    console.error('Failed to mark token as used', { error: updateError, token })
    return jsonResponse({ error: 'Failed to process unsubscribe' }, 500)
  }
  if (!updated) {
    return jsonResponse({ success: false, reason: 'already_unsubscribed' })
  }

  const { error: suppressError } = await supabase
    .from('suppressed_emails')
    .upsert(
      { email: tokenRecord.email.toLowerCase(), reason: 'unsubscribe' },
      { onConflict: 'email' },
    )
  if (suppressError) {
    console.error('Failed to suppress email', { error: suppressError, email: tokenRecord.email })
    return jsonResponse({ error: 'Failed to process unsubscribe' }, 500)
  }

  // Also flip all categories off for the linked user (defensive — suppression already blocks all)
  await supabase.rpc('set_email_preferences_by_token', {
    p_token: token, p_product: false, p_digest: false, p_alert: false,
  })

  console.log('Email unsubscribed (full)', { email: tokenRecord.email })
  return jsonResponse({ success: true, mode: 'all' })
})
