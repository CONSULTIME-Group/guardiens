import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { isServiceRoleCall, runMetricsFromBody } from './cron-run-log.ts'

Deno.test('ADM8 : métriques limitées aux champs simples, statut HTTP toujours présent', () => {
  assertEquals(runMetricsFromBody({ ok: true, sent: 3, note: 'x'.repeat(300), nested: { a: 1 }, list: [1] }, 200),
    { http_status: 200, ok: true, sent: 3, note: 'x'.repeat(200) })
  assertEquals(runMetricsFromBody(null, 500), { http_status: 500 })
})

Deno.test('ADM8 : seul un appel avec la clé de service est journalisé', () => {
  Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'cle-de-test')
  const req = (auth?: string) => new Request('https://x.test', { headers: auth ? { Authorization: auth } : {} })
  assertEquals(isServiceRoleCall(req('Bearer cle-de-test')), true)
  const payload = btoa(JSON.stringify({ role: 'service_role' })).replace(/=+$/, '')
  assertEquals(isServiceRoleCall(req(`Bearer aaa.${payload}.bbb`)), true)
  const user = btoa(JSON.stringify({ role: 'authenticated' })).replace(/=+$/, '')
  assertEquals(isServiceRoleCall(req(`Bearer aaa.${user}.bbb`)), false)
  assertEquals(isServiceRoleCall(req()), false)
})
