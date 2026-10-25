// Lot E20 « Vague proche » (migration 0098), sur Postgres local (PGlite).
// Couvre : aucun envoi au-delà de 30 km (rayon explicite compris), vague 1 à
// 15 km quand au moins une personne y est, ordre par distance, 10 au plus par
// vague, enchaînement vers 30 km, épuisement posé une seule fois, signal admin
// et aperçu du formulaire au même plafond.
import { readFileSync, readdirSync } from 'node:fs';
import assert from 'node:assert/strict';

const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
const root = new URL('../', import.meta.url);
const dir = new URL('drizzle/migrations/', root);
const file = (prefix) => new URL(readdirSync(dir).find((f) => f.startsWith(prefix)), dir);
const passed = [];

await db.exec(`
CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;
CREATE SCHEMA IF NOT EXISTS auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE TYPE mission_type_enum AS ENUM('besoin','offre');
CREATE TABLE profiles(id uuid PRIMARY KEY,email text,latitude double precision,longitude double precision,
  available_for_help boolean,account_status text DEFAULT 'active');
CREATE TABLE email_preferences(user_id uuid,new_mission_digest boolean DEFAULT true,product_emails boolean DEFAULT true);
CREATE TABLE suppressed_emails(email text);
CREATE TABLE blocked_users(blocker_id uuid,blocked_id uuid);
CREATE TABLE small_missions(id uuid PRIMARY KEY,user_id uuid,title text,city text,status text DEFAULT 'open',
  mission_type mission_type_enum DEFAULT 'besoin',latitude double precision,longitude double precision,
  wave_count integer NOT NULL DEFAULT 0,last_wave_at timestamptz,created_at timestamptz DEFAULT now());
CREATE TABLE mission_notification_queue(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),helper_id uuid,mission_id uuid,
  distance_km numeric,wave integer,status text DEFAULT 'queued',skip_reason text,queued_at timestamptz DEFAULT now(),
  sent_at timestamptz,UNIQUE(helper_id,mission_id));
CREATE TABLE mission_action_tokens(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),mission_id uuid,helper_id uuid,
  action text,token text,used_at timestamptz,created_at timestamptz DEFAULT now());
CREATE TABLE alert_preferences(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid,radius_km integer,
  alert_types text[] NOT NULL DEFAULT '{gardes,missions}',active boolean NOT NULL DEFAULT true);
CREATE TABLE admin_signals(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),signal_type text NOT NULL,severity text NOT NULL,
  entity_type text NOT NULL,entity_id uuid NOT NULL,detected_at timestamptz DEFAULT now(),resolved_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}',action_taken text);
CREATE UNIQUE INDEX idx_admin_signals_idempotent ON admin_signals(signal_type,entity_id) WHERE resolved_at IS NULL;
CREATE FUNCTION gen_random_bytes(n integer) RETURNS bytea LANGUAGE sql VOLATILE
  AS $$ SELECT decode(md5(random()::text||clock_timestamp()::text),'hex') $$;
CREATE FUNCTION mutual_aid_radius_km(p_user uuid,p_default numeric DEFAULT 30,p_max numeric DEFAULT 100)
 RETURNS numeric LANGUAGE sql STABLE AS $$
  SELECT least(coalesce((SELECT max(ap.radius_km)::numeric FROM alert_preferences ap WHERE ap.user_id=p_user
    AND coalesce(ap.active,true) AND ap.radius_km IS NOT NULL AND ap.alert_types @> array['missions']),p_default),p_max) $$;
`);
await db.exec(readFileSync(file('0027_'), 'utf8'));
await db.exec(readFileSync(file('0098_'), 'utf8'));
passed.push('Les migrations 0027 puis 0098 s\'appliquent');

// Un degré de latitude vaut environ 111,2 km.
const km = (d) => 45 + d / 111.195;
let n = 0;
const uid = (p) => `${p}-0000-4000-8000-${String(++n).padStart(12, '0')}`;
const owner = uid('11111111');
await db.query('INSERT INTO profiles(id,email,available_for_help) VALUES($1,$2,false)', [owner, 'o@t.fr']);
const helpers = [];
async function helper(distKm, radius = null) {
  const id = uid('33333333');
  await db.query('INSERT INTO profiles(id,email,available_for_help,latitude,longitude) VALUES($1,$2,true,$3,4.85)', [id, `${id}@t.fr`, km(distKm)]);
  if (radius !== null) await db.query('INSERT INTO alert_preferences(user_id,radius_km) VALUES($1,$2)', [id, radius]);
  helpers.push(id);
  return id;
}
async function mission() {
  const id = uid('22222222');
  await db.query(`INSERT INTO small_missions(id,user_id,title,city,latitude,longitude) VALUES($1,$2,'Aide','Ici',45,4.85)`, [id, owner]);
  return id;
}
const wave = async (m, size = 10) => (await db.query('SELECT enqueue_mission_wave($1,$2) AS r', [m, size])).rows[0].r;
const sendAll = (m) => db.query("UPDATE mission_notification_queue SET status='sent', sent_at=now() WHERE mission_id=$1", [m]);
const off = () => db.query('UPDATE profiles SET available_for_help=false WHERE id<>$1', [owner]);

// 1. Rien au-delà de 30 km, rayon explicite compris (le rayon peut seulement réduire).
const near10 = await helper(10);
const at29 = await helper(29);
const far31 = await helper(31);
const far80 = await helper(80);
const explicit50at40 = await helper(40, 50);
const explicit100at60 = await helper(60, 100);
const explicit15at20 = await helper(20, 15);
const m1 = await mission();
const r1 = await wave(m1);
const ids1 = r1.helpers.map((h) => h.helper_id);
assert.deepEqual(ids1, [near10, at29]);
for (const h of r1.helpers) assert.ok(Number(h.distance_km) <= 30, `distance ${h.distance_km}`);
for (const x of [far31, far80, explicit50at40, explicit100at60, explicit15at20]) assert.ok(!ids1.includes(x));
for (const floor of [30, 50, 100, 500]) {
  const rows = (await db.query('SELECT helper_id, distance_km FROM mission_wave_audience_floor($1,$2,100,0)', [m1, floor])).rows;
  assert.ok(rows.every((r) => Number(r.distance_km) <= 30), `plancher ${floor}`);
}
passed.push('Aucun envoi au-delà de 30 km, même avec un rayon déclaré de 50 ou 100 km ; un rayon de 15 km réduit');

// 2. Vague 1 à 15 km quand au moins une personne y est, 10 au plus, ordre par distance.
await off();
const ring15 = [];
for (const d of [14, 3, 9, 1, 12, 7, 5, 11, 2, 13, 8, 6]) ring15.push([d, await helper(d)]);
const ring30 = [];
for (const d of [22, 18, 27, 16, 25]) ring30.push([d, await helper(d)]);
const m2 = await mission();
const w1 = await wave(m2, 50);
assert.equal(w1.count, 10, '10 au plus, même si 50 sont demandés');
assert.equal(w1.radius_floor, 15);
const d1 = w1.helpers.map((h) => Number(h.distance_km));
assert.ok(d1.every((d) => d <= 15), 'vague 1 entièrement à 15 km');
assert.deepEqual(d1, [...d1].sort((a, b) => a - b), 'ordre par distance croissante');
assert.equal(w1.remaining, 7);
passed.push('Vague 1 à 15 km, 10 personnes au plus, les plus proches d\'abord');

// 3. Vague suivante : les 2 restants à 15 km, complétés jusqu'à 30 km.
await sendAll(m2);
const w2 = await wave(m2, 10);
const d2 = w2.helpers.map((h) => Number(h.distance_km));
assert.equal(w2.count, 7);
assert.equal(w2.radius_floor, 30);
assert.deepEqual(d2.slice(0, 2).map(Math.round), [13, 14], '15 km tant qu\'il en reste');
assert.ok(d2.slice(2).every((d) => d > 15 && d <= 30));
assert.deepEqual(d2, [...d2].sort((a, b) => a - b));
assert.equal(w2.remaining, 0);
passed.push('Vague suivante : d\'abord le reste à 15 km, puis jusqu\'à 30 km, même vague');

// 4. Moins de 10 personnes à 15 km : la vague 1 se complète jusqu'à 30 km.
await off();
for (const d of [4, 9, 19, 26]) await helper(d);
const m3 = await mission();
const w3 = await wave(m3);
assert.deepEqual(w3.helpers.map((h) => Math.round(Number(h.distance_km))), [4, 9, 19, 26]);
assert.equal(w3.remaining, 0);
passed.push('Moins de 10 personnes à 15 km : la même vague enchaîne jusqu\'à 30 km');

// 5. Épuisement : marqueur posé une seule fois, plus aucune vague ensuite.
await sendAll(m3);
const e1 = (await db.query('SELECT mark_mission_wave_exhausted($1) AS n', [m3])).rows[0].n;
assert.equal(e1, 4, 'nombre de personnes prévenues');
const e2 = (await db.query('SELECT mark_mission_wave_exhausted($1) AS n', [m3])).rows[0].n;
assert.equal(e2, null, 'déjà posé : aucun second message');
await helper(3); // une personne arrive ensuite dans le secteur
const w3b = await wave(m3);
assert.equal(w3b.count, 0);
assert.equal(w3b.exhausted, true);
passed.push('Épuisement posé une seule fois, plus aucune vague ensuite');

// 6. Signal admin et aperçu du formulaire au même plafond de 30 km.
await off();
await helper(40);
await helper(55, 100);
const m4 = await mission();
await db.query("UPDATE small_missions SET created_at=now()-interval '4 days' WHERE id=$1", [m4]);
await db.query("UPDATE small_missions SET status='completed' WHERE id<>$1", [m4]);
assert.equal((await db.query('SELECT detect_missions_without_audience() AS n')).rows[0].n, 1);
const preview = (await db.query('SELECT mission_wave_audience_preview(45, 4.85) AS c')).rows[0].c;
assert.equal(preview, 0);
await helper(12);
assert.equal((await db.query('SELECT mission_wave_audience_preview(45, 4.85) AS c')).rows[0].c, 1);
passed.push('Signal admin et aperçu du formulaire : 30 km au plus');

for (const p of passed) console.log(`ok ${p}`);
console.log(`\n${passed.length} contrôles verts.`);
