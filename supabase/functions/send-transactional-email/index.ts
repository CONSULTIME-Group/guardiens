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

// === Frequency cap & quiet hours config ===
// Per-recipient caps (rolling windows ending now)
const CAP_PER_HOUR = 1
const CAP_PER_DAY = 3
// Quiet hours in Europe/Paris (inclusive start, exclusive end)
const QUIET_START_HOUR = 22 // 22:00
const QUIET_END_HOUR = 8    // 08:00

// Templates that BYPASS cap + quiet hours (auth handled separately via auth-email-hook).
// Kept tight: identity / disputes / cancellations / sit confirmation are time-critical.
const BYPASS_TEMPLATES = new Set<string>([
  'identity-verified',
  'identity-rejected',
  'relance-piece-identite',
  'dispute-resolved',
  'report-resolved',
  'cancellation-by-owner',
  'cancellation-by-sitter',
  'cancellation-review-published',
  'cancellation-response-published',
  'sit-confirmed',
  'contact-reply', // direct human reply, expected immediately
])

function getParisParts(d = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(d)
  const get = (t: string) => parts.find((p) => p.type === t)!.value
  return {
    year: parseInt(get('year'), 10),
    month: parseInt(get('month'), 10),
    day: parseInt(get('day'), 10),
    hour: parseInt(get('hour'), 10),
    minute: parseInt(get('minute'), 10),
  }
}

function isQuietNow(): boolean {
  const { hour } = getParisParts()
  return hour >= QUIET_START_HOUR || hour < QUIET_END_HOUR
}

// Returns the next Date (UTC) at which Europe/Paris reaches QUIET_END_HOUR.
function nextQuietEnd(): Date {
  // Iterate minute by minute is overkill — compute via offset.
  // Strategy: pick the next Paris calendar day if we're already past 08:00 today
  // OR if currently in the late-night part (>=22:00 today => need tomorrow 08:00).
  const now = new Date()
  const p = getParisParts(now)
  // If currently before 08:00 Paris, target = today 08:00 Paris
  // Else target = tomorrow 08:00 Paris
  let targetY = p.year, targetM = p.month, targetD = p.day
  if (p.hour >= QUIET_END_HOUR) {
    // tomorrow
    const tmp = new Date(Date.UTC(p.year, p.month - 1, p.day) + 24 * 3600_000)
    targetY = tmp.getUTCFullYear()
    targetM = tmp.getUTCMonth() + 1
    targetD = tmp.getUTCDate()
  }
  // Construct a UTC date that, when interpreted in Paris, is targetY-targetM-targetD 08:00.
  // Use binary search on UTC offset: try with +1, then verify with formatter.
  for (const offsetH of [1, 2]) {
    const candidate = new Date(Date.UTC(targetY, targetM - 1, targetD, QUIET_END_HOUR - offsetH, 0, 0))
    const cp = getParisParts(candidate)
    if (cp.year === targetY && cp.month === targetM && cp.day === targetD && cp.hour === QUIET_END_HOUR && cp.minute === 0) {
      return candidate
    }
  }
  // Fallback: now + 1h (safety)
  return new Date(Date.now() + 3600_000)
}

// Generate a cryptographically random 32-byte hex token
function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// Auth note: this function uses verify_jwt = true in config.toml, so Supabase's
// gateway validates the caller's JWT (anon or service_role) before the request
// reaches this code. No in-function auth check is needed.

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
      console.log('Duplicate send blocked by idempotency', { idempotencyKey, templateName, effectiveRecipient })
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: 'duplicate_idempotency_key' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
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
  const html = await renderAsync(
    React.createElement(template.component, templateData)
  )
  const plainText = await renderAsync(
    React.createElement(template.component, templateData),
    { plainText: true }
  )

  // Resolve subject — supports static string or dynamic function
  const resolvedSubject =
    typeof template.subject === 'function'
      ? template.subject(templateData)
      : template.subject

  // 5. Send email directly via Resend (bypasses broken Lovable email queue)
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
    metadata: { idempotency_key: idempotencyKey },
  })

  const resendPayload: Record<string, unknown> = {
    from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
    to: [effectiveRecipient],
    subject: resolvedSubject,
    html,
    text: plainText,
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
      metadata: { idempotency_key: idempotencyKey, resend_id: resendData.id ?? null },
    })

    console.log('Transactional email sent via Resend', { templateName, effectiveRecipient, resendId: resendData.id })

    return new Response(
      JSON.stringify({ success: true, sent: true, resendId: resendData.id }),
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
