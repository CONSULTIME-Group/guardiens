// Lot E19 : modération du mot laissé après un coup de main, et détection
// d'adresse postale partagée avec moderate-content.
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { moderateMeetupWord, wordModerationParam } from './meetup-word.ts'
import { detectContactDetails, detectPostalAddress } from './contact-details.ts'

const opts = (fetchImpl: typeof fetch) => ({
  supabaseUrl: 'https://projet.supabase.co',
  serviceKey: 'cle-service',
  actingUserId: null,
  fetchImpl,
})

const never: typeof fetch = () => { throw new Error('appel réseau inattendu') }

Deno.test('adresse postale : numéro et type de voie', () => {
  assertEquals(detectPostalAddress('Je suis au 12 rue des Lilas'), true)
  assertEquals(detectPostalAddress('3 bis, avenue Foch'), true)
  assertEquals(detectPostalAddress('1 place de parking disponible'), false)
  assertEquals(detectPostalAddress('à 10h place Bellecour'), false)
  assertEquals(detectContactDetails('7 allée du Parc'), ['address'])
})

Deno.test('numéro, email, adresse : refusés sans appel réseau', async () => {
  for (const word of ['06 12 34 56 78', 'odile@exemple.fr', '12 rue des Lilas']) {
    assertEquals(await moderateMeetupWord(word, opts(never)), { verdict: 'refused', rule: 'contact_details' })
  }
})

Deno.test('verdicts de moderate-content', async () => {
  const reply = (body: unknown): typeof fetch => () => Promise.resolve(new Response(JSON.stringify(body)))
  assertEquals((await moderateMeetupWord('Un bel après-midi ensemble', opts(reply({ status: 'ok' })))).verdict, 'ok')
  assertEquals(await moderateMeetupWord('Texte retenu ici', opts(reply({ status: 'block', rule: 'hate' }))), { verdict: 'refused', rule: 'hate' })
  const failing: typeof fetch = () => Promise.reject(new Error('réseau'))
  assertEquals((await moderateMeetupWord('Merci pour tout', opts(failing))).verdict, 'unchecked')
  assertEquals(wordModerationParam('refused'), null)
})
