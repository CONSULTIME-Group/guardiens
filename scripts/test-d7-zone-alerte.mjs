// Test SQL du lot D7 (état G3) (09/11/2026) : get_alert_zone_options, lecture seule.
//
// Base éphémère (PGlite), migration appliquée deux fois (rejouable), puis :
// membre absent = NULL, gardes ouvertes comptées à 100 km, dans le
// département et en France (sa propre annonce, une garde passée, une garde
// fermée aux candidatures et une garde à l'étranger écartées), zones de
// gardes déjà suivies, alertes actives comptées, aucune écriture.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
const root = new URL('../', import.meta.url);
const migration = readFileSync(new URL('drizzle/migrations/0125_d7_zone_alerte.sql', root), 'utf8');
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
  CREATE TABLE departements(code text PRIMARY KEY, nom text, code_region text, nom_region text);
  INSERT INTO departements VALUES ('03', 'Allier', '84', 'Auvergne-Rhône-Alpes'), ('69', 'Rhône', '84', 'Auvergne-Rhône-Alpes'),
    ('71', 'Saône-et-Loire', '27', 'Bourgogne-Franche-Comté'), ('13', 'Bouches-du-Rhône', '93', 'Provence-Alpes-Côte d''Azur');
  CREATE TABLE profiles(id uuid PRIMARY KEY, latitude double precision, longitude double precision,
    city text, postal_code text, departement_code text);
  CREATE TABLE sits(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, status text, end_date date,
    accepting_applications boolean, country text, departement_code text);
  CREATE TABLE alert_preferences(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, active boolean,
    zone_type text, radius_km integer, departement text, region_code text, alert_types text[]);
`);

await db.exec(migration);
await db.exec(migration);
passed.push('migration rejouable');

const ME = '00000000-0000-0000-0000-000000000001';        // Moulins (03)
const MACON = '00000000-0000-0000-0000-000000000002';     // Digoin (71), environ 50 km
const VICHY = '00000000-0000-0000-0000-000000000003';     // Vichy (03), environ 47 km
const MARSEILLE = '00000000-0000-0000-0000-000000000004'; // Marseille (13), environ 400 km
const ABROAD = '00000000-0000-0000-0000-000000000005';
const as = (uid) => db.exec(`SELECT set_config('fixture.uid', '${uid}', false)`);

await db.exec(`
  INSERT INTO profiles VALUES
   ('${ME}', 46.5660, 3.3330, 'Moulins', '03000', '03'),
   ('${MACON}', 46.4810, 3.9810, 'Digoin', '71160', '71'),
   ('${VICHY}', 46.1278, 3.4255, 'Vichy', '03200', '03'),
   ('${MARSEILLE}', 43.2965, 5.3698, 'Marseille', '13001', '13'),
   ('${ABROAD}', 46.5000, 3.3000, 'Ailleurs', null, null);
  INSERT INTO sits(user_id, status, end_date, accepting_applications, country, departement_code) VALUES
   ('${MACON}', 'published', current_date + 20, true, 'FR', '71'),
   ('${VICHY}', 'published', current_date + 10, null, null, '03'),
   ('${MARSEILLE}', 'published', current_date + 30, true, 'FR', '13'),
   ('${ME}', 'published', current_date + 30, true, 'FR', '03'),
   ('${VICHY}', 'published', current_date - 1, true, 'FR', '03'),
   ('${VICHY}', 'published', current_date + 30, false, 'FR', '03'),
   ('${VICHY}', 'confirmed', current_date + 30, true, 'FR', '03'),
   ('${ABROAD}', 'published', current_date + 30, true, 'CA', null);
  INSERT INTO alert_preferences(user_id, active, zone_type, radius_km, alert_types) VALUES
   ('${ME}', true, 'rayon', 30, ARRAY['gardes', 'new_sit']),
   ('${ME}', true, 'rayon', 15, ARRAY['missions']),
   ('${ME}', false, 'france', null, ARRAY['gardes']),
   ('${MACON}', true, 'france', null, ARRAY['gardes']);
`);

await as('');
const anon = await db.query('SELECT public.get_alert_zone_options() AS r');
assert.equal(anon.rows[0].r, null);
passed.push('membre absent = NULL');

await as(ME);
const { rows } = await db.query('SELECT public.get_alert_zone_options() AS r');
const r = rows[0].r;
assert.equal(r.located, true);
assert.equal(r.city, 'Moulins');
assert.equal(r.departement, '03');
assert.equal(r.departement_name, 'Allier');
passed.push('lieu du membre et nom du département');

assert.equal(r.open_sits.r100, 2, 'Digoin et Vichy à 100 km, Marseille au-delà');
passed.push('gardes ouvertes à 100 km');
assert.equal(r.open_sits.departement, 1, 'Vichy seule dans l\'Allier');
passed.push('gardes ouvertes du département');
assert.equal(r.open_sits.france, 3, 'Digoin, Vichy, Marseille');
passed.push('France sans l\'étranger, sa propre annonce, une garde passée ou fermée');

assert.deepEqual(r.alerts.map((a) => [a.zone_type, a.radius_km]), [['rayon', 30]]);
passed.push('zones de gardes déjà suivies (actives et portant les gardes)');
assert.equal(r.active_alerts, 2);
passed.push('alertes actives comptées');

await as(ABROAD);
const far = (await db.query('SELECT public.get_alert_zone_options() AS r')).rows[0].r;
assert.equal(far.departement, null);
assert.equal(far.open_sits.departement, null);
passed.push('sans département connu, aucune zone département');

const vol = await db.query(`SELECT provolatile FROM pg_proc WHERE proname = 'get_alert_zone_options'`);
assert.equal(vol.rows[0].provolatile, 's');
passed.push('lecture seule');

for (const p of passed) console.log(`ok  ${p}`);
console.log(`\n${passed.length} vérifications passées.`);
