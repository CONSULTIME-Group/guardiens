// Test SQL du lot TRF2 (15/11/2026) : onglet Leads de /admin/traffic.
//
// Base éphémère (PGlite) : migrations 0144, 0162 puis 0166, deux fois chacune
// (rejouables). Contrôle : application hôte dans le canal (mêmes cas que le
// site), visites rangées par la première page vue de chaque visite, inscrits
// égaux aux profils créés hors comptes supprimés et admins, premières actions,
// campagnes, lecture refusée hors admin et rôle service.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
const root = new URL('../', import.meta.url);
const read = (f) => readFileSync(new URL(f, root), 'utf8');
const cases = JSON.parse(read('src/__tests__/src1/channel-cases.json'));
const passed = [];

await db.exec(`
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
  CREATE SCHEMA auth;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
    SELECT nullif(current_setting('fixture.uid', true), '')::uuid $$;
  CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$
    SELECT nullif(current_setting('fixture.role', true), '') $$;
  CREATE TABLE auth.users(id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb, raw_app_meta_data jsonb,
    created_at timestamptz NOT NULL DEFAULT now());
  CREATE TYPE public.user_role AS ENUM ('owner', 'sitter', 'both');
  CREATE TYPE public.app_role AS ENUM ('admin', 'user');
  CREATE TABLE public.profiles(id uuid PRIMARY KEY, email text, role public.user_role DEFAULT 'sitter',
    arrival_intent text, account_status text, created_at timestamptz NOT NULL DEFAULT now());
  CREATE TABLE public.sitter_profiles(user_id uuid PRIMARY KEY);
  CREATE TABLE public.owner_profiles(user_id uuid PRIMARY KEY);
  CREATE TABLE public.sits(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, published_at timestamptz);
  CREATE TABLE public.user_roles(user_id uuid, role public.app_role);
  CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean LANGUAGE sql STABLE AS $$
    SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;
  CREATE TABLE public.analytics_events(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_type text, user_id uuid,
    metadata jsonb, created_at timestamptz NOT NULL DEFAULT now());
  CREATE TABLE public.applications(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sitter_id uuid);
  CREATE TABLE public.small_missions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, status text);
  CREATE TABLE public.small_mission_responses(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), responder_id uuid);
  CREATE TABLE public.outings(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organizer_id uuid, status text);
  CREATE TABLE public.outing_attendees(outing_id uuid, user_id uuid);
`);
for (const f of ['0144_src1_source_inscription.sql', '0162_src2_canaux_sociaux.sql', '0166_trf2_leads.sql']) {
  await db.exec(read(`drizzle/migrations/${f}`));
  await db.exec(read(`drizzle/migrations/${f}`));
}
passed.push('migrations rejouables');

for (const c of cases) {
  const { rows } = await db.query('SELECT public.derive_signup_channel($1::jsonb) AS channel', [JSON.stringify(c.src)]);
  assert.equal(rows[0].channel, c.channel, `canal « ${c.name} »`);
}
passed.push(`canal identique au site (${cases.length} cas)`);

const id = (n) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const ADMIN = id(99);
await db.query(`INSERT INTO public.user_roles VALUES ($1, 'admin')`, [ADMIN]);

// Visites : première page vue de chaque visite.
const pv = async (visit, meta, user = null, at = 'now()') =>
  db.query(`INSERT INTO public.analytics_events(event_type, user_id, metadata, created_at) VALUES ('page_view', $1, $2::jsonb, ${at})`,
    [user, JSON.stringify({ visit_id: visit, ...meta })]);
await pv('v1', { search: '?utm_source=instagram&utm_medium=social&utm_campaign=251119-carrousel-annonces' }, null, "now() - interval '2 minutes'");
await pv('v1', { search: '?utm_source=facebook' }); // seconde page de la même visite : ignorée
await pv('v2', { search: '?fbclid=1', ap: 'instagram' });
await pv('v3', { search: '?fbclid=1' });
await pv('v4', { referrer: 'https://www.google.com/' });
await pv('v5', { referrer: 'https://guardiens.fr/annonces' });
await pv('v6', { search: '?utm_source=tiktok&utm_campaign=bio' }, ADMIN); // admin : ignoré
await pv('', { search: '?utm_source=tiktok' }); // sans visite : ignoré

// Inscrits.
const signup = async (n, src, extra = {}) => {
  await db.query(`INSERT INTO public.profiles(id, account_status) VALUES ($1, $2)`, [id(n), extra.status ?? null]);
  if (src) await db.query(`INSERT INTO public.profile_signup_sources(user_id, channel, utm_campaign, recorded_via) VALUES ($1, $2, $3, 'signup_metadata')`, [id(n), src.channel, src.uc ?? null]);
};
await signup(1, { channel: 'instagram', uc: '251119-carrousel-annonces' });
await signup(2, { channel: 'instagram' });
await signup(3, { channel: 'facebook' });
await signup(4, null);
await signup(5, { channel: 'facebook' }, { status: 'deleted' });
await db.query(`INSERT INTO public.sits(user_id, published_at) VALUES ($1, now()), ($2, now())`, [id(1), id(77)]);
await db.query(`INSERT INTO public.applications(sitter_id) VALUES ($1)`, [id(2)]);
await db.query(`INSERT INTO public.small_mission_responses(responder_id) VALUES ($1)`, [id(3)]);
await db.query(`INSERT INTO public.small_missions(user_id, status) VALUES ($1, 'cancelled')`, [id(4)]);
await db.query(`INSERT INTO public.outing_attendees(user_id) VALUES ($1)`, [id(4)]);

// Lecture refusée hors admin.
await db.exec(`SELECT set_config('fixture.uid', '${id(1)}', false)`);
await assert.rejects(db.query(`SELECT public.admin_channel_leads(current_date - 1, current_date + 1)`), /forbidden/);
passed.push('lecture refusée à un membre');

await db.exec(`SELECT set_config('fixture.uid', '${ADMIN}', false)`);
const { rows: [{ r }] } = await db.query(`SELECT public.admin_channel_leads(current_date - 1, current_date + 1) AS r`);
const rows = r.rows;
const line = (channel) => rows.find((x) => x.channel === channel && !x.is_campaign);
const camp = (channel, campaign) => rows.find((x) => x.channel === channel && x.is_campaign && x.campaign === campaign);

assert.equal(r.sits_published, 2);
assert.deepEqual([line('instagram').visits, line('instagram').signups, line('instagram').published_members, line('instagram').applicants], [2, 2, 1, 1]);
assert.equal(camp('instagram', '251119-carrousel-annonces').visits, 1);
assert.equal(camp('instagram', '251119-carrousel-annonces').signups, 1);
assert.equal(camp('instagram', null).visits, 1, 'fbclid ouvert dans Instagram, sans campagne');
assert.deepEqual([line('facebook').visits, line('facebook').signups, line('facebook').helpers], [1, 1, 1]);
assert.equal(line('recherche_naturelle').visits, 1);
assert.equal(line('direct').visits, 1, 'site précédent guardiens.fr = direct');
assert.equal(line('inconnu').signups, 1);
assert.equal(line('inconnu').helpers, 0, 'coup de main annulé non compté');
assert.equal(line('inconnu').outing_members, 1);
assert.equal(line('tiktok'), undefined, 'visites admin et sans visite ignorées');
const totalSignups = rows.filter((x) => !x.is_campaign).reduce((a, x) => a + x.signups, 0);
assert.equal(totalSignups, 4, 'inscrits = profils créés hors compte supprimé');
passed.push('visites, inscrits, premières actions et campagnes justes');

await db.exec(`SELECT set_config('fixture.uid', '', false); SELECT set_config('fixture.role', 'service_role', false)`);
await db.query(`SELECT public.admin_channel_leads(current_date - 1, current_date + 1)`);
passed.push('lecture ouverte au rôle service (poste acquisition)');

const { rows: [g] } = await db.query(`SELECT has_function_privilege('anon', 'public.admin_channel_leads(date, date)', 'EXECUTE') AS anon_reads`);
assert.equal(g.anon_reads, false);
passed.push('anon sans accès');

console.log(`TRF2 : ${passed.length} contrôles réussis\n- ${passed.join('\n- ')}`);
