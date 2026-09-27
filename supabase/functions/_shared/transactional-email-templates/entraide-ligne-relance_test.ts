import * as React from 'npm:react@18.3.1'
import { render } from 'npm:@react-email/components@0.0.22'
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { template } from './entraide-ligne-relance.tsx'

const html = (p: Record<string, unknown>) => render(React.createElement(template.component, p))
const count = (s: string, n: string) => s.split(n).length - 1
const AV = 'https://x.supabase.co/storage/v1/render/image/public/avatars/a.jpg?width=112&height=112'

Deno.test('rendu complet avec prénom, ville et avatar', () => {
  const h = html({ firstName: 'camille', city: 'Lyon', avatarUrl: AV })
  assertEquals(template.subject, 'Rendre service fait du bien. À vous aussi.')
  assert(h.includes('Une partie de belote, un coup de main au potager : dites en une phrase ce que vous aimez faire.'))
  assert(h.includes('Bonjour Camille,'))
  for (const q of ['Scrabble', 'au potager, et on cueille', 'le samedi matin', 'déposer en voiture']) assert(h.includes(q), q)
  assertEquals(count(h, 'Je complète ma carte'), 2)
  assert(h.includes('Écrire à Camille'))
  assert(h.includes(AV.replaceAll('&', '&amp;')))
  assert(h.includes('>Lyon<'))
  assert(!/<svg/i.test(h)); assert(!/\.webp/i.test(h))
  assert(!/voisin|gratuit/i.test(h)); assert(!/[\u2013\u2014]/.test(h))
})

Deno.test('sans avatar ni ville : initiale, ligne ville absente', () => {
  const h = html({ firstName: 'Camille' })
  assert(!h.includes('render/image'))
  assert(/>C<\/td>/.test(h))
  assert(!h.includes('>Lyon<'))
})

Deno.test('sans prénom : Bonjour, et Écrire', () => {
  const h = html({})
  assert(h.includes('Bonjour,'))
  assert(h.includes('>Écrire<'))
  assert(!h.includes('Écrire à'))
})
