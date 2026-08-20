// send-sitter-daily-digest
// -------------------------------------------------------------
// Envoie chaque soir un digest quotidien aux gardiens ayant au moins une
// entrée `queued` dans `sitter_digest_queue`. L'identité vérifiée n'est plus
// un filtre d'éligibilité : c'est une clé de tri (vérifiés en tête de file).
// Depuis le 20/08/2026, le score d'affinité est calculé ICI par le moteur
// unique partagé (`_shared/affinity/score.ts`, le même que l'affichage), en
// mode distribution : seuls les refus explicitement déclarés par le gardien
// excluent une annonce, jamais un score bas. Le tri du top 3 est
// (score DESC, distance ASC). La colonne SQL `affinity_score` de la file
// n'est plus lue (NULL depuis la même date).
// Pour chaque gardien :
//  - top 3 par (score moteur unique DESC, distance ASC NULLS LAST)
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
import { claimSitNotification, raiseClaimErrorSignal, raiseStaleClaimSignal, releaseSitNotification, reportClaimOutcome } from '../_shared/sitNotificationClaim.ts'
import { parisWindowVerdict } from '../_shared/paris-hour.ts'
import { recordDeliveryFailure } from '../_shared/delivery-failure.ts'
import { startCronRun } from '../_shared/cron-run-log.ts'
import { computeAffinityResultFull } from '../_shared/affinity/score.ts'
import { pickMissingOpportunities, type MissingOpportunitiesStats } from '../_shared/missing-opportunities/index.ts'

// Heure de Paris visée pour ce passage, garde saison-proof (voir paris-hour.ts).
const TARGET_PARIS_HOUR = 8

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
  accepts_sitter_pets: string | null
  accepts_sitter_children: string | null
}

// Colonnes gardien consommées par le moteur unique d'affinité.
// À maintenir en phase avec `AffinitySitterInput` (_shared/affinity/score.ts).
const SITTER_AFFINITY_COLUMNS = 'user_id, experience_years, life_pace, lifestyle, availability_during, languages, interests, work_during_sit, meeting_preference, handover_preference, sensitivities, animal_types, sitter_type, special_animal_skills, travels_with_children, travels_with_own_animals, has_vehicle, has_license, farm_animals_ok'

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

  let body: { manual?: boolean; dry_run?: boolean; sitter_id?: string; catchup?: boolean } = {}
  try {
    if (req.body) body = await req.json()
  } catch { /* empty body ok */ }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  )

  // Règle heure de Paris : hors passage visé ou en plage calme, on sort sans
  // rien faire, le passage suivant de la fenêtre reprend la main.
  if (!body.manual && !body.dry_run && !body.catchup && !body.sitter_id) {
    const verdict = parisWindowVerdict(new Date(), TARGET_PARIS_HOUR)
    if (!verdict.run) {
      console.log(JSON.stringify({ event: 'digest_skipped_paris_window', source: 'send-sitter-daily-digest', ...verdict }))
      return json({ ok: true, skipped: true, reason: verdict.reason, paris_hour: verdict.parisHour })
    }
  }

  // Passage nominal : tracé dans cron_run_log avec compteurs et erreurs.
  const nominalRun = (!body.manual && !body.dry_run && !body.catchup && !body.sitter_id)
    ? await startCronRun('send-sitter-daily-digest')
    : null

  // Passage de rattrapage : unique, tracé, non rejouable. Le gabarit assume
  // le rappel, le contrôle des 24h et la réservation de créneau sont sautés
  // pour ce seul passage. Un second appel réel est refusé.
  const CATCHUP_TAG = 'send-sitter-daily-digest-catchup-2026-08-05'
  if (body.catchup && !body.dry_run) {
    const { data: already } = await supabase
      .from('cron_run_log')
      .select('id')
      .eq('edge_name', CATCHUP_TAG)
      .limit(1)
    if (already && already.length > 0) {
      return json({ ok: false, reason: 'catchup_already_executed' }, 409)
    }
    await supabase.from('cron_run_log').insert({
      edge_name: CATCHUP_TAG,
      started_at: new Date().toISOString(),
    })
  }


  try {
    // 1. Récupère toutes les paires queued (filtrage optionnel par sitter)
    let queueQuery = supabase
      .from('sitter_digest_queue')
      .select('id, sitter_id, sit_id, affinity_score, distance_km, queued_at')
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
    let claimSkipped = 0
    let claimGranted = 0
    const staleSolded: string[] = []
    let staleReason = ''
    const claimSkippedBy: Record<string, number> = {}
    const errors: Array<{ sitter_id: string; reason: string }> = []
    const plan: Array<{ sitter_id: string; sits: string[]; skipped: string[] }> = []

    // Cache sits déjà chargées pour éviter multi requêtes
    const sitCache = new Map<string, SitRow>()
    // Cache des inputs propriétaire du moteur unique (par owner_id).
    const ownerInputCache = new Map<string, Record<string, unknown>>()

    // Construit l'input propriétaire du moteur unique : préférences matching,
    // drapeaux d'acceptation de l'annonce, véhicule et animaux (avec besoins
    // spéciaux et races). Les champs absents restent null : le moteur les
    // traite comme non renseignés (neutres), jamais pénalisants.
    const loadOwnerInput = async (sit: SitRow): Promise<Record<string, unknown>> => {
      const [{ data: op }, { data: props }] = await Promise.all([
        supabase
          .from('owner_profiles')
          .select('preferred_sitter_types, home_ambiance, languages, interests, life_pace, presence_expected')
          .eq('user_id', sit.user_id)
          .maybeSingle(),
        supabase
          .from('properties')
          .select('id, car_required, pets:pets(species, special_needs, breed)')
          .eq('user_id', sit.user_id),
      ])
      const pets = (props ?? []).flatMap((p: any) => p.pets ?? [])
      const carRequired = (props ?? []).some((p: any) => p.car_required === true)
      return {
        preferred_sitter_types: (op as any)?.preferred_sitter_types ?? null,
        home_ambiance: (op as any)?.home_ambiance ?? null,
        languages: (op as any)?.languages ?? null,
        interests: (op as any)?.interests ?? null,
        life_pace: (op as any)?.life_pace ?? null,
        presence_expected: (op as any)?.presence_expected ?? null,
        accepts_sitter_pets: sit.accepts_sitter_pets ?? null,
        accepts_sitter_children: sit.accepts_sitter_children ?? null,
        car_required: carRequired,
        pets: pets.map((p: any) => ({ species: p.species, special_needs: p.special_needs, breed: p.breed ?? null })),
      }
    }

    // 2a-bis. Ordre d'envoi : les gardiens dont l'identité est vérifiée
    // passent en tête de file, les autres suivent (la vérification trie,
    // elle n'exclut plus).
    const { data: verifiedRows } = await supabase
      .from('profiles')
      .select('id, identity_verified')
      .in('id', [...bySitter.keys()])
    const verifiedSitters = new Set(
      (verifiedRows ?? []).filter((r: any) => r.identity_verified).map((r: any) => r.id as string)
    )
    const orderedSitters = [...bySitter.entries()].sort(
      (a, b) => Number(verifiedSitters.has(b[0])) - Number(verifiedSitters.has(a[0]))
    )

    for (const [sitterId, rows] of orderedSitters) {
      try {
        // 2a. Charge les infos gardien (profile + email_preferences)
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, first_name, account_status, identity_verified, profile_completion, last_seen_at, role')
          .eq('id', sitterId)
          .maybeSingle()

        // Éligibilité : compte actif uniquement. La complétude de profil NE
        // conditionne PAS la distribution (décision du 20/08/2026) : un
        // profil incomplet ne peut pas candidater, mais il reçoit les
        // annonces, avec un appel à compléter son profil dans l'email.
        if (!profile
            || profile.account_status !== 'active'
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
          // Sans email, la ligne ne pourra jamais partir : on la sort de la
          // file plutôt que de la laisser tourner indéfiniment en `queued`.
          await markSkipped(supabase, rows.map(r => r.id), 'auth_email_missing', body.dry_run)
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
        // Le passage de rattrapage saute ce contrôle, par décision explicite.
        if (!body.manual && !body.catchup) {
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

        // 2e. Profil gardien complet pour le moteur unique.
        const { data: sitterRow } = await supabase
          .from('sitter_profiles')
          .select(SITTER_AFFINITY_COLUMNS)
          .eq('user_id', sitterId)
          .maybeSingle()
        if (!sitterRow) {
          await markSkipped(supabase, rows.map(r => r.id), 'sitter_profile_missing', body.dry_run)
          sittersSkipped++
          continue
        }

        // 2f. Score par annonce via le moteur unique partagé, mode
        // distribution : seuls les refus explicitement déclarés par le
        // gardien excluent (distributable=false), jamais un score bas.
        const scoredRows: Array<{ row: QueueRow; score: number; sit: SitRow }> = []
        for (const q of rows) {
          let sit = sitCache.get(q.sit_id) as SitRow | undefined
          if (!sit) {
            const { data } = await supabase
              .from('sits')
              .select('id, title, city, start_date, end_date, cover_photo_url, user_id, status, accepting_applications, unpublished_at, accepts_sitter_pets, accepts_sitter_children')
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

          let ownerInput = ownerInputCache.get(sit.user_id)
          if (!ownerInput) {
            ownerInput = await loadOwnerInput(sit)
            ownerInputCache.set(sit.user_id, ownerInput)
          }

          const result = computeAffinityResultFull(ownerInput as any, sitterRow as any, { mode: 'distribution' })
          if (!result.distributable) {
            await markSkipped(supabase, [q.id], 'declared_refusal', body.dry_run)
            continue
          }
          scoredRows.push({ row: q, score: result.score, sit })
        }

        if (scoredRows.length === 0) {
          // Aucune annonce diffusable : toutes les lignes restantes de ce
          // gardien sont soldées, sinon elles restent en file pour toujours.
          await markSkipped(supabase, rows.map(r => r.id), 'no_distributable_sit', body.dry_run)
          sittersSkipped++
          continue
        }

        // 2g. Tri : score moteur unique DESC, distance ASC.
        scoredRows.sort((a, b) => {
          if (a.score !== b.score) return b.score - a.score
          const aDist = a.row.distance_km ?? Number.POSITIVE_INFINITY
          const bDist = b.row.distance_km ?? Number.POSITIVE_INFINITY
          return aDist - bDist
        })

        const top3 = scoredRows.slice(0, 3)
        const overflow = scoredRows.slice(3)

        // 2h. Construit les items du gabarit
        const items: any[] = []
        for (const s of top3) {
          const sit = s.sit

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
            const sp = p?.species
            if (!sp) continue
            speciesCounts[sp] = (speciesCounts[sp] ?? 0) + 1
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
            affinityScore: s.score,
            affinityTotal: null,
            distanceKm: s.row.distance_km,
          })
        }

        if (items.length === 0) {
          // Aucune annonce diffusable : toutes les lignes restantes de ce
          // gardien sont soldées, sinon elles restent en file pour toujours.
          await markSkipped(supabase, rows.map(r => r.id), 'no_available_sit', body.dry_run)
          sittersSkipped++
          continue
        }

        plan.push({
          sitter_id: sitterId,
          recipient_email: email,
          sitter_first_name: profile.first_name ?? null,
          subject: buildSubject(items.length, !!body.catchup),
          sits: items.map(i => i.sitId),
          sit_titles: items.map(i => i.sitTitle),
          skipped: overflow.map(o => o.row.sit_id),
        } as any)

        if (body.dry_run) {
          continue
        }

        // 2f bis. Idempotence inter-pipelines : réservation posée seulement
        // ici, une fois le contenu établi et le gardien éligible. En cas de
        // refus, les lignes restent `queued` pour un passage ultérieur. Le
        // mode manuel (action admin délibérée) n'est pas soumis à la garde.
        if (!body.manual && !body.catchup) {
          const claim = await claimSitNotification(
            supabase,
            sitterId,
            'sitter-daily-digest',
            items.map((i: any) => i.sitId),
          )
          if (!claim.granted) {
            claimSkipped++
            const key = claim.heldBy ?? (claim.error ? 'claim_error' : 'inconnu')
            claimSkippedBy[key] = (claimSkippedBy[key] ?? 0) + 1
            // Filet anti file bloquée : une réservation refusée fait
            // repasser la ligne au lendemain, mais au delà de 48 heures la
            // ligne ne partira jamais, on la solde explicitement.
            const staleCutoff = Date.now() - 48 * 60 * 60 * 1000
            const staleRows = rows.filter(r => {
              const t = (r as any).queued_at ? new Date((r as any).queued_at).getTime() : Date.now()
              return t < staleCutoff
            })
            if (staleRows.length > 0) {
              const reason = `claim_blocked_stale_${key}`.slice(0, 60)
              await markSkipped(supabase, staleRows.map(r => r.id), reason, body.dry_run)
              // Une ligne soldée faute de créneau est une perte de diffusion :
              // elle sort de la file mais reste visible en signal admin.
              staleSolded.push(...staleRows.map(r => r.id))
              staleReason = reason
            }
            continue
          }
          claimGranted++
        }

        // 2g bis. CTA selon complétude : sous 60 %, le gardien ne peut pas
        // candidater (useAccessLevel niveau 1). Mêmes annonces, même ordre,
        // seul l'appel à l'action change, avec le pourcentage actuel et le
        // manque principal chiffré (MÊME fonction de calcul que le bloc
        // dashboard gardien, une seule source).
        const profileCompletion = profile.profile_completion ?? 0
        const canApply = profileCompletion >= 60
        let completionHint: string | undefined
        if (!canApply) {
          const { data: missing } = await supabase.rpc('sitter_missing_opportunities', { _sitter_id: sitterId })
          const hint = pickMissingOpportunities(missing as MissingOpportunitiesStats | null, 1)[0]
          completionHint = hint?.sentence
        }

        // 2h. Envoi digest
        const idemBase = body.catchup
          ? `sitter-digest-catchup-2026-08-05-${sitterId}`
          : body.manual
            ? `sitter-digest-${sitterId}-${Date.now()}`
            : `sitter-digest-${sitterId}-${today}`

        const _steRes = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-transactional-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
          body: JSON.stringify({
            templateName: 'sitter-daily-digest',
            recipientEmail: email,
            idempotencyKey: idemBase,
            templateData: {
              sitterFirstName: profile.first_name ?? undefined,
              items,
              isCatchup: !!body.catchup,
              canApply,
              profileCompletion,
              completionHint,
            },
          }),
        });
        const _steTxt1 = _steRes.ok ? '' : await _steRes.text().catch(() => '');
        if (!_steRes.ok) console.error('send-transactional-email failed', _steRes.status, _steTxt1);
        const sendErr = _steRes.ok ? null : new Error(`send-transactional-email ${_steRes.status}: ${_steTxt1}`);

        if (sendErr) {
          // Trace persistante : code HTTP et corps de réponse, jamais un
          // simple console.error.
          await recordDeliveryFailure(supabase, {
            templateName: 'sitter-daily-digest',
            recipientEmail: email,
            recipientId: sitterId,
            entityType: 'user',
            entityId: sitterId,
            source: 'send-sitter-daily-digest',
            errorMessage: `HTTP ${_steRes.status}: ${_steTxt1.slice(0, 500)}`,
            extra: { http_status: _steRes.status, response_body: _steTxt1.slice(0, 1000), idempotency_key: idemBase },
          })
          if (!body.manual) await releaseSitNotification(supabase, sitterId, 'send_failed')
          // La file ne reste pas nue en `queued` : elle porte le motif du
          // report, la ligne sera reprise au passage suivant.
          if (!body.dry_run) {
            await supabase
              .from('sitter_digest_queue')
              .update({ skip_reason: `deferred_retry:http_${_steRes.status}` })
              .in('id', top3.map(s => s.row.id))
          }
          errors.push({ sitter_id: sitterId, reason: `send_failed: ${String(sendErr)}` })
          continue
        }

        // 2h. Mise à jour queue : top → sent, overflow → skipped
        const sentIds = top3
          .filter(s => items.find(i => i.sitId === s.sit.id))
          .map(s => s.row.id)

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
            .in('id', overflow.map(o => o.row.id))
        }

        sittersSent++
      } catch (loopErr) {
        errors.push({ sitter_id: sitterId, reason: String(loopErr) })
      }
    }

    await raiseClaimErrorSignal(supabase, 'sitter-daily-digest', claimSkippedBy.claim_error ?? 0)
    await reportClaimOutcome(supabase, 'sitter-daily-digest', claimGranted, claimSkipped, claimSkippedBy)
    if (!body.dry_run && staleSolded.length > 0) {
      await raiseStaleClaimSignal(supabase, 'sitter-daily-digest', staleReason, staleSolded)
    }

    if (body.catchup && !body.dry_run) {
      await supabase
        .from('cron_run_log')
        .update({
          finished_at: new Date().toISOString(),
          status: errors.length > 0 ? 'partial' : 'success',
          metrics: { sitters_sent: sittersSent, sitters_skipped: sittersSkipped, plan },
        })
        .eq('edge_name', CATCHUP_TAG)
    }

    await nominalRun?.finish(errors.length > 0 ? 'partial' : 'success', {
      sitters_processed: bySitter.size,
      sitters_sent: sittersSent,
      sitters_skipped: sittersSkipped,
      claim_granted: claimGranted,
      claim_skipped: claimSkipped,
      claim_skipped_by: claimSkippedBy,
      errors,
    })

    return json({
      ok: true,
      catchup: !!body.catchup,
      sitters_processed: bySitter.size,
      sitters_sent: sittersSent,
      sitters_skipped: sittersSkipped,
      claim_skipped: claimSkipped,
      claim_skipped_by: claimSkippedBy,
      errors,
      dry_run: !!body.dry_run,
      plan: body.dry_run ? plan : undefined,
    })
  } catch (err) {
    console.error('send-sitter-daily-digest fatal', err)
    await nominalRun?.fail(err)
    return json({ error: String(err) }, 500)
  }
})

function buildSubject(count: number, isCatchup: boolean): string {
  if (count === 0) return 'Votre digest Guardiens'
  if (isCatchup) {
    return count === 1
      ? 'Rappel, une annonce publiée ces derniers jours vous correspond'
      : `Rappel, ${count} annonces publiées ces derniers jours vous correspondent`
  }
  return count === 1
    ? 'Une annonce qui vous correspond aujourd\'hui'
    : `${count} annonces qui vous correspondent aujourd'hui`
}


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
