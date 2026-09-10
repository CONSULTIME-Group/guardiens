import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { wrapEmailLink } from './email-link-wrap.ts'

const SITE_URL = 'https://guardiens.fr'
const MESSAGE_ID = 'msg-123'

Deno.test('wrapEmailLink decode les entites HTML avant de signer le lien', () => {
  const html = `<a href="https://guardiens.fr/sits/create?utm_source=email&amp;utm_campaign=x&amp;debut=2026-10-17&amp;fin=2026-11-01">Publier</a>`
  const hrefMatch = html.match(/href="([^"]+)"/)?.[1] ?? ''

  const wrapped = wrapEmailLink(hrefMatch, MESSAGE_ID, SITE_URL)

  // Le lien de tracking pointe vers /go avec un parametre u en base64url.
  assertEquals(wrapped.startsWith(`${SITE_URL}/go?mid=${MESSAGE_ID}&u=`), true)

  const uParam = new URL(wrapped).searchParams.get('u')
  if (!uParam) throw new Error('Parametre u manquant')

  // Decodage base64url -> base64 standard -> texte
  const normalized = uParam.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4)
  const decoded = atob(padded)

  const finalUrl = new URL(decoded)
  const params = finalUrl.searchParams

  assertEquals(params.get('utm_source'), 'email')
  assertEquals(params.get('utm_campaign'), 'x')
  assertEquals(params.get('debut'), '2026-10-17')
  assertEquals(params.get('fin'), '2026-11-01')

  // Aucune cle ne doit commencer par "amp;" : l'entite &amp; a ete decodee.
  for (const key of params.keys()) {
    assertEquals(key.startsWith('amp;'), false, `Cle corrompue detectee : ${key}`)
  }
})
