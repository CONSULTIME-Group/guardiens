// Local PostgreSQL (PGlite) verification; never connects to Supabase.
// Usage: GUARDIENS_PGLITE_MODULE=/absolute/path/to/pglite/dist/index.js node scripts/audit/test-member-email-claims.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
const modulePath = process.env.GUARDIENS_PGLITE_MODULE;
if (!modulePath?.startsWith('/')) throw new Error('Provide the absolute local PGlite module path');
const { PGlite } = await import(pathToFileURL(modulePath).href);
const db = new PGlite();
let checks = 0;
const equal = (a, b) => { assert.deepEqual(a, b); checks++; };
try {
  await db.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;');
  await db.exec(readFileSync('supabase/sql/pending/20260920094000_member_email_send_claims.sql', 'utf8'));
  const acquire = async (key, token) => (await db.query('SELECT public.acquire_member_email_send_claim($1,$2) AS result', [key, token])).rows[0].result;
  const finish = async (key, token, outcome) => (await db.query('SELECT public.finish_member_email_send_claim($1,$2,$3) AS result', [key, token, outcome])).rows[0].result;
  const key = 'a'.repeat(64), token = randomUUID();
  equal(await acquire(key, token), 'acquired');
  equal(await acquire(key, randomUUID()), 'busy');
  equal(await finish(key, randomUUID(), 'sent'), false);
  equal(await finish(key, token, 'retryable'), true);
  const next = randomUUID();
  equal(await acquire(key, next), 'acquired');
  equal(await finish(key, token, 'sent'), false);
  equal(await finish(key, next, 'sent'), true);
  equal(await acquire(key, randomUUID()), 'sent');
  equal(await finish(key, next, 'retryable'), false);
  const uncertain = 'b'.repeat(64), second = randomUUID();
  equal(await acquire(uncertain, second), 'acquired');
  equal(await finish(uncertain, second, 'uncertain'), true);
  equal(await acquire(uncertain, randomUUID()), 'uncertain');
  await db.exec("UPDATE public.member_email_send_claims SET updated_at = now() - interval '48 hours'");
  equal(await acquire(uncertain, randomUUID()), 'uncertain');
  const concurrent = await Promise.all(Array.from({ length: 32 }, () => acquire('c'.repeat(64), randomUUID())));
  equal(concurrent.filter(x => x === 'acquired').length, 1);
  equal(concurrent.filter(x => x === 'busy').length, 31);
  equal((await db.query('SELECT count(*)::int AS count FROM public.member_email_send_claims')).rows[0].count, 3);
  // PGlite executes these requests on one connection. This verifies the actual
  // unique-key/upsert SQL, not contention between multiple PostgreSQL sessions.
  for (const role of ['anon', 'authenticated']) {
    await db.exec(`SET ROLE ${role}`);
    try {
      await assert.rejects(acquire('d'.repeat(64), randomUUID()), /permission denied/); checks++;
      await assert.rejects(finish(key, next, 'sent'), /permission denied/); checks++;
      await assert.rejects(db.query('SELECT * FROM public.member_email_send_claims'), /permission denied/); checks++;
    } finally { await db.exec('RESET ROLE'); }
  }
  await db.exec('SET ROLE service_role');
  const serviceToken = randomUUID();
  equal(await acquire('e'.repeat(64), serviceToken), 'acquired');
  equal(await finish('e'.repeat(64), serviceToken, 'sent'), true);
  await db.exec('RESET ROLE');
  await assert.rejects(acquire('bad-key', token), /invalid send claim/); checks++;
  await assert.rejects(finish(key, token, 'invalid'), /invalid send outcome/); checks++;
  equal((await db.query("SELECT relrowsecurity FROM pg_class WHERE oid='public.member_email_send_claims'::regclass")).rows[0].relrowsecurity, true);
  console.log(JSON.stringify({ checks_passed: checks, database: 'local PGlite', provider_calls: 0, production_writes: 0 }));
} finally { await db.close(); }
