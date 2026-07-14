// send-nearby-daily-digest
// -------------------------------------------------------------
// Chaque jour à 13h (Europe/Paris), envoie à chaque utilisateur opt-in
// (email_preferences.nearby_daily_digest = true) un récapitulatif des
// nouvelles annonces (sits + petites missions) publiées dans les
// dernières 24h à moins de nearby_daily_radius_km (5/15/30, défaut 15).
//
// Contraintes :
//  - Anti-doublon 20h sur email_send_log
//  - Utilisateur doit avoir latitude/longitude + email
//  - Suppression (suppressed_emails) respectée
//  - Idempotency key = nearby-digest-<user>-YYYY-MM-DD
//  - Cap 10 items max
//
// Body : { manual?: boolean, dry_run?: boolean, user_id?: string }

import { createClient } from 'npm:@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MAX_ITEMS = 10

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}

function formatFrDate(iso?: string | null): string | undefined {
  if (!iso) return undefined
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch { return iso }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  let body: { manual?: boolean; dry_run?: boolean; user_id?: string } = {}
  try { if (req.body) body = await req.json() } catch { /* empty */ }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  )

  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    // 1) Charge les annonces récentes une seule fois.
    const [{ data: sits }, { data: missions }] = await Promise.all([
      supabase
        .from('sits')
        .select('id, slug, title, city, start_date, end_date, latitude, longitude, user_id, status, created_at, cover_photo_url, property_id')
        .gte('created_at', since)
        .eq('status', 'open')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null),
      supabase
        .from('small_missions')
        .select('id, slug, title, description, mission_type, city, category, date_needed, latitude, longitude, user_id, status, created_at, photos')
        .gte('created_at', since)
        .eq('status', 'open')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null),
    ])

    const allSits = sits ?? []
    const allMissions = missions ?? []

    if (allSits.length === 0 && allMissions.length === 0) {
      return json({ ok: true, reason: 'no_new_listings', users_sent: 0 })
    }

    // 2) Enrichit avec prénom du propriétaire.
    const ownerIds = Array.from(new Set([
      ...allSits.map((s: any) => s.user_id).filter(Boolean),
      ...allMissions.map((m: any) => m.user_id).filter(Boolean),
    ]))
    const ownerMap = new Map<string, string | undefined>()
    if (ownerIds.length > 0) {
      const { data: owners } = await supabase
        .from('profiles')
        .select('id, first_name')
        .in('id', ownerIds)
      for (const o of owners ?? []) ownerMap.set(o.id, o.first_name ?? undefined)
    }

    // 2b) Cover fallback + animaux via properties/pets pour les sits.
    const propertyIds = Array.from(new Set(
      allSits.map((s: any) => s.property_id).filter(Boolean)
    ))
    const propertyCoverMap = new Map<string, string | null>()
    const propertyAnimalsMap = new Map<string, string>()
    if (propertyIds.length > 0) {
      const { data: props } = await supabase
        .from('properties')
        .select('id, cover_photo_url, photos, pets(species)')
        .in('id', propertyIds)
      const SPECIES: Record<string, { s: string; p: string }> = {
        dog: { s: 'chien', p: 'chiens' },
        cat: { s: 'chat', p: 'chats' },
        rabbit: { s: 'lapin', p: 'lapins' },
        bird: { s: 'oiseau', p: 'oiseaux' },
        rodent: { s: 'rongeur', p: 'rongeurs' },
        fish: { s: 'poisson', p: 'poissons' },
        reptile: { s: 'reptile', p: 'reptiles' },
        horse: { s: 'cheval', p: 'chevaux' },
        other: { s: 'animal', p: 'animaux' },
      }
      for (const p of props ?? []) {
        const anyP = p as any
        const cover = (anyP.cover_photo_url as string | null)
          || (Array.isArray(anyP.photos) && anyP.photos.length > 0 ? anyP.photos[0] : null)
        propertyCoverMap.set(anyP.id, cover ?? null)
        const counts: Record<string, number> = {}
        for (const pet of (anyP.pets ?? [])) {
          const key = String(pet.species || 'other')
          counts[key] = (counts[key] || 0) + 1
        }
        const parts = Object.entries(counts).map(([k, n]) => {
          const lab = SPECIES[k] || SPECIES.other
          return `${n} ${n > 1 ? lab.p : lab.s}`
        })
        if (parts.length > 0) propertyAnimalsMap.set(anyP.id, parts.join(', '))
      }
    }


    // 3) Récupère les destinataires opt-in avec coordonnées.
    let recipientsQ = supabase
      .from('email_preferences')
      .select('user_id, nearby_daily_radius_km, product_emails')
      .eq('nearby_daily_digest', true)
    if (body.user_id) recipientsQ = recipientsQ.eq('user_id', body.user_id)

    const { data: prefs, error: prefsErr } = await recipientsQ
    if (prefsErr) throw prefsErr

    // Ajoute aussi les utilisateurs SANS ligne email_preferences (défaut = opt-in)
    // uniquement si un user_id est passé explicitement, sinon on se limite aux
    // opt-in explicites pour éviter un balayage global de la table profiles.
    const optedInIds = new Set((prefs ?? []).map((p: any) => p.user_id))
    if (body.user_id && !optedInIds.has(body.user_id)) {
      optedInIds.add(body.user_id)
    }

    if (optedInIds.size === 0) {
      return json({ ok: true, reason: 'no_recipients', users_sent: 0 })
    }

    const { data: profiles, error: profErr } = await supabase
      .from('profiles')
      .select('id, first_name, city, latitude, longitude, email, account_status')
      .in('id', Array.from(optedInIds))
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
    if (profErr) throw profErr

    const today = new Date().toISOString().slice(0, 10)
    let usersSent = 0
    let usersSkipped = 0
    const errors: Array<{ user_id: string; reason: string }> = []

    for (const p of profiles ?? []) {
      try {
        if (p.account_status && p.account_status !== 'active') { usersSkipped++; continue }
        const pref = (prefs ?? []).find((x: any) => x.user_id === p.id)
        const radiusKm = pref?.nearby_daily_radius_km ?? 15
        // product_emails=false ne coupe PAS ce digest (opt-in dédié), mais on
        // respecte quand même si l'utilisateur a explicitement tout coupé côté
        // produit — cohérent avec les autres digests.
        if (pref?.product_emails === false) { usersSkipped++; continue }

        const origin = { lat: Number(p.latitude), lng: Number(p.longitude) }
        if (!Number.isFinite(origin.lat) || !Number.isFinite(origin.lng)) { usersSkipped++; continue }

        // Filtre + distance
        const items: any[] = []
        for (const s of allSits) {
          if (s.user_id === p.id) continue
          const d = haversineKm(origin, { lat: Number(s.latitude), lng: Number(s.longitude) })
          if (d > radiusKm) continue
          items.push({
            kind: 'sit',
            id: s.id,
            slug: s.slug ?? null,
            title: s.title,
            city: s.city,
            distanceKm: Math.round(d),
            startDate: formatFrDate(s.start_date),
            endDate: formatFrDate(s.end_date),
            ownerFirstName: ownerMap.get(s.user_id),
            _sort: d,
          })
        }
        for (const m of allMissions) {
          if (m.user_id === p.id) continue
          const d = haversineKm(origin, { lat: Number(m.latitude), lng: Number(m.longitude) })
          if (d > radiusKm) continue
          const desc = (m.description ?? '').toString().replace(/\s+/g, ' ').trim()
          const excerpt = desc.length > 160 ? desc.slice(0, 157).trimEnd() + '...' : desc
          items.push({
            kind: 'mission',
            id: m.id,
            slug: m.slug ?? null,
            title: m.title,
            city: m.city,
            distanceKm: Math.round(d),
            category: m.category,
            missionType: m.mission_type ?? 'besoin',
            excerpt,
            ownerFirstName: ownerMap.get(m.user_id),
            _sort: d,
          })
        }

        if (items.length === 0) { usersSkipped++; continue }

        items.sort((a, b) => a._sort - b._sort)
        const top = items.slice(0, MAX_ITEMS).map(({ _sort, ...rest }) => rest)

        // Email
        let email = (p.email as string | undefined)?.trim() || null
        if (!email) {
          const { data: authData } = await supabase.auth.admin.getUserById(p.id)
          email = authData?.user?.email ?? null
        }
        if (!email) { errors.push({ user_id: p.id, reason: 'email_missing' }); continue }

        // Suppression
        const { data: sup } = await supabase
          .from('suppressed_emails')
          .select('email')
          .ilike('email', email)
          .maybeSingle()
        if (sup) { usersSkipped++; continue }

        // Anti-doublon 20h
        if (!body.manual) {
          const cutoff = new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString()
          const { data: recent } = await supabase
            .from('email_send_log')
            .select('id')
            .eq('template_name', 'nearby-daily-digest')
            .eq('recipient_email', email)
            .in('status', ['sent', 'pending'])
            .gte('created_at', cutoff)
            .limit(1)
          if (recent && recent.length > 0) { usersSkipped++; continue }
        }

        if (body.dry_run) { usersSent++; continue }

        const idem = body.manual
          ? `nearby-digest-${p.id}-${Date.now()}`
          : `nearby-digest-${p.id}-${today}`

        const { error: sendErr } = await supabase.functions.invoke('send-transactional-email', {
          body: {
            templateName: 'nearby-daily-digest',
            recipientEmail: email,
            idempotencyKey: idem,
            templateData: {
              firstName: p.first_name ?? undefined,
              radiusKm,
              city: p.city ?? undefined,
              items: top,
            },
          },
        })
        if (sendErr) { errors.push({ user_id: p.id, reason: `send_failed: ${String(sendErr)}` }); continue }
        usersSent++
      } catch (loopErr) {
        errors.push({ user_id: p.id, reason: String(loopErr) })
      }
    }

    return json({
      ok: true,
      users_considered: (profiles ?? []).length,
      users_sent: usersSent,
      users_skipped: usersSkipped,
      errors,
      dry_run: !!body.dry_run,
    })
  } catch (err) {
    console.error('send-nearby-daily-digest fatal', err)
    return json({ error: String(err) }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
