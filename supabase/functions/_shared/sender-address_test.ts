import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { transactionalSender, CONTACT_REPLY_ADDRESS, FOUNDER_CAMPAIGN_TEMPLATES } from './sender-address.ts'

Deno.test('gabarits des fondateurs : nom affiché et reply_to de contact-reply', () => {
  assertEquals(FOUNDER_CAMPAIGN_TEMPLATES.length, 3)
  for (const t of FOUNDER_CAMPAIGN_TEMPLATES) {
    const s = transactionalSender(t, 'Guardiens', 'guardiens.fr')
    assertEquals(s.from, '"Elisa et Jérémie, Guardiens" <noreply@guardiens.fr>')
    assertEquals(s.reply_to, CONTACT_REPLY_ADDRESS)
  }
})
Deno.test('contact-reply garde Guardiens et la même adresse de réponse', () => {
  assertEquals(transactionalSender('contact-reply', 'Guardiens', 'guardiens.fr'), { from: 'Guardiens <noreply@guardiens.fr>', reply_to: CONTACT_REPLY_ADDRESS })
})
Deno.test('autres gabarits : Guardiens, sans reply_to', () => {
  assertEquals(transactionalSender('sit-confirmed', 'Guardiens', 'guardiens.fr'), { from: 'Guardiens <noreply@guardiens.fr>' })
})
