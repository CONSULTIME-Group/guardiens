import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

// Lot ALR6 : familles d'emails que le membre règle lui-même.
const FAMILIES = ['product', 'digest', 'alert']

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
  // Lot SORT4 : désinscription en un geste limitée aux alertes sorties.
  const scope: string | null = url.searchParams.get('scope')
  let categoriesPayload: { product?: boolean; digest?: boolean; alert?: boolean } | null = null
  let unsubscribeAll = false
  let oneClickFamily: string | null = null
  let oneClickAllFamilies = false
  let requestEmail: string | null = null

  if (req.method === 'POST') {
    const contentType = req.headers.get('content-type') ?? ''
    if (contentType.includes('application/x-www-form-urlencoded')) {
      // RFC 8058 one-click. Lot ALR6 (14/11/2026) : le clic coupe la famille
      // de l'email reçu (paramètre category posé par send-transactional-email).
      // Sans famille (email envoyé avant le lot), il coupe les trois familles,
      // sans liste de suppression : messages des membres, candidatures et
      // emails de service continuent. Portée « outing » : lot SORT4.
      if (scope !== 'outing') {
        if (category && FAMILIES.includes(category)) oneClickFamily = category
        else oneClickAllFamilies = true
      }
    } else {
      try {
        const body = await req.json()
        if (body.token) token = body.token
        if (body.category) category = body.category
        if (body.all === true) unsubscribeAll = true
        if (typeof body.request_email === 'string') requestEmail = body.request_email
        if (body.categories && typeof body.categories === 'object') {
          categoriesPayload = body.categories
        }
      } catch { /* ignore */ }
    }
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Branch 0 : demande d'un lien de désinscription par adresse email (aucun token en main).
  // Réponse TOUJOURS neutre : on ne révèle jamais si l'adresse est connue.
  if (req.method === 'POST' && requestEmail !== null) {
    const cleaned = requestEmail.trim().toLowerCase()
    const looksValid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleaned)
    if (looksValid) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .ilike('email', cleaned)
        .maybeSingle()

      if (profile) {
        let linkToken: string | null = null
        const { data: existing } = await supabase
          .from('email_unsubscribe_tokens')
          .select('token')
          .eq('email', cleaned)
          .maybeSingle()
        if (existing?.token) {
          linkToken = existing.token
        } else {
          const fresh = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')
          const { data: inserted } = await supabase
            .from('email_unsubscribe_tokens')
            .insert({ email: cleaned, token: fresh })
            .select('token')
            .maybeSingle()
          linkToken = inserted?.token ?? null
        }

        if (linkToken) {
          const siteUrl = 'https://guardiens.fr'
          const resp = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${supabaseServiceKey}`,
              apikey: supabaseServiceKey,
            },
            body: JSON.stringify({
              templateName: 'unsubscribe-link',
              recipientEmail: cleaned,
              idempotencyKey: `unsub-link-${cleaned}-${new Date().toISOString().slice(0, 10)}`,
              templateData: { unsubscribeUrl: `${siteUrl}/unsubscribe?token=${linkToken}` },
            }),
          })
          if (!resp.ok) {
            console.error('[handle-email-unsubscribe] link email failed', resp.status, await resp.text())
          }
        }
      }
    }
    return jsonResponse({ success: true, mode: 'request_link' })
  }

  if (!token) return jsonResponse({ error: 'Token is required' }, 400)

  // Lot SORT4 : le bouton de désinscription d'une alerte sortie coupe les
  // seules alertes sorties. Les autres emails du membre restent tels quels.
  if (req.method === 'POST' && scope === 'outing') {
    const { data: stopped, error: stopError } = await supabase.rpc('outing_alerts_set_by_token', { p_token: token, p_enabled: false })
    if (stopError || (stopped as { ok?: boolean } | null)?.ok !== true) {
      return jsonResponse({ error: 'Invalid or expired token' }, 404)
    }
    return jsonResponse({ success: true, mode: 'outing_alerts' })
  }

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
    // Lot ALR6 : le lien reste un lien de gestion, même après une ancienne
    // désinscription totale : le membre retrouve ses réglages et peut rallumer
    // une famille (ce qui lève l'ancienne liste de suppression).
    return jsonResponse({
      valid: true,
      already_unsubscribed: false,
      email: tokenRecord.email,
      preferences: prefs ?? null,
    })
  }

  // === POST branches ===

  // Lot ALR6 : « Tout désactiver » de la page et clic de la messagerie sans
  // famille = les trois familles coupées, sans liste de suppression.
  if (unsubscribeAll || oneClickAllFamilies) {
    categoriesPayload = { product: false, digest: false, alert: false }
    unsubscribeAll = false
  }
  if (oneClickFamily) {
    category = oneClickFamily
  }

  // Branch A: Category-only opt-out (token NOT consumed — user can still tweak more)
  if (category || categoriesPayload) {
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
    // Lot ALR6 : une famille rallumée lève une ancienne désinscription
    // totale (motif unsubscribe seulement ; plaintes et rebonds restent).
    if (finalProduct || finalDigest || finalAlert) {
      const { error: liftErr } = await supabase
        .from('suppressed_emails')
        .delete()
        .eq('email', tokenRecord.email.toLowerCase())
        .eq('reason', 'unsubscribe')
      if (liftErr) console.error('Unsubscribe suppression lift failed', liftErr)
      // Le jeton consommé par l'ancienne désinscription totale bloquait aussi
      // tout envoi (garde-fou de send-transactional-email) : il redevient actif.
      if (!liftErr && tokenRecord.used_at) {
        const { error: tokErr } = await supabase
          .from('email_unsubscribe_tokens')
          .update({ used_at: null })
          .eq('token', token)
        if (tokErr) console.error('Unsubscribe token reset failed', tokErr)
      }
    }
    const allOff = !finalProduct && !finalDigest && !finalAlert
    return jsonResponse({
      success: true,
      mode: allOff ? 'all' : 'category',
      preferences: { product_emails: finalProduct, digest_emails: finalDigest, alert_emails: finalAlert },
    })
  }

  // Lot ALR6 : plus de désinscription totale par liste de suppression depuis
  // un lien ; seuls les rebonds et les plaintes y entrent (et la suppression
  // de compte). Une requête sans famille ni choix n'a rien à faire.
  return jsonResponse({ error: 'Nothing to update' }, 400)
})
