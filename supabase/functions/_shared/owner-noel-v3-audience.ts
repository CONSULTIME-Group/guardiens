// Email de Noël v3 (lot V1, 14/10/2026) : audience et données par
// destinataire, lectures et écritures (client service). La logique pure vit
// dans owner-noel-v3.ts.
//
// Audience : propriétaires jamais publiés (published_at, lot W0), témoin owner
// v2 exclu (10 %), réponse de départ lointaine récente exclue (printemps, été,
// plus tard, moins de 30 jours, règle W0), un seul email de Noël par personne
// (owner-noel-2026 ou une variante v3 déjà partie), garde-fou de pression.
// Aucune coordonnée ne sort de ce module.

import { isOwnerV2Holdout } from './owner-departure-logic.ts'
import { mintDepartureTokens, periodBaseUrl } from './owner-departure-audience.ts'
import { emailLookupVariants, isUnderPressure } from './owner-campaign-pressure.ts'
import { departureHoldsPublishAsk, lastHumanAnswer, type DepartureAnswer } from './owner-sequence-rules.ts'
import { loadOwnerSitterPool, ownerNearbyContext, type SitterRow } from './owner-nearby.ts'
import {
  buildNoelV3EmailData,
  NOEL_EMAIL_GROUP,
  NOEL_V3_TEMPLATES,
  NOEL_V3_TOKEN_CAMPAIGN,
  NOEL_V3_TOKEN_DAYS,
  type NoelV3EmailData,
} from './owner-noel-v3.ts'

// deno-lint-ignore no-explicit-any
type Client = any
const IN_CHUNK = 150
const PAGE = 1000

/** Statuts qui valent réception (ou réception à venir). */
export const NOEL_RECEIVED_STATUSES: readonly string[] = ['sent', 'pending', 'deferred']

export interface NoelV3Split<T> {
  rows: T[]
  holdoutExcluded: number
  departureHoldExcluded: number
  alreadyReceived: number
  pressureExcluded: number
}

/** Répartition pure : témoin, réponse de départ lointaine, déjà reçu un email de Noël, pression. */
export function splitNoelV3Audience<T extends { id: string; email?: string | null }>(
  rows: T[],
  opts: { holds: Set<string>; received: Set<string>; recentCounts?: Map<string, number> },
): NoelV3Split<T> {
  let holdoutExcluded = 0, departureHoldExcluded = 0, alreadyReceived = 0, pressureExcluded = 0
  const kept: T[] = []
  for (const r of rows) {
    if (isOwnerV2Holdout(r.id)) { holdoutExcluded++; continue }
    if (opts.holds.has(r.id)) { departureHoldExcluded++; continue }
    if (opts.received.has((r.email ?? '').trim().toLowerCase())) { alreadyReceived++; continue }
    if (opts.recentCounts && isUnderPressure(opts.recentCounts, r.email)) { pressureExcluded++; continue }
    kept.push(r)
  }
  return { rows: kept, holdoutExcluded, departureHoldExcluded, alreadyReceived, pressureExcluded }
}

/** Profils dont la dernière réponse de départ suspend les demandes de publication. Lève une erreur si la lecture échoue. */
export async function loadDepartureHolds(client: Client, ids: string[], now = new Date()): Promise<Set<string>> {
  const byUser = new Map<string, DepartureAnswer[]>()
  for (let i = 0; i < ids.length; i += IN_CHUNK) {
    const { data, error } = await client.from('owner_departure_intents')
      .select('user_id, period, answered_at, source')
      .in('user_id', ids.slice(i, i + IN_CHUNK))
      .neq('source', 'scanner_suspect')
    if (error) throw new Error(`owner_departure_intents lookup failed: ${error.message}`)
    for (const r of (data ?? []) as Array<DepartureAnswer & { user_id: string }>) {
      const list = byUser.get(r.user_id) ?? []
      list.push(r)
      byUser.set(r.user_id, list)
    }
  }
  const out = new Set<string>()
  for (const [id, list] of byUser) if (departureHoldsPublishAsk(lastHumanAnswer(list), now)) out.add(id)
  return out
}

/** Adresses (minuscules) ayant déjà reçu un des gabarits donnés. Lève une erreur si la lecture échoue. */
export async function loadReceivedTemplates(client: Client, emails: string[], templates: readonly string[] = NOEL_EMAIL_GROUP): Promise<Set<string>> {
  const list = emailLookupVariants(emails)
  const out = new Set<string>()
  for (let i = 0; i < list.length; i += IN_CHUNK) {
    const chunk = list.slice(i, i + IN_CHUNK)
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await client.from('email_send_log')
        .select('recipient_email')
        .in('template_name', [...templates])
        .in('recipient_email', chunk)
        .in('status', [...NOEL_RECEIVED_STATUSES])
        .order('id', { ascending: true })
        .range(from, from + PAGE - 1)
      if (error) throw new Error(`email_send_log lookup failed: ${error.message}`)
      for (const r of data ?? []) out.add(String((r as { recipient_email: string }).recipient_email ?? '').toLowerCase())
      if (!data || data.length < PAGE) break
    }
  }
  return out
}

/**
 * Envoi saisonnier de Noël déjà parti (seasonal-nurture, période noel*) :
 * l'autre moitié de « un seul email de Noël ». Lève une erreur si la lecture échoue.
 */
export async function loadSeasonalNoelReceived(client: Client, emails: string[]): Promise<Set<string>> {
  const list = emailLookupVariants(emails)
  const out = new Set<string>()
  for (let i = 0; i < list.length; i += IN_CHUNK) {
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await client.from('email_send_log')
        .select('recipient_email')
        .eq('template_name', 'seasonal-nurture')
        .like('metadata->>period_key', 'noel%')
        .in('recipient_email', list.slice(i, i + IN_CHUNK))
        .in('status', [...NOEL_RECEIVED_STATUSES])
        .order('id', { ascending: true })
        .range(from, from + PAGE - 1)
      if (error) throw new Error(`seasonal noel lookup failed: ${error.message}`)
      for (const r of data ?? []) out.add(String((r as { recipient_email: string }).recipient_email ?? '').toLowerCase())
      if (!data || data.length < PAGE) break
    }
  }
  return out
}

/** Relance J+3 : ouvreurs sans clic d'une campagne v3, page à jeton jamais ouverte. */
export interface RelanceSendRow { recipient_email: string | null; status: string | null; first_opened_at: string | null; first_clicked_at: string | null }

export function relanceTargets(sends: RelanceSendRow[], pageUsers: Set<string>, emailToId: Map<string, string>): Set<string> {
  const out = new Set<string>()
  for (const s of sends) {
    const e = (s.recipient_email ?? '').trim().toLowerCase()
    if (!e || !s.first_opened_at || s.first_clicked_at) continue
    if (['skipped', 'suppressed', 'failed', 'cancelled', 'queued'].includes(s.status ?? '')) continue
    const id = emailToId.get(e)
    if (id && pageUsers.has(id)) continue
    out.add(e)
  }
  return out
}

/** Lecture des envois d'une campagne et des jetons utilisés. */
export async function loadRelanceTargets(client: Client, massEmailId: string, emailToId: Map<string, string>): Promise<Set<string>> {
  const sends: RelanceSendRow[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await client.from('mass_email_sends')
      .select('recipient_email, status, first_opened_at, first_clicked_at')
      .eq('mass_email_id', massEmailId)
      .order('id', { ascending: true }).range(from, from + PAGE - 1)
    if (error) throw new Error(`relance sends lookup failed: ${error.message}`)
    sends.push(...((data ?? []) as RelanceSendRow[]))
    if (!data || data.length < PAGE) break
  }
  const pageUsers = new Set<string>()
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await client.from('owner_noel_tokens')
      .select('profile_id').eq('campaign', NOEL_V3_TOKEN_CAMPAIGN).not('used_at', 'is', null)
      .order('id', { ascending: true }).range(from, from + PAGE - 1)
    if (error) throw new Error(`noel tokens lookup failed: ${error.message}`)
    for (const r of data ?? []) pageUsers.add((r as { profile_id: string }).profile_id)
    if (!data || data.length < PAGE) break
  }
  return relanceTargets(sends, pageUsers, emailToId)
}

/** Délai minimal entre l'envoi J0 et la relance. */
export const NOEL_V3_RELANCE_MIN_HOURS = 72

export function relanceTooEarly(campaignCreatedAt: string | null | undefined, now = new Date()): boolean {
  if (!campaignCreatedAt) return true
  const t = new Date(campaignCreatedAt).getTime()
  return !Number.isFinite(t) || now.getTime() - t < NOEL_V3_RELANCE_MIN_HOURS * 3600_000
}

function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Jeton de la page /annonce-noel : jeton actif réutilisé (au moins 7 jours
 * de validité restants), sinon créé pour 30 jours. Renvoie profil vers jeton.
 */
export async function mintNoelV3Tokens(client: Client, profileIds: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  const ids = [...new Set(profileIds)]
  const minExpiry = new Date(Date.now() + 7 * 86400000).toISOString()
  for (let i = 0; i < ids.length; i += IN_CHUNK) {
    const { data, error } = await client.from('owner_noel_tokens').select('profile_id, token')
      .eq('campaign', NOEL_V3_TOKEN_CAMPAIGN)
      .in('profile_id', ids.slice(i, i + IN_CHUNK)).is('revoked_at', null).gt('expires_at', minExpiry)
    if (error) throw new Error(`noel token lookup failed: ${error.message}`)
    for (const r of data ?? []) out.set(r.profile_id as string, r.token as string)
  }
  const expires = new Date(Date.now() + NOEL_V3_TOKEN_DAYS * 86400000).toISOString()
  const rows: Array<{ token: string; profile_id: string; expires_at: string; campaign: string }> = []
  for (const id of ids) {
    if (out.has(id)) continue
    const token = generateToken()
    out.set(id, token)
    rows.push({ token, profile_id: id, expires_at: expires, campaign: NOEL_V3_TOKEN_CAMPAIGN })
  }
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await client.from('owner_noel_tokens').insert(rows.slice(i, i + 500))
    if (error) throw new Error(`noel token mint failed: ${error.message}`)
  }
  return out
}

async function pageIn<T>(client: Client, table: string, select: string, column: string, ids: string[], extra?: (q: any) => any): Promise<T[]> {
  const out: T[] = []
  for (let i = 0; i < ids.length; i += IN_CHUNK) {
    for (let from = 0; ; from += PAGE) {
      let q = client.from(table).select(select).in(column, ids.slice(i, i + IN_CHUNK))
      if (extra) q = extra(q)
      const { data, error } = await q.order('id', { ascending: true }).range(from, from + PAGE - 1)
      if (error) throw new Error(`${table} lookup failed: ${error.message}`)
      out.push(...((data ?? []) as T[]))
      if (!data || data.length < PAGE) break
    }
  }
  return out
}

interface ProfileRow { id: string; first_name: string | null; city: string | null; latitude: number | null; longitude: number | null }
interface PropertyRow { id: string; user_id: string; type: string | null; photos: string[] | null; cover_photo_url: string | null; created_at: string }
interface PetRow { id: string; property_id: string; name: string | null }
interface GalleryRow { id: string; user_id: string; photo_url: string | null; position: number | null }
interface DraftRow { id: string; user_id: string; title: string | null; start_date: string | null; end_date: string | null; created_at: string }

/** Ce qu'un propriétaire a déjà renseigné, lu en lot. */
export interface OwnerNoelFacts {
  profile: ProfileRow
  property: PropertyRow | null
  petNames: string[]
  photoCount: number
  photoUrl: string | null
  draftTitle: string | null
  draftDates: { start: string | null; end: string | null } | null
}

export async function loadOwnerNoelFacts(client: Client, ids: string[]): Promise<Map<string, OwnerNoelFacts>> {
  const profiles = await pageIn<ProfileRow>(client, 'profiles', 'id, first_name, city, latitude, longitude', 'id', ids)
  const properties = await pageIn<PropertyRow>(client, 'properties', 'id, user_id, type, photos, cover_photo_url, created_at', 'user_id', ids)
  const latest = new Map<string, PropertyRow>()
  for (const p of properties) {
    const cur = latest.get(p.user_id)
    if (!cur || p.created_at > cur.created_at) latest.set(p.user_id, p)
  }
  const propIds = [...latest.values()].map((p) => p.id)
  const pets = propIds.length ? await pageIn<PetRow>(client, 'pets', 'id, property_id, name', 'property_id', propIds) : []
  const gallery = await pageIn<GalleryRow>(client, 'owner_gallery', 'id, user_id, photo_url, position', 'user_id', ids)
  const drafts = await pageIn<DraftRow>(client, 'sits', 'id, user_id, title, start_date, end_date, created_at', 'user_id', ids,
    (q) => q.eq('status', 'draft').is('published_at', null))
  const petsByProp = new Map<string, string[]>()
  for (const p of pets) {
    const n = (p.name ?? '').trim()
    if (!n) continue
    petsByProp.set(p.property_id, [...(petsByProp.get(p.property_id) ?? []), n])
  }
  const galleryByUser = new Map<string, GalleryRow[]>()
  for (const g of gallery) galleryByUser.set(g.user_id, [...(galleryByUser.get(g.user_id) ?? []), g])
  const draftByUser = new Map<string, DraftRow>()
  for (const d of drafts) {
    const cur = draftByUser.get(d.user_id)
    if (!cur || d.created_at > cur.created_at) draftByUser.set(d.user_id, d)
  }
  const out = new Map<string, OwnerNoelFacts>()
  for (const profile of profiles) {
    const property = latest.get(profile.id) ?? null
    const g = (galleryByUser.get(profile.id) ?? []).sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    const propPhotos = Array.isArray(property?.photos) ? property!.photos!.filter(Boolean) : []
    const photoUrl = (property?.cover_photo_url || propPhotos[0] || g[0]?.photo_url || null) as string | null
    out.set(profile.id, {
      profile,
      property,
      petNames: property ? (petsByProp.get(property.id) ?? []) : [],
      photoCount: g.length + propPhotos.length + (property?.cover_photo_url ? 1 : 0),
      photoUrl,
      draftTitle: (draftByUser.get(profile.id)?.title ?? '').trim() || null,
      draftDates: draftByUser.has(profile.id)
        ? { start: draftByUser.get(profile.id)!.start_date, end: draftByUser.get(profile.id)!.end_date }
        : null,
    })
  }
  return out
}

/**
 * Données de chaque destinataire : jeton de page, jeton de période, gardiens à
 * proximité (vivier W0), ce qui est déjà renseigné. Écrit seulement des jetons.
 */
export async function buildNoelV3DataFor(client: Client, ids: string[], pool?: SitterRow[]): Promise<Map<string, NoelV3EmailData>> {
  const unique = [...new Set(ids)]
  const facts = await loadOwnerNoelFacts(client, unique)
  const sitters = pool ?? await loadOwnerSitterPool(client)
  const pageTokens = await mintNoelV3Tokens(client, unique)
  const periodTokens = await mintDepartureTokens(client, unique)
  const out = new Map<string, NoelV3EmailData>()
  for (const id of unique) {
    const f = facts.get(id)
    const token = pageTokens.get(id)
    if (!f || !token) continue
    const near = ownerNearbyContext({ id, city: f.profile.city, latitude: f.profile.latitude, longitude: f.profile.longitude }, sitters)
    const period = periodTokens.get(id)
    out.set(id, buildNoelV3EmailData({
      firstName: f.profile.first_name,
      city: f.profile.city,
      propertyType: f.property?.type ?? null,
      hasProperty: !!f.property,
      petNames: f.petNames,
      photoCount: f.photoCount,
      photoUrl: f.photoUrl,
      existingDraftTitle: f.draftTitle,
      existingDraftDates: f.draftDates,
      today: new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date()),
      token,
      periodUrl: period ? periodBaseUrl(period) : null,
      nearby: {
        count: near.count,
        label: near.label,
        faces: near.cards.map((c) => ({ id: c.id, firstName: c.first_name, ...(c.avatar_url ? { avatarUrl: c.avatar_url } : {}) })),
      },
    }))
  }
  return out
}

/** Gabarit réel d'un destinataire : variante pour J0, relance pour J+3. */
export function noelV3TemplateFor(data: Pick<NoelV3EmailData, 'variant'>, relance: boolean): string {
  return relance ? 'owner-noel-v3-relance' : NOEL_V3_TEMPLATES[data.variant]
}
