// Test SQL du lot D4 (09/11/2026) : get_dashboard_movement, lecture seule.
//
// Base éphémère (PGlite), migration appliquée deux fois (rejouable), puis :
// membre absent = NULL, distances exactes (50 km pour les gardes, 30 km pour
// l'entraide et les membres), fenêtre « depuis » bornée à 30 jours, fenêtre
// de 7 jours, ses propres annonces et besoins écartés, candidatures reçues et
// lues, garde ouverte la plus proche, note moyenne seulement à 5 avis,
// aucune écriture en base.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
const root = new URL('../', import.meta.url);
const migration = readFileSync(new URL('drizzle/migrations/0124_d4_mouvement_accueil.sql', root), 'utf8');
const passed = [];

await db.exec(`
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
  CREATE SCHEMA auth;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
    SELECT nullif(current_setting('fixture.uid', true), '')::uuid
  $$;
  CREATE FUNCTION public.haversine_km(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
  RETURNS double precision LANGUAGE sql IMMUTABLE AS $$
    SELECT 6371 * 2 * asin(sqrt(power(sin(radians((lat2 - lat1) / 2)), 2) + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians((lng2 - lng1) / 2)), 2)));
  $$;
  CREATE TYPE user_role AS ENUM ('owner', 'sitter', 'both');
  CREATE TYPE sit_status AS ENUM ('draft', 'published', 'confirmed', 'in_progress', 'completed', 'cancelled', 'archived', 'expired');
  CREATE TYPE application_status AS ENUM ('pending', 'viewed', 'discussing', 'accepted', 'rejected', 'cancelled');
  CREATE TYPE small_mission_status AS ENUM ('open', 'in_progress', 'completed', 'cancelled');
  CREATE TYPE small_mission_category AS ENUM ('animals', 'garden', 'house', 'skills', 'other', 'projet');
  CREATE TYPE mission_type_enum AS ENUM ('besoin', 'offre');
  CREATE TABLE profiles(id uuid PRIMARY KEY, role user_role, latitude double precision, longitude double precision,
    postal_code text, account_status text, identity_verified boolean DEFAULT false, created_at timestamptz DEFAULT now());
  CREATE TABLE sits(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, status sit_status, city text,
    start_date date, end_date date, published_at timestamptz);
  CREATE TABLE applications(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sit_id uuid, sitter_id uuid,
    status application_status DEFAULT 'pending', created_at timestamptz DEFAULT now(), viewed_at timestamptz);
  CREATE TABLE small_missions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, status small_mission_status,
    mission_type mission_type_enum DEFAULT 'besoin', category small_mission_category DEFAULT 'garden',
    latitude numeric, longitude numeric, hidden_at timestamptz, moderation_hidden_at timestamptz, created_at timestamptz DEFAULT now());
  CREATE TABLE reviews(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), published boolean, moderation_hidden_at timestamptz,
    overall_rating integer, review_type text);
`);

await db.exec(migration);
await db.exec(migration);
passed.push('migration rejouable');

const ME = '00000000-0000-0000-0000-000000000001';
const OWN_NEAR = '00000000-0000-0000-0000-000000000002'; // Villeurbanne, environ 4 km
const OWN_40 = '00000000-0000-0000-0000-000000000003';   // Vienne, environ 27 km
const OWN_FAR = '00000000-0000-0000-0000-000000000004';  // Grenoble, environ 95 km
const OLD = '00000000-0000-0000-0000-000000000005';
const SITTER = '00000000-0000-0000-0000-000000000006';
const as = (uid) => db.exec(`SELECT set_config('fixture.uid', '${uid}', false)`);

await db.exec(`
  INSERT INTO profiles(id, role, latitude, longitude, postal_code, identity_verified, created_at) VALUES
   ('${ME}', 'both', 45.7640, 4.8357, '69001', true, now() - interval '200 days'),
   ('${OWN_NEAR}', 'owner', 45.7719, 4.8902, '69100', false, now() - interval '2 days'),
   ('${OWN_40}', 'sitter', 45.5250, 4.8740, '38200', true, now() - interval '20 days'),
   ('${OWN_FAR}', 'owner', 45.1885, 5.7245, '38000', false, now() - interval '200 days'),
   ('${OLD}', 'sitter', 45.7700, 4.8400, '69002', false, now() - interval '40 days'),
   ('${SITTER}', 'sitter', 45.7600, 4.8300, 'abc', false, now() - interval '1 day');
  INSERT INTO sits(id, user_id, status, city, start_date, end_date, published_at) VALUES
   ('10000000-0000-0000-0000-000000000001', '${OWN_NEAR}', 'published', 'Villeurbanne', current_date + 20, current_date + 30, now() - interval '1 day'),
   ('10000000-0000-0000-0000-000000000002', '${OWN_FAR}', 'published', 'Grenoble', current_date + 10, current_date + 15, now() - interval '1 day'),
   ('10000000-0000-0000-0000-000000000003', '${ME}', 'published', 'Lyon', current_date + 5, current_date + 9, now() - interval '1 day'),
   ('10000000-0000-0000-0000-000000000004', '${OWN_NEAR}', 'published', 'Villeurbanne', current_date + 40, current_date + 45, now() - interval '10 days');
  INSERT INTO applications(sit_id, sitter_id, status, created_at) VALUES
   ('10000000-0000-0000-0000-000000000003', '${SITTER}', 'pending', now() - interval '2 hours'),
   ('10000000-0000-0000-0000-000000000003', '${OLD}', 'cancelled', now() - interval '2 hours');
  INSERT INTO applications(sit_id, sitter_id, status, created_at, viewed_at) VALUES
   ('10000000-0000-0000-0000-000000000001', '${ME}', 'viewed', now() - interval '3 days', now() - interval '3 hours');
  INSERT INTO small_missions(user_id, status, category, latitude, longitude, created_at) VALUES
   ('${OWN_NEAR}', 'open', 'garden', 45.7719, 4.8902, now() - interval '1 day'),
   ('${OWN_FAR}', 'open', 'garden', 45.1885, 5.7245, now() - interval '1 day'),
   ('${ME}', 'open', 'garden', 45.7640, 4.8357, now() - interval '1 day'),
   ('${OWN_NEAR}', 'open', 'projet', 45.7719, 4.8902, now() - interval '1 day'),
   ('${OWN_NEAR}', 'open', 'garden', 45.7719, 4.8902, now() - interval '1 day');
  UPDATE small_missions SET moderation_hidden_at = now() WHERE id = (SELECT id FROM small_missions WHERE category = 'garden' AND user_id = '${OWN_NEAR}' ORDER BY id LIMIT 1);
  INSERT INTO reviews(published, overall_rating) SELECT true, 5 FROM generate_series(1, 4);
`);

await as('');
assert.equal((await db.query(`SELECT public.get_dashboard_movement() AS r`)).rows[0].r, null);
passed.push('sans membre connecté : NULL');

await as(ME);
const before = (await db.query(`SELECT count(*)::int AS n FROM profiles`)).rows[0].n;
const r = (await db.query(`SELECT public.get_dashboard_movement(now() - interval '6 hours') AS r`)).rows[0].r;
const since = r.windows.since;
const week = r.windows.week;

assert.equal(r.located, true);
assert.equal(since.new_sits_50, 0, 'aucune garde publiée depuis 6 h');
assert.equal(week.new_sits_50, 1, 'Villeurbanne à 4 km, Grenoble à 95 km écartée, la sienne écartée, celle de 10 jours hors fenêtre');
passed.push('gardes à 50 km, fenêtres et propres annonces');

assert.equal(week.new_needs_30, 1, 'besoin proche visible seul : projet, masqué, sien et lointain écartés');
passed.push('entraide à 30 km, projets et besoins masqués écartés');

assert.equal(week.new_sitters_30, 1, 'le gardien inscrit hier seul : le propriétaire est écarté, Vienne a 20 jours');
assert.equal(week.new_members_30, 2, 'le propriétaire de Villeurbanne et le gardien d\'hier, Vienne a 20 jours');
passed.push('nouveaux gardiens et membres à 30 km');

assert.equal(since.new_applications, 1, 'candidature reçue, annulée écartée');
assert.equal(since.applications_viewed, 1, 'sa candidature lue il y a 3 h');
passed.push('candidatures reçues et lues');

assert.equal(r.nearest_sit.city, 'Villeurbanne');
assert.equal(Number(r.nearest_sit.distance_km), 4);
passed.push('garde ouverte la plus proche, distance arrondie');

assert.equal(r.community.departments, 2, '69 et 38, le code postal invalide écarté');
assert.equal(r.community.identities_verified, 2);
assert.equal(r.community.reviews_count, 4);
assert.equal(r.community.reviews_avg, null, 'note moyenne masquée sous 5 avis');
await db.exec(`INSERT INTO reviews(published, overall_rating) VALUES (true, 4)`);
const r5 = (await db.query(`SELECT public.get_dashboard_movement() AS r`)).rows[0].r;
assert.equal(Number(r5.community.reviews_avg), 4.8);
passed.push('chiffres de Guardiens aujourd\'hui, note à partir de 5 avis');

const far = (await db.query(`SELECT public.get_dashboard_movement(now() - interval '400 days') AS r`)).rows[0].r;
assert.ok(new Date(far.since) > new Date(Date.now() - 31 * 86400000), 'fenêtre bornée à 30 jours');
passed.push('fenêtre « depuis » bornée à 30 jours');

assert.equal((await db.query(`SELECT count(*)::int AS n FROM profiles`)).rows[0].n, before);
const vol = (await db.query(`SELECT provolatile FROM pg_proc WHERE proname = 'get_dashboard_movement'`)).rows[0].provolatile;
assert.equal(vol, 's', 'STABLE : aucune écriture possible');
passed.push('lecture seule');

for (const p of passed) console.log(`ok  ${p}`);
console.log(`\n${passed.length} vérifications passées.`);
