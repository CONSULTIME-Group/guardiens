// Test SQL du lot ALR1 (14/11/2026) : diffusion d'une annonce selon sa position.
//
// Base éphémère (PGlite), migration appliquée deux fois (rejouable), puis :
//  1. propriétaire situé : file du récapitulatif avec distances, gardien proche
//     avant le lointain, cloche à moins de 100 km seulement ;
//  2. propriétaire sans position, commune de l'annonce connue : distances
//     calculées depuis la commune ;
//  3. aucune position : aucune ligne de file, aucune cloche, un seul signal
//     d'attente ; puis la position du propriétaire arrive : la file se remplit
//     et le signal se ferme ;
//  4. une annonce qui a déjà une file n'est pas rediffusée.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
const root = new URL('../', import.meta.url);
const migration = readFileSync(new URL('drizzle/migrations/0158_alr1_diffusion_position.sql', root), 'utf8');
const passed = [];

await db.exec(`
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
  CREATE FUNCTION public.unaccent(text) RETURNS text LANGUAGE sql IMMUTABLE AS $$ SELECT $1 $$;
  CREATE FUNCTION public.haversine_km(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
  RETURNS double precision LANGUAGE sql IMMUTABLE AS $$
    SELECT 6371 * 2 * asin(sqrt(power(sin(radians((lat2 - lat1) / 2)), 2) + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians((lng2 - lng1) / 2)), 2)));
  $$;
  CREATE FUNCTION public.dept_code_from_postal(p text) RETURNS text LANGUAGE sql IMMUTABLE AS $$ SELECT left(p, 2) $$;
  CREATE TYPE sit_status AS ENUM ('draft', 'published', 'confirmed', 'in_progress', 'completed');
  CREATE TABLE departements(code text PRIMARY KEY, code_region text);
  CREATE TABLE profiles(id uuid PRIMARY KEY, latitude double precision, longitude double precision,
    postal_code text, city text, role text, last_seen_at timestamptz DEFAULT now());
  CREATE TABLE sits(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, property_id uuid, title text,
    city text, status sit_status DEFAULT 'draft', start_date date DEFAULT current_date + 10, end_date date DEFAULT current_date + 20,
    accepts_sitter_children text, accepts_sitter_pets text, accepting_applications boolean, unpublished_at timestamptz,
    published_at timestamptz);
  CREATE TABLE pets(property_id uuid, species text);
  CREATE TABLE properties(id uuid, user_id uuid);
  CREATE TABLE feature_flags(key text, enabled boolean);
  CREATE TABLE owner_profiles(user_id uuid, smoker_accepted text);
  CREATE TABLE applications(sit_id uuid, sitter_id uuid, status text);
  CREATE TABLE sitter_profiles(user_id uuid, smoker boolean, travels_with_children boolean,
    travels_with_own_animals boolean, animal_types text[]);
  CREATE TABLE email_preferences(user_id uuid, new_sit_digest boolean);
  CREATE TABLE blocked_users(blocker_id uuid, blocked_id uuid);
  CREATE TABLE account_deletion_requests(user_id uuid, status text);
  CREATE TABLE sitter_digest_queue(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sitter_id uuid, sit_id uuid,
    distance_km numeric(8,2), queued_at timestamptz DEFAULT now(), status text DEFAULT 'queued', skip_reason text,
    UNIQUE (sitter_id, sit_id));
  CREATE TABLE alert_preferences(user_id uuid, active boolean, source text, zone_type text, departement text,
    region_code text, city text, radius_km integer);
  CREATE TABLE geocode_cache(normalized_name text, lat double precision, lng double precision);
  CREATE TABLE notifications(user_id uuid, type text, title text, body text, link text);
  CREATE TABLE admin_signals(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), signal_type text, severity text,
    entity_type text, entity_id uuid, metadata jsonb, detected_at timestamptz DEFAULT now(), resolved_at timestamptz,
    action_taken text);
  -- Déclencheur de production, tel qu'il est posé sur sits.
  CREATE FUNCTION public.notify_sitters_on_new_sit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$;
  CREATE TRIGGER trg_notify_sitters_on_new_sit AFTER INSERT OR UPDATE OF status, accepting_applications, unpublished_at
    ON public.sits FOR EACH ROW EXECUTE FUNCTION public.notify_sitters_on_new_sit();
`);

await db.exec(migration);
await db.exec(migration);
passed.push('migration rejouable');

const OWNER_LYON = '00000000-0000-0000-0000-000000000001';
const OWNER_NOWHERE = '00000000-0000-0000-0000-000000000002';
const NEAR = '00000000-0000-0000-0000-00000000000a';   // Villeurbanne
const FAR = '00000000-0000-0000-0000-00000000000b';    // Marseille
const NIMES = '00000000-0000-0000-0000-00000000000c';  // Nîmes, près de Clarensac

await db.exec(`
  INSERT INTO profiles VALUES
   ('${OWNER_LYON}', 45.764, 4.8357, '69005', 'Lyon', 'owner'),
   ('${OWNER_NOWHERE}', null, null, '30870', 'Clarensac', 'owner'),
   ('${NEAR}', 45.7719, 4.8902, '69100', 'Villeurbanne', 'sitter'),
   ('${FAR}', 43.2965, 5.3698, '13001', 'Marseille', 'sitter'),
   ('${NIMES}', 43.8367, 4.3601, '30000', 'Nîmes', 'sitter');
  INSERT INTO sitter_profiles(user_id) VALUES ('${NEAR}'), ('${FAR}'), ('${NIMES}');
`);

const queue = async (sit) => (await db.query(
  `SELECT sitter_id, distance_km::float AS d FROM sitter_digest_queue WHERE sit_id = $1 ORDER BY distance_km NULLS LAST`, [sit])).rows;
const bells = async (sit) => Number((await db.query(
  `SELECT count(*)::int AS n FROM notifications WHERE link = '/sits/' || $1::text`, [sit])).rows[0].n);
const openSignals = async (sit) => Number((await db.query(
  `SELECT count(*)::int AS n FROM admin_signals WHERE entity_id = $1 AND resolved_at IS NULL`, [sit])).rows[0].n);

// 1. Propriétaire situé.
const s1 = (await db.query(`INSERT INTO sits(user_id, title, city, status, published_at)
  VALUES ($1, 'Garde à Lyon', 'Lyon', 'published', now()) RETURNING id`, [OWNER_LYON])).rows[0].id;
let q = await queue(s1);
assert.equal(q.length, 3);
assert.equal(q[0].sitter_id, NEAR);
assert.ok(q[0].d < 10 && q[2].d > 100, 'distances calculées depuis le propriétaire');
assert.equal(await bells(s1), 1, 'cloche au seul gardien à moins de 100 km');
passed.push('propriétaire situé : file classée par distance');

// 2. Propriétaire sans position, commune de l'annonce en cache.
await db.exec(`INSERT INTO geocode_cache VALUES ('clarensac', 43.8239, 4.2224)`);
const s2 = (await db.query(`INSERT INTO sits(user_id, title, city, status, published_at)
  VALUES ($1, 'Garde à Clarensac', 'Clarensac', 'published', now()) RETURNING id`, [OWNER_NOWHERE])).rows[0].id;
q = await queue(s2);
assert.equal(q[0].sitter_id, NIMES, 'le gardien de Nîmes passe en tête');
assert.ok(q[0].d < 20, 'distance depuis la commune de l\'annonce');
assert.equal(await openSignals(s2), 0);
passed.push('repli sur la commune de l\'annonce');

// 3. Aucune position : attente puis rejeu.
await db.exec(`DELETE FROM geocode_cache; UPDATE profiles SET city = 'Inconnue' WHERE id = '${OWNER_NOWHERE}'`);
const s3 = (await db.query(`INSERT INTO sits(user_id, title, city, status, published_at)
  VALUES ($1, 'Garde sans position', 'Nulle part', 'published', now()) RETURNING id`, [OWNER_NOWHERE])).rows[0].id;
assert.equal((await queue(s3)).length, 0, 'aucune file au hasard');
assert.equal(await bells(s3), 0, 'aucune cloche');
assert.equal(await openSignals(s3), 1, 'un signal d\'attente');
await db.query(`SELECT public.notify_sitters_for_sit($1)`, [s3]);
assert.equal(await openSignals(s3), 1, 'pas de second signal');
passed.push('sans position : aucune diffusion, un signal');

await db.exec(`UPDATE profiles SET latitude = 43.8239, longitude = 4.2224 WHERE id = '${OWNER_NOWHERE}'`);
q = await queue(s3);
assert.equal(q.length, 3, 'diffusion rejouée à l\'arrivée de la position');
assert.equal(q[0].sitter_id, NIMES);
assert.equal(await openSignals(s3), 0, 'signal fermé');
const closed = (await db.query(`SELECT action_taken FROM admin_signals WHERE entity_id = $1`, [s3])).rows[0].action_taken;
assert.equal(closed, 'auto_resolved_diffused');
passed.push('position arrivée : rejeu et signal fermé');

// 4. Pas de seconde diffusion pour une annonce déjà en file.
const before = (await queue(s2)).length;
await db.exec(`UPDATE profiles SET latitude = null, longitude = null WHERE id = '${OWNER_NOWHERE}'`);
await db.exec(`UPDATE profiles SET latitude = 43.8, longitude = 4.2 WHERE id = '${OWNER_NOWHERE}'`);
assert.equal((await queue(s2)).length, before);
passed.push('annonce déjà diffusée : rien de plus');

// 5. Republication d'une annonce déjà publiée : rien.
await db.exec(`UPDATE sits SET accepting_applications = true WHERE id = '${s1}'`);
assert.equal((await queue(s1)).length, 3);
passed.push('mise à jour d\'une annonce publiée : rien de plus');

// 6. Zone « France entière » enregistrée en region + FR : priorité, hors plafond.
const FAR2 = '00000000-0000-0000-0000-00000000000d';
await db.exec(`INSERT INTO profiles VALUES ('${FAR2}', 48.8566, 2.3522, '75001', 'Paris', 'sitter', now() - interval '200 days');
  INSERT INTO sitter_profiles(user_id) VALUES ('${FAR2}');
  INSERT INTO alert_preferences VALUES ('${FAR2}', true, null, 'region', null, 'FR', null, null);
  INSERT INTO sitter_digest_queue(sitter_id, sit_id, distance_km) VALUES ('${FAR2}', '${s1}', 1);`);
const s4 = (await db.query(`INSERT INTO sits(user_id, title, city, status, published_at)
  VALUES ($1, 'Autre garde à Lyon', 'Lyon', 'published', now()) RETURNING id`, [OWNER_LYON])).rows[0].id;
assert.ok((await queue(s4)).some((r) => r.sitter_id === FAR2), 'absent avec zone France entière servi');
assert.equal((await db.query(`SELECT count(*)::int n FROM notifications WHERE user_id = $1 AND link = '/sits/' || $2::text`, [FAR2, s4])).rows[0].n, 1, 'cloche par la zone France');
passed.push('zone France entière en region + FR prioritaire');

// 7. Droits.
const grants = (await db.query(`SELECT has_function_privilege('authenticated', 'public.notify_sitters_for_sit(uuid)', 'EXECUTE') AS a,
  has_function_privilege('anon', 'public.notify_sitters_for_sit(uuid)', 'EXECUTE') AS b`)).rows[0];
assert.equal(grants.a, false);
assert.equal(grants.b, false);
passed.push('fonction fermée aux visiteurs et aux membres');

console.log(`ALR1 diffusion par position : ${passed.length} contrôles OK`);
for (const p of passed) console.log(`  ok ${p}`);
