// send-sitter-daily-digest
// -------------------------------------------------------------
// Envoie chaque soir un digest quotidien aux gardiens ayant au moins une
// entrée `queued` dans `sitter_digest_queue`. Pour chaque gardien :
//  - top 3 par (affinity_score DESC NULLS LAST, distance ASC NULLS LAST)
//  - anti-doublon : pas de digest dans les 24h (via email_send_log)
//  - vérification suppression, opt-in email_preferences.new_sit_digest
//  - envoi via `send-transactional-email` (template 'sitter-daily-digest')
//  - marque les entrées : top 3 → sent, reste → skipped (raison digest_cap_3)
//
// Body accepté : { manual?: boolean, dry_run?: boolean, sitter_id?: string }
// - manual=true : bypass le check "1 digest / 24h" pour permettre au bouton
//   admin "Envoyer maintenant" de retester (idempotency key horodatée).
// - dry_run=true : ne modifie rien, ne notifie rien, retourne juste le plan.
// - sitter_id : limite l'exécution à un gardien précis (test ciblé).

import { createClient } from 'npm:@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface QueueRow {
  id: string
  sitter_id: string
  sit_id: string
  affinity_score: number | null
  distance_km: number | null
}

interface SitRow {
  id: string
  title: string | null
  city: string | null
  start_date: string | null
  end_date: string | null
  cover_photo_url: string | null
  user_id: string
  status: string
  accepting_applications: boolean
  unpublished_at: string | null
}

function formatFrDate(iso?: string | null): string | undefined {
  if (!iso) return undefined
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric',
    })
  } catch {
    return iso
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  let body: { manual?: boolean; dry_run?: boolean; sitter_id?: string } = {}
  try {
    if (req.body) body = await req.json()
  } catch { /* empty body ok */ }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  )

  try {
    // 1. Récupère toutes les paires queued (filtrage optionnel par sitter)
    let queueQuery = supabase
      .from('sitter_digest_queue')
      .select('id, sitter_id, sit_id, affinity_score, distance_km')
      .eq('status', 'queued')

    if (body.sitter_id) {
      queueQuery = queueQuery.eq('sitter_id', body.sitter_id)
    }

    const { data: queued, error: qErr } = await queueQuery
    if (qErr) throw qErr

    if (!queued || queued.length === 0) {
      return json({ ok: true, sitters_processed: 0, reason: 'empty_queue' })
    }

    // 2. Regroupe par sitter_id
    const bySitter = new Map<string, QueueRow[]>()
    for (const row of queued as QueueRow[]) {
      const arr = bySitter.get(row.sitter_id) ?? []
      arr.push(row)
      bySitter.set(row.sitter_id, arr)
    }

    const today = new Date().toISOString().slice(0, 10)
    let sittersSent = 0
    let sittersSkipped = 0
    const errors: Array<{ sitter_id: string; reason: string }> = []
    const plan: Array<{ sitter_id: string; sits: string[]; skipped: string[] }> = []

    // Cache sits déjà chargées pour éviter multi requêtes
    const sitCache = new Map<string, SitRow>()

    for (const [sitterId, rows] of bySitter.entries()) {
      try {
        // 2a. Charge les infos gardien (profile + email_preferences)
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, first_name, account_status, identity_verified, profile_completion, last_seen_at, role')
          .eq('id', sitterId)
          .maybeSingle()

        if (!profile
            || profile.account_status !== 'active'
            || !profile.identity_verified
            || (profile.profile_completion ?? 0) < 60
        ) {
          await markSkipped(supabase, rows.map(r => r.id), 'sitter_not_eligible', body.dry_run)
          sittersSkipped++
          continue
        }

        const { data: prefs } = await supabase
          .from('email_preferences')
          .select('new_sit_digest')
          .eq('user_id', sitterId)
          .maybeSingle()

        if (prefs && prefs.new_sit_digest === false) {
          await markSkipped(supabase, rows.map(r => r.id), 'digest_opt_out', body.dry_run)
          sittersSkipped++
          continue
        }

        // 2b. Résout l'email auth
        const { data: authData, error: authErr } = await supabase.auth.admin.getUserById(sitterId)
        if (authErr || !authData?.user?.email) {
          errors.push({ sitter_id: sitterId, reason: 'auth_email_missing' })
          continue
        }
        const email = authData.user.email

        // 2c. Anti-spam suppression
        const { data: sup } = await supabase
          .from('suppressed_emails')
          .select('email')
          .eq('email', email)
          .maybeSingle()
        if (sup) {
          await markSkipped(supabase, rows.map(r => r.id), 'email_suppressed', body.dry_run)
          sittersSkipped++
          continue
        }

        // 2d. Anti-spam : déjà envoyé dans les 24h ?
        if (!body.manual) {
          const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
          const { data: recent } = await supabase
            .from('email_send_log')
            .select('id')
            .eq('template_name', 'sitter-daily-digest')
            .eq('recipient_email', email)
            .in('status', ['sent', 'pending'])
            .gte('created_at', since)
            .limit(1)
          if (recent && recent.length > 0) {
            await markSkipped(supabase, rows.map(r => r.id), 'already_sent_24h', body.dry_run)
            sittersSkipped++
            continue
          }
        }

        // 2e. Tri : affinity DESC NULLS LAST, distance ASC NULLS LAST
        const sorted = [...rows].sort((a, b) => {
          const aScore = a.affinity_score ?? -1
          const bScore = b.affinity_score ?? -1
          if (aScore !== bScore) return bScore - aScore
          const aDist = a.distance_km ?? Number.POSITIVE_INFINITY
          const bDist = b.distance_km ?? Number.POSITIVE_INFINITY
          return aDist - bDist
        })

        const top3 = sorted.slice(0, 3)
        const overflow = sorted.slice(3)

        // 2f. Charge chaque sit (vérifie toujours publiée + accepting)
        const items: any[] = []
        for (const q of top3) {
          let sit = sitCache.get(q.sit_id) as SitRow | undefined
          if (!sit) {
            const { data } = await supabase
              .from('sits')
              .select('id, title, city, start_date, end_date, cover_photo_url, user_id, status, accepting_applications, unpublished_at')
              .eq('id', q.sit_id)
              .maybeSingle()
            if (data) {
              sit = data as SitRow
              sitCache.set(q.sit_id, sit)
            }
          }
          if (!sit
              || sit.status !== 'published'
              || !sit.accepting_applications
              || sit.unpublished_at
          ) {
            await markSkipped(supabase, [q.id], 'sit_not_available', body.dry_run)
            continue
          }

          // Owner + animals summary
          const { data: ownerProfile } = await supabase
            .from('profiles')
            .select('first_name')
            .eq('id', sit.user_id)
            .maybeSingle()

          const { data: props } = await supabase
            .from('properties')
            .select('id, pets:pets(species)')
            .eq('user_id', sit.user_id)
            .limit(1)

          const speciesCounts: Record<string, number> = {}
          const petsList = props?.[0]?.pets ?? []
          for (const p of petsList as Array<{ species: string | null }>) {
            const s = p?.species
            if (!s) continue
            speciesCounts[s] = (speciesCounts[s] ?? 0) + 1
          }
          const animalsSummary = Object.entries(speciesCounts)
            .map(([k, n]) => `${n} ${labelSpecies(k, n)}`)
            .join(', ')

          items.push({
            sitId: sit.id,
            sitTitle: sit.title,
            city: sit.city,
            ownerFirstName: ownerProfile?.first_name,
            startDate: formatFrDate(sit.start_date),
            endDate: formatFrDate(sit.end_date),
            animalsSummary: animalsSummary || undefined,
            coverPhotoUrl: sit.cover_photo_url,
            affinityScore: q.affinity_score,
            affinityTotal: null,
            distanceKm: q.distance_km,
          })
        }

        if (items.length === 0) {
          sittersSkipped++
          continue
        }

        plan.push({
          sitter_id: sitterId,
          sits: items.map(i => i.sitId),
          skipped: overflow.map(o => o.sit_id),
        })

        if (body.dry_run) {
          continue
        }

        // 2g. Envoi digest
        const idemBase = body.manual
          ? `sitter-digest-${sitterId}-${Date.now()}`
          : `sitter-digest-${sitterId}-${today}`

        const { error: sendErr } = await supabase.functions.invoke('send-transactional-email', {
          body: {
            templateName: 'sitter-daily-digest',
            recipientEmail: email,
            idempotencyKey: idemBase,
            templateData: {
              sitterFirstName: profile.first_name ?? undefined,
              items,
            },
          },
        })

        if (sendErr) {
          errors.push({ sitter_id: sitterId, reason: `send_failed: ${String(sendErr)}` })
          continue
        }

        // 2h. Mise à jour queue : top → sent, overflow → skipped
        const sentIds = top3
          .filter(q => items.find(i => i.sitId === q.sit_id))
          .map(q => q.id)

        if (sentIds.length > 0) {
          await supabase
            .from('sitter_digest_queue')
            .update({ status: 'sent', sent_at: new Date().toISOString() })
            .in('id', sentIds)
        }

        if (overflow.length > 0) {
          await supabase
            .from('sitter_digest_queue')
            .update({ status: 'skipped', skip_reason: 'digest_cap_3' })
            .in('id', overflow.map(o => o.id))
        }

        sittersSent++
      } catch (loopErr) {
        errors.push({ sitter_id: sitterId, reason: String(loopErr) })
      }
    }

    return json({
      ok: true,
      sitters_processed: bySitter.size,
      sitters_sent: sittersSent,
      sitters_skipped: sittersSkipped,
      errors,
      dry_run: !!body.dry_run,
      plan: body.dry_run ? plan : undefined,
    })
  } catch (err) {
    console.error('send-sitter-daily-digest fatal', err)
    return json({ error: String(err) }, 500)
  }
})

async function markSkipped(
  supabase: any,
  ids: string[],
  reason: string,
  dryRun?: boolean,
) {
  if (dryRun || ids.length === 0) return
  await supabase
    .from('sitter_digest_queue')
    .update({ status: 'skipped', skip_reason: reason })
    .in('id', ids)
}

function labelSpecies(code: string, count: number): string {
  const map: Record<string, [string, string]> = {
    dog: ['chien', 'chiens'],
    cat: ['chat', 'chats'],
    bird: ['oiseau', 'oiseaux'],
    rodent: ['rongeur', 'rongeurs'],
    reptile: ['reptile', 'reptiles'],
    horse: ['cheval', 'chevaux'],
    farm_animal: ['animal de ferme', 'animaux de ferme'],
    nac: ['NAC', 'NAC'],
  }
  const [sing, plur] = map[code] ?? [code, code]
  return count > 1 ? plur : sing
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
