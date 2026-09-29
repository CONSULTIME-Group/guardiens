import * as React from 'npm:react@18.3.1'
import { render } from 'npm:@react-email/components@0.0.22'
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { template, ownerNoelPreheader, responderFinishUrl } from './owner-noel-2026.tsx'
import { donePhrase, latestIntentByUser, splitNoelV2Audience } from '../owner-noel-v2.ts'
import { computeReadiness, isOwnerV2Holdout } from '../owner-departure-logic.ts'
import { publishedOwnerIds } from '../owner-noel-audience.ts'

const decode = (s: string) =>
  s.replaceAll('&#x27;', "'").replaceAll('&#39;', "'").replaceAll('&quot;', '"').replaceAll('&amp;', '&')
const html = (p: Record<string, unknown>) => decode(render(React.createElement(template.component, p)))
const subject = (p: Record<string, unknown>) => (template.subject as (d: Record<string, unknown>) => string)(p)
const card = (i: number, chip?: string) => ({ id: `s${i}`, firstName: `Gardien${i}`, city: 'Villeurbanne', distanceKm: i + 2, ...(chip ? { chip } : {}) })
const R = (extra: Record<string, unknown> = {}) => ({
  mode: 'responder', period: 'noel', firstName: 'Camille', percent: 60,
  done: 'votre maison, Mila et Rex, votre commune', todo: 'une photo de chez vous et vos dates', ...extra,
})
const noDash = (h: string) => assert(!/[\u2013\u2014]/.test(h), 'tiret long')
const noGender = (h: string) => { for (const w of ['votre chienne', 'votre chien ', 'votre chatte', 'votre chat ']) assert(!h.includes(w), w) }

Deno.test('répondant Noël avec commune et 3 cartes : textes exacts', () => {
  const p = R({ variant: 'A', city: 'Lyon', nearbyCount: 42, sitters: [card(1, 'Identité vérifiée'), card(2), card(3)] })
  const h = html(p)
  assertEquals(subject(p), 'Pour Noël, 42 gardiens près de chez vous')
  assertEquals(ownerNoelPreheader(p as never), 'Votre annonce est prête à 60 %, il reste une photo de chez vous et vos dates')
  for (const s of [
    'NOËL 2026',
    'Votre annonce de Noël est prête à 60 %.',
    'Bonjour Camille, vous nous avez dit partir à Noël. On a préparé votre annonce avec votre maison, Mila et Rex, votre commune. Il reste une photo de chez vous et vos dates.',
    'PRÈS DE CHEZ VOUS',
    '42 gardiens à moins de 50 km de Lyon',
    "En voici trois. Ils vous envoient leur candidature, et c'est vous qui choisissez.",
    'Identité vérifiée',
    'Terminer mon annonce',
    "Publier et choisir votre gardien : c'est gratuit.",
    '3 sur 4',
    'des annonces publiées reçoivent des candidatures. Les premières arrivent en général sous 24 heures.',
    'On lit chaque nouvelle annonce, et on répond à chaque message.',
    'Elisa et Jérémie',
    'https://guardiens.fr/email/elisa.jpg',
    'https://guardiens.fr/email/jeremie.jpg',
  ]) assert(h.includes(s), s)
  assert(h.includes('https://guardiens.fr/sits/create?express=1&periode=noel&debut=2026-12-19&fin=2027-01-03&utm_source=email&utm_medium=email&utm_campaign=owner_noel_2026'))
  assert(!h.includes('Dites-le-nous en un clic'))
  assert(!h.includes('CE QUE GUARDIENS FAIT POUR VOUS'))
  noDash(h); noGender(h)
})

Deno.test('répondant hiver : objet, eyebrow, titre, lien sans dates', () => {
  const p = R({ period: 'hiver', variant: 'A', city: 'Annecy', nearbyCount: 7, sitters: [card(1)] })
  const h = html(p)
  assertEquals(subject(p), 'Cet hiver, 7 gardiens près de chez vous')
  assert(h.includes('CET HIVER'))
  assert(h.includes('Votre annonce de cet hiver est prête à 60 %.'))
  assert(h.includes('vous nous avez dit partir cet hiver.'))
  assert(h.includes("En voici un. Il vous envoie"))
  assertEquals(responderFinishUrl('hiver'), 'https://guardiens.fr/sits/create?express=1&periode=hiver&utm_source=email&utm_medium=email&utm_campaign=owner_noel_2026')
  noDash(h)
})

Deno.test('répondant sans commune : objet de repli et bloc B', () => {
  for (const [period, of] of [['noel', 'de Noël'], ['hiver', 'de cet hiver']]) {
    const p = R({ period, variant: 'B', percent: 40 })
    const h = html(p)
    assertEquals(subject(p), `Votre annonce ${of} est prête à 40 %`)
    assert(h.includes('Montrez votre annonce aux gardiens proches'))
    assert(h.includes('Ajouter ma commune'))
    assert(!h.includes('gardiens à moins de 50 km'))
    noDash(h)
  }
})

Deno.test('répondant, commune mais aucun gardien proche : objet de repli', () => {
  const p = R({ variant: 'A', city: 'Brest', nearbyCount: 0 })
  assertEquals(subject(p), 'Votre annonce de Noël est prête à 60 %')
})

Deno.test('répondant, 0, 2 cartes', () => {
  const h0 = html(R({ variant: 'A', city: 'Lyon', nearbyCount: 3, sitters: [] }))
  assert(h0.includes("Ils vous envoient leur candidature, et c'est vous qui choisissez."))
  assert(!h0.includes('En voici'))
  const h2 = html(R({ variant: 'A', city: 'Lyon', nearbyCount: 3, sitters: [card(1), card(2)] }))
  assert(h2.includes('En voici deux.'))
})

Deno.test('déjà renseigné : noms seuls, appartement, jamais de genre', () => {
  const r = computeReadiness({ city: 'Lyon', latitude: 45, hasProperty: true, pets: [{ name: 'Mila', species: 'dog' }, { name: 'Rex', species: 'dog' }, { name: 'Nala', species: 'cat' }], galleryPhotoCount: 0, propertyPhotoCount: 0, draftStartDates: [] })
  assertEquals(donePhrase(r, ['Mila', 'Rex', 'Nala'], 'house'), 'votre maison, Mila, Rex, Nala et votre commune')
  assertEquals(donePhrase(r, ['Mila'], 'apartment'), 'votre appartement, Mila et votre commune')
  assertEquals(donePhrase(r, [], 'house'), 'votre maison et votre commune')
})

Deno.test('non-répondant : cinq boutons à jeton /ma-periode', () => {
  const base = 'https://guardiens.fr/ma-periode/abcdef0123456789abcdef0123456789'
  const h = html({ variant: 'B', firstName: 'Lou', periodBaseUrl: base })
  assertEquals(subject({ variant: 'B' }), 'Pour Noël, votre maison entre de bonnes mains')
  assert(h.includes('Vous partez à une autre période ? Dites-le-nous en un clic :'))
  for (const p of ['noel', 'hiver', 'printemps', 'ete', 'plus_tard']) assert(h.includes(`${base}?p=${p}&utm_source=email`), p)
  assert(!h.includes('Votre annonce se prépare de la même façon'))
  noDash(h)
})

Deno.test('audience : témoin exclu, printemps/été/plus tard exclus, noel/hiver répondants', () => {
  const ids = Array.from({ length: 400 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`)
  const holdout = ids.find(isOwnerV2Holdout)!
  const plain = ids.filter((i) => !isOwnerV2Holdout(i))
  const [n, h, pr, e, pt, none] = plain
  const latest = latestIntentByUser([
    { user_id: n, period: 'plus_tard', answered_at: '2026-09-01T00:00:00Z' },
    { user_id: n, period: 'noel', answered_at: '2026-09-10T00:00:00Z' },
    { user_id: h, period: 'hiver', answered_at: '2026-09-10T00:00:00Z' },
    { user_id: pr, period: 'printemps', answered_at: '2026-09-10T00:00:00Z' },
    { user_id: e, period: 'noel', answered_at: '2026-09-01T00:00:00Z' },
    { user_id: e, period: 'ete', answered_at: '2026-09-10T00:00:00Z' },
    { user_id: pt, period: 'plus_tard', answered_at: '2026-09-10T00:00:00Z' },
    { user_id: holdout, period: 'noel', answered_at: '2026-09-10T00:00:00Z' },
  ])
  const split = splitNoelV2Audience([n, h, pr, e, pt, none, holdout].map((id) => ({ id })), latest)
  assertEquals(split.rows.map((r) => r.id), [n, h, none])
  assertEquals(split.responders.get(n), 'noel')
  assertEquals(split.responders.get(h), 'hiver')
  assert(!split.responders.has(none))
  assertEquals(split.holdoutExcluded, 1)
  assertEquals(split.otherPeriodExcluded, 3)
})

Deno.test('audience : publication exclue (inchangé)', () => {
  const pub = publishedOwnerIds([{ user_id: 'p', status: 'published', published_at: '2026-09-01' }, { user_id: 'd', status: 'draft', published_at: null }])
  assert(pub.has('p')); assert(!pub.has('d'))
})

Deno.test('N7 : sous 40 %, objet et titre sans pourcentage, sans « On a préparé » si rien', () => {
  const p = R({ percent: 25, done: '', variant: 'A', city: 'Lyon', nearbyCount: 4, sitters: [card(1)] })
  assertEquals(subject(p), 'Pour Noël, votre annonce en deux gestes')
  const h = html(p)
  assert(h.includes('Votre annonce de Noël, en deux gestes.'))
  assert(!h.includes('On a préparé votre annonce'))
  assert(!h.includes('prête à 25'))
  noDash(h)
})

Deno.test('N7 : accord au singulier pour 1 gardien', () => {
  const p = R({ variant: 'A', city: 'Lyon', nearbyCount: 1, sitters: [card(1)] })
  assertEquals(subject(p), 'Pour Noël, 1 gardien près de chez vous')
  const h = html(p)
  assert(h.includes('1 gardien à moins de 50 km de Lyon'))
  assert(h.includes('En voici un. Il vous envoie sa candidature'))
  assertEquals(ownerNoelPreheader({ firstName: 'C', city: 'Lyon', nearbyCount: 1, variant: 'A' } as never), "1 gardien à moins de 50 km de Lyon, et c'est vous qui choisissez")
})
