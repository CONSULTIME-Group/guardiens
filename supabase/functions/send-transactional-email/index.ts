import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { TEMPLATES } from '../_shared/transactional-email-templates/registry.ts'
import { getEmailCategory, type EmailCategory } from '../_shared/email-categories.ts'
import { bypassesSuppression } from '../_shared/email-suppression.ts'
import { evaluateSitAlert, isSitStatusGuardedTemplate } from '../_shared/sit-alert-guard.ts'

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
import { resendFetch } from "../_shared/resend-guard.ts";
import {
  BYPASS_TEMPLATES,
  decideDeferral,
  resolveDeferral,

  isQuietAt,
  nextQuietEndFrom,
} from '../_shared/email-cap.ts'

// Alma persona (Pass 3 C2) : liste des templates signés visuellement par Alma
// (header + intro + signoff). Tout log/analytics de ces envois porte
// `alma_signed: true` pour permettre l'attribution ROI de la persona.
const ALMA_SIGNED_TEMPLATES = new Set<string>([
  'sitter-daily-digest',
  'mission-daily-digest',
  'sit-draft-reminder',
  'owner-no-sit-j3',
  'owner-no-sit-j10',
  'owner-no-sit-j21',
])
export function isAlmaSigned(templateName: string): boolean {
  return ALMA_SIGNED_TEMPLATES.has(templateName)
}

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
  // logMetadata: métadonnées additionnelles fusionnées dans email_send_log.metadata.
  // Ex : notify-new-message y passe { conversation_id, recipient_id } pour que le
  // throttle « WHERE status='sent' AND metadata->>conversation_id » continue à
  // fonctionner sans nécessiter une seconde ligne de log dédiée (fix double-logging).
  let logMetadata: Record<string, any> = {}
  // sourceQueueId: id de la ligne email_deferred_queue en cours de retraitement par
  // flush-deferred-emails. Doit être exclu de la garde anti-doublon "already_queued"
  // ci-dessous, sinon la ligne se trouve elle-même et flush clôture silencieusement
  // l'envoi sans jamais le transmettre au provider.
  let sourceQueueId: string | null = null
  try {
    const body = await req.json()
    templateName = body.templateName || body.template_name
    recipientEmail = body.recipientEmail || body.recipient_email
    messageId = crypto.randomUUID()
    idempotencyKey = body.idempotencyKey || body.idempotency_key || messageId
    if (body.templateData && typeof body.templateData === 'object') {
      templateData = body.templateData
    }
    if (body.logMetadata && typeof body.logMetadata === 'object') {
      logMetadata = body.logMetadata
    }
    if (typeof body.sourceQueueId === 'string' && body.sourceQueueId.length > 0) {
      sourceQueueId = body.sourceQueueId
    } else if (typeof body.source_queue_id === 'string' && body.source_queue_id.length > 0) {
      sourceQueueId = body.source_queue_id
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
  //
  // For non-admin authenticated callers, we apply a two-tier policy:
  //   - SENSITIVE_TEMPLATES (account / identity / platform-branded messages
  //     that could be used for phishing): must be sent to the caller's OWN
  //     email address.
  //   - All other templates (cross-user notifications: application-accepted,
  //     new-message, mission-response, etc.): allowed — abuse is constrained
  //     by per-recipient frequency caps and by business validation upstream.
  const SENSITIVE_TEMPLATES = new Set([
    'identity-verified',
    'identity-rejected',
    'pro-profile-approved',
    'pro-profile-rejected',
    'contact-reply',
    'subscription-expired',
    'dispute-resolved',
    'report-resolved',
    'relance-piece-identite',
  ])

  const authHeader = req.headers.get('Authorization') ?? ''
  const callerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  const isServiceRole = !!callerToken && callerToken === supabaseServiceKey

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

    if (!callerIsAdmin && SENSITIVE_TEMPLATES.has(templateName)) {
      if (!callerEmail || effectiveRecipient.toLowerCase() !== callerEmail) {
        console.warn('[security] Non-admin caller attempted to send sensitive template to another recipient', {
          callerUserId,
          templateName,
        })
        return new Response(
          JSON.stringify({ error: 'Forbidden: this template can only be sent to your own account' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Anti open-relay : un membre non admin ne peut jamais adresser un email
    // de marque à une adresse extérieure à la plateforme. Le destinataire doit
    // être sa propre adresse, ou celle d'un compte Guardiens existant (les
    // notifications inter-membres légitimes visent toujours un membre réel).
    if (!callerIsAdmin) {
      const target = effectiveRecipient.toLowerCase()
      if (!callerEmail || target !== callerEmail) {
        const { data: recipientProfile } = await supabase
          .from('profiles')
          .select('id')
          .ilike('email', target)
          .maybeSingle()
        if (!recipientProfile) {
          console.warn('[security] Non-admin caller attempted to send to a non-member address', {
            callerUserId,
            templateName,
          })
          return new Response(
            JSON.stringify({ error: 'Forbidden: recipient must be a Guardiens member' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
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

  // 1b-bis. Garde de statut d'annonce (alertes de proximité).
  // Entre l'enfilement et le drainage il peut s'écouler plus de 24 h : on relit
  // le statut réel avant d'expédier. Si l'annonce n'est plus publiée, rien ne
  // part et la ligne source de la file différée est close en `abandoned`.
  if (isSitStatusGuardedTemplate(templateName)) {
    const sitId = typeof templateData?.sitId === 'string'
      ? templateData.sitId
      : (typeof templateData?.sit_id === 'string' ? templateData.sit_id : null)
    if (sitId) {
      const { data: sitRow, error: sitErr } = await supabase
        .from('sits')
        .select('status')
        .eq('id', sitId)
        .maybeSingle()
      if (!sitErr) {
        const verdict = evaluateSitAlert(templateName, (sitRow as { status?: string } | null)?.status ?? null)
        if (verdict.block) {
          const reason = verdict.reason ?? 'annonce non publiée'
          if (sourceQueueId) {
            await supabase
              .from('email_deferred_queue')
              .update({ status: 'abandoned', last_error: reason })
              .eq('id', sourceQueueId)
          } else if (idempotencyKey && idempotencyKey !== messageId) {
            await supabase
              .from('email_deferred_queue')
              .update({ status: 'abandoned', last_error: reason })
              .eq('idempotency_key', idempotencyKey)
              .eq('template_name', templateName)
              .eq('status', 'pending')
          }
          const { error: logAbandonSitErr } = await supabase.from('email_send_log').insert({
            message_id: messageId,
            template_name: templateName,
            recipient_email: effectiveRecipient,
            status: 'abandoned',
            error_message: reason,
            metadata: { idempotency_key: idempotencyKey, sit_id: sitId, skip_reason: reason, abandon_reason: 'sit_not_published' },
          })
          if (logAbandonSitErr) {
            console.error('email_send_log insert failed (sit_not_published)', {
              templateName, idempotencyKey, error: logAbandonSitErr,
            })
          }
          console.log('Alerte annulée, annonce non publiée', { sitId, reason, templateName })
          return new Response(
            JSON.stringify({ success: true, skipped: true, abandoned: true, reason: 'sit_not_published', details: reason }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      } else {
        console.error('Lecture du statut annonce impossible, envoi maintenu', sitErr)
      }
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
        const { error: logOptOutErr } = await supabase.from('email_send_log').insert({
          message_id: messageId,
          template_name: templateName,
          recipient_email: effectiveRecipient,
          status: 'unsubscribed_category',
          metadata: { idempotency_key: idempotencyKey, category },
        })
        if (logOptOutErr) {
          console.error('email_send_log insert failed (unsubscribed_category)', {
            templateName, category, error: logOptOutErr.message, code: logOptOutErr.code,
          })
        }
        console.log('Email blocked by category preference', { effectiveRecipient, category, templateName })
        return new Response(
          JSON.stringify({ success: false, reason: 'unsubscribed_category', category }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }
  }

  // 2. Check suppression list (fail-closed: if we can't verify, don't send).
  // Exception : les templates légaux de la liste blanche (accusé RGPD, lien de
  // désinscription) franchissent la liste de suppression. Voir
  // docs/email-frequency-cap.md, section liste de suppression.
  const suppressionBypass = bypassesSuppression(templateName)
  if (!suppressionBypass) {
    const { data: suppressed, error: suppressionError } = await supabase
      .from('suppressed_emails')
      .select('id')
      .eq('email', effectiveRecipient.toLowerCase())
      .maybeSingle()

    if (suppressionError) {
      console.error('Suppression check failed, refusing to send', {
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
      const { error: logSuppErr } = await supabase.from('email_send_log').insert({
        message_id: messageId,
        template_name: templateName,
        recipient_email: effectiveRecipient,
        status: 'suppressed',
      })
      if (logSuppErr) {
        console.error('email_send_log write failed', {
          status: 'suppressed', template_name: templateName, message_id: messageId,
          error: logSuppErr.message, code: logSuppErr.code,
        })
      }

      console.log('Email suppressed', { effectiveRecipient, templateName })
      return new Response(
        JSON.stringify({ success: false, reason: 'email_suppressed' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }
  } else {
    console.log('Suppression list bypassed (legal template)', { templateName, effectiveRecipient })
  }

  // 2b. Frequency cap & quiet hours (skipped for bypass templates and when caller marks urgent)
  const isUrgent = !!(templateData as any)?.__urgent
  const bypass = BYPASS_TEMPLATES.has(templateName) || isUrgent
  if (!bypass) {
    const recipientLower = effectiveRecipient.toLowerCase()
    const nowMs = Date.now()
    const oneHourAgo = new Date(nowMs - 3600_000).toISOString()
    const oneDayAgo = new Date(nowMs - 86400_000).toISOString()
    const oneWeekAgo = new Date(nowMs - 7 * 86400_000).toISOString()

    // Lot 6 : le plafond depend de la categorie. Les envois non transactionnels
    // (product / digest / alert) sont comptes ensemble : 1 / 24h et 3 / 7 jours.
    const NON_TX = ['product', 'digest', 'alert']
    const [{ data: hourRows }, { data: dayRows }, { data: nonTxWeekRows }] = await Promise.all([
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
      supabase
        .from('email_send_log')
        .select('created_at, template_name, metadata')
        .ilike('recipient_email', recipientLower)
        .eq('status', 'sent')
        .gte('created_at', oneWeekAgo)
        .in('metadata->>category', NON_TX)
        .order('created_at', { ascending: true }),
    ])

    const toIso = (rows: Array<{ created_at: string }> | null) =>
      (rows ?? []).map((r) => r.created_at as string)
    type CatRow = { created_at: string; template_name?: string | null; metadata?: { category?: string } | null }
    const nonTxRows = (nonTxWeekRows ?? []) as CatRow[]
    // ETAPE 2 : la categorie 'alert' a ses propres compteurs, elle ne consomme
    // plus le quota des emails produit et reciproquement.
    // CORRECTIF 06/08/2026 : l'alerte de nouvelle annonce sort en plus du
    // quota partage de la categorie 'alert'. Un recapitulatif ne peut donc
    // plus consommer le quota d'une alerte, ni l'inverse.
    const isNearby = (r: CatRow) => NEARBY_SIT_ALERT_TEMPLATES.has(r.template_name ?? '')
    const nearbySitWeek = nonTxRows.filter(isNearby).map((r) => r.created_at)
    const alertWeek = nonTxRows
      .filter((r) => r.metadata?.category === 'alert' && !isNearby(r))
      .map((r) => r.created_at)
    const nonTxWeek = nonTxRows
      .filter((r) => r.metadata?.category !== 'alert' && !isNearby(r))
      .map((r) => r.created_at)
    const nonTxDay = nonTxWeek.filter((t) => t >= oneDayAgo)
    const alertDay = alertWeek.filter((t) => t >= oneDayAgo)
    const nearbySitDay = nearbySitWeek.filter((t) => t >= oneDayAgo)

    const decision = decideDeferral({
      now: new Date(nowMs),
      templateName,
      isUrgent,
      category,
      hourSentAt: toIso(hourRows as Array<{ created_at: string }> | null),
      daySentAt: toIso(dayRows as Array<{ created_at: string }> | null),
      nonTxDaySentAt: nonTxDay,
      nonTxWeekSentAt: nonTxWeek,
      alertDaySentAt: alertDay,
      alertWeekSentAt: alertWeek,
      nearbySitDaySentAt: nearbySitDay,
      nearbySitWeekSentAt: nearbySitWeek,
    })


    const deferReason: string | null = decision.action === 'defer' ? decision.reason : null
    // Jitter deterministe de 0 a 900 s applique cote appelant (decideDeferral
    // reste pure). Evite que deux emails differes au meme instant soient
    // reprogrammes a la seconde pres et se retapent mutuellement le cap.
    const jitterSeconds = (() => {
      const key = idempotencyKey || messageId || ''
      let h = 2166136261
      for (let i = 0; i < key.length; i++) {
        h ^= key.charCodeAt(i)
        h = Math.imul(h, 16777619)
      }
      return Math.abs(h) % 901
    })()
    const scheduledFor: Date | null = decision.action === 'defer'
      ? new Date(decision.scheduledFor.getTime() + jitterSeconds * 1000)
      : null

    if (deferReason && scheduledFor) {
      if (idempotencyKey && idempotencyKey !== messageId) {
        let existingQuery = supabase
          .from('email_deferred_queue')
          .select('id')
          .eq('idempotency_key', idempotencyKey)
          .eq('template_name', templateName)
          // Seule une ligne encore en attente doit bloquer un re-enfilement.
          // Une ligne 'sent' ou 'superseded' ne represente plus un envoi a venir.
          .eq('status', 'pending')
        // Exclut la ligne source (re-traitement flush) pour éviter que la garde
        // se déclenche sur elle-même et clôture silencieusement l'envoi.
        if (sourceQueueId) {
          existingQuery = existingQuery.neq('id', sourceQueueId)
        }
        const { data: existingDefer } = await existingQuery.limit(1)
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


      // Re-report depuis la file : on met a jour la ligne source au lieu d'en
      // creer une nouvelle. Sinon attempts repart a 0 et first_enqueued_at est
      // perdu, ce qui neutralise MAX_ATTEMPTS et le TTL (famine).
      let enqErr: { message?: string } | null = null
      let srcAttempts = 0
      let firstEnqueuedAt = new Date()
      if (sourceQueueId) {
        const { data: srcRow } = await supabase
          .from('email_deferred_queue')
          .select('attempts, first_enqueued_at')
          .eq('id', sourceQueueId)
          .maybeSingle()
        const row = srcRow as { attempts?: number; first_enqueued_at?: string } | null
        srcAttempts = row?.attempts ?? 0
        if (row?.first_enqueued_at) firstEnqueuedAt = new Date(row.first_enqueued_at)
      }

      // Etape 1 (05/08/2026) : on n'enfile plus jamais un report qui depasse
      // deja la TTL du gabarit. Si c'est le cas, on tranche tout de suite :
      // envoyer maintenant (notification legitime) ou annuler (contenu date).
      const resolution = resolveDeferral({
        templateName,
        reason: deferReason,
        scheduledFor,
        firstEnqueuedAt,
      })

      if (resolution.action === 'cancel') {
        const cancelReason = `ttl_exceeded_cancelled (${deferReason}, report ${scheduledFor.toISOString()} > TTL ${resolution.ttlDeadline.toISOString()})`
        if (sourceQueueId) {
          await supabase
            .from('email_deferred_queue')
            .update({ status: 'cancelled', last_error: cancelReason })
            .eq('id', sourceQueueId)
        }
        const { error: logCancelErr } = await supabase.from('email_send_log').insert({
          message_id: messageId,
          template_name: templateName,
          recipient_email: effectiveRecipient,
          status: 'cancelled',
          error_message: cancelReason,
          metadata: {
            idempotency_key: idempotencyKey,
            category,
            defer_reason: deferReason,
            cancel_reason: 'ttl_exceeded',
            ttl_deadline: resolution.ttlDeadline.toISOString(),
            scheduled_for: scheduledFor.toISOString(),
          },
        })
        if (logCancelErr) {
          console.error('email_send_log insert failed (ttl_exceeded_cancelled)', {
            templateName, idempotencyKey, error: logCancelErr,
          })
        }
        console.warn('Email annule, contenu date et report au dela de la TTL', {
          templateName, recipientLower, deferReason, scheduledFor: scheduledFor.toISOString(),
        })
        return new Response(
          JSON.stringify({ success: false, status: 'cancelled', reason: 'ttl_exceeded', defer_reason: deferReason }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (resolution.action === 'send_now') {
        // Le plafond protege des relances marketing, pas des notifications
        // legitimes. Plutot que de condamner l'email, on l'envoie maintenant.
        if (sourceQueueId) {
          await supabase
            .from('email_deferred_queue')
            .update({ status: 'sent', last_error: null })
            .eq('id', sourceQueueId)
        }
        // ETAPE 2, reserve 1 : ce chemin franchit deliberement le plafond de
        // frequence. Il doit etre compte par gabarit, sinon on aura remplace
        // une perte silencieuse par une pression silencieuse.
        const { error: bypassErr } = await supabase.from('email_cap_bypass_log').insert({
          template_name: templateName,
          recipient_email: effectiveRecipient,
          category,
          defer_reason: deferReason,
          scheduled_for: scheduledFor.toISOString(),
          ttl_deadline: resolution.ttlDeadline.toISOString(),
        })
        if (bypassErr) {
          console.error('email_cap_bypass_log insert failed', { templateName, error: bypassErr.message })
        }
        console.warn('Report au dela de la TTL, envoi immediat plutot qu abandon', {
          templateName, recipientLower, deferReason,
          scheduledFor: scheduledFor.toISOString(),
          ttlDeadline: resolution.ttlDeadline.toISOString(),
        })
        // On tombe volontairement dans le flux d'envoi normal ci-dessous.
      } else {


      if (sourceQueueId) {
        const { error: updErr } = await supabase
          .from('email_deferred_queue')
          .update({
            status: 'pending',
            defer_reason: deferReason,
            scheduled_for: scheduledFor.toISOString(),
            attempts: srcAttempts + 1,
          })
          .eq('id', sourceQueueId)
        enqErr = updErr
      } else {
        const { error: insErr } = await supabase.from('email_deferred_queue').insert({
          template_name: templateName,
          recipient_email: effectiveRecipient,
          template_data: templateData,
          idempotency_key: idempotencyKey,
          defer_reason: deferReason,
          scheduled_for: scheduledFor.toISOString(),
        })
        enqErr = insErr
      }



      if (enqErr) {
        console.error('Failed to enqueue deferred email — falling open and sending', enqErr)
      } else {
        const { error: logDeferErr } = await supabase.from('email_send_log').insert({
          message_id: messageId,
          template_name: templateName,
          recipient_email: effectiveRecipient,
          status: 'deferred',
          metadata: { idempotency_key: idempotencyKey, category, defer_reason: deferReason, scheduled_for: scheduledFor.toISOString() },
        })
        if (logDeferErr) {
          console.error('email_send_log insert failed (deferred)', {
            templateName, deferReason, error: logDeferErr.message, code: logDeferErr.code,
          })
        }
        console.log('Email deferred', { templateName, recipientLower, deferReason, scheduledFor: scheduledFor.toISOString() })
        return new Response(
          JSON.stringify({ success: true, deferred: true, reason: deferReason, scheduled_for: scheduledFor.toISOString() }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
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
    const { error: logTokenLookupErr } = await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: effectiveRecipient,
      status: 'failed',
      error_message: 'Failed to look up unsubscribe token',
    })
  if (logTokenLookupErr) {
    console.error('email_send_log write failed', {
      status: 'failed', template_name: templateName, message_id: messageId,
      error: logTokenLookupErr.message, code: logTokenLookupErr.code,
    })
  }
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
      const { error: logTokenCreateErr } = await supabase.from('email_send_log').insert({
        message_id: messageId,
        template_name: templateName,
        recipient_email: effectiveRecipient,
        status: 'failed',
        error_message: 'Failed to create unsubscribe token',
      })
      if (logTokenCreateErr) {
        console.error('email_send_log write failed', {
          status: 'failed', template_name: templateName, message_id: messageId,
          error: logTokenCreateErr.message, code: logTokenCreateErr.code,
        })
      }
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
      const { error: logTokenReadErr } = await supabase.from('email_send_log').insert({
        message_id: messageId,
        template_name: templateName,
        recipient_email: effectiveRecipient,
        status: 'failed',
        error_message: 'Failed to confirm unsubscribe token storage',
      })
      if (logTokenReadErr) {
        console.error('email_send_log write failed', {
          status: 'failed', template_name: templateName, message_id: messageId,
          error: logTokenReadErr.message, code: logTokenReadErr.code,
        })
      }
      return new Response(
        JSON.stringify({ error: 'Failed to prepare email' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }
    unsubscribeToken = storedToken.token
  } else if (suppressionBypass) {
    // Templates légaux : le jeton déjà consommé est réutilisé tel quel, l'envoi
    // ne doit pas être bloqué (accusé RGPD, lien de désinscription).
    unsubscribeToken = existingToken.token
  } else {
    // Token exists but is already used, the email should have been caught by the
    // suppression check above. This is a safety fallback: log and skip sending.
    console.warn('Unsubscribe token already used but email not suppressed', {
      email: normalizedEmail,
    })
    const { error: logTokenUsedErr } = await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: effectiveRecipient,
      status: 'suppressed',
      error_message:
        'Unsubscribe token used but email missing from suppressed list',
    })
  if (logTokenUsedErr) {
    console.error('email_send_log write failed', {
      status: 'suppressed', template_name: templateName, message_id: messageId,
      error: logTokenUsedErr.message, code: logTokenUsedErr.code,
    })
  }
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
  const prefsUrl = `${SITE_URL}/email-preferences`
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
    footerText = `\n\n· · ·\nCet email essentiel est lié au fonctionnement de votre compte Guardiens.\nGérer mes préférences : ${prefsUrl}\n`
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
    footerText = `\n\n· · ·\nGérer mes préférences : ${prefsUrl}\nMe désinscrire de cette catégorie : ${unsubUrl}\nTout désinscrire : ${unsubAllUrl}\n`
  }

  // Inject footer just before </body> (or append if not found)
  if (html.includes('</body>')) {
    html = html.replace('</body>', `${footerHtml}</body>`)
  } else {
    html = `${html}${footerHtml}`
  }
  plainText = `${plainText}${footerText}`

  // 4c. Engagement tracking : pixel d'ouverture + suivi de clic via une page
  // de l'app (guardiens.fr/go). Aucun lien visible vers un domaine tiers brut
  // (*.supabase.co), neutralisé par certains scanners de messagerie (Yahoo).
  {
    const trackBase = `${supabaseUrl}/functions/v1`
    const pixelUrl = `${trackBase}/track-email-pixel?mid=${messageId}`
    const pixelHtml = `<img src="${pixelUrl}" width="1" height="1" alt="" style="display:none;width:1px;height:1px;border:0;" />`

    const b64url = (s: string) =>
      btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

    const wrap = (href: string): string => {
      try {
        const u = new URL(href)
        const allowed = new Set(['guardiens.fr', 'www.guardiens.fr', 'guardiens.lovable.app'])
        if (!allowed.has(u.hostname)) return href
        if (u.pathname.startsWith('/unsubscribe') || u.pathname.startsWith('/email-preferences')) return href
        if (u.pathname.startsWith('/go')) return href
        return `${SITE_URL}/go?mid=${messageId}&u=${b64url(u.toString())}`
      } catch {
        return href
      }
    }

    html = html.replace(/href="([^"]+)"/g, (_m, href) => `href="${wrap(href)}"`)

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
    const { error: logNoKeyErr } = await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: effectiveRecipient,
      status: 'failed',
      error_message: 'RESEND_API_KEY not configured',
    })
  if (logNoKeyErr) {
    console.error('email_send_log write failed', {
      status: 'failed', template_name: templateName, message_id: messageId,
      error: logNoKeyErr.message, code: logNoKeyErr.code,
    })
  }
    return new Response(JSON.stringify({ error: 'Email service not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Log pending — on capture l'id pour faire évoluer CETTE ligne vers
  // 'sent' ou 'failed' (UPDATE), au lieu d'insérer une seconde ligne.
  // Fix double-logging (vague 45) : ~1 pending orphelin par envoi historiquement.
  const { data: pendingRow, error: pendingErr } = await supabase
    .from('email_send_log')
    .insert({
      message_id: messageId,
      template_name: templateName,
      recipient_email: effectiveRecipient,
      status: 'pending',
      metadata: { idempotency_key: idempotencyKey, category, bypass, isUrgent, ...logMetadata },
    })
    .select('id')
    .single()
  if (pendingErr) {
    console.error('email_send_log insert failed (pending)', {
      templateName, error: pendingErr.message, code: pendingErr.code,
    })
  }
  const pendingRowId: string | null = (pendingRow as { id?: string } | null)?.id ?? null

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
    // Activation explicite du tracking Resend (pixel d'ouverture + réécriture des liens).
    // Sans cette clé, les envois transactionnels remontent 0 open / 0 click dans email_send_log
    // (le webhook resend-webhook ne reçoit alors que delivered / bounced / complained).
    tracking: { opens: true, clicks: true },
  }
  if (Object.keys(headers).length > 0) {
    resendPayload.headers = headers
  }

  if (templateName === 'contact-reply') {
    resendPayload.reply_to = 'contact.guardiens@gmail.com'
  }

  try {
    const resendRes = await resendFetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(resendPayload),
    }, { functionName: "send-transactional-email" })

    const resendData = await resendRes.json()

    if (!resendRes.ok) {
      console.error('Resend API error', { status: resendRes.status, data: resendData })
      // Fait évoluer la ligne pending -> failed (une seule ligne par envoi).
      let logResendErr: { message: string; code?: string } | null = null
      if (pendingRowId) {
        const { error } = await supabase.from('email_send_log').update({
          status: 'failed',
          error_message: `Resend ${resendRes.status}: ${resendData.message || 'Unknown error'}`,
        }).eq('id', pendingRowId)
        logResendErr = error
      } else {
        const { error } = await supabase.from('email_send_log').insert({
          message_id: messageId,
          template_name: templateName,
          recipient_email: effectiveRecipient,
          status: 'failed',
          error_message: `Resend ${resendRes.status}: ${resendData.message || 'Unknown error'}`,
          metadata: { idempotency_key: idempotencyKey, ...logMetadata },
        })
        logResendErr = error
      }
  if (logResendErr) {
    console.error('email_send_log write failed', {
      status: 'failed', template_name: templateName, message_id: messageId,
      error: logResendErr.message, code: logResendErr.code,
    })
  }
      return new Response(JSON.stringify({
        error: 'Failed to send email',
        providerStatus: resendRes.status,
        details: resendData?.message ?? null,
      }), {
        status: resendRes.status === 429 ? 429 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fait évoluer la ligne pending -> sent (une seule ligne par envoi).
    // Le throttle de notify-new-message lit WHERE status='sent' AND
    // metadata->>conversation_id : la métadata a été fusionnée dès l'insert
    // pending, donc l'UPDATE ci-dessous préserve le mécanisme.
    const sentMetadata = {
      idempotency_key: idempotencyKey,
      resend_id: resendData.id ?? null,
      category,
      bypass,
      isUrgent,
      alma_signed: isAlmaSigned(templateName),
      ...logMetadata,
    }
    let logSentErr: { message: string; code?: string } | null = null
    if (pendingRowId) {
      const { error } = await supabase.from('email_send_log').update({
        status: 'sent',
        resend_id: resendData.id ?? null,
        metadata: sentMetadata,
      }).eq('id', pendingRowId)
      logSentErr = error
    } else {
      // Fallback si la capture d'id a échoué (n'insère qu'une ligne).
      const { error } = await supabase.from('email_send_log').insert({
        message_id: messageId,
        template_name: templateName,
        recipient_email: effectiveRecipient,
        status: 'sent',
        resend_id: resendData.id ?? null,
        metadata: sentMetadata,
      })
      logSentErr = error
    }
  if (logSentErr) {
    console.error('email_send_log write failed', {
      status: 'sent', template_name: templateName, message_id: messageId,
      error: logSentErr.message, code: logSentErr.code,
    })
  }

    console.log('Transactional email sent via Resend', { templateName, effectiveRecipient, resendId: resendData.id })

    return new Response(
      JSON.stringify({ success: true, sent: true, resendId: resendData.id, messageId }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (sendError) {
    console.error('Resend fetch error', sendError)
    const errMsg = (sendError instanceof Error ? sendError.message : String(sendError)) || 'Network error sending via Resend'
    let logCatchErr: { message: string; code?: string } | null = null
    if (pendingRowId) {
      const { error } = await supabase.from('email_send_log').update({
        status: 'failed',
        error_message: errMsg,
      }).eq('id', pendingRowId)
      logCatchErr = error
    } else {
      const { error } = await supabase.from('email_send_log').insert({
        message_id: messageId,
        template_name: templateName,
        recipient_email: effectiveRecipient,
        status: 'failed',
        error_message: errMsg,
        metadata: { idempotency_key: idempotencyKey, ...logMetadata },
      })
      logCatchErr = error
    }
  if (logCatchErr) {
    console.error('email_send_log write failed', {
      status: 'failed', template_name: templateName, message_id: messageId,
      error: logCatchErr.message, code: logCatchErr.code,
    })
  }
    return new Response(JSON.stringify({ error: 'Failed to send email' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
