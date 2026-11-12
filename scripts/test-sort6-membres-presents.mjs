// Lot SORT6 : l'audience de l'entraide ne retient que les membres vus depuis 30 jours.
// Rejoue 0150 sur une base PGlite minimale. npm run test:sql:sort6
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const migration = readFileSync(new URL('drizzle/migrations/0150_sort6_entraide_membres_presents.sql', root), 'utf8');
const db = new PGlite();
const passed = [];

await db.exec(`
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
  CREATE SCHEMA auth;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
    SELECT nullif(current_setting('fixture.uid', true), '')::uuid
  $$;
  CREATE TABLE public.profiles(id uuid PRIMARY KEY, email text, latitude double precision, longitude double precision,
    available_for_help boolean, account_status text DEFAULT 'active', last_seen_at timestamptz);
  CREATE TABLE public.small_missions(id uuid PRIMARY KEY, user_id uuid, latitude double precision, longitude double precision);
  CREATE TABLE public.email_preferences(user_id uuid PRIMARY KEY, new_mission_digest boolean, product_emails boolean);
  CREATE TABLE public.suppressed_emails(email text);
  CREATE TABLE public.blocked_users(blocker_id uuid, blocked_id uuid);
  CREATE FUNCTION public.mutual_aid_radius_km(p uuid) RETURNS integer LANGUAGE sql STABLE AS $$ SELECT 30 $$;
`);
await db.exec(migration);
await db.exec(migration);
passed.push('migration 0150 rejouable');

const U = (n) => `00000000-0000-0000-0000-00000000000${n}`;
const [OWNER, RECENT, LIMIT29, AWAY31, NEVER, MISSION] = [1, 2, 3, 4, 5, 9].map(U);
await db.query(`INSERT INTO public.profiles VALUES ($1, 'o@t.fr', 45.76, 4.83, false, 'active', now())`, [OWNER]);
await db.query(`INSERT INTO public.profiles VALUES ($1, 'a@t.fr', 45.77, 4.83, true, 'active', now() - interval '2 days')`, [RECENT]);
await db.query(`INSERT INTO public.profiles VALUES ($1, 'b@t.fr', 45.78, 4.83, true, 'active', now() - interval '29 days')`, [LIMIT29]);
await db.query(`INSERT INTO public.profiles VALUES ($1, 'c@t.fr', 45.79, 4.83, true, 'active', now() - interval '31 days')`, [AWAY31]);
await db.query(`INSERT INTO public.profiles VALUES ($1, 'd@t.fr', 45.80, 4.83, true, 'active', NULL)`, [NEVER]);
await db.query(`INSERT INTO public.small_missions VALUES ($1, $2, 45.76, 4.83)`, [MISSION, OWNER]);

const audience = (await db.query(`SELECT helper_id FROM public.mission_wave_audience_floor($1, 30, 100, 0)`, [MISSION])).rows.map((r) => r.helper_id);
assert.deepEqual(audience, [RECENT, LIMIT29]);
passed.push('vagues : membres vus depuis 30 jours seulement, les plus proches d\'abord');

await db.exec(`SELECT set_config('fixture.uid', '${OWNER}', false)`);
assert.equal((await db.query(`SELECT public.mission_wave_audience_preview(45.76, 4.83) AS n`)).rows[0].n, 2);
passed.push('formulaire : le nombre annoncé suit la même règle');

await db.query(`UPDATE public.profiles SET last_seen_at = now() WHERE id = $1`, [AWAY31]);
assert.equal((await db.query(`SELECT count(*)::int AS n FROM public.mission_wave_audience_floor($1, 30, 100, 0)`, [MISSION])).rows[0].n, 3);
passed.push('un membre qui revient rejoint l\'audience');

const grants = (await db.query(`SELECT has_function_privilege('authenticated', 'public.mission_wave_audience_floor(uuid, integer, integer, integer)', 'EXECUTE') AS floor_auth,
  has_function_privilege('authenticated', 'public.mission_wave_audience_preview(double precision, double precision)', 'EXECUTE') AS preview_auth,
  has_function_privilege('anon', 'public.mission_wave_audience_preview(double precision, double precision)', 'EXECUTE') AS preview_anon`)).rows[0];
assert.deepEqual(grants, { floor_auth: false, preview_auth: true, preview_anon: false });
passed.push('droits inchangés : vagues au rôle service, aperçu aux membres connectés');

for (const p of passed) console.log(`ok  ${p}`);
console.log(`\n${passed.length} contrôles verts (SORT6)`);
