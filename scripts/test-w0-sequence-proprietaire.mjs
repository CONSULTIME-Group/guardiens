// Test SQL du lot W0 (14/10/2026) : séquence propriétaire propre.
//
// Base éphémère (PGlite) au schéma utile, état de départ relu en production le
// 14/10/2026 (étapes des séquences onboarding-owner et owner-no-sit-relance),
// puis application de la migration deux fois (rejouable) et vérification :
// étapes, définition de has_published_sit et ses droits, transition des
// parcours en cours sans doublon, réouverture des propriétaires sortis trop
// tôt, sortie de reactivation-d30 pour un propriétaire jamais publié.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
const root = new URL('../', import.meta.url);
const migration = readFileSync(new URL('supabase/prepared-migrations/20261014160000_w0_sequence_proprietaire.sql', root), 'utf8');
const passed = [];

await db.exec(`
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
  GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
  CREATE TABLE profiles(id uuid PRIMARY KEY, role text, account_status text, email text, created_at timestamptz);
  CREATE TABLE sits(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, status text, published_at timestamptz);
  CREATE TABLE sit_status_history(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sit_id uuid, old_status text, new_status text, changed_at timestamptz);
  CREATE TABLE nurturing_sequences(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), key text UNIQUE NOT NULL, audience text NOT NULL,
    description text, active boolean NOT NULL, enrollment_rule jsonb NOT NULL DEFAULT '{}'::jsonb,
    anchor_field text NOT NULL DEFAULT 'created_at', priority integer NOT NULL DEFAULT 500,
    created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
  CREATE TABLE nurturing_steps(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sequence_id uuid NOT NULL REFERENCES nurturing_sequences(id) ON DELETE CASCADE,
    step_order integer NOT NULL, delay_hours integer NOT NULL, template_name text NOT NULL,
    exit_condition jsonb, send_condition jsonb, created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (sequence_id, step_order));
  CREATE TABLE user_journeys(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, sequence_key text NOT NULL,
    status text NOT NULL, current_step integer NOT NULL DEFAULT 0, started_at timestamptz NOT NULL DEFAULT now(),
    last_step_at timestamptz, completed_at timestamptz, exit_reason text,
    created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
    transient_failure_count integer NOT NULL DEFAULT 0);
  CREATE UNIQUE INDEX user_journeys_active_unique ON user_journeys(user_id, sequence_key) WHERE status = 'active';

  -- État de production du 14/10/2026.
  INSERT INTO nurturing_sequences(key, audience, active, priority) VALUES
    ('onboarding-owner', 'owner', true, 10),
    ('owner-no-sit-relance', 'owner', true, 20),
    ('reactivation-d30', 'all', true, 80);
  INSERT INTO nurturing_steps(sequence_id, step_order, delay_hours, template_name, exit_condition)
  SELECT id, s.o, s.h, s.t, s.x::jsonb FROM nurturing_sequences, (VALUES
    (1, 24, 'onboarding-j1', '{"type":"profile_complete","threshold":60}'),
    (2, 72, 'conseils-publication-annonce', '{"type":"has_published_sit"}'),
    (3, 168, 'conseils-annonce-personnalises', '{"type":"has_application_received"}'),
    (4, 336, 'relance-profil-incomplet', '{"type":"profile_complete","threshold":80}')
  ) AS s(o, h, t, x) WHERE key = 'onboarding-owner';
  INSERT INTO nurturing_steps(sequence_id, step_order, delay_hours, template_name, exit_condition)
  SELECT id, s.o, s.h, s.t, '{"type":"has_published_sit"}'::jsonb FROM nurturing_sequences, (VALUES
    (1, 0, 'owner-no-sit-j3'), (2, 168, 'owner-no-sit-j10'), (3, 504, 'owner-no-sit-j21')
  ) AS s(o, h, t) WHERE key = 'owner-no-sit-relance';
`);

const U = (n) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const people = [
  // id, rôle, jours depuis l'inscription
  [1, 'owner', 2], [2, 'owner', 9], [3, 'both', 12], [4, 'owner', 6],
  [5, 'owner', 18], [6, 'both', 16], [7, 'owner', 60], [8, 'owner', 60],
  [9, 'owner', 5], [10, 'owner', 40], [11, 'owner', 70],
];
for (const [n, role, d] of people) {
  await db.query(`INSERT INTO profiles VALUES ($1, $2, 'active', $3, now() - ($4 || ' days')::interval)`, [U(n), role, `p${n}@x.fr`, String(d)]);
}
// Publications : 8 a publié puis repassé en brouillon ; 9 n'a qu'un brouillon.
await db.exec(`
  INSERT INTO sits(user_id, status, published_at) VALUES ('${U(8)}', 'draft', now() - interval '20 days');
  INSERT INTO sits(user_id, status, published_at) VALUES ('${U(9)}', 'draft', NULL);
  INSERT INTO sits(user_id, status, published_at) VALUES ('${U(10)}', 'archived', NULL);
  -- 11 : annonce mise en ligne puis archivée avant le remplissage de published_at.
  INSERT INTO sits(id, user_id, status, published_at) VALUES ('${U(911)}', '${U(11)}', 'archived', NULL);
  INSERT INTO sit_status_history(sit_id, old_status, new_status, changed_at) VALUES
    ('${U(911)}', 'draft', 'published', '2026-07-21T08:00:00Z'), ('${U(911)}', 'published', 'archived', '2026-08-21T08:00:00Z');
`);
await db.exec(`
  -- 1 : onboarding-owner actif, pas 1 (j1 envoyé).
  INSERT INTO user_journeys(user_id, sequence_key, status, current_step) VALUES ('${U(1)}', 'onboarding-owner', 'active', 1);
  -- 2 : onboarding-owner actif, pas 3 (deux conseils envoyés).
  INSERT INTO user_journeys(user_id, sequence_key, status, current_step) VALUES ('${U(2)}', 'onboarding-owner', 'active', 3);
  -- 3 : owner-no-sit-relance actif, pas 1 (j3 envoyé).
  INSERT INTO user_journeys(user_id, sequence_key, status, current_step) VALUES ('${U(3)}', 'owner-no-sit-relance', 'active', 1);
  -- 4 : sorti au J+1 sur profil à 60 %, jamais entré dans owner-no-sit.
  INSERT INTO user_journeys(user_id, sequence_key, status, current_step, exit_reason, completed_at)
    VALUES ('${U(4)}', 'onboarding-owner', 'exited', 0, 'step_1_profile_complete', now() - interval '5 days');
  -- 5 : ancienne séquence terminée (4 étapes), jamais entré dans owner-no-sit.
  INSERT INTO user_journeys(user_id, sequence_key, status, current_step, completed_at)
    VALUES ('${U(5)}', 'onboarding-owner', 'completed', 4, now() - interval '2 days');
  -- 6 : sorti au J+1, mais déjà passé par owner-no-sit-relance : pas de réouverture.
  INSERT INTO user_journeys(user_id, sequence_key, status, current_step, exit_reason)
    VALUES ('${U(6)}', 'onboarding-owner', 'exited', 0, 'step_1_profile_complete');
  INSERT INTO user_journeys(user_id, sequence_key, status, current_step) VALUES ('${U(6)}', 'owner-no-sit-relance', 'completed', 3);
  -- 7 : reactivation-d30, owner jamais publié : sort.
  INSERT INTO user_journeys(user_id, sequence_key, status, current_step) VALUES ('${U(7)}', 'reactivation-d30', 'active', 1);
  -- 8 : reactivation-d30, owner qui a déjà publié : reste.
  INSERT INTO user_journeys(user_id, sequence_key, status, current_step) VALUES ('${U(8)}', 'reactivation-d30', 'active', 1);
  -- 10 : inscrit il y a 40 jours, sorti au J+1 : trop ancien pour reprendre.
  INSERT INTO user_journeys(user_id, sequence_key, status, current_step, exit_reason)
    VALUES ('${U(10)}', 'onboarding-owner', 'exited', 0, 'step_1_profile_complete');
`);

await db.exec(migration);
const snapshot = async () => (await db.query(`SELECT user_id, sequence_key, status, current_step, exit_reason FROM user_journeys ORDER BY user_id, sequence_key, status`)).rows;
const first = await snapshot();
await db.exec(migration);
assert.deepEqual(await snapshot(), first, 'la migration rejouée ne change rien');
passed.push('migration rejouable, aucune ligne modifiée au second passage');

const steps = (await db.query(`
  SELECT st.step_order, st.delay_hours, st.template_name, st.exit_condition, st.skip_condition
  FROM nurturing_steps st JOIN nurturing_sequences sq ON sq.id = st.sequence_id
  WHERE sq.key = 'onboarding-owner' ORDER BY st.step_order`)).rows;
assert.deepEqual(steps.map((s) => [s.step_order, s.delay_hours, s.template_name]), [
  [1, 24, 'onboarding-j1'], [2, 72, 'owner-no-sit-j3'], [3, 240, 'owner-no-sit-j10'], [4, 504, 'owner-no-sit-j21'],
]);
for (const s of steps) assert.deepEqual(s.exit_condition, { type: 'has_published_sit' });
assert.deepEqual(steps[0].skip_condition, { type: 'profile_complete', threshold: 60 });
assert.equal(steps[1].skip_condition, null);
passed.push('onboarding-owner : J+1, J+3, J+10, J+21, sortie à la publication, J+1 sauté à 60 %');

const seqs = (await db.query(`SELECT key, active FROM nurturing_sequences ORDER BY key`)).rows;
assert.deepEqual(seqs, [
  { key: 'onboarding-owner', active: true },
  { key: 'owner-no-sit-relance', active: false },
  { key: 'reactivation-d30', active: true },
]);
passed.push('owner-no-sit-relance éteinte');

const pub = async (n) => (await db.query(`SELECT public.has_published_sit($1) AS v`, [U(n)])).rows[0].v;
assert.equal(await pub(8), true, 'publié puis repassé en brouillon = publié');
assert.equal(await pub(9), false, 'brouillon seul = jamais publié');
assert.equal(await pub(10), false, 'archivé jamais mis en ligne = jamais publié');
assert.equal(await pub(11), true, 'mis en ligne puis archivé, date rattrapée depuis l’historique');
const backfilled = (await db.query(`SELECT published_at FROM sits WHERE id = $1`, [U(911)])).rows[0].published_at;
assert.equal(new Date(backfilled).toISOString(), '2026-07-21T08:00:00.000Z');
const priv = (await db.query(`SELECT
  has_function_privilege('anon', 'public.has_published_sit(uuid)', 'EXECUTE') AS anon,
  has_function_privilege('authenticated', 'public.has_published_sit(uuid)', 'EXECUTE') AS auth,
  has_function_privilege('service_role', 'public.has_published_sit(uuid)', 'EXECUTE') AS svc`)).rows[0];
assert.deepEqual(priv, { anon: false, auth: false, svc: true });
passed.push('has_published_sit : published_at seul, service_role seul');

const row = (n, key) => first.find((r) => r.user_id === U(n) && r.sequence_key === key && (r.status === 'active' || key !== 'onboarding-owner'));
assert.equal(row(1, 'onboarding-owner').current_step, 1, 'pas 1 inchangé');
assert.equal(row(2, 'onboarding-owner').current_step, 2, 'pas 3 de l’ancienne séquence = pas 2');
const moved = first.filter((r) => r.user_id === U(3));
assert.deepEqual(moved, [{ user_id: U(3), sequence_key: 'onboarding-owner', status: 'active', current_step: 2, exit_reason: null }]);
passed.push('parcours actifs renumérotés, owner-no-sit-relance rattaché à onboarding-owner');

assert.deepEqual(first.filter((r) => r.user_id === U(4)).map((r) => [r.status, r.current_step]), [['active', 1]]);
assert.deepEqual(first.filter((r) => r.user_id === U(5)).map((r) => [r.status, r.current_step]), [['active', 3]]);
assert.deepEqual(first.filter((r) => r.user_id === U(6)).map((r) => [r.sequence_key, r.status]), [
  ['onboarding-owner', 'exited'], ['owner-no-sit-relance', 'completed'],
]);
assert.deepEqual(first.filter((r) => r.user_id === U(10)).map((r) => r.status), ['exited']);
passed.push('réouverture des sortis trop tôt (21 jours au plus, jamais passés par owner-no-sit)');

assert.deepEqual(first.filter((r) => r.user_id === U(7)).map((r) => [r.status, r.exit_reason]), [['exited', 'owner_never_published']]);
assert.deepEqual(first.filter((r) => r.user_id === U(8)).map((r) => r.status), ['active']);
passed.push('reactivation-d30 : propriétaire jamais publié sorti, propriétaire publié gardé');

const actives = (await db.query(`SELECT user_id, count(*)::int AS n FROM user_journeys WHERE status = 'active' GROUP BY user_id HAVING count(*) > 1`)).rows;
assert.deepEqual(actives, [], 'un seul parcours actif par personne');
passed.push('un seul parcours actif par personne');

for (const p of passed) console.log(`ok - ${p}`);
console.log(`test-w0-sequence-proprietaire : ${passed.length} vérifications`);
