import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { TEMPLATES } from '../_shared/transactional-email-templates/registry.ts'
import { getEmailCategory, type EmailCategory } from '../_shared/email-categories.ts'

const SITE_URL = 'https://guardiens.fr'

// Configuration baked in at scaffold time — do NOT change these manually.
// To update, re-run the email domain setup flow.
const SITE_NAME = "Guardiens"
// SENDER_DOMAIN is the verified sender subdomain FQDN (e.g., "notify.example.com").
// It MUST match the subdomain delegated to Lovable's nameservers — never the root domain.
// The email API looks up this exact domain; a mismatch causes "No email domain record found".
const SENDER_DOMAIN = "notify.guardiens.fr"
// FROM_DOMAIN is the domain shown in the From: header (e.g., "example.com").
// When display_from_root is enabled, this can be the root domain for cleaner branding,
// even though actual sending uses the subdomain above.
const FROM_DOMAIN = "guardiens.fr"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

// === Frequency cap & quiet hours ===
// Pure logic lives in _shared/email-cap.ts so it can be unit-tested.
import {
  BYPASS_TEMPLATES,
  CAP_PER_HOUR,
  CAP_PER_DAY,
  isQuietAt,
  nextQuietEndFrom,
} from '../_shared/email-cap.ts'

function isQuietNow(): boolean {
  return isQuietAt(new Date())
}

function nextQuietEnd(): Date {
  return nextQuietEndFrom(new Date())
}

// Generate a cryptographically random 32-byte hex token
function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// Auth: this function is deployed with verify_jwt = true in config.toml, so
// Supabase's gateway validates the caller's JWT (anon, authenticated user, or
// service_role) before the request reaches this code. Public anonymous calls
// without a valid JWT are blocked at the gateway.

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing required environment variables')
    return new Response(
      JSON.stringify({ error: 'Server configuration error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  // Parse request body
  let templateName: string
  let recipientEmail: string
  let idempotencyKey: string
  let messageId: string
  let templateData: Record<string, any> = {}
  try {
    const body = await req.json()
    templateName = body.templateName || body.template_name
    recipientEmail = body.recipientEmail || body.recipient_email
    messageId = crypto.randomUUID()
    idempotencyKey = body.idempotencyKey || body.idempotency_key || messageId
    if (body.templateData && typeof body.templateData === 'object') {
      templateData = body.templateData
    }
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON in request body' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  if (!templateName) {
    return new Response(
      JSON.stringify({ error: 'templateName is required' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  // 1. Look up template from registry (early — needed to resolve recipient)
  const template = TEMPLATES[templateName]

  if (!template) {
    console.error('Template not found in registry', { templateName })
    return new Response(
      JSON.stringify({
        error: `Template '${templateName}' not found. Available: ${Object.keys(TEMPLATES).join(', ')}`,
      }),
      {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  // Resolve effective recipient: template-level `to` takes precedence over
  // the caller-provided recipientEmail. This allows notification templates
  // to always send to a fixed address (e.g., site owner from env var).
  const effectiveRecipient = template.to || recipientEmail

  if (!effectiveRecipient) {
    return new Response(
      JSON.stringify({
        error: 'recipientEmail is required (unless the template defines a fixed recipient)',
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  // Create Supabase client with service role (bypasses RLS)
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // === Caller authorization ===
  // verify_jwt = true ensures a valid JWT, but without this check ANY
  // authenticated user could spam arbitrary recipients with platform-branded
  // templates. Trusted callers bypass: service_role and admin users.
  // Non-admin authenticated callers may ONLY target their own email address.
  const authHeader = req.headers.get('Authorization') ?? ''
  const callerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  const isServiceRole = callerToken && callerToken === supabaseServiceKey

  if (!isServiceRole) {
    let callerUserId: string | null = null
    let callerEmail: string | null = null
    let callerIsAdmin = false
    if (callerToken) {
      const { data: userData } = await supabase.auth.getUser(callerToken)
      if (userData?.user) {
        callerUserId = userData.user.id
        callerEmail = (userData.user.email ?? '').toLowerCase() || null
        const { data: adminCheck } = await supabase.rpc('has_role', {
          _user_id: callerUserId,
          _role: 'admin',
        })
        callerIsAdmin = adminCheck === true
      }
    }

    if (!callerUserId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!callerIsAdmin) {
      if (!callerEmail || effectiveRecipient.toLowerCase() !== callerEmail) {
        console.warn('[security] Non-admin caller attempted to email a different recipient', {
          callerUserId,
          templateName,
        })
        return new Response(
          JSON.stringify({ error: 'Forbidden: you can only send templates to your own account' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }
  }

  // 1b. Idempotency check — prevent duplicate sends for the same key
  if (idempotencyKey && idempotencyKey !== messageId) {
    const { data: existingSend } = await supabase
      .from('email_send_log')
      .select('id')
      .eq('template_name', templateName)
      .eq('recipient_email', effectiveRecipient)
      .or('status.eq.sent,status.eq.pending')
      .filter('metadata->>idempotency_key', 'eq', idempotencyKey)
      .limit(1)

    if (existingSend && existingSend.length > 0) {
      console.warn('[ALERT] Duplicate idempotency hit (duplicate_send)', { idempotencyKey, templateName, effectiveRecipient })
      // Métrique : insertion best-effort (n'échoue jamais l'appel)
      void supabase.from('email_idempotency_hits').insert({
        template_name: templateName,
        recipient_email: effectiveRecipient,
        idempotency_key: idempotencyKey,
        hit_type: 'duplicate_send',
      }).then(({ error }) => { if (error) console.error('Failed to record idempotency hit', error) })
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: 'duplicate_idempotency_key' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  }

  // Compute category once — used by gating, footer and List-Unsubscribe header
  const category: EmailCategory = getEmailCategory(templateName)

  // 1c. Category preference gating (transactional always passes)
  if (category !== 'transactional') {
    const { data: prefRow } = await supabase
      .rpc('get_email_preferences_by_email', { p_email: effectiveRecipient.toLowerCase() })
      .maybeSingle()

    if (prefRow) {
      const allowed =
        (category === 'product' && (prefRow as any).product_emails) ||
        (category === 'digest' && (prefRow as any).digest_emails) ||
        (category === 'alert' && (prefRow as any).alert_emails)
      if (!allowed) {
        await supabase.from('email_send_log').insert({
          message_id: messageId,
          template_name: templateName,
          recipient_email: effectiveRecipient,
          status: 'unsubscribed_category',
          metadata: { idempotency_key: idempotencyKey, category },
        })
        console.log('Email blocked by category preference', { effectiveRecipient, category, templateName })
        return new Response(
          JSON.stringify({ success: false, reason: 'unsubscribed_category', category }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }
  }

  // 2. Check suppression list (fail-closed: if we can't verify, don't send)
  const { data: suppressed, error: suppressionError } = await supabase
    .from('suppressed_emails')
    .select('id')
    .eq('email', effectiveRecipient.toLowerCase())
    .maybeSingle()

  if (suppressionError) {
    console.error('Suppression check failed — refusing to send', {
      error: suppressionError,
      effectiveRecipient,
    })
    return new Response(
      JSON.stringify({ error: 'Failed to verify suppression status' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  if (suppressed) {
    // Log the suppressed attempt
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: effectiveRecipient,
      status: 'suppressed',
    })

    console.log('Email suppressed', { effectiveRecipient, templateName })
    return new Response(
      JSON.stringify({ success: false, reason: 'email_suppressed' }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  // 2b. Frequency cap & quiet hours (skipped for bypass templates and when caller marks urgent)
  const isUrgent = !!(templateData as any)?.__urgent
  const bypass = BYPASS_TEMPLATES.has(templateName) || isUrgent
  if (!bypass) {
    const recipientLower = effectiveRecipient.toLowerCase()
    const nowMs = Date.now()
    const oneHourAgo = new Date(nowMs - 3600_000).toISOString()
    const oneDayAgo = new Date(nowMs - 86400_000).toISOString()

    const [{ data: hourRows }, { data: dayRows }] = await Promise.all([
      supabase
        .from('email_send_log')
        .select('created_at')
        .ilike('recipient_email', recipientLower)
        .eq('status', 'sent')
        .gte('created_at', oneHourAgo)
        .order('created_at', { ascending: true }),
      supabase
        .from('email_send_log')
        .select('created_at')
        .ilike('recipient_email', recipientLower)
        .eq('status', 'sent')
        .gte('created_at', oneDayAgo)
        .order('created_at', { ascending: true }),
    ])

    const hourCount = hourRows?.length ?? 0
    const dayCount = dayRows?.length ?? 0

    let deferReason: string | null = null
    let scheduledFor: Date | null = null

    if (isQuietNow()) {
      deferReason = 'quiet_hours'
      scheduledFor = nextQuietEnd()
    } else if (dayCount >= CAP_PER_DAY) {
      const oldest = dayRows![0].created_at as string
      deferReason = 'frequency_cap_day'
      scheduledFor = new Date(new Date(oldest).getTime() + 86400_000 + 30_000)
    } else if (hourCount >= CAP_PER_HOUR) {
      const oldest = hourRows![0].created_at as string
      deferReason = 'frequency_cap_hour'
      scheduledFor = new Date(new Date(oldest).getTime() + 3600_000 + 30_000)
    }

    if (deferReason && scheduledFor) {
      if (idempotencyKey && idempotencyKey !== messageId) {
        const { data: existingDefer } = await supabase
          .from('email_deferred_queue')
          .select('id')
          .eq('idempotency_key', idempotencyKey)
          .eq('template_name', templateName)
          .in('status', ['pending', 'sent'])
          .limit(1)
        if (existingDefer && existingDefer.length > 0) {
          console.warn('[ALERT] Duplicate idempotency hit (already_queued)', { idempotencyKey, templateName, effectiveRecipient, deferReason })
          void supabase.from('email_idempotency_hits').insert({
            template_name: templateName,
            recipient_email: effectiveRecipient,
            idempotency_key: idempotencyKey,
            hit_type: 'already_queued',
            metadata: { defer_reason: deferReason },
          }).then(({ error }) => { if (error) console.error('Failed to record idempotency hit', error) })
          return new Response(
            JSON.stringify({ success: true, deferred: true, reason: 'already_queued' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }

      const { error: enqErr } = await supabase.from('email_deferred_queue').insert({
        template_name: templateName,
        recipient_email: effectiveRecipient,
        template_data: templateData,
        idempotency_key: idempotencyKey,
        defer_reason: deferReason,
        scheduled_for: scheduledFor.toISOString(),
      })
      if (enqErr) {
        console.error('Failed to enqueue deferred email — falling open and sending', enqErr)
      } else {
        await supabase.from('email_send_log').insert({
          message_id: messageId,
          template_name: templateName,
          recipient_email: effectiveRecipient,
          status: 'deferred',
          metadata: { idempotency_key: idempotencyKey, defer_reason: deferReason, scheduled_for: scheduledFor.toISOString() },
        })
        console.log('Email deferred', { templateName, recipientLower, deferReason, scheduledFor: scheduledFor.toISOString() })
        return new Response(
          JSON.stringify({ success: true, deferred: true, reason: deferReason, scheduled_for: scheduledFor.toISOString() }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }
  }

  // 3. Get or create unsubscribe token (one token per email address)
  const normalizedEmail = effectiveRecipient.toLowerCase()
  let unsubscribeToken: string

  // Check for existing token for this email
  const { data: existingToken, error: tokenLookupError } = await supabase
    .from('email_unsubscribe_tokens')
    .select('token, used_at')
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (tokenLookupError) {
    console.error('Token lookup failed', {
      error: tokenLookupError,
      email: normalizedEmail,
    })
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: effectiveRecipient,
      status: 'failed',
      error_message: 'Failed to look up unsubscribe token',
    })
    return new Response(
      JSON.stringify({ error: 'Failed to prepare email' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  if (existingToken && !existingToken.used_at) {
    // Reuse existing unused token
    unsubscribeToken = existingToken.token
  } else if (!existingToken) {
    // Create new token — upsert handles concurrent inserts gracefully
    unsubscribeToken = generateToken()
    const { error: tokenError } = await supabase
      .from('email_unsubscribe_tokens')
      .upsert(
        { token: unsubscribeToken, email: normalizedEmail },
        { onConflict: 'email', ignoreDuplicates: true }
      )

    if (tokenError) {
      console.error('Failed to create unsubscribe token', {
        error: tokenError,
      })
      await supabase.from('email_send_log').insert({
        message_id: messageId,
        template_name: templateName,
        recipient_email: effectiveRecipient,
        status: 'failed',
        error_message: 'Failed to create unsubscribe token',
      })
      return new Response(
        JSON.stringify({ error: 'Failed to prepare email' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // If another request raced us, our upsert was silently ignored.
    // Re-read to get the actual stored token.
    const { data: storedToken, error: reReadError } = await supabase
      .from('email_unsubscribe_tokens')
      .select('token')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (reReadError || !storedToken) {
      console.error('Failed to read back unsubscribe token after upsert', {
        error: reReadError,
        email: normalizedEmail,
      })
      await supabase.from('email_send_log').insert({
        message_id: messageId,
        template_name: templateName,
        recipient_email: effectiveRecipient,
        status: 'failed',
        error_message: 'Failed to confirm unsubscribe token storage',
      })
      return new Response(
        JSON.stringify({ error: 'Failed to prepare email' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }
    unsubscribeToken = storedToken.token
  } else {
    // Token exists but is already used — email should have been caught by suppression check above.
    // This is a safety fallback; log and skip sending.
    console.warn('Unsubscribe token already used but email not suppressed', {
      email: normalizedEmail,
    })
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: effectiveRecipient,
      status: 'suppressed',
      error_message:
        'Unsubscribe token used but email missing from suppressed list',
    })
    return new Response(
      JSON.stringify({ success: false, reason: 'email_suppressed' }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  // 4. Render React Email template to HTML and plain text
  let html = await renderAsync(
    React.createElement(template.component, templateData)
  )
  let plainText = await renderAsync(
    React.createElement(template.component, templateData),
    { plainText: true }
  )

  // 4b. Append branded footer with preferences + unsubscribe links.
  // The token is per-recipient (one per email address) and used for one-click and category opt-out.
  const prefsUrl = `${SITE_URL}/preferences-email`
  const unsubUrl = `${SITE_URL}/unsubscribe?token=${unsubscribeToken}&category=${category}`
  const unsubAllUrl = `${SITE_URL}/unsubscribe?token=${unsubscribeToken}`

  // Different copy depending on whether opt-out is offered
  let footerHtml: string
  let footerText: string
  if (category === 'transactional') {
    footerHtml = `
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;border-top:1px solid #e7e1d8;padding-top:16px;font-family:Arial,sans-serif;">
        <tr><td style="font-size:11px;color:#999;line-height:1.6;text-align:center;">
          Cet email essentiel est lié au fonctionnement de votre compte Guardiens.<br/>
          <a href="${prefsUrl}" style="color:#666;text-decoration:underline;">Gérer mes préférences email</a>
        </td></tr>
      </table>`
    footerText = `\n\n—\nCet email essentiel est lié au fonctionnement de votre compte Guardiens.\nGérer mes préférences : ${prefsUrl}\n`
  } else {
    footerHtml = `
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;border-top:1px solid #e7e1d8;padding-top:16px;font-family:Arial,sans-serif;">
        <tr><td style="font-size:11px;color:#999;line-height:1.6;text-align:center;">
          <a href="${prefsUrl}" style="color:#666;text-decoration:underline;">Gérer mes préférences</a>
          &nbsp;·&nbsp;
          <a href="${unsubUrl}" style="color:#666;text-decoration:underline;">Me désinscrire de cette catégorie</a>
          &nbsp;·&nbsp;
          <a href="${unsubAllUrl}" style="color:#666;text-decoration:underline;">Tout désinscrire</a>
        </td></tr>
      </table>`
    footerText = `\n\n—\nGérer mes préférences : ${prefsUrl}\nMe désinscrire de cette catégorie : ${unsubUrl}\nTout désinscrire : ${unsubAllUrl}\n`
  }

  // Inject footer just before </body> (or append if not found)
  if (html.includes('</body>')) {
    html = html.replace('</body>', `${footerHtml}</body>`)
  } else {
    html = `${html}${footerHtml}`
  }
  plainText = `${plainText}${footerText}`

  // 4c. Engagement tracking — only for nurturing emails (idempotencyKey "journey-*").
  // Adds a 1x1 open pixel and rewrites guardiens.fr links through the click tracker.
  const isNurturing = typeof idempotencyKey === 'string' && idempotencyKey.startsWith('journey-')
  if (isNurturing) {
    const trackBase = `${supabaseUrl}/functions/v1`
    const pixelUrl = `${trackBase}/track-email-pixel?mid=${messageId}`
    const pixelHtml = `<img src="${pixelUrl}" width="1" height="1" alt="" style="display:none;width:1px;height:1px;border:0;" />`

    // Wrap guardiens.fr links via click tracker
    const wrap = (raw: string) => {
      try {
        const u = new URL(raw)
        const host = u.hostname.toLowerCase()
        const isAllowed = host === 'guardiens.fr' || host === 'www.guardiens.fr'
        // Don't wrap unsubscribe / preference links so the user always reaches them
        const isOptOut = u.pathname.startsWith('/unsubscribe') || u.pathname.startsWith('/preferences-email')
        if (!isAllowed || isOptOut) return raw
        const b64 = btoa(raw).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
        return `${trackBase}/track-email-click?mid=${messageId}&u=${b64}`
      } catch {
        return raw
      }
    }

    html = html.replace(/href="(https:\/\/(?:www\.)?guardiens\.fr[^"]*)"/g, (_m, raw) => `href="${wrap(raw)}"`)

    if (html.includes('</body>')) {
      html = html.replace('</body>', `${pixelHtml}</body>`)
    } else {
      html = `${html}${pixelHtml}`
    }
  }


  // Resolve subject — supports static string or dynamic function
  const resolvedSubject =
    typeof template.subject === 'function'
      ? template.subject(templateData)
      : template.subject

  // 5. Send email directly via Resend
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY is not configured')
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: effectiveRecipient,
      status: 'failed',
      error_message: 'RESEND_API_KEY not configured',
    })
    return new Response(JSON.stringify({ error: 'Email service not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Log pending
  await supabase.from('email_send_log').insert({
    message_id: messageId,
    template_name: templateName,
    recipient_email: effectiveRecipient,
    status: 'pending',
    metadata: { idempotency_key: idempotencyKey, category, bypass, isUrgent },
  })

  // RFC 8058 List-Unsubscribe headers — Gmail/Apple Mail one-click unsubscribe.
  // Only meaningful for non-transactional emails. The unsubscribe handler accepts
  // POST with form body for one-click compliance.
  const headers: Record<string, string> = {}
  if (category !== 'transactional') {
    const oneClickUrl = `https://${SENDER_DOMAIN.replace(/^notify\./, '')}`
    // Use the supabase function URL directly so one-click hits the API without a UI
    const apiBase = Deno.env.get('SUPABASE_URL') ?? `https://${SENDER_DOMAIN}`
    const oneClick = `${apiBase}/functions/v1/handle-email-unsubscribe?token=${unsubscribeToken}`
    headers['List-Unsubscribe'] = `<${oneClick}>, <${unsubAllUrl}>`
    headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click'
    void oneClickUrl
  }

  const resendPayload: Record<string, unknown> = {
    from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
    to: [effectiveRecipient],
    subject: resolvedSubject,
    html,
    text: plainText,
  }
  if (Object.keys(headers).length > 0) {
    resendPayload.headers = headers
  }

  if (templateName === 'contact-reply') {
    resendPayload.reply_to = 'contact.guardiens@gmail.com'
  }

  try {
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(resendPayload),
    })

    const resendData = await resendRes.json()

    if (!resendRes.ok) {
      console.error('Resend API error', { status: resendRes.status, data: resendData })
      await supabase.from('email_send_log').insert({
        message_id: messageId,
        template_name: templateName,
        recipient_email: effectiveRecipient,
        status: 'failed',
        error_message: `Resend ${resendRes.status}: ${resendData.message || 'Unknown error'}`,
      })
      return new Response(JSON.stringify({ error: 'Failed to send email' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Log success
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: effectiveRecipient,
      status: 'sent',
      resend_id: resendData.id ?? null,
      metadata: { idempotency_key: idempotencyKey, resend_id: resendData.id ?? null, bypass, isUrgent },
    })

    console.log('Transactional email sent via Resend', { templateName, effectiveRecipient, resendId: resendData.id })

    return new Response(
      JSON.stringify({ success: true, sent: true, resendId: resendData.id, messageId }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (sendError) {
    console.error('Resend fetch error', sendError)
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: effectiveRecipient,
      status: 'failed',
      error_message: (sendError instanceof Error ? sendError.message : String(sendError)) || 'Network error sending via Resend',
    })
    return new Response(JSON.stringify({ error: 'Failed to send email' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
