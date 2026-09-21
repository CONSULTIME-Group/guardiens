// Moteur de vagues de l'Entraide, verifications sur base reelle (PGlite).
// Couvre : les dix plus proches, la vague suivante, les jetons « je peux »
// (valide, deja utilise, expire, besoin ferme), et la fin des offres.
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
const root = new URL('../', import.meta.url);
const migration = readFileSync(new URL('drizzle/migrations/0009_entraide_wave_engine.sql', root), 'utf8');
const fixRaise = readFileSync(new URL('drizzle/migrations/0011_fix_entraide_raise_messages.sql', root), 'utf8');
const passed = [];

// Schema minimal, limite aux colonnes lues par le moteur.
await db.exec(`
CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;
GRANT USAGE ON SCHEMA public TO anon,authenticated,service_role;
CREATE TYPE mission_type_enum AS ENUM('besoin','offre');
CREATE TABLE profiles(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),email text,first_name text,
  latitude double precision,longitude double precision,available_for_help boolean,
  account_status text DEFAULT 'active',helps_with text);
CREATE TABLE email_preferences(user_id uuid,new_mission_digest boolean DEFAULT true,product_emails boolean DEFAULT true);
CREATE TABLE suppressed_emails(email text);
CREATE TABLE blocked_users(blocker_id uuid,blocked_id uuid);
CREATE TABLE small_missions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid,title text,description text,
  city text,slug text,status text DEFAULT 'open',mission_type mission_type_enum DEFAULT 'besoin',
  latitude double precision,longitude double precision,date_needed date,end_date date,
  duration_estimate text,exchange_offer text,category text DEFAULT 'other');
CREATE TABLE small_mission_responses(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),mission_id uuid,
  responder_id uuid,message text,status text DEFAULT 'pending',created_at timestamptz DEFAULT now());
CREATE TABLE mission_notification_queue(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),helper_id uuid,
  mission_id uuid,distance_km numeric,status text DEFAULT 'queued',skip_reason text,
  queued_at timestamptz DEFAULT now(),sent_at timestamptz,UNIQUE(helper_id,mission_id));
CREATE FUNCTION mutual_aid_radius_km(p_user uuid,p_default integer DEFAULT 30,p_max integer DEFAULT 100)
  RETURNS integer LANGUAGE sql STABLE AS $$ SELECT 100 $$;
-- pgcrypto absent de PGlite : substitut pour le tirage du jeton.
CREATE FUNCTION gen_random_bytes(n integer) RETURNS bytea LANGUAGE sql VOLATILE
  AS $$ SELECT decode(md5(random()::text||clock_timestamp()::text),'hex') $$;
CREATE FUNCTION strip_emojis(t text) RETURNS text LANGUAGE sql IMMUTABLE AS $$ SELECT t $$;
CREATE FUNCTION money_in_mutual_aid(t text) RETURNS boolean LANGUAGE sql IMMUTABLE AS $$ SELECT false $$;
CREATE FUNCTION mutual_aid_money_mention(t text) RETURNS boolean LANGUAGE sql IMMUTABLE AS $$ SELECT false $$;
`);

// Seules les parties du lot applicables hors production : on rejoue le fichier
// de migration en entier, il ne depend que du schema ci-dessus.
await db.exec(migration);
await db.exec(fixRaise);
passed.push('La migration du moteur s\'applique sur un schema minimal');

// Le declencheur existe deja en production, on le recree ici pour le tester.
await db.exec(`CREATE TRIGGER trg_validate_small_mission BEFORE INSERT OR UPDATE ON small_missions
  FOR EACH ROW EXECUTE FUNCTION validate_small_mission();`);

const owner = '11111111-1111-4111-8111-111111111111';
const mission = '22222222-2222-4222-8222-222222222222';
await db.query('INSERT INTO profiles(id,email,first_name,available_for_help) VALUES($1,$2,$3,false)', [owner, 'owner@test.fr', 'Jeanne']);
await db.query(
  `INSERT INTO small_missions(id,user_id,title,city,status,latitude,longitude) VALUES($1,$2,'Arroser les plantes','Lyon','open',45.75,4.85)`,
  [mission, owner],
);

// 25 personnes disponibles, de plus en plus loin (environ 1,1 km par cran).
const helpers = [];
for (let i = 1; i <= 25; i++) {
  const id = `33333333-3333-4333-8333-${String(i).padStart(12, '0')}`;
  helpers.push(id);
  await db.query(
    'INSERT INTO profiles(id,email,first_name,available_for_help,latitude,longitude) VALUES($1,$2,$3,true,$4,4.85)',
    [id, `h${i}@test.fr`, `Aide${i}`, 45.75 + i * 0.01],
  );
}

const audience = await db.query('SELECT helper_id,distance_km FROM mission_wave_audience($1,10,0)', [mission]);
assert.equal(audience.rows.length, 10);
assert.deepEqual(audience.rows.map((r) => r.helper_id), helpers.slice(0, 10));
passed.push('Le vivier renvoie les dix plus proches, dans l\'ordre de distance');

// Exclusions : auteur, blocage dans les deux sens, desinscription, adresse supprimee.
await db.query('UPDATE profiles SET available_for_help=true WHERE id=$1', [owner]);
const withOwner = await db.query('SELECT helper_id FROM mission_wave_audience($1,100,0)', [mission]);
assert.ok(!withOwner.rows.some((r) => r.helper_id === owner), 'auteur exclu');
await db.query('INSERT INTO blocked_users VALUES($1,$2)', [helpers[0], owner]);
await db.query('UPDATE email_preferences SET product_emails=false WHERE user_id=$1', [helpers[1]]);
await db.query('INSERT INTO email_preferences(user_id,product_emails) VALUES($1,false)', [helpers[1]]);
await db.query('INSERT INTO suppressed_emails VALUES($1)', ['h3@test.fr']);
await db.query('UPDATE profiles SET account_status=\'deleted\' WHERE id=$1', [helpers[3]]);
const filtered = (await db.query('SELECT helper_id FROM mission_wave_audience($1,100,0)', [mission])).rows.map((r) => r.helper_id);
for (const [i, why] of [[0, 'personne bloquee'], [1, 'desinscrit des emails produit'], [2, 'adresse supprimee'], [3, 'compte inactif']]) {
  assert.ok(!filtered.includes(helpers[i]), why);
}
passed.push('Auteur, blocages, desinscrits, adresses supprimees et comptes inactifs sont ecartes');

// Vague 1 puis vague 2 : jamais deux fois la meme personne.
const w1 = (await db.query('SELECT enqueue_mission_wave($1,10) AS r', [mission])).rows[0].r;
assert.equal(w1.ok, true);
assert.equal(w1.wave, 1);
assert.equal(w1.count, 10);
assert.equal(w1.helpers.length, 10);
assert.ok(w1.helpers.every((h) => typeof h.token === 'string' && h.token.length > 0));
const w2 = (await db.query('SELECT enqueue_mission_wave($1,10) AS r', [mission])).rows[0].r;
assert.equal(w2.wave, 2);
assert.equal(w2.count, 10);
const ids1 = new Set(w1.helpers.map((h) => h.helper_id));
assert.ok(w2.helpers.every((h) => !ids1.has(h.helper_id)), 'aucun doublon entre vagues');
const state = (await db.query('SELECT wave_count,last_wave_at FROM small_missions WHERE id=$1', [mission])).rows[0];
assert.equal(state.wave_count, 2);
assert.ok(state.last_wave_at);
passed.push('Deux vagues successives previennent vingt personnes distinctes, sans repetition');

// Jetons : valide, puis usage unique, puis expire, puis besoin ferme.
const token = w1.helpers[0].token;
const peek = (await db.query('SELECT peek_mission_action_token($1) AS r', [token])).rows[0].r;
assert.equal(peek.valid, true);
assert.equal(peek.mission_title, 'Arroser les plantes');
const used = (await db.query('SELECT consume_mission_action_token($1) AS r', [token])).rows[0].r;
assert.equal(used.ok, true);
const responses = await db.query('SELECT responder_id,message FROM small_mission_responses WHERE mission_id=$1', [mission]);
assert.equal(responses.rows.length, 1);
assert.equal(responses.rows[0].responder_id, w1.helpers[0].helper_id);
const twice = (await db.query('SELECT consume_mission_action_token($1) AS r', [token])).rows[0].r;
assert.deepEqual([twice.ok, twice.reason], [false, 'already_used']);
const unknown = (await db.query('SELECT peek_mission_action_token($1) AS r', ['jeton-inconnu'])).rows[0].r;
assert.deepEqual([unknown.valid, unknown.reason], [false, 'invalid']);
passed.push('Le jeton « je peux » cree une reponse, ne sert qu\'une fois, et un jeton inconnu est refuse');

const expired = w1.helpers[1].token;
await db.query('UPDATE mission_action_tokens SET expires_at=now()-interval \'1 day\' WHERE token=$1', [expired]);
const exp = (await db.query('SELECT peek_mission_action_token($1) AS r', [expired])).rows[0].r;
assert.deepEqual([exp.valid, exp.reason], [false, 'expired']);
const expConsume = (await db.query('SELECT consume_mission_action_token($1) AS r', [expired])).rows[0].r;
assert.deepEqual([expConsume.ok, expConsume.reason], [false, 'expired']);
passed.push('Un jeton expire est refuse a la lecture comme a l\'usage');

// « C'est pourvu » : une fois le besoin pris, les autres jetons ne valent plus.
const pourvu = w1.helpers[2].token;
await db.query('UPDATE small_missions SET status=\'in_progress\' WHERE id=$1', [mission]);
const closed = (await db.query('SELECT peek_mission_action_token($1) AS r', [pourvu])).rows[0].r;
assert.deepEqual([closed.valid, closed.reason], [false, 'mission_closed']);
const closedConsume = (await db.query('SELECT consume_mission_action_token($1) AS r', [pourvu])).rows[0].r;
assert.deepEqual([closedConsume.ok, closedConsume.reason], [false, 'mission_closed']);
passed.push('Besoin pourvu : les jetons restants ne creent plus de reponse');

// Fin des offres.
let refused = false;
try {
  await db.query(
    `INSERT INTO small_missions(user_id,title,description,city,mission_type,latitude,longitude) VALUES($1,'Je propose mon aide','Description assez longue pour passer les regles de saisie du formulaire.','Lyon','offre',45.75,4.85)`,
    [owner],
  );
} catch (e) {
  refused = e.hint === 'offer_creation_disabled' || /ne se publient plus/.test(e.message);
}
assert.ok(refused, 'la creation d\'offre doit etre refusee');
await db.query(
  `INSERT INTO small_missions(user_id,title,description,city,mission_type,latitude,longitude) VALUES($1,'Un besoin normal','Description assez longue pour passer les regles de saisie du formulaire.','Lyon','besoin',45.75,4.85)`,
  [owner],
);
passed.push('Les offres ne se creent plus, les besoins passent toujours');

// Reprise des offres : la phrase de profil remplace l'offre publiee.
const offreAuteur = '44444444-4444-4444-8444-444444444444';
await db.query('INSERT INTO profiles(id,email,first_name,available_for_help) VALUES($1,$2,$3,false)', [offreAuteur, 'offre@test.fr', 'Paul']);
await db.query(
  `INSERT INTO small_missions(user_id,title,description,city,mission_type,status,latitude,longitude)
   VALUES($1,'Je promene les chiens','Disponible le matin pour promener un chien du quartier.','Lyon','besoin','open',45.75,4.85)`,
  [offreAuteur],
);
await db.query('UPDATE small_missions SET mission_type=\'offre\' WHERE user_id=$1', [offreAuteur]);
await db.exec(`
WITH src AS (
  SELECT DISTINCT ON (user_id) user_id, left(btrim(title || ' : ' || coalesce(description,'')),200) AS phrase
  FROM small_missions WHERE mission_type='offre' AND status='open' ORDER BY user_id, id
)
UPDATE profiles p SET helps_with=src.phrase, available_for_help=true
FROM src WHERE p.id=src.user_id AND (p.helps_with IS NULL OR btrim(p.helps_with)='');
UPDATE small_missions SET status='completed' WHERE mission_type='offre' AND status='open';`);
const migrated = (await db.query('SELECT helps_with,available_for_help FROM profiles WHERE id=$1', [offreAuteur])).rows[0];
assert.ok(migrated.helps_with.startsWith('Je promene les chiens : '));
assert.ok(migrated.helps_with.length <= 200);
assert.equal(migrated.available_for_help, true);
const remaining = (await db.query("SELECT count(*)::int AS n FROM small_missions WHERE mission_type='offre' AND status='open'")).rows[0].n;
assert.equal(remaining, 0);
passed.push('Reprise des offres : phrase de profil remplie, visibilite activee, offre cloturee');

// Garde-fou de longueur sur la phrase de profil.
let tooLong = false;
try {
  await db.query('UPDATE profiles SET helps_with=$2 WHERE id=$1', [offreAuteur, 'a'.repeat(201)]);
} catch (e) {
  tooLong = /profiles_helps_with_len/.test(e.message);
}
assert.ok(tooLong, 'plus de 200 caracteres doit etre refuse');
passed.push('La phrase de profil est plafonnee a 200 caracteres');

for (const p of passed) console.log('ok -', p);
console.log(`\n${passed.length} verifications reussies`);
await db.close();
