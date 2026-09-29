import * as React from 'npm:react@18.3.1'
import { render } from 'npm:@react-email/components@0.0.22'
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { template, OWNER_DEPARTURE_SUBJECT, periodHref } from './owner-departure-question.tsx'
import { TEMPLATES } from './registry.ts'
import { FOUNDER_CAMPAIGN_TEMPLATES, transactionalSender } from '../sender-address.ts'

const decode = (s: string) => s.replaceAll('&#x27;', "'").replaceAll('&#39;', "'").replaceAll('&quot;', '"').replaceAll('&amp;', '&')
const html = (p: Record<string, unknown>) => decode(render(React.createElement(template.component, p)))
const text = (p: Record<string, unknown>) => render(React.createElement(template.component, p), { plainText: true })
const BASE = 'https://guardiens.fr/ma-periode/' + 'a'.repeat(64)

Deno.test('objet, enregistrement et expéditeur fondateurs', () => {
  assertEquals(OWNER_DEPARTURE_SUBJECT, 'Vous partez quand, cette année ?')
  assert(TEMPLATES['owner-departure-question'])
  assert(FOUNDER_CAMPAIGN_TEMPLATES.includes('owner-departure-question'))
  assertEquals(transactionalSender('owner-departure-question', 'Guardiens', 'guardiens.fr').reply_to, 'contact@guardiens.fr')
})

Deno.test('textes exacts, cinq boutons à jeton, aucun tiret long', () => {
  const h = html({ firstName: 'camille', periodBaseUrl: BASE })
  for (const s of ['Vous partez quand, cette année ?', 'Bonjour Camille,', 'Pour Noël', 'Cet hiver', 'Au printemps', 'Cet été', 'Je verrai plus tard', 'Elisa et Jérémie', '3 sur 4', 'des annonces publiées reçoivent des candidatures. Les premières arrivent en général sous 24 heures.']) assert(h.includes(s), s)
  for (const p of ['noel', 'hiver', 'printemps', 'ete', 'plus_tard']) assert(h.includes(`${BASE}?p=${p}&`), p)
  const t = text({ firstName: 'camille', periodBaseUrl: BASE })
  for (const s of [h, t]) { assert(!s.includes('\u2014')); assert(!s.includes('\u2013')) }
  assert(t.includes('Pour Noël'))
})

Deno.test('sans prénom ni jeton : repli propre', () => {
  const h = html({})
  assert(h.includes('Bonjour, un clic suffit.'))
  assertEquals(periodHref(undefined, 'noel').startsWith('https://guardiens.fr/ma-periode?p=noel&'), true)
})
