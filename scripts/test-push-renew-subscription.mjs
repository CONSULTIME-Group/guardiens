// Lot 0b : migration 0056 réelle sur PGlite. Un abonnement perdu en 410 se
// renouvelle (préférences gardées, enabled = true) ; un abonnement désactivé
// volontairement ou appartenant à un autre membre ne se renouvelle jamais.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
const U1 = '11111111-1111-1111-1111-111111111111';
const U2 = '22222222-2222-2222-2222-222222222222';
const S410 = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const SVOL = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const SOTHER = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const passed = [];
await db.exec(`
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
  CREATE TABLE public.push_subscriptions(
    id uuid PRIMARY KEY, user_id uuid NOT NULL, endpoint text UNIQUE NOT NULL, endpoint_host text,
    auth_key text, p256dh_key text, opt_in_messages boolean, opt_in_applications boolean,
    opt_in_nearby_sits boolean, enabled boolean, disabled_at timestamptz, disabled_reason text, updated_at timestamptz);
  INSERT INTO public.push_subscriptions VALUES
    ('${S410}', '${U1}', 'https://fcm.googleapis.com/old', 'fcm.googleapis.com', 'a', 'p', true, false, true, false, now(), 'http_410', now()),
    ('${SVOL}', '${U1}', 'https://fcm.googleapis.com/vol', 'fcm.googleapis.com', 'a', 'p', true, true, false, false, now(), 'member_disabled', now()),
    ('${SOTHER}', '${U2}', 'https://fcm.googleapis.com/other', 'fcm.googleapis.com', 'a', 'p', true, true, false, false, now(), 'http_410', now());
`);
await db.exec(readFileSync(new URL('../drizzle/migrations/0056_push_renew_subscription.sql', import.meta.url), 'utf8'));
const renew = async (u, s, e) => (await db.query(
  `SELECT public.push_renew_subscription($1, $2, $3, 'fcm.googleapis.com', 'auth2', 'p256dh2') AS r`, [u, s, e])).rows[0].r;
const row = async (id) => (await db.query(`SELECT * FROM public.push_subscriptions WHERE id = $1`, [id])).rows[0];

assert.equal(await renew(U1, S410, 'https://fcm.googleapis.com/new'), 'renewed');
const r = await row(S410);
assert.equal(r.endpoint, 'https://fcm.googleapis.com/new');
assert.equal(r.enabled, true);
assert.equal(r.disabled_reason, null);
assert.deepEqual([r.opt_in_messages, r.opt_in_applications, r.opt_in_nearby_sits], [true, false, true]);
passed.push('Perdu en 410 : renouvelé, préférences gardées, enabled = true');

assert.equal(await renew(U1, SVOL, 'https://fcm.googleapis.com/vol2'), 'not_renewable');
assert.equal((await row(SVOL)).enabled, false);
passed.push('Désactivé volontairement : jamais renouvelé');

assert.equal(await renew(U1, SOTHER, 'https://fcm.googleapis.com/x'), 'not_found');
passed.push("Abonnement d'un autre membre : jamais renouvelé");

assert.equal(await renew(U2, SOTHER, 'https://fcm.googleapis.com/new'), 'endpoint_in_use');
passed.push('Adresse déjà utilisée : refusée');

for (const p of passed) console.log('OK', p);
console.log(`${passed.length}/${passed.length}`);
