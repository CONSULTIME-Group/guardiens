// Élargissement progressif du rayon de l'Entraide (migration 0027), sur base réelle (PGlite).
// Couvre : préférence explicite respectée quel que soit le plancher, plancher
// appliqué aux personnes sans préférence, montée 30 puis 50 puis 100 dans
// enqueue_mission_wave, signal admin des besoins sans audience.
import { readFileSync, readdirSync } from 'node:fs';
import assert from 'node:assert/strict';

const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
const root = new URL('../', import.meta.url);
const file = process.env.MIGRATION_0027
  || new URL(`drizzle/migrations/${readdirSync(new URL('drizzle/migrations/', root)).find((f) => f.startsWith('0027_'))}`, root);
const migration = readFileSync(file, 'utf8');
const passed = [];

await db.exec(`
CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;
CREATE SCHEMA IF NOT EXISTS auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULL::uuid $$;
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
await db.exec(migration);
passed.push('La migration 0027 s\'applique');

// Un degré de latitude vaut environ 111,2 km.
const km = (d) => 45 + d / 111.195;
let n = 0;
const uid = (p) => `${p}-0000-4000-8000-${String(++n).padStart(12, '0')}`;
const owner = uid('11111111');
await db.query('INSERT INTO profiles(id,email,available_for_help) VALUES($1,$2,false)', [owner, 'o@t.fr']);
async function mission(floor = 30) {
  const id = uid('22222222');
  await db.query(
    `INSERT INTO small_missions(id,user_id,title,city,latitude,longitude,wave_radius_floor) VALUES($1,$2,'Aide','Ici',45,4.85,$3)`,
    [id, owner, floor],
  );
  return id;
}
async function helper(distKm, radius = null) {
  const id = uid('33333333');
  await db.query('INSERT INTO profiles(id,email,available_for_help,latitude,longitude) VALUES($1,$2,true,$3,4.85)', [id, `${id}@t.fr`, km(distKm)]);
  if (radius !== null) await db.query('INSERT INTO alert_preferences(user_id,radius_km) VALUES($1,$2)', [id, radius]);
  return id;
}
const audience = async (m, floor) =>
  (await db.query('SELECT helper_id FROM mission_wave_audience_floor($1,$2,100,0)', [m, floor])).rows.map((r) => r.helper_id);

// 1. Préférence explicite à 15 km : jamais retenue à 40 km, quel que soit le plancher.
const explicit15 = await helper(40, 15);
const m1 = await mission();
for (const floor of [30, 50, 100, 500]) assert.ok(!(await audience(m1, floor)).includes(explicit15), `plancher ${floor}`);
await db.query('UPDATE small_missions SET wave_radius_floor=100 WHERE id=$1', [m1]);
assert.ok(!(await db.query('SELECT helper_id FROM mission_wave_audience($1,100,0)', [m1])).rows.some((r) => r.helper_id === explicit15));
const e1 = await db.query('SELECT enqueue_mission_wave($1,10) AS r', [m1]);
assert.equal(e1.rows[0].r.count, 0);
passed.push('Préférence explicite à 15 km : jamais retenue à 40 km, quel que soit le plancher');

// 2. Sans préférence : retenue à 40 km quand le plancher vaut 50, écartée à 30.
const default40 = await helper(40);
const m2 = await mission();
assert.ok(!(await audience(m2, 30)).includes(default40));
assert.ok((await audience(m2, 50)).includes(default40));
passed.push('Sans préférence : retenue à 40 km quand le plancher vaut 50');

// Isolation : les deux personnes suivantes ne concernent que le test 3.
await db.query('UPDATE profiles SET available_for_help=false WHERE id=ANY($1)', [[explicit15, default40]]);

// 3. Montée 30, puis 50, puis 100 quand les paliers inférieurs sont vides.
const far = await helper(80);
const m3 = await mission();
const r3 = (await db.query('SELECT enqueue_mission_wave($1,10) AS r', [m3])).rows[0].r;
assert.equal(r3.radius_floor, 100);
assert.equal(r3.count, 1);
assert.equal(r3.helpers[0].helper_id, far);
assert.equal((await db.query('SELECT wave_radius_floor FROM small_missions WHERE id=$1', [m3])).rows[0].wave_radius_floor, 100);

const mid = await helper(45);
const m4 = await mission();
const r4 = (await db.query('SELECT enqueue_mission_wave($1,10) AS r', [m4])).rows[0].r;
assert.equal(r4.radius_floor, 50);
assert.deepEqual(r4.helpers.map((h) => h.helper_id), [mid]);
assert.equal((await db.query('SELECT wave_radius_floor FROM small_missions WHERE id=$1', [m4])).rows[0].wave_radius_floor, 50);

const near = await helper(10);
const m5 = await mission();
const r5 = (await db.query('SELECT enqueue_mission_wave($1,10) AS r', [m5])).rows[0].r;
assert.equal(r5.radius_floor, 30);
assert.deepEqual(r5.helpers.map((h) => h.helper_id), [near]);
passed.push('enqueue_mission_wave monte de 30 à 50 puis à 100, et enregistre le palier');

// Vague suivante : repart du plancher enregistré, les plus proches d'abord.
const r4b = (await db.query('SELECT enqueue_mission_wave($1,10) AS r', [m4])).rows[0].r;
assert.equal(r4b.radius_floor, 100);
assert.deepEqual(r4b.helpers.map((h) => h.helper_id), [far]);
passed.push('La vague suivante repart du plancher enregistré');

// 4. Signal admin : besoin ouvert depuis plus de 72 h sans personne à 100 km.
await db.query('UPDATE profiles SET available_for_help=false WHERE id<>$1', [owner]);
const m6 = await mission();
await db.query("UPDATE small_missions SET created_at=now()-interval '4 days' WHERE id=$1", [m6]);
await db.query("UPDATE small_missions SET status='completed' WHERE id<>$1", [m6]);
assert.equal((await db.query('SELECT detect_missions_without_audience() AS n')).rows[0].n, 1);
assert.equal((await db.query('SELECT detect_missions_without_audience() AS n')).rows[0].n, 0);
await db.query('UPDATE profiles SET available_for_help=true WHERE id=$1', [far]);
await db.query('SELECT detect_missions_without_audience()');
assert.equal((await db.query("SELECT count(*)::int c FROM admin_signals WHERE resolved_at IS NULL")).rows[0].c, 0);
passed.push('Signal admin créé à 72 h sans audience, puis résolu quand une personne devient joignable');

for (const p of passed) console.log(`ok ${p}`);
console.log(`\n${passed.length} vérifications réussies.`);
