import * as React from 'npm:react@18.3.1'
import { render } from 'npm:@react-email/components@0.0.22'
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { TEMPLATES } from './registry.ts'

const html = (n: string) => render(React.createElement(TEMPLATES[n].component, TEMPLATES[n].previewData ?? {}))
const SIG = 'équipe Guardiens'

Deno.test('signature unique dans les gabarits des fondateurs', () => {
  for (const n of ['entraide-ligne-relance', 'entraide-ligne-helps-with', 'entraide-demander-coup-de-main']) {
    assert(!html(n).includes(SIG), n)
  }
  const h = html('entraide-ligne-relance')
  const tail = h.slice(h.lastIndexOf('Fondateurs de Guardiens'))
  assertEquals(tail.split('<hr').length - 1, 1)
  assert(tail.includes('SIRET 894 864 040 00015'))
})
Deno.test('gabarit témoin sit-confirmed garde L\'équipe Guardiens', () => {
  assert(html('sit-confirmed').includes(SIG))
})
