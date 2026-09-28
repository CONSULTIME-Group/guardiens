import * as React from 'npm:react@18.3.1'
import { render } from 'npm:@react-email/components@0.0.22'
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { template, ownerNoelPreheader } from './owner-noel-2026.tsx'
import {
  buildNoelData,
  founderFollowupIds,
  publishedOwnerIds,
  topBadgeLabels,
  type SitterRow,
} from '../owner-noel-audience.ts'

const decode = (s: string) =>
  s.replaceAll('&#x27;', "'").replaceAll('&#39;', "'").replaceAll('&quot;', '"').replaceAll('&amp;', '&')
const html = (p: Record<string, unknown>) => decode(render(React.createElement(template.component, p)))
const text = (p: Record<string, unknown>) => render(React.createElement(template.component, p), { plainText: true })

const card = (i: number, chip?: string) => ({
  id: `s${i}`, firstName: `Gardien${i}`, city: 'Villeurbanne', distanceKm: i + 2,
  avatarUrl: `https://x.supabase.co/storage/v1/render/image/public/avatars/${i}.jpg?width=112&height=112`,
  ...(chip ? { chip } : {}),
})

const COMMON = [
  'NOËL 2026',
  "Partez l'esprit léger, quelqu'un du coin garde la maison.",
  "les départs de fin d'année se décident maintenant. Votre annonce est en ligne en quelques minutes, et les gardiens proches de chez vous vous écrivent directement.",
  'Je prépare ma garde de Noël',
  'Publier et choisir votre gardien : c\'est gratuit.',
  'CE QUE GUARDIENS FAIT POUR VOUS',
  "Une garde qui se passe bien, de l'annonce au retour",
  'Vous décrivez qui vous voulez chez vous.',
  'La confiance, écrite noir sur blanc.',
  'Vos consignes et vos nouvelles, au bon moment.',
  'On a gardé 37 maisons et 234 animaux avant de créer Guardiens.',
  'Elisa et Jérémie',
  'Vous partez à une autre période ? Votre annonce se prépare de la même façon, avec vos dates.',
]

Deno.test('variante A : textes exacts, préheader, 3 cartes', () => {
  const p = { firstName: 'Camille', city: 'Lyon', nearbyCount: 42, variant: 'A', sitters: [card(1, 'Identité vérifiée'), card(2), card(3)] }
  const h = html(p)
  assertEquals(template.subject, 'Pour Noël, votre maison entre de bonnes mains')
  for (const s of COMMON) assert(h.includes(s), s)
  assert(h.includes('Bonjour Camille, les départs'))
  assert(h.includes('PRÈS DE CHEZ VOUS'))
  assert(h.includes('42 gardiens à moins de 50 km de Lyon'))
  assert(h.includes("En voici trois. Ils vous envoient leur candidature, et c'est vous qui choisissez."))
  for (const i of [1, 2, 3]) assert(h.includes(`Gardien${i}`))
  assert(h.includes('Villeurbanne, 3 km'))
  assert(h.includes('https://guardiens.fr/gardiens/s1'))
  assert(h.includes('utm_campaign=owner_noel_2026'))
  assertEquals(ownerNoelPreheader(p as never), "42 gardiens à moins de 50 km de Lyon, et c'est vous qui choisissez")
  assert(!/[\u2013\u2014]/.test(h)); assert(!/voisin/i.test(h))
  const t = text(p)
  assert(t.includes('Je prépare ma garde de Noël')); assert(!/[\u2013\u2014]/.test(t))
})

Deno.test('variante A : 0, 1 et 3 cartes', () => {
  const base = { firstName: 'Camille', city: 'Lyon', nearbyCount: 5, variant: 'A' }
  const h0 = html({ ...base, sitters: [] })
  assert(h0.includes('5 gardiens à moins de 50 km de Lyon'))
  assert(!h0.includes('Gardien1'))
  const h1 = html({ ...base, sitters: [card(1)] })
  assert(h1.includes('Gardien1')); assert(!h1.includes('Gardien2'))
  assert(h1.includes('En voici un. Ils vous')); assert(!h1.includes('En voici trois'))
  assert(html({ ...base, sitters: [card(1), card(2)] }).includes('En voici deux. Ils vous'))
  assert(!h0.includes('En voici'))
  const h3 = html({ ...base, sitters: [card(1), card(2), card(3)] })
  for (const i of [1, 2, 3]) assert(h3.includes(`Gardien${i}`))
})

Deno.test('pastille absente quand le gardien n\'en a pas', () => {
  const h = html({ firstName: 'C', city: 'Lyon', nearbyCount: 1, variant: 'A', sitters: [card(1)] })
  assert(!h.includes('Identité vérifiée'))
  const h2 = html({ firstName: 'C', city: 'Lyon', nearbyCount: 1, variant: 'A', sitters: [card(1, 'Maison nickel')] })
  assert(h2.includes('Maison nickel'))
})

Deno.test('variante B : textes exacts, sans prénom', () => {
  const p = { variant: 'B' }
  const h = html(p)
  for (const s of COMMON) assert(h.includes(s), s)
  assert(h.includes('Bonjour, les départs'))
  assert(h.includes('Montrez votre annonce aux gardiens proches'))
  assert(h.includes('Ajoutez votre commune sur votre profil : votre annonce apparaît aux gardiens qui habitent près de chez vous, et vous découvrez qui ils sont.'))
  assert(h.includes('Ajouter ma commune'))
  assert(!h.includes('gardiens à moins de 50 km'))
  assertEquals(ownerNoelPreheader(p as never), 'Vos dates, votre commune, et les gardiens proches vous écrivent')
  assert(!/[\u2013\u2014]/.test(h))
})

Deno.test('audience : publié exclu, brouillon seul inclus', () => {
  const pub = publishedOwnerIds([
    { user_id: 'publie', status: 'completed', published_at: '2026-01-01' },
    { user_id: 'brouillon', status: 'draft', published_at: null },
    { user_id: 'brouillon-date', status: 'draft', published_at: '2026-02-01' },
  ])
  assert(pub.has('publie')); assert(!pub.has('brouillon')); assert(pub.has('brouillon-date'))
})

Deno.test('audience : exclusion fondateur à 4 jours ou réponse du membre', () => {
  const F = 'founder'
  const now = new Date('2026-10-14T09:00:00Z')
  const convs = [
    { id: 'c1', owner_id: 'recent', sitter_id: F },
    { id: 'c2', owner_id: 'ancien', sitter_id: F },
    { id: 'c3', owner_id: F, sitter_id: 'repondu' },
    { id: 'c4', owner_id: 'autre', sitter_id: 'x' },
  ]
  const msgs = [
    { conversation_id: 'c1', sender_id: F, created_at: '2026-10-11T10:00:00Z' },
    { conversation_id: 'c2', sender_id: F, created_at: '2026-10-09T08:00:00Z' },
    { conversation_id: 'c3', sender_id: F, created_at: '2026-01-01T00:00:00Z' },
    { conversation_id: 'c3', sender_id: 'repondu', created_at: '2026-01-02T00:00:00Z' },
    { conversation_id: 'c4', sender_id: 'autre', created_at: '2026-10-13T00:00:00Z' },
  ]
  const out = founderFollowupIds(convs, msgs, now, [F])
  assert(out.has('recent')); assert(out.has('repondu'))
  assert(!out.has('ancien')); assert(!out.has('autre'))
})

const sitter = (id: string, lat: number, extra: Partial<SitterRow> = {}): SitterRow => ({
  id, first_name: id, city: 'Lyon', avatar_url: 'https://x/a.jpg', latitude: lat, longitude: 4.8357,
  profile_completion: 80, identity_verified: false, ...extra,
})

Deno.test('données : variante, tri, photo et complétion prioritaires, aucune coordonnée transmise', () => {
  const pool = [
    sitter('proche-sans-photo', 45.765, { avatar_url: null }),
    sitter('a', 45.77), sitter('b', 45.78, { identity_verified: true }), sitter('c', 45.79),
    sitter('loin', 46.5),
  ]
  const badges = topBadgeLabels([
    { user_id: 'a', badge_id: 'maison_nickel' }, { user_id: 'a', badge_id: 'maison_nickel' },
    { user_id: 'a', badge_id: 'animaux_heureux' },
  ])
  const d = buildNoelData({ id: 'o', first_name: 'Lou', city: 'Lyon', latitude: 45.764, longitude: 4.8357 }, pool, badges)
  assertEquals(d.variant, 'A')
  assertEquals(d.nearbyCount, 4)
  assertEquals(d.sitters?.map((s) => s.id), ['a', 'b', 'c'])
  assertEquals(d.sitters?.[0].chip, 'Maison nickel')
  assertEquals(d.sitters?.[1].chip, 'Identité vérifiée')
  assertEquals(d.sitters?.[2].chip, undefined)
  assert(!JSON.stringify(d).includes('latitude'))
  assertEquals(buildNoelData({ id: 'o', city: 'Lyon' }, pool, badges).variant, 'B')
  assertEquals(buildNoelData({ id: 'o', city: 'Brest', latitude: 48.39, longitude: -4.49 }, pool, badges).variant, 'B')
})

Deno.test('correctif J3 : échange, jamais de rencontre systématique', async () => {
  const src = await Deno.readTextFile(new URL('./owner-no-sit-j3.tsx', import.meta.url))
  assert(src.includes('puis vous échangez avec les candidats avant de choisir'))
  assert(!src.includes('vous rencontrez les candidats'))
})
