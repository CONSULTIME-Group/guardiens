// send-nearby-daily-digest
// -------------------------------------------------------------
// Chaque jour à 9h (Europe/Paris), envoie à chaque utilisateur opt-in
// (email_preferences.nearby_daily_digest = true) un récapitulatif des
// nouvelles annonces (sits + petites missions) publiées dans les
// dernières 24h à moins de nearby_daily_radius_km (5/15/30/50/100, défaut 100).
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
import { claimSitNotification, raiseClaimErrorSignal, releaseSitNotification } from '../_shared/sitNotificationClaim.ts'

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

    // Repli départemental : quand une coordonnée manque, on compare les codes
    // département plutôt que d'abandonner le destinataire.
    const deptOf = (...candidates: Array<string | null | undefined>): string | null => {
      for (const c of candidates) {
        const v = (c ?? '').toString().trim()
        if (!v) continue
        if (/^(2A|2B)/i.test(v)) return v.slice(0, 2).toUpperCase()
        const m = v.match(/^\d{2}/)
        if (m) return m[0]
      }
      return null
    }
    const todayIso = new Date().toISOString().slice(0, 10)

    // 1) Charge les annonces récentes une seule fois. `sits` ne porte pas de
    // coordonnées, on passe par celles du propriétaire, avec repli département.
    const [{ data: sits, error: sitsErr }, { data: missions, error: missionsErr }] = await Promise.all([
      supabase
        .from('sits')
        .select('id, slug, title, city, start_date, end_date, user_id, status, created_at, cover_photo_url, property_id, departement_code, accepting_applications, country, profiles:user_id (latitude, longitude, postal_code, departement_code, country)')
        .gte('created_at', since)
        .eq('status', 'published')
        .or('country.is.null,country.eq.FR'),
      supabase
        .from('small_missions')
        .select('id, slug, title, description, mission_type, city, category, date_needed, latitude, longitude, postal_code, user_id, status, created_at, photos')
        .gte('created_at', since)
        .eq('status', 'open'),
    ])
    if (sitsErr) throw new Error('sits query: ' + JSON.stringify(sitsErr))
    if (missionsErr) throw new Error('missions query: ' + JSON.stringify(missionsErr))

    const allSits = (sits ?? []).filter((s: any) => {
      if (s.accepting_applications === false) return false
      if (s.end_date && s.end_date < todayIso) return false
      const oc = (s.profiles as any)?.country
      if (oc && oc !== 'FR') return false
      return true
    })
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
      .select('user_id, nearby_daily_radius_km, product_emails, new_mission_digest')
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

    // La liste des destinataires dépasse le millier : on découpe le `in` par
    // lots de 200 pour rester sous la limite de longueur d'URL PostgREST.
    const recipientIds = Array.from(optedInIds)
    const profiles: any[] = []
    for (let i = 0; i < recipientIds.length; i += 200) {
      const { data: chunk, error: profErr } = await supabase
        .from('profiles')
        .select('id, first_name, city, latitude, longitude, postal_code, departement_code, email, account_status')
        .in('id', recipientIds.slice(i, i + 200))
      if (profErr) throw new Error('profiles query: ' + JSON.stringify(profErr))
      profiles.push(...(chunk ?? []))
    }

    const today = new Date().toISOString().slice(0, 10)
    let usersSent = 0
    let usersSkipped = 0
    let claimSkipped = 0
    let deptFallbackUsers = 0
    const claimSkippedBy: Record<string, number> = {}
    const errors: Array<{ user_id: string; reason: string }> = []


    for (const p of profiles ?? []) {
      try {
        if (p.account_status && p.account_status !== 'active') { usersSkipped++; continue }
        const pref = (prefs ?? []).find((x: any) => x.user_id === p.id)
        const radiusKm = pref?.nearby_daily_radius_km ?? 100
        // product_emails=false ne coupe PAS ce digest (opt-in dédié), mais on
        // respecte quand même si l'utilisateur a explicitement tout coupé côté
        // produit — cohérent avec les autres digests.
        if (pref?.product_emails === false) { usersSkipped++; continue }

        const origin = { lat: Number(p.latitude), lng: Number(p.longitude) }
        const hasOrigin = Number.isFinite(origin.lat) && Number.isFinite(origin.lng)
        const userDept = deptOf(p.departement_code, p.postal_code)
        if (!hasOrigin && !userDept) { usersSkipped++; continue }
        if (!hasOrigin) deptFallbackUsers++

        // Rapproche une annonce du gardien : distance si les deux points sont
        // connus, sinon égalité de département. Renvoie la distance en km, ou
        // null si le rapprochement s'est fait par département.
        const match = (
          lat: unknown, lng: unknown, dept: string | null,
        ): { ok: boolean; km: number | null } => {
          const la = Number(lat), lo = Number(lng)
          if (hasOrigin && Number.isFinite(la) && Number.isFinite(lo)) {
            const d = haversineKm(origin, { lat: la, lng: lo })
            return { ok: d <= radiusKm, km: d }
          }
          if (userDept && dept && userDept === dept) return { ok: true, km: null }
          return { ok: false, km: null }
        }

        // Filtre + distance
        const items: any[] = []
        for (const s of allSits) {
          if (s.user_id === p.id) continue
          const owner = (s.profiles as any) ?? {}
          const sitDept = deptOf(s.departement_code, owner.departement_code, owner.postal_code)
          const r = match(owner.latitude, owner.longitude, sitDept)
          if (!r.ok) continue
          const sitCover = (s.cover_photo_url as string | null)
            || (s.property_id ? propertyCoverMap.get(s.property_id) ?? null : null)
          const sitAnimals = s.property_id ? propertyAnimalsMap.get(s.property_id) : undefined
          items.push({
            kind: 'sit',
            id: s.id,
            slug: s.slug ?? null,
            title: s.title,
            city: s.city,
            distanceKm: r.km == null ? null : Math.round(r.km),
            startDate: formatFrDate(s.start_date),
            endDate: formatFrDate(s.end_date),
            ownerFirstName: ownerMap.get(s.user_id),
            coverPhotoUrl: sitCover,
            animalsSummary: sitAnimals,
            _sort: r.km ?? radiusKm + 1,
          })
        }
        // Les petites missions relèvent de leur propre consentement
        // (new_mission_digest) : si le gardien l'a coupé, ce canal ne doit
        // pas les lui servir malgré tout. Les gardes restent gouvernées par
        // nearby_daily_digest, inchangé.
        const missionsAllowed = pref?.new_mission_digest !== false
        for (const m of (missionsAllowed ? allMissions : [])) {
          if (m.user_id === p.id) continue
          const r = match(m.latitude, m.longitude, deptOf(m.postal_code))
          if (!r.ok) continue

          const desc = (m.description ?? '').toString().replace(/\s+/g, ' ').trim()
          const excerpt = desc.length > 160 ? desc.slice(0, 157).trimEnd() + '...' : desc
          const missionPhoto = Array.isArray(m.photos) && m.photos.length > 0 && typeof m.photos[0] === 'string'
            ? m.photos[0] : null
          items.push({
            kind: 'mission',
            id: m.id,
            slug: m.slug ?? null,
            title: m.title,
            city: m.city,
            distanceKm: r.km == null ? null : Math.round(r.km),
            category: m.category,
            missionType: m.mission_type ?? 'besoin',
            excerpt,
            ownerFirstName: ownerMap.get(m.user_id),
            coverPhotoUrl: missionPhoto,
            _sort: r.km ?? radiusKm + 1,
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

        // Idempotence inter-pipelines : réservation posée seulement ici, une
        // fois le contenu établi et le destinataire éligible. Le mode manuel
        // (action admin délibérée) n'est pas soumis à la garde.
        if (!body.manual) {
          const claim = await claimSitNotification(
            supabase,
            p.id,
            'nearby-daily-digest',
            top.filter((i: any) => i.kind === 'sit').map((i: any) => i.id),
          )
          if (!claim.granted) {
            claimSkipped++
            const key = claim.heldBy ?? (claim.error ? 'claim_error' : 'inconnu')
            claimSkippedBy[key] = (claimSkippedBy[key] ?? 0) + 1
            continue
          }
        }

        const idem = body.manual
          ? `nearby-digest-${p.id}-${Date.now()}`
          : `nearby-digest-${p.id}-${today}`

        const _steRes = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-transactional-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
          body: JSON.stringify({
            templateName: 'nearby-daily-digest',
            recipientEmail: email,
            idempotencyKey: idem,
            templateData: {
              firstName: p.first_name ?? undefined,
              radiusKm,
              city: p.city ?? undefined,
              items: top,
            },
          }),
        });
        const _steTxt1 = _steRes.ok ? '' : await _steRes.text().catch(() => '');
        if (!_steRes.ok) console.error('send-transactional-email failed', _steRes.status, _steTxt1);
        const sendErr = _steRes.ok ? null : new Error(`send-transactional-email ${_steRes.status}: ${_steTxt1}`);
        if (sendErr) {
          if (!body.manual) await releaseSitNotification(supabase, p.id)
          errors.push({ user_id: p.id, reason: `send_failed: ${String(sendErr)}` })
          continue
        }
        usersSent++
      } catch (loopErr) {
        errors.push({ user_id: p.id, reason: String(loopErr) })
      }
    }

    await raiseClaimErrorSignal(supabase, 'nearby-daily-digest', claimSkippedBy.claim_error ?? 0)

    return json({
      ok: true,
      users_considered: (profiles ?? []).length,
      users_sent: usersSent,
      users_skipped: usersSkipped,
      claim_skipped: claimSkipped,
      claim_skipped_by: claimSkippedBy,
      dept_fallback_users: deptFallbackUsers,
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
