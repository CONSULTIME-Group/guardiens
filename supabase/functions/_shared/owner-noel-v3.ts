// Email de Noël v3, « un email, un geste » (lot V1, 14/10/2026).
//
// Logique pure partagée par send-mass-email (audience et données des
// gabarits), la fonction annonce-noel (page à jeton) et le site
// (src/lib/annonceNoel.ts). Aucune dépendance : importée aussi par Vitest.
//
// Trois gabarits selon ce qui manque au propriétaire jamais publié :
//   - pret     : logement et photo déjà là, l'annonce est à un clic ;
//   - photo    : logement décrit, il manque une photo ;
//   - logement : rien de décrit, trois questions puis une photo.
// Source du découpage : claude/email-noel-v3-cadrage-et-maquettes-14-octobre-2026.md
// (base, 14/10/2026 : 43 prêts, 46 photo, 157 logement).

export type NoelV3Variant = 'pret' | 'photo' | 'logement'

export const NOEL_V3_CAMPAIGN = 'owner-noel-v3'
export const NOEL_V3_TEMPLATES: Record<NoelV3Variant, string> = {
  pret: 'owner-noel-v3-pret',
  photo: 'owner-noel-v3-photo',
  logement: 'owner-noel-v3-logement',
}
/** Relance J+3 : gabarit distinct, l'anti-doublon par gabarit bloquerait un renvoi. */
export const NOEL_V3_RELANCE_TEMPLATE = 'owner-noel-v3-relance'
export const NOEL_V3_RELANCE_CAMPAIGN = 'owner-noel-v3-relance'
export const NOEL_V3_ALL_TEMPLATES: readonly string[] = [
  ...Object.values(NOEL_V3_TEMPLATES),
  NOEL_V3_RELANCE_TEMPLATE,
]
/** « Un seul email de Noël » : ces gabarits s'excluent mutuellement. */
export const NOEL_EMAIL_GROUP: readonly string[] = ['owner-noel-2026', ...Object.values(NOEL_V3_TEMPLATES)]

export const NOEL_V3_TOKEN_DAYS = 30
export const NOEL_V3_TOKEN_CAMPAIGN = 'noel_v3'
export const SITE = 'https://guardiens.fr'

/**
 * Preuve affichée dans les emails et la page. Base du 14/10/2026 : 46
 * annonces sur 63 publiées ont reçu une candidature (73 %), première
 * candidature en 23 heures (médiane). « Près de 3 sur 4 » plutôt que
 * « 3 sur 4 » : 73 % est sous 75 %.
 */
export const NOEL_V3_PROOF =
  'Près de 3 annonces publiées sur 4 reçoivent des candidatures, les premières arrivent en général sous 24 heures.'

export const NOEL_V3_SIGNATURE = 'On lit chaque nouvelle annonce, et on répond à chaque message.'
export const NOEL_V3_FREE_LINE = 'Guardiens est gratuit. Les gardiens vous écrivent, et c\'est vous qui choisissez.'

// ── Classement ───────────────────────────────────────────────────────────────

export interface NoelV3Facts {
  hasProperty: boolean
  /** Photos de la galerie, du logement ou couverture d'un brouillon. */
  photoCount: number
}

/** Gabarit selon ce qui manque. Sans logement, la photo ne suffit pas. */
export function noelV3Variant(f: NoelV3Facts): NoelV3Variant {
  if (!f.hasProperty) return 'logement'
  return f.photoCount > 0 ? 'pret' : 'photo'
}

// ── Dates proposées ──────────────────────────────────────────────────────────

export type NoelDateChoice = 'vacances' | 'noel' | 'nouvel_an' | 'autres'

export const NOEL_DATE_OPTIONS: Record<Exclude<NoelDateChoice, 'autres'>, { start: string; end: string; label: string }> = {
  vacances: { start: '2026-12-19', end: '2027-01-03', label: 'Toutes les vacances, du 19 décembre au 3 janvier' },
  noel: { start: '2026-12-20', end: '2026-12-27', label: 'Noël, du 20 au 27 décembre' },
  nouvel_an: { start: '2026-12-26', end: '2027-01-02', label: 'Le Nouvel An, du 26 décembre au 2 janvier' },
}
export const NOEL_DEFAULT_DATES = NOEL_DATE_OPTIONS.vacances

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/** Dates valides : format AAAA-MM-JJ, début à partir d'aujourd'hui, fin après le début, 120 jours au plus. */
export function validNoelDates(start: unknown, end: unknown, today: string): { start: string; end: string } | null {
  if (typeof start !== 'string' || typeof end !== 'string') return null
  if (!ISO_DATE.test(start) || !ISO_DATE.test(end)) return null
  const s = Date.parse(`${start}T00:00:00Z`)
  const e = Date.parse(`${end}T00:00:00Z`)
  if (!Number.isFinite(s) || !Number.isFinite(e)) return null
  if (start < today || end <= start) return null
  if ((e - s) / 86400000 > 120) return null
  return { start, end }
}

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

/** « 19 décembre », « 1er janvier ». */
export function frDay(iso: string): string {
  const [, m, d] = iso.split('-').map((x) => parseInt(x, 10))
  return `${d === 1 ? '1er' : d} ${MONTHS[(m || 1) - 1]}`
}

/** « Du 19 décembre au 3 janvier ». */
export function frRange(start: string, end: string): string {
  return `Du ${frDay(start)} au ${frDay(end)}`
}

// ── Animaux ──────────────────────────────────────────────────────────────────

export type NoelPetChoice = 'dog' | 'cat' | 'other'
export const NOEL_PET_SPECIES: Record<NoelPetChoice, string> = { dog: 'dog', cat: 'cat', other: 'nac' }

/** Première lettre en majuscule, affichage seulement. */
export function capitalizeName(name: string | null | undefined): string {
  const n = (name ?? '').trim()
  return n ? n.charAt(0).toLocaleUpperCase('fr-FR') + n.slice(1) : ''
}

/** « Mila », « Mila et Rex », « Mila, Rex et Nala ». Aucun genre deviné. */
export function petNamesLabel(names: Array<string | null | undefined>): string {
  const n = names.map(capitalizeName).filter(Boolean)
  if (n.length === 0) return ''
  if (n.length === 1) return n[0]
  return `${n.slice(0, -1).join(', ')} et ${n[n.length - 1]}`
}

/** Prénom d'animal accepté : 1 à 40 caractères, lettres, espaces, apostrophes, tirets de mot. */
export function cleanPetName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const n = raw.replace(/\s+/g, ' ').trim()
  if (!n || n.length > 40) return null
  return /^[\p{L}][\p{L}'’ -]*$/u.test(n) ? n : null
}

// ── Brouillon préparé ────────────────────────────────────────────────────────

export interface NoelDraftInput {
  city?: string | null
  petNames: string[]
  /** Des animaux sans prénom connu. */
  hasUnnamedPets?: boolean
  /** Type du logement (house, apartment, ...), pour « ma maison » ou « mon appartement ». */
  propertyType?: string | null
  start: string
  end: string
}

/** Titre : « Garde de Mila pendant les fêtes, à Draveil ». 120 caractères au plus. */
const MY_PLACE: Record<string, string> = {
  house: 'ma maison', apartment: 'mon appartement', farm: 'ma ferme', chalet: 'mon chalet', other: 'mon logement',
}
const THE_PLACE: Record<string, string> = {
  house: 'La maison', apartment: 'L\'appartement', farm: 'La ferme', chalet: 'Le chalet', other: 'Le logement',
}
/** « ma maison », « mon appartement », « ma maison » par défaut. */
export const myPlace = (type?: string | null) => MY_PLACE[(type ?? '').trim()] ?? 'ma maison'

export function noelDraftTitle(d: NoelDraftInput): string {
  const who = petNamesLabel(d.petNames) || (d.hasUnnamedPets ? `mes animaux et ${myPlace(d.propertyType)}` : myPlace(d.propertyType))
  const city = (d.city ?? '').trim()
  const t = `Garde de ${who} pendant les fêtes${city ? `, à ${city}` : ''}`
  return t.length <= 120 ? t : t.slice(0, 120).trim()
}

/**
 * Texte de l'annonce, écrit à partir des réponses, affirmatif, sans genre
 * attribué aux animaux. Plus de 30 caractères (contrainte
 * sits_publiee_exige_description). La rencontre est proposée si les deux le
 * souhaitent, jamais présentée comme une étape.
 */
export function noelDraftText(d: NoelDraftInput): string {
  const range = frRange(d.start, d.end).replace(/^Du/, 'du')
  const names = petNamesLabel(d.petNames)
  const several = d.petNames.filter((x) => capitalizeName(x)).length > 1
  const lines: string[] = [`Départ pour les fêtes de fin d'année, ${range}.`]
  if (names) {
    lines.push(several
      ? `${names} restent à la maison, avec leurs habitudes : la garde consiste à vivre sur place et à prendre soin de ${names} pendant l'absence.`
      : `${names} reste à la maison, avec ses habitudes : la garde consiste à vivre sur place et à prendre soin de ${names} pendant l'absence.`)
  } else if (d.hasUnnamedPets) {
    lines.push('Les animaux restent à la maison, avec leurs habitudes : la garde consiste à vivre sur place et à prendre soin des animaux pendant l\'absence.')
  } else {
    const place = THE_PLACE[(d.propertyType ?? '').trim()] ?? 'La maison'
    lines.push(`${place} reste à garder : la garde consiste à y vivre, à l'entretenir et à relever le courrier pendant l'absence.`)
  }
  lines.push('Les échanges se font sur Guardiens avant de choisir, et une rencontre se propose si les deux le souhaitent.')
  return lines.join(' ')
}

// ── Jeton ────────────────────────────────────────────────────────────────────

export const isWellFormedNoelToken = (t: unknown): t is string =>
  typeof t === 'string' && t.length >= 32 && t.length <= 200 && /^[a-f0-9]+$/i.test(t)

export interface NoelTokenRow { profile_id: string | null; expires_at: string | null; revoked_at: string | null }
export type NoelTokenState = 'valid' | 'expired' | 'revoked' | 'invalid'

export function noelTokenState(row: NoelTokenRow | null, now: Date = new Date()): NoelTokenState {
  if (!row || !row.profile_id) return 'invalid'
  if (row.revoked_at) return 'revoked'
  if (!row.expires_at || new Date(row.expires_at).getTime() <= now.getTime()) return 'expired'
  return 'valid'
}

export const noelPageUrl = (token: string, extra = '') =>
  `${SITE}/annonce-noel/${token}?utm_source=email&utm_medium=email&utm_campaign=owner_noel_v3${extra}`

/** Chemin d'une photo envoyée par la page : dossier du propriétaire, préfixe noel-. */
export function noelPhotoPath(userId: string, stamp: number, rand: string, ext: string): string {
  const e = ['jpg', 'jpeg', 'png', 'webp'].includes(ext.toLowerCase()) ? ext.toLowerCase() : 'jpg'
  return `${userId}/owner-gallery/noel-${stamp}-${rand.replace(/[^a-z0-9]/gi, '').slice(0, 12)}.${e}`
}

/** Un chemin renvoyé par la page n'est accepté que s'il vise le dossier du propriétaire. */
export function isOwnNoelPhotoPath(userId: string, path: unknown): path is string {
  if (typeof path !== 'string') return false
  const prefix = `${userId}/owner-gallery/noel-`
  return path.startsWith(prefix) && /^[a-z0-9-]+\.(jpg|jpeg|png|webp)$/i.test(path.slice(prefix.length)) && !path.includes('..')
}

// ── Gabarits ─────────────────────────────────────────────────────────────────

export const NOEL_V3_SUBJECTS: Record<NoelV3Variant, (firstName: string) => string> = {
  pret: (n) => (n ? `${n}, votre annonce de Noël est à un clic` : 'Votre annonce de Noël est à un clic'),
  photo: (n) => (n ? `${n}, une photo et votre annonce de Noël est prête` : 'Une photo et votre annonce de Noël est prête'),
  logement: () => 'Pour Noël, votre annonce en trois questions',
}

export const NOEL_V3_PREHEADERS: Record<NoelV3Variant, string> = {
  pret: 'Vos dates, votre texte et votre photo sont déjà en place',
  photo: 'Le salon, le jardin ou l\'entrée : une seule suffit',
  logement: 'Maison ou appartement ? Commencez par là',
}

/** Objet de la relance J+3 : nouveau, même contenu. */
export const NOEL_V3_RELANCE_SUBJECTS: Record<NoelV3Variant, (firstName: string) => string> = {
  pret: (n) => (n ? `${n}, votre annonce de Noël vous attend` : 'Votre annonce de Noël vous attend'),
  photo: (n) => (n ? `${n}, il reste une photo pour Noël` : 'Il reste une photo pour Noël'),
  logement: () => 'Noël approche : trois questions et c’est prêt',
}

// ── Données des gabarits ─────────────────────────────────────────────────────

const PROPERTY_WORDS: Record<string, string> = {
  house: 'votre maison',
  apartment: 'votre appartement',
  farm: 'votre ferme',
  chalet: 'votre chalet',
  other: 'votre logement',
}

/** « votre maison à Draveil », « votre logement » sans type ni commune. */
export function propertyPhrase(type: string | null | undefined, city?: string | null): string {
  const word = PROPERTY_WORDS[(type ?? '').trim()] ?? 'votre logement'
  const c = (city ?? '').trim()
  return c ? `${word} à ${c}` : word
}

/** Première lettre en majuscule, pour une ligne de liste. */
export const upperFirst = (s: string) => (s ? s.charAt(0).toLocaleUpperCase('fr-FR') + s.slice(1) : s)

/** « a, b et c ». */
export function frList(items: string[]): string {
  const n = items.filter((x) => x && x.trim())
  if (n.length <= 1) return n[0] ?? ''
  return `${n.slice(0, -1).join(', ')} et ${n[n.length - 1]}`
}

/** Visage d'un gardien à proximité : prénom et photo seulement. */
export interface NoelV3Face { id: string; firstName: string; avatarUrl?: string }

/** Données envoyées aux quatre gabarits (trois variantes et la relance). */
export interface NoelV3EmailData {
  variant: NoelV3Variant
  firstName: string
  city?: string
  /** Lien de la page à jeton, avec suivi. */
  pageUrl: string
  /** Lien /ma-periode/:jeton, sans période choisie. */
  periodUrl?: string
  /** « votre maison à Draveil », variantes pret et photo. */
  propertyLabel?: string
  petNames: string[]
  /** Titre affiché pour la variante pret. */
  draftTitle?: string
  /** « Du 19 décembre au 3 janvier ». */
  datesLabel: string
  /** Photo du logement, variante pret. */
  photoUrl?: string
  nearbyCount: number
  /** « 90 gardiens à moins de 50 km de Draveil », absent sans gardien proche ou sans commune. */
  nearbyLabel?: string
  faces: NoelV3Face[]
}

export interface NoelV3RecipientFacts {
  firstName?: string | null
  city?: string | null
  propertyType?: string | null
  hasProperty: boolean
  petNames: Array<string | null | undefined>
  photoCount: number
  photoUrl?: string | null
  /** Titre d'un brouillon existant du propriétaire, repris tel quel. */
  existingDraftTitle?: string | null
  /** Dates d'un brouillon existant, reprises si elles sont à venir. */
  existingDraftDates?: { start: string | null; end: string | null } | null
  /** Jour de Paris (AAAA-MM-JJ), pour juger les dates d'un brouillon existant. */
  today?: string
  token: string
  periodUrl?: string | null
  nearby?: { count: number; label: string | null; faces: NoelV3Face[] } | null
}

/** Construit les données d'un destinataire, calcul pur. */
export function buildNoelV3EmailData(f: NoelV3RecipientFacts): NoelV3EmailData {
  const variant = noelV3Variant({ hasProperty: f.hasProperty, photoCount: f.photoCount })
  const city = (f.city ?? '').trim()
  const petNames = f.petNames.map(capitalizeName).filter(Boolean)
  const today = f.today ?? new Date().toISOString().slice(0, 10)
  const own = f.existingDraftDates ? validNoelDates(f.existingDraftDates.start, f.existingDraftDates.end, today) : null
  const dates = own ?? NOEL_DEFAULT_DATES
  const generatedTitle = noelDraftTitle({ city, petNames, start: dates.start, end: dates.end, propertyType: f.propertyType })
  const existing = (f.existingDraftTitle ?? '').trim()
  const near = f.nearby && f.nearby.count > 0 && city && f.nearby.label ? f.nearby : null
  const photo = (f.photoUrl ?? '').trim()
  return {
    variant,
    firstName: (f.firstName ?? '').trim(),
    ...(city ? { city } : {}),
    pageUrl: noelPageUrl(f.token, `&v=${variant}`),
    ...(f.periodUrl ? { periodUrl: f.periodUrl } : {}),
    ...(variant !== 'logement' ? { propertyLabel: propertyPhrase(f.propertyType, city) } : {}),
    petNames,
    ...(variant === 'pret' ? { draftTitle: existing || generatedTitle } : {}),
    datesLabel: frRange(dates.start, dates.end),
    ...(variant === 'pret' && /^https:\/\//.test(photo) ? { photoUrl: photo } : {}),
    nearbyCount: near ? near.count : 0,
    ...(near ? { nearbyLabel: near.label as string } : {}),
    faces: near ? near.faces.slice(0, 3) : [],
  }
}
