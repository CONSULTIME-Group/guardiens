// send-mutual-aid-weekly-digest
// -----------------------------------------------------------------------------
// Envoie chaque mardi 8h UTC un digest hebdomadaire "le fil de l'entraide" aux
// membres opt-in `email_preferences.new_mission_digest = true`.
// Contenu :
//   - 5 nouvelles missions les plus proches (haversine sur postal_code)
//   - 3 questions les plus commentées de la semaine
//   - 3 profils avec le plus de badges reçus cette semaine (mission_feedbacks)
// Anti-spam : dédup 6j sur email_send_log, respect suppressed_emails.
// Body : { dry_run?: boolean, recipient_id?: string, manual?: boolean }
import { createClient } from 'npm:@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const TEMPLATE = 'mutual-aid-weekly-digest'

interface Recipient {
  id: string
  first_name: string | null
  email: string | null
  city: string | null
  postal_code: string | null
  latitude: number | null
  longitude: number | null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  let body: { dry_run?: boolean; recipient_id?: string; manual?: boolean } = {}
  try { if (req.body) body = await req.json() } catch { /* noop */ }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
  const now = Date.now()
  const weekAgoIso = new Date(now - 7 * 86400_000).toISOString()

  try {
    // === Contenu global (mutualisé pour tous les destinataires) ===
    // Section 3 : top 3 profils avec le plus de badges reçus cette semaine
    const { data: recentFeedbacks } = await admin
      .from('mission_feedbacks')
      .select('receiver_id, badge_key, created_at')
      .not('badge_key', 'is', null)
      .gte('created_at', weekAgoIso)
      .limit(2000)

    const badgeCount = new Map<string, number>()
    for (const f of recentFeedbacks ?? []) {
      badgeCount.set(f.receiver_id, (badgeCount.get(f.receiver_id) ?? 0) + 1)
    }
    const topMemberIds = [...badgeCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id, count]) => ({ id, count }))

    let topMembers: Array<{ userId: string; firstName?: string; city?: string | null; badgesCount: number }> = []
    if (topMemberIds.length > 0) {
      const { data: profs } = await admin
        .from('profiles')
        .select('id, first_name, city')
        .in('id', topMemberIds.map((t) => t.id))
      const byId = new Map((profs ?? []).map((p) => [p.id, p]))
      topMembers = topMemberIds.map((t) => ({
        userId: t.id,
        firstName: byId.get(t.id)?.first_name ?? undefined,
        city: byId.get(t.id)?.city ?? null,
        badgesCount: t.count,
      }))
    }

    // Section 2 : top 3 questions les plus commentées de la semaine
    const { data: recentQuestions } = await admin
      .from('community_questions')
      .select('id, title, city, answers_count, created_at')
      .eq('is_hidden', false)
      .gte('created_at', weekAgoIso)
      .order('answers_count', { ascending: false })
      .limit(3)
    const questions = (recentQuestions ?? []).map((q) => ({
      id: q.id,
      title: q.title,
      city: q.city,
      answersCount: q.answers_count ?? 0,
    }))

    // Section 1 (partiel) : missions récentes (24-96h) , filtrées par distance côté recipient
    const missionsCutoff = new Date(now - 7 * 86400_000).toISOString()
    const { data: freshMissions } = await admin
      .from('small_missions')
      .select('id, title, city, mission_type, latitude, longitude, postal_code, created_at')
      .eq('status', 'open')
      .gte('created_at', missionsCutoff)
      .order('created_at', { ascending: false })
      .limit(200)

    // === Destinataires ===
    let recipientsQuery = admin
      .from('email_preferences')
      .select('user_id')
      .eq('new_mission_digest', true)
      .eq('product_emails', true)
      .limit(5000)
    if (body.recipient_id) recipientsQuery = recipientsQuery.eq('user_id', body.recipient_id)
    const { data: prefsRows, error: prefsErr } = await recipientsQuery
    if (prefsErr) throw prefsErr

    const recipientIds = (prefsRows ?? []).map((r) => r.user_id).filter(Boolean)
    if (recipientIds.length === 0) return json({ ok: true, sent: 0, reason: 'no_optin' })

    // Charge profils par lots de 200
    const recipients: Recipient[] = []
    for (let i = 0; i < recipientIds.length; i += 200) {
      const batch = recipientIds.slice(i, i + 200)
      const { data } = await admin
        .from('profiles')
        .select('id, first_name, email, city, postal_code, latitude, longitude, account_status')
        .in('id', batch)
        .eq('account_status', 'active')
      for (const p of data ?? []) {
        recipients.push({
          id: p.id, first_name: p.first_name, email: p.email,
          city: p.city, postal_code: p.postal_code,
          latitude: p.latitude, longitude: p.longitude,
        })
      }
    }

    const dedupWindowIso = new Date(now - 6 * 86400_000).toISOString()
    let sent = 0, skipped = 0
    const errors: Array<{ user_id: string; reason: string }> = []
    const plan: Array<{ user_id: string; missions: number }> = []

    for (const r of recipients) {
      // Email
      let email = r.email?.trim() || null
      if (!email) {
        const { data: authData } = await admin.auth.admin.getUserById(r.id)
        email = authData?.user?.email ?? null
      }
      if (!email) { errors.push({ user_id: r.id, reason: 'email_missing' }); continue }

      // Suppression
      const { data: sup } = await admin
        .from('suppressed_emails')
        .select('email')
        .ilike('email', email)
        .maybeSingle()
      if (sup) { skipped++; continue }

      // Dédup hebdo (sauf manual)
      if (!body.manual) {
        const { data: prev } = await admin
          .from('email_send_log')
          .select('id')
          .eq('template_name', TEMPLATE)
          .eq('recipient_email', email)
          .in('status', ['sent', 'pending'])
          .gte('created_at', dedupWindowIso)
          .limit(1)
        if (prev && prev.length > 0) { skipped++; continue }
      }

      // Sélection missions par distance (fallback: 5 plus récentes nationales)
      let missionsForRecipient = freshMissions ?? []
      if (r.latitude != null && r.longitude != null) {
        const withDistance = missionsForRecipient
          .filter((m) => m.latitude != null && m.longitude != null)
          .map((m) => ({
            m,
            d: haversineKm(r.latitude!, r.longitude!, m.latitude!, m.longitude!),
          }))
          .sort((a, b) => a.d - b.d)
          .slice(0, 5)
        missionsForRecipient = withDistance.map((x) => ({ ...x.m, __distance: x.d } as any))
      } else {
        missionsForRecipient = missionsForRecipient.slice(0, 5)
      }

      const missionsPayload = (missionsForRecipient as any[]).map((m) => ({
        id: m.id,
        title: m.title,
        city: m.city,
        missionType: m.mission_type,
        distanceKm: typeof m.__distance === 'number' ? m.__distance : null,
      }))

      // Skip si aucun contenu à montrer (0 mission + 0 question + 0 top members)
      if (missionsPayload.length === 0 && questions.length === 0 && topMembers.length === 0) {
        skipped++
        continue
      }

      plan.push({ user_id: r.id, missions: missionsPayload.length })

      if (body.dry_run) continue

      const idem = body.manual
        ? `${TEMPLATE}-${r.id}-${Date.now()}`
        : `${TEMPLATE}-${r.id}-${new Date().toISOString().slice(0, 10)}`

      const { error: sendErr } = await admin.functions.invoke('send-transactional-email', {
        body: {
          templateName: TEMPLATE,
          recipientEmail: email,
          idempotencyKey: idem,
          templateData: {
            firstName: r.first_name ?? undefined,
            city: r.city ?? null,
            missions: missionsPayload,
            questions,
            topMembers,
          },
          metadata: { digest: 'mutual_aid_weekly' },
        },
      })
      if (sendErr) { errors.push({ user_id: r.id, reason: String(sendErr) }); continue }
      sent++
    }

    return json({
      ok: true, sent, skipped, total_recipients: recipients.length,
      errors, dry_run: !!body.dry_run,
      plan: body.dry_run ? plan.slice(0, 20) : undefined,
    })
  } catch (err) {
    console.error('[send-mutual-aid-weekly-digest] fatal', err)
    return json({ error: String(err) }, 500)
  }
})

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
