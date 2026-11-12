// Test SQL du lot REL1 (12/11/2026) sur base éphémère (PGlite).
// Migration appliquée deux fois (rejouable), puis les règles de la
// spécification : brouillons presque prêts (A), candidatures sans réponse à 7
// et 10 jours (B1, B2), pose et effacement de la mention, lecture par le seul
// candidat, fonctions fermées aux rôles du navigateur.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
const root = new URL('../', import.meta.url);
const migration = readFileSync(new URL('drizzle/migrations/0143_rel1_relances.sql', root), 'utf8');
const passed = [];
const u = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

await db.exec(`
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
  GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
  CREATE SCHEMA auth;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
    SELECT nullif(current_setting('fixture.uid', true), '')::uuid
  $$;
  GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
  CREATE TYPE application_status AS ENUM('pending','viewed','discussing','accepted','rejected','cancelled');
  CREATE TYPE sit_status AS ENUM('draft','published','confirmed','in_progress','completed','cancelled','archived','expired');
  CREATE TABLE feature_flags(key text PRIMARY KEY, enabled boolean NOT NULL DEFAULT false, description text);
  CREATE TABLE profiles(id uuid PRIMARY KEY, first_name text, email text, city text,
    account_status text NOT NULL DEFAULT 'active', last_seen_at timestamptz DEFAULT now());
  CREATE TABLE sits(id uuid PRIMARY KEY, user_id uuid, title text, city text, status sit_status,
    start_date date, end_date date, absence_reason text, sitter_expectations text, cover_photo_url text,
    published_at timestamptz, updated_at timestamptz DEFAULT now() - interval '5 days');
  CREATE TABLE applications(id uuid PRIMARY KEY, sit_id uuid REFERENCES sits(id) ON DELETE CASCADE, sitter_id uuid,
    status application_status, created_at timestamptz);
  CREATE TABLE conversations(id uuid PRIMARY KEY, sit_id uuid, sitter_id uuid);
  CREATE TABLE messages(conversation_id uuid, sender_id uuid, is_system boolean);
  CREATE TABLE email_preferences(user_id uuid PRIMARY KEY, product_emails boolean);
  CREATE TABLE suppressed_emails(email text);
  CREATE TABLE email_send_log(template_name text, recipient_email text, status text, metadata jsonb, created_at timestamptz DEFAULT now());
`);

await db.exec(migration);
await db.exec(migration);
passed.push('migration rejouable');

const flags = (await db.query(`SELECT key, enabled FROM feature_flags ORDER BY key`)).rows;
assert.deepEqual(flags, [{ key: 'rel1_draft_almost_ready', enabled: false }, { key: 'rel1_owner_silent', enabled: false }]);
passed.push('deux drapeaux, éteints');

for (const fn of ['detect_almost_ready_drafts()', 'detect_unanswered_applications(integer)', 'sync_owner_response_pending(uuid[],integer)']) {
  for (const role of ['anon', 'authenticated']) {
    const { rows } = await db.query(`SELECT has_function_privilege($1, $2, 'EXECUTE') AS ok`, [role, `public.${fn}`]);
    assert.equal(rows[0].ok, false, `${fn} fermé à ${role}`);
  }
  const { rows } = await db.query(`SELECT has_function_privilege('service_role', $1, 'EXECUTE') AS ok`, [`public.${fn}`]);
  assert.equal(rows[0].ok, true);
}
passed.push('fonctions réservées au rôle service');

// ── A. Brouillons presque prêts ──────────────────────────────────────────
const TEXT = 'Nous partons deux semaines en famille.';
const owner = (n, extra = '') => db.exec(`INSERT INTO profiles(id, first_name, email, city${extra ? ', ' + extra.split('=')[0] : ''})
  VALUES ('${u(n)}', 'P${n}', 'p${n}@example.invalid', 'Lyon'${extra ? ', ' + extra.split('=')[1] : ''})`);
const draft = (n, ownerN, cols = {}) => {
  const row = { status: 'draft', start_date: "current_date + 20", end_date: "current_date + 30", absence_reason: `'${TEXT}'`,
    sitter_expectations: `'${TEXT}'`, updated_at: "now() - interval '5 days'", published_at: 'NULL', ...cols };
  return db.exec(`INSERT INTO sits(id, user_id, title, city, status, start_date, end_date, absence_reason, sitter_expectations, updated_at, published_at)
    VALUES ('${u(n)}', '${u(ownerN)}', 'Annonce ${n}', 'Lyon', '${row.status}', ${row.start_date}, ${row.end_date}, ${row.absence_reason}, ${row.sitter_expectations}, ${row.updated_at}, ${row.published_at})`);
};
for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9]) await owner(n);
await draft(101, 1);                                                  // cible
await draft(102, 2, { published_at: "now() - interval '40 days'" });  // déjà publiée une fois : cible
await draft(103, 3);                                                  // emails produit refusés
await db.exec(`INSERT INTO email_preferences VALUES ('${u(3)}', false)`);
await draft(104, 4);                                                  // relance de brouillon il y a 3 jours
await db.exec(`INSERT INTO email_send_log VALUES ('sit-draft-reminder', 'p4@example.invalid', 'sent', '{}', now() - interval '3 days')`);
await draft(105, 5, { updated_at: "now() - interval '2 hours'" });   // modifié il y a 2 heures
await draft(106, 6, { start_date: 'current_date + 1', end_date: 'current_date + 9' }); // départ dans 1 jour
await draft(107, 7, { absence_reason: "'Court'" });                  // texte trop court
await draft(108, 8);                                                  // adresse en liste de suppression
await db.exec(`INSERT INTO suppressed_emails VALUES ('p8@example.invalid')`);
await draft(109, 9);                                                  // deux relances anciennes : plafond de l'autre relance, cible ici
await db.exec(`INSERT INTO email_send_log VALUES
  ('sit-draft-reminder', 'p9@example.invalid', 'sent', '{"reminder_stage":1}', now() - interval '30 days'),
  ('sit-draft-reminder', 'p9@example.invalid', 'sent', '{"reminder_stage":2}', now() - interval '20 days')`);

const almost = async () => (await db.query(`SELECT id FROM detect_almost_ready_drafts() ORDER BY id`)).rows.map(r => r.id);
assert.deepEqual(await almost(), [u(101), u(102), u(109)]);
passed.push('A : cible exacte (ancienne annonce repassée en brouillon et plafond de deux relances inclus)');
passed.push('A : refus des emails produit, relance de moins de 7 jours, suppression, modification récente, départ proche, texte court écartés');

await db.exec(`INSERT INTO email_send_log VALUES ('sit-draft-almost-ready', 'p1@example.invalid', 'sent', '{"sit_id":"${u(101)}"}', now())`);
assert.deepEqual(await almost(), [u(102), u(109)]);
passed.push('A : un seul envoi par annonce');
await db.exec(`INSERT INTO email_send_log VALUES ('sit-draft-almost-ready', 'p2@example.invalid', 'failed', '{"sit_id":"${u(102)}"}', now())`);
assert.deepEqual(await almost(), [u(102), u(109)]);
passed.push('A : un envoi en échec laisse le brouillon dans la cible');

// ── B. Candidatures sans réponse ─────────────────────────────────────────
for (const n of [20, 21, 22, 23, 30, 31, 32, 33]) await owner(n);
const sit = (n, ownerN, cols = {}) => {
  const row = { status: 'published', start_date: 'current_date + 15', ...cols };
  return db.exec(`INSERT INTO sits(id, user_id, title, city, status, start_date, end_date)
    VALUES ('${u(n)}', '${u(ownerN)}', 'Garde ${n}', 'Annecy', '${row.status}', ${row.start_date}, current_date + 40)`);
};
const app = (n, sitN, sitterN, days, status = 'pending') => db.exec(`INSERT INTO applications VALUES
  ('${u(n)}', '${u(sitN)}', '${u(sitterN)}', '${status}', now() - interval '${days} days')`);
await sit(201, 20); await app(301, 201, 30, 12); await app(302, 201, 31, 8, 'viewed'); await app(303, 201, 32, 2);
await sit(202, 21); await app(304, 202, 30, 11);   // le propriétaire a écrit
await db.exec(`INSERT INTO conversations VALUES ('${u(401)}', '${u(202)}', '${u(30)}');
  INSERT INTO messages VALUES ('${u(401)}', '${u(21)}', false)`);
await sit(203, 22, { start_date: 'current_date - 1' }); await app(305, 203, 31, 14); // garde commencée
await sit(204, 23); await app(306, 204, 33, 13);   // propriétaire en liste de suppression
await db.exec(`INSERT INTO suppressed_emails VALUES ('p23@example.invalid')`);
await app(307, 201, 33, 20, 'discussing');          // en discussion : hors cible

const unanswered = async (days) => (await db.query(`SELECT * FROM detect_unanswered_applications($1) ORDER BY application_id`, [days])).rows;
let seven = await unanswered(7);
assert.deepEqual(seven.map(r => r.application_id), [u(301), u(302), u(306)]);
assert.equal(seven.find(r => r.application_id === u(306)).owner_suppressed, true);
assert.equal(seven[0].owner_suppressed, false);
assert.equal(seven[0].second_nudge_logged, false);
assert.equal(seven[0].days_since_created, 12);
passed.push('B1 : candidatures de plus de 7 jours, annonce publiée, garde à venir, aucun message du propriétaire');
let ten = await unanswered(10);
assert.deepEqual(ten.map(r => r.application_id), [u(301), u(306)]);
passed.push('B2 : même cible à 10 jours, propriétaire en liste de suppression compris');

await db.exec(`INSERT INTO email_send_log VALUES ('owner-pending-applications-second-nudge', 'p20@example.invalid', 'sent',
  '{"sit_id":"${u(201)}","idempotency_key":"pending-apps-second-${u(201)}"}', now() - interval '4 days')`);
seven = await unanswered(7);
assert.equal(seven[0].second_nudge_logged, true);
assert.ok(seven[0].second_nudge_settled_at);
passed.push('B1 : seconde relance tracée une fois par annonce, avec sa date');

// ── Mention : pose, lecture par le seul candidat, effacement ────────────
const sync = async (ids) => (await db.query(`SELECT * FROM sync_owner_response_pending($1::uuid[], 10)`, [ids])).rows[0];
assert.deepEqual(await sync([u(301), u(306), u(303)]), { marked: 2, cleared: 0 });
passed.push('mention posée sur les seules candidatures de la cible');
const since = (await db.query(`SELECT since FROM owner_response_pending WHERE application_id = '${u(301)}'`)).rows[0].since;
assert.deepEqual(await sync([u(301), u(306)]), { marked: 0, cleared: 0 });
passed.push('second passage : aucune ligne en double');

const readAs = async (uid) => {
  await db.exec(`SET ROLE authenticated; SELECT set_config('fixture.uid', '${uid}', false)`);
  const { rows } = await db.query(`SELECT application_id FROM owner_response_pending ORDER BY application_id`);
  await db.exec(`RESET ROLE`);
  return rows.map(r => r.application_id);
};
assert.deepEqual(await readAs(u(30)), [u(301)]);
assert.deepEqual(await readAs(u(33)), [u(306)]);
assert.deepEqual(await readAs(u(31)), []);
assert.deepEqual(await readAs(u(20)), []);
passed.push('mention lue par le seul candidat concerné (option B), ni par un autre gardien ni par le propriétaire');
await db.exec(`SET ROLE authenticated`);
await assert.rejects(db.exec(`UPDATE owner_response_pending SET cleared_at = now() WHERE true`), /permission denied/);
await db.exec(`RESET ROLE; SET ROLE anon`);
await assert.rejects(db.query(`SELECT 1 FROM owner_response_pending`), /permission denied/);
await db.exec(`RESET ROLE`);
passed.push('aucune écriture depuis le navigateur, aucune lecture anonyme');

// Le propriétaire écrit au candidat : la mention s'efface au passage suivant.
await db.exec(`INSERT INTO conversations VALUES ('${u(402)}', '${u(201)}', '${u(30)}');
  INSERT INTO messages VALUES ('${u(402)}', '${u(20)}', false)`);
assert.deepEqual(await sync([u(306)]), { marked: 0, cleared: 1 });
assert.deepEqual(await readAs(u(30)), []);
passed.push('réponse du propriétaire : mention effacée au passage suivant');

// La candidature revient dans la cible : date de première pose conservée.
await db.exec(`DELETE FROM messages WHERE conversation_id = '${u(402)}'`);
assert.deepEqual(await sync([u(301), u(306)]), { marked: 1, cleared: 0 });
const again = (await db.query(`SELECT since, cleared_at FROM owner_response_pending WHERE application_id = '${u(301)}'`)).rows[0];
assert.equal(String(again.since), String(since));
assert.equal(again.cleared_at, null);
passed.push('date de la première pose conservée');

// Aucun déclencheur de sits ni de applications n'est touché par la mention.
const { rows: cols } = await db.query(`SELECT table_name FROM information_schema.columns
  WHERE table_schema = 'public' AND column_name LIKE 'owner_response_pending%'`);
assert.deepEqual(cols, []);
passed.push('aucune colonne ajoutée à sits ni à applications');

await db.close();
console.log(JSON.stringify({ passed: true, count: passed.length, tests: passed }, null, 2));
