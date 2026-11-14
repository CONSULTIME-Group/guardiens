// Test SQL du lot SRC1 (12/11/2026) : source enregistrée à l'inscription.
//
// Base éphémère (PGlite), migration appliquée deux fois (rejouable), puis :
// canal calculé comme côté site (mêmes cas que src/__tests__/src1/channel-cases.json),
// inscription par email écrite par handle_new_user avant toute confirmation,
// valeur d'un identifiant de clic jamais stockée, première source jamais écrasée,
// inscription qui aboutit même si la source est illisible, retour Google réservé
// à un compte de moins de 30 minutes, lecture réservée à l'équipe et total égal
// au nombre de profils créés.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
const root = new URL('../', import.meta.url);
const migration = readFileSync(new URL('drizzle/migrations/0144_src1_source_inscription.sql', root), 'utf8');
// Lot SRC2 : 0162 ajoute YouTube, TikTok et Instagram au calcul du canal.
const migrationSrc2 = readFileSync(new URL('drizzle/migrations/0162_src2_canaux_sociaux.sql', root), 'utf8');
const cases = JSON.parse(readFileSync(new URL('src/__tests__/src1/channel-cases.json', root), 'utf8'));
const passed = [];

await db.exec(`
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
  CREATE SCHEMA auth;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
    SELECT nullif(current_setting('fixture.uid', true), '')::uuid
  $$;
  CREATE TABLE auth.users(id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb, raw_app_meta_data jsonb,
    created_at timestamptz NOT NULL DEFAULT now());
  CREATE TYPE public.user_role AS ENUM ('owner', 'sitter', 'both');
  CREATE TYPE public.app_role AS ENUM ('admin', 'user');
  CREATE TABLE public.profiles(id uuid PRIMARY KEY, email text, role public.user_role DEFAULT 'sitter',
    arrival_intent text, created_at timestamptz NOT NULL DEFAULT now());
  CREATE TABLE public.sitter_profiles(user_id uuid PRIMARY KEY);
  CREATE TABLE public.owner_profiles(user_id uuid PRIMARY KEY);
  CREATE TABLE public.sits(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, published_at timestamptz);
  CREATE TABLE public.user_roles(user_id uuid, role public.app_role);
  CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean LANGUAGE sql STABLE AS $$
    SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
  $$;
`);

await db.exec(migration);
await db.exec(migration);
await db.exec(migrationSrc2);
await db.exec(migrationSrc2);
await db.exec(`
  CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
`);
passed.push('migration rejouable');

// 1. Canal : mêmes cas que le site.
for (const c of cases) {
  const { rows } = await db.query('SELECT public.derive_signup_channel($1::jsonb) AS channel', [JSON.stringify(c.src)]);
  assert.equal(rows[0].channel, c.channel, `canal « ${c.name} »`);
}
passed.push(`canal identique au site (${cases.length} cas)`);

const one = async (sql, params = []) => (await db.query(sql, params)).rows[0];
const OWNER = '00000000-0000-0000-0000-000000000001';
const BROKEN = '00000000-0000-0000-0000-000000000002';
const GOOGLE = '00000000-0000-0000-0000-000000000003';
const OLD = '00000000-0000-0000-0000-000000000004';
const ADMIN = '00000000-0000-0000-0000-000000000005';
const NOSRC = '00000000-0000-0000-0000-000000000006';

// 2. Inscription par email : la ligne existe dès la création du compte.
const meta = {
  role: 'owner',
  signup_source: { us: 'Test', um: 'cpc', uc: 'recette', ck: 'gclid', rd: 'google.fr', lp: '/?gclid=ABC123xyz', ts: new Date().toISOString(), gclid: 'ABC123xyz' },
};
await db.query(`INSERT INTO auth.users(id, email, raw_user_meta_data, raw_app_meta_data) VALUES ($1, 'a@test.fr', $2::jsonb, '{"provider":"email"}')`, [OWNER, JSON.stringify(meta)]);
let row = await one('SELECT * FROM public.profile_signup_sources WHERE user_id = $1', [OWNER]);
assert.equal(row.channel, 'google_ads');
assert.equal(row.utm_source, 'test');
assert.equal(row.utm_campaign, 'recette');
assert.equal(row.click_id_type, 'gclid');
assert.equal(row.landing_path, '/');
assert.equal(row.recorded_via, 'signup_metadata');
assert.equal(JSON.stringify(row).includes('ABC123xyz'), false, 'la valeur du clic ne doit apparaître nulle part');
passed.push('inscription par email : source écrite à la création, sans valeur de clic');

// 3. La première source n'est jamais écrasée.
await db.query(`SELECT public.signup_source_insert($1, '{"us":"autre"}'::jsonb, 'oauth_return')`, [OWNER]);
row = await one('SELECT utm_source, recorded_via FROM public.profile_signup_sources WHERE user_id = $1', [OWNER]);
assert.deepEqual(row, { utm_source: 'test', recorded_via: 'signup_metadata' });
passed.push('première source jamais écrasée');

// 4. Une source illisible n'empêche jamais l'inscription.
await db.query(`INSERT INTO auth.users(id, email, raw_user_meta_data) VALUES ($1, 'b@test.fr', '{"role":"sitter","signup_source":"n importe quoi"}')`, [BROKEN]);
assert.equal((await one('SELECT count(*)::int AS n FROM public.profiles WHERE id = $1', [BROKEN])).n, 1);
assert.equal((await one('SELECT count(*)::int AS n FROM public.profile_signup_sources WHERE user_id = $1', [BROKEN])).n, 0);
await db.query(`INSERT INTO auth.users(id, email, raw_user_meta_data) VALUES ($1, 'f@test.fr', '{"role":"sitter"}')`, [NOSRC]);
assert.equal((await one('SELECT count(*)::int AS n FROM public.profiles WHERE id = $1', [NOSRC])).n, 1);
passed.push('inscription maintenue avec une source illisible ou absente');

// 5. Retour Google : compte de moins de 30 minutes seulement.
await db.query(`INSERT INTO auth.users(id, email, raw_user_meta_data, raw_app_meta_data) VALUES ($1, 'c@test.fr', '{}', '{"provider":"google"}')`, [GOOGLE]);
await db.query(`INSERT INTO auth.users(id, email, raw_user_meta_data, raw_app_meta_data, created_at) VALUES ($1, 'd@test.fr', '{}', '{"provider":"google"}', now() - interval '31 minutes')`, [OLD]);
assert.equal((await one(`SELECT public.record_signup_source('{"rd":"chatgpt.com"}'::jsonb) AS ok`)).ok, false, 'sans membre connecté');
await db.exec(`SELECT set_config('fixture.uid', '${OLD}', false)`);
assert.equal((await one(`SELECT public.record_signup_source('{"rd":"chatgpt.com"}'::jsonb) AS ok`)).ok, false, 'compte de plus de 30 minutes');
await db.exec(`SELECT set_config('fixture.uid', '${GOOGLE}', false)`);
assert.equal((await one(`SELECT public.record_signup_source('{"rd":"chatgpt.com","lp":"/annonces"}'::jsonb) AS ok`)).ok, true);
assert.equal((await one(`SELECT public.record_signup_source('{"us":"email"}'::jsonb) AS ok`)).ok, false, 'second appel sans effet');
row = await one('SELECT channel, recorded_via, landing_path FROM public.profile_signup_sources WHERE user_id = $1', [GOOGLE]);
assert.deepEqual(row, { channel: 'ia', recorded_via: 'oauth_return', landing_path: '/annonces' });
passed.push('retour Google : compte neuf seulement, une seule écriture');

// 6. Lecture réservée à l'équipe.
await assert.rejects(db.query(`SELECT * FROM public.admin_signup_sources(current_date - 1, current_date + 1)`), /forbidden/);
passed.push('lecture refusée à un membre');

await db.query(`INSERT INTO auth.users(id, email, raw_user_meta_data) VALUES ($1, 'e@test.fr', '{"role":"both"}')`, [ADMIN]);
await db.query(`INSERT INTO public.user_roles VALUES ($1, 'admin')`, [ADMIN]);
await db.query(`INSERT INTO public.sits(user_id, published_at) VALUES ($1, now()), ($1, now()), ($1, NULL)`, [OWNER]);
await db.exec(`SELECT set_config('fixture.uid', '${ADMIN}', false)`);
const { rows: report } = await db.query(`SELECT * FROM public.admin_signup_sources(current_date - 1, current_date + 1)`);
const by = Object.fromEntries(report.map((r) => [r.channel, r]));
const profiles = (await one('SELECT count(*)::int AS n FROM public.profiles')).n;
assert.equal(report.reduce((n, r) => n + Number(r.signups), 0), profiles, 'total par canal = profils créés');
assert.equal(Number(by.google_ads.signups), 1);
assert.equal(Number(by.google_ads.owners), 1);
assert.equal(Number(by.google_ads.members_with_published_sit), 1);
assert.equal(Number(by.google_ads.published_sits), 2);
assert.equal(Number(by.ia.google_accounts), 1);
assert.equal(Number(by.inconnu.signups), profiles - 2);
passed.push('lecture équipe : total égal aux profils, « inconnu » visible, annonces publiées comptées');

// 7. Droits.
const grants = await one(`SELECT
  has_table_privilege('authenticated', 'public.profile_signup_sources', 'SELECT') AS member_reads,
  has_function_privilege('anon', 'public.record_signup_source(jsonb)', 'EXECUTE') AS anon_records,
  has_function_privilege('authenticated', 'public.signup_source_insert(uuid, jsonb, text)', 'EXECUTE') AS member_inserts,
  has_function_privilege('anon', 'public.admin_signup_sources(date, date)', 'EXECUTE') AS anon_reads`);
assert.deepEqual(grants, { member_reads: false, anon_records: false, member_inserts: false, anon_reads: false });
passed.push('droits : table fermée aux membres, écriture interne au service');

// 8. Suppression du compte : la source part avec le profil.
await db.query('DELETE FROM public.profiles WHERE id = $1', [GOOGLE]);
assert.equal((await one('SELECT count(*)::int AS n FROM public.profile_signup_sources WHERE user_id = $1', [GOOGLE])).n, 0);
passed.push('source supprimée avec le compte');

console.log('SRC1 OK');
for (const p of passed) console.log(' - ' + p);
