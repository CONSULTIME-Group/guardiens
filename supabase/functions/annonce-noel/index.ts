/**
 * annonce-noel (lot V1, email de Noël v3)
 *
 * Page /annonce-noel/:jeton, sans connexion : quelques questions, une photo,
 * et un brouillon d'annonce préparé côté serveur. La publication passe par la
 * connexion, depuis la fiche de l'annonce (/sits/:id).
 *
 * Modes (POST, corps JSON { token, mode, ... }) :
 *  - peek       : état de la page ;
 *  - property   : { type: house | apartment | other }, crée le logement s'il manque ;
 *  - pets       : { pets: [{ kind: dog | cat | other, name? }] } ou { none: true } ;
 *  - dates      : { choice: vacances | noel | nouvel_an } ou { start, end } ;
 *  - photo_url  : URL d'envoi signée dans le dossier du propriétaire ;
 *  - photo_done : { path }, rattache la photo à la galerie, au logement et au brouillon ;
 *  - prepare    : crée ou met à jour le brouillon.
 * Réponse : jamais de coordonnées ni d'email.
 */
import { createClient } from 'npm:@supabase/supabase-js@2'
import { isAccountBlockedForMarketing } from '../_shared/account-email-block.ts'
import { ownerHasPublished } from '../_shared/published-sit.ts'
import { loadOwnerSitterPool, ownerNearbyContext } from '../_shared/owner-nearby.ts'
import {
  cleanPetName,
  isOwnNoelPhotoPath,
  isWellFormedNoelToken,
  NOEL_DATE_OPTIONS,
  NOEL_DEFAULT_DATES,
  NOEL_PET_SPECIES,
  noelDraftText,
  noelDraftTitle,
  noelPhotoPath,
  noelTokenState,
  noelV3Variant,
  validNoelDates,
  type NoelDateChoice,
  type NoelPetChoice,
} from '../_shared/owner-noel-v3.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

const BUCKET = 'property-photos'
const RATE_WINDOW_MINUTES = 10
const RATE_PER_IP = 60
const RATE_PER_TOKEN = 40
const PROPERTY_TYPES: Record<string, string> = { house: 'house', apartment: 'apartment', other: 'other' }
const PHOTO_MAX_BYTES = 5 * 1024 * 1024
const PHOTO_MIME = new Set(['image/jpeg', 'image/png', 'image/webp'])
const POOL_TTL_MS = 10 * 60 * 1000
let poolCache: { at: number; pool: Awaited<ReturnType<typeof loadOwnerSitterPool>> } | null = null

/** Vivier gardien gardé 10 minutes dans l'isolat : une lecture complète par visite évitée. */
async function sitterPool(service: Client) {
  if (poolCache && Date.now() - poolCache.at < POOL_TTL_MS) return poolCache.pool
  const pool = await loadOwnerSitterPool(service)
  poolCache = { at: Date.now(), pool }
  return pool
}

// deno-lint-ignore no-explicit-any
type Client = any

async function sha(value: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32)
}

async function hit(service: Client, key: string): Promise<number> {
  const since = new Date(Date.now() - RATE_WINDOW_MINUTES * 60000).toISOString()
  const { data } = await service.from('anon_insert_throttle').select('count').eq('table_name', key).gte('bucket_minute', since)
  const total = (data ?? []).reduce((s: number, r: { count: number }) => s + (r.count ?? 0), 0)
  await service.from('anon_insert_throttle').insert({ table_name: key, bucket_minute: new Date().toISOString(), count: 1 })
  return total
}

const todayParis = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date())

interface TokenRow {
  id: string
  profile_id: string
  expires_at: string
  revoked_at: string | null
  draft_sit_id: string | null
  answers: Record<string, unknown> | null
}

interface Ctx {
  service: Client
  token: TokenRow
  userId: string
}

async function loadProperty(service: Client, userId: string) {
  const { data } = await service.from('properties')
    .select('id, type, photos, cover_photo_url, created_at')
    .eq('user_id', userId).order('created_at', { ascending: false }).limit(1)
  return (data ?? [])[0] ?? null
}

async function loadPets(service: Client, propertyId: string | null) {
  if (!propertyId) return []
  const { data } = await service.from('pets').select('id, name, species').eq('property_id', propertyId)
  return (data ?? []) as Array<{ id: string; name: string | null; species: string | null }>
}

async function photoCount(service: Client, userId: string, property: { photos?: string[] | null; cover_photo_url?: string | null } | null) {
  const { count } = await service.from('owner_gallery').select('id', { count: 'exact', head: true }).eq('user_id', userId)
  return (count ?? 0) + (property?.photos?.length ?? 0) + (property?.cover_photo_url ? 1 : 0)
}

async function firstPhotoUrl(service: Client, userId: string, property: { photos?: string[] | null; cover_photo_url?: string | null } | null) {
  if (property?.cover_photo_url) return property.cover_photo_url
  if (property?.photos?.length) return property.photos[0]
  const { data } = await service.from('owner_gallery').select('photo_url').eq('user_id', userId)
    .order('position', { ascending: true }).order('created_at', { ascending: true }).limit(1)
  return ((data ?? [])[0]?.photo_url as string | undefined) ?? null
}

async function loadDraft(service: Client, ctx: Ctx) {
  if (ctx.token.draft_sit_id) {
    const { data } = await service.from('sits')
      .select('id, user_id, status, published_at, title, start_date, end_date, specific_expectations, cover_photo_url, property_id')
      .eq('id', ctx.token.draft_sit_id).maybeSingle()
    if (data && data.user_id === ctx.userId) return data
  }
  return null
}

/** Brouillon existant du propriétaire, le plus récent, jamais publié. */
async function adoptExistingDraft(service: Client, userId: string) {
  const { data } = await service.from('sits')
    .select('id, user_id, status, published_at, title, start_date, end_date, specific_expectations, cover_photo_url, property_id')
    .eq('user_id', userId).eq('status', 'draft').is('published_at', null)
    .order('created_at', { ascending: false }).limit(1)
  return (data ?? [])[0] ?? null
}

async function saveAnswers(ctx: Ctx, patch: Record<string, unknown>) {
  const answers = { ...(ctx.token.answers ?? {}), ...patch }
  await ctx.service.from('owner_noel_tokens').update({ answers }).eq('id', ctx.token.id)
  ctx.token.answers = answers
}

function chosenDates(ctx: Ctx): { start: string; end: string } {
  const a = (ctx.token.answers ?? {}) as { start?: string; end?: string }
  return validNoelDates(a.start, a.end, todayParis()) ?? { start: NOEL_DEFAULT_DATES.start, end: NOEL_DEFAULT_DATES.end }
}

/** Crée ou met à jour le brouillon. Un texte réécrit par le propriétaire n'est jamais écrasé. */
async function prepareDraft(ctx: Ctx, profile: { city: string | null }) {
  const { service, userId } = ctx
  const property = await loadProperty(service, userId)
  if (!property) return { error: 'property_missing' as const }
  const pets = await loadPets(service, property.id)
  const dates = chosenDates(ctx)
  const named = pets.map((p) => p.name ?? '').filter((n) => n.trim())
  const input = { city: profile.city, petNames: named, hasUnnamedPets: pets.length > named.length, start: dates.start, end: dates.end, propertyType: property.type ?? null }
  const title = noelDraftTitle(input)
  const text = noelDraftText(input)
  const cover = await firstPhotoUrl(service, userId, property)
  const generated = (ctx.token.answers ?? {}).generated as { title?: string; text?: string } | undefined

  let draft = await loadDraft(service, ctx)
  if (!draft) {
    draft = await adoptExistingDraft(service, userId)
    if (draft) {
      // Brouillon du propriétaire : on complète, on ne remplace rien de ce
      // qu'il a écrit. Des dates absentes ou passées prennent celles de Noël
      // (une date passée bloque la publication), un texte court est complété.
      const patch: Record<string, unknown> = {}
      const today = todayParis()
      if (!draft.start_date || !draft.end_date || draft.start_date < today) { patch.start_date = dates.start; patch.end_date = dates.end }
      if (!(draft.title ?? '').trim()) patch.title = title
      const ownText = (draft.specific_expectations ?? '').trim()
      if (ownText.length < 30) patch.specific_expectations = ownText ? `${ownText}\n\n${text}` : text
      if (!draft.cover_photo_url && cover) patch.cover_photo_url = cover
      if (Object.keys(patch).length) {
        const { error } = await service.from('sits').update(patch).eq('id', draft.id).eq('user_id', userId).eq('status', 'draft')
        if (error) return { error: 'draft_update_failed' as const, detail: error.message }
      }
      await service.from('owner_noel_tokens').update({ draft_sit_id: draft.id }).eq('id', ctx.token.id)
      ctx.token.draft_sit_id = draft.id
      // Brouillon adopté : la page ne réécrit plus ni ses textes ni ses dates.
      await saveAnswers(ctx, { generated: { title: null, text: null }, adopted_draft_id: draft.id })
      return { draftId: draft.id as string }
    }
    const { data: created, error } = await service.from('sits').insert({
      user_id: userId,
      property_id: property.id,
      status: 'draft',
      title,
      start_date: dates.start,
      end_date: dates.end,
      flexible_dates: false,
      specific_expectations: text,
      cover_photo_url: cover,
      ...(profile.city ? { city: profile.city } : {}),
    }).select('id').single()
    if (error || !created) return { error: 'draft_create_failed' as const, detail: error?.message }
    await service.from('owner_noel_tokens').update({ draft_sit_id: created.id }).eq('id', ctx.token.id)
    ctx.token.draft_sit_id = created.id
    await saveAnswers(ctx, { generated: { title, text }, created_draft_id: created.id })
    return { draftId: created.id as string }
  }

  if (draft.status !== 'draft') return { draftId: draft.id as string }
  // Brouillon préparé par la page : dates suivies, textes remplacés seulement
  // s'ils sont encore ceux que la page avait écrits. Un brouillon adopté garde
  // ses dates.
  const createdByPage = (ctx.token.answers ?? {}).created_draft_id === draft.id
  const patch: Record<string, unknown> = createdByPage ? { start_date: dates.start, end_date: dates.end } : {}
  if (!draft.title || draft.title === generated?.title) patch.title = title
  if (!draft.specific_expectations || draft.specific_expectations === generated?.text) patch.specific_expectations = text
  if (!draft.cover_photo_url && cover) patch.cover_photo_url = cover
  const { error } = await service.from('sits').update(patch).eq('id', draft.id).eq('user_id', userId).eq('status', 'draft')
  if (error) return { error: 'draft_update_failed' as const, detail: error.message }
  await saveAnswers(ctx, {
    generated: {
      title: patch.title ?? generated?.title ?? null,
      text: patch.specific_expectations ?? generated?.text ?? null,
    },
  })
  return { draftId: draft.id as string }
}

async function statePayload(ctx: Ctx) {
  const { service, userId } = ctx
  const { data: profile } = await service.from('profiles')
    .select('first_name, city, latitude, longitude').eq('id', userId).maybeSingle()
  const property = await loadProperty(service, userId)
  const pets = await loadPets(service, property?.id ?? null)
  const photos = await photoCount(service, userId, property)
  const cover = photos > 0 ? await firstPhotoUrl(service, userId, property) : null
  const published = await ownerHasPublished(service, userId)
  const draft = await loadDraft(service, ctx)
  let nearby: { count: number; label: string | null; sitters: Array<{ id: string; firstName: string; avatarUrl?: string; distanceKm: number }> } | null = null
  try {
    const ctxNear = ownerNearbyContext({
      id: userId,
      city: profile?.city ?? null,
      latitude: profile?.latitude ?? null,
      longitude: profile?.longitude ?? null,
    }, await sitterPool(service))
    nearby = {
      count: ctxNear.count,
      label: ctxNear.label,
      sitters: ctxNear.cards.map((c) => ({ id: c.id, firstName: c.first_name, ...(c.avatar_url ? { avatarUrl: c.avatar_url } : {}), distanceKm: c.distance_km })),
    }
  } catch (e) {
    console.warn('[annonce-noel] nearby failed', e)
  }
  const answers = (ctx.token.answers ?? {}) as { pets_answered?: boolean; flow?: string; start?: string }
  return {
    ok: true,
    state: 'valid',
    first_name: (profile?.first_name ?? '').trim(),
    city: (profile?.city ?? '').trim() || null,
    has_city: !!(profile?.city ?? '').trim(),
    variant: noelV3Variant({ hasProperty: !!property, photoCount: photos }),
    has_property: !!property,
    property_type: property?.type ?? null,
    pets: pets.map((p) => ({ name: p.name, species: p.species })),
    pets_answered: answers.pets_answered === true || pets.length > 0,
    dates: chosenDates(ctx),
    dates_answered: typeof answers.start === 'string',
    questions: answers.flow === 'questions',
    photo_count: photos,
    photo_url: cover,
    published,
    draft: draft ? {
      id: draft.id,
      status: draft.status,
      title: draft.title,
      start_date: draft.start_date,
      end_date: draft.end_date,
      text: draft.specific_expectations,
      cover_photo_url: draft.cover_photo_url,
    } : null,
    nearby,
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  try {
    const service = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
    const body = await req.json().catch(() => ({}))
    const rawToken = typeof body?.token === 'string' ? body.token.trim() : ''
    const mode = typeof body?.mode === 'string' ? body.mode : 'peek'

    const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown'
    if (await hit(service, `annonce-noel:ip:${await sha(ip)}`) >= RATE_PER_IP) return json({ ok: false, reason: 'rate_limited' }, 429)
    if (!isWellFormedNoelToken(rawToken)) return json({ ok: false, state: 'invalid' })
    if (await hit(service, `annonce-noel:tok:${await sha(rawToken)}`) >= RATE_PER_TOKEN) return json({ ok: false, reason: 'rate_limited' }, 429)

    const { data: row } = await service.from('owner_noel_tokens')
      .select('id, profile_id, expires_at, revoked_at, draft_sit_id, answers').eq('token', rawToken).maybeSingle()
    const tokenState = noelTokenState(row)
    if (tokenState !== 'valid') return json({ ok: false, state: tokenState })
    const token = row as TokenRow
    const userId = token.profile_id

    const { data: account } = await service.from('profiles')
      .select('account_status, suspended_at, suspended_until, city').eq('id', userId).maybeSingle()
    if (!account || isAccountBlockedForMarketing(account)) return json({ ok: false, state: 'invalid' })

    const ctx: Ctx = { service, token, userId }
    if (!token.answers) token.answers = {}
    await service.from('owner_noel_tokens').update({ used_at: new Date().toISOString() }).eq('id', token.id).is('used_at', null)

    if (mode === 'property') {
      const type = PROPERTY_TYPES[String(body?.type ?? '')]
      if (!type) return json({ ok: false, reason: 'invalid_type' }, 400)
      const existing = await loadProperty(service, userId)
      if (!existing) {
        const { error } = await service.from('properties').insert({ user_id: userId, type })
        if (error) return json({ ok: false, reason: 'property_failed' }, 500)
        // Logement créé par la page : les questions (animaux, dates) suivent.
        await saveAnswers(ctx, { flow: 'questions' })
      }
    } else if ((mode === 'pets' || mode === 'dates') && (token.answers as { flow?: string }).flow !== 'questions') {
      // Questions réservées au logement décrit par la page : un brouillon déjà
      // écrit par le propriétaire ne change pas de dates par ce lien.
      return json({ ok: false, reason: 'questions_closed' }, 409)
    } else if (mode === 'pets') {
      const property = await loadProperty(service, userId)
      if (!property) return json({ ok: false, reason: 'property_missing' }, 400)
      if (body?.none === true) {
        await saveAnswers(ctx, { pets_answered: true })
      } else {
        const list = Array.isArray(body?.pets) ? body.pets.slice(0, 6) : []
        const rows: Array<{ property_id: string; species: string; name: string | null }> = []
        for (const p of list) {
          const kind = String((p as { kind?: string })?.kind ?? '') as NoelPetChoice
          const species = NOEL_PET_SPECIES[kind]
          if (!species) continue
          // pets.name est NOT NULL (défaut '') : un prénom absent reste vide.
          rows.push({ property_id: property.id, species, name: cleanPetName((p as { name?: string })?.name) ?? '' })
        }
        if (rows.length === 0) return json({ ok: false, reason: 'invalid_pets' }, 400)
        const existing = await loadPets(service, property.id)
        if (existing.length === 0) {
          const { error } = await service.from('pets').insert(rows)
          if (error) return json({ ok: false, reason: 'pets_failed' }, 500)
        }
        await saveAnswers(ctx, { pets_answered: true })
      }
    } else if (mode === 'dates') {
      const choice = String(body?.choice ?? '') as NoelDateChoice
      const preset = (NOEL_DATE_OPTIONS as Record<string, { start: string; end: string }>)[choice]
      const dates = preset
        ? validNoelDates(preset.start, preset.end, todayParis())
        : validNoelDates(body?.start, body?.end, todayParis())
      if (!dates) return json({ ok: false, reason: 'invalid_dates' }, 400)
      await saveAnswers(ctx, { start: dates.start, end: dates.end })
      if (token.draft_sit_id) {
        const r = await prepareDraft(ctx, { city: account.city ?? null })
        if ('error' in r) return json({ ok: false, reason: r.error }, 500)
      }
    } else if (mode === 'photo_url') {
      const ext = String(body?.ext ?? 'jpg')
      const path = noelPhotoPath(userId, Date.now(), crypto.randomUUID().replace(/-/g, ''), ext)
      const { data, error } = await service.storage.from(BUCKET).createSignedUploadUrl(path)
      if (error || !data) return json({ ok: false, reason: 'upload_url_failed' }, 500)
      return json({ ok: true, path: data.path ?? path, upload_token: data.token })
    } else if (mode === 'photo_done') {
      const path = body?.path
      if (!isOwnNoelPhotoPath(userId, path)) return json({ ok: false, reason: 'invalid_path' }, 400)
      const folder = path.slice(0, path.lastIndexOf('/'))
      const file = path.slice(path.lastIndexOf('/') + 1)
      const { data: listed, error: listErr } = await service.storage.from(BUCKET).list(folder, { search: file, limit: 1 })
      const object = (listed ?? []).find((o: { name: string }) => o.name === file) as { metadata?: { mimetype?: string; size?: number } } | undefined
      if (listErr || !object) return json({ ok: false, reason: 'photo_missing' }, 400)
      const mime = String(object.metadata?.mimetype ?? '').toLowerCase()
      const size = Number(object.metadata?.size ?? 0)
      if (!PHOTO_MIME.has(mime) || !(size > 0) || size > PHOTO_MAX_BYTES) {
        await service.storage.from(BUCKET).remove([path])
        return json({ ok: false, reason: 'photo_invalid' }, 400)
      }
      const url = service.storage.from(BUCKET).getPublicUrl(path).data.publicUrl as string
      const { data: already } = await service.from('owner_gallery').select('id').eq('user_id', userId).eq('photo_url', url).limit(1)
      if (!(already ?? []).length) {
        const { data: last } = await service.from('owner_gallery').select('position').eq('user_id', userId)
          .order('position', { ascending: false }).limit(1)
        const position = (((last ?? [])[0]?.position as number | null) ?? -1) + 1
        const { error: gErr } = await service.from('owner_gallery').insert({
          user_id: userId, photo_url: url, caption: '', category: 'home_life', season: null, position,
        })
        if (gErr) return json({ ok: false, reason: 'gallery_failed' }, 500)
      }
      // Logement : la photo rejoint ses photos, et sa couverture si elle manque.
      const property = await loadProperty(service, userId)
      if (property) {
        const photos = Array.isArray(property.photos) ? property.photos : []
        if (!photos.includes(url)) {
          const patch: Record<string, unknown> = { photos: [...photos, url] }
          if (!property.cover_photo_url) patch.cover_photo_url = url
          const { error: pErr } = await service.from('properties').update(patch).eq('id', property.id)
          if (pErr) console.error('[annonce-noel] property photo failed', pErr.message)
        }
      }
      const draft = await loadDraft(service, ctx)
      if (draft && draft.status === 'draft' && !draft.cover_photo_url) {
        await service.from('sits').update({ cover_photo_url: url }).eq('id', draft.id).eq('user_id', userId).eq('status', 'draft')
      }
    } else if (mode === 'prepare') {
      if (await ownerHasPublished(service, userId)) return json(await statePayload(ctx))
      const r = await prepareDraft(ctx, { city: account.city ?? null })
      if ('error' in r) return json({ ok: false, reason: r.error }, r.error === 'property_missing' ? 400 : 500)
    } else if (mode !== 'peek') {
      return json({ ok: false, reason: 'invalid_mode' }, 400)
    }

    return json(await statePayload(ctx))
  } catch (e) {
    console.error('[annonce-noel] unexpected', e)
    return json({ ok: false, reason: 'error' }, 500)
  }
})
