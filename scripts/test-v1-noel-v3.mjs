// Test SQL du lot V1 (14/10/2026) : email de Noël v3.
//
// Base éphémère (PGlite) au schéma utile, migration appliquée deux fois
// (rejouable), puis vérification : table des jetons réservée au service_role,
// photo obligatoire à la première mise en ligne (insertion publiée ou passage
// depuis un brouillon), republication depuis une annonce annulée jamais
// bloquée, statuts autres que « publiée » libres.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
const root = new URL('../', import.meta.url);
const migration = readFileSync(new URL('supabase/prepared-migrations/20261014170000_v1_noel_v3.sql', root), 'utf8');
const passed = [];

await db.exec(`
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
  GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
  CREATE TYPE sit_status AS ENUM ('draft', 'published', 'confirmed', 'in_progress', 'completed', 'cancelled', 'expired', 'archived');
  CREATE TABLE profiles(id uuid PRIMARY KEY);
  CREATE TABLE properties(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, photos text[], cover_photo_url text);
  CREATE TABLE owner_gallery(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, url text);
  CREATE TABLE sits(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, property_id uuid,
    status sit_status NOT NULL DEFAULT 'draft', cover_photo_url text, title text);
`);

await db.exec(migration);
await db.exec(migration);
passed.push('migration rejouable');

// ── Droits de la table des jetons ────────────────────────────────────────────
for (const role of ['anon', 'authenticated']) {
  for (const priv of ['SELECT', 'INSERT', 'UPDATE', 'DELETE']) {
    const { rows } = await db.query(`SELECT has_table_privilege($1, 'public.owner_noel_tokens', $2) AS ok`, [role, priv]);
    assert.equal(rows[0].ok, false, `${role} ${priv}`);
  }
}
for (const priv of ['SELECT', 'INSERT', 'UPDATE', 'DELETE']) {
  const { rows } = await db.query(`SELECT has_table_privilege('service_role', 'public.owner_noel_tokens', $1) AS ok`, [priv]);
  assert.equal(rows[0].ok, true, `service_role ${priv}`);
}
{
  const { rows } = await db.query(`SELECT relrowsecurity FROM pg_class WHERE relname = 'owner_noel_tokens'`);
  assert.equal(rows[0].relrowsecurity, true);
}
passed.push('jetons : service_role seul, RLS active');

const U = (n) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
for (let n = 1; n <= 9; n++) await db.query('INSERT INTO profiles VALUES ($1)', [U(n)]);

await db.exec(`
  INSERT INTO owner_noel_tokens(token, profile_id, expires_at) VALUES ('${'a'.repeat(48)}', '${U(1)}', now() + interval '30 days');
`);
{
  const { rows } = await db.query(`SELECT campaign, answers FROM owner_noel_tokens`);
  assert.equal(rows[0].campaign, 'noel_v3');
  assert.deepEqual(rows[0].answers, {});
}
await assert.rejects(
  db.query(`INSERT INTO owner_noel_tokens(token, profile_id, expires_at) VALUES ('${'a'.repeat(48)}', '${U(2)}', now())`),
  /unique|duplicate/i,
);
passed.push('jeton unique, valeurs par défaut');

const refuse = /Ajoutez au moins une photo/;

// 1 : aucun logement photographié, aucune galerie : brouillon accepté, publication refusée.
await db.exec(`
  INSERT INTO properties(id, user_id, photos) VALUES ('${U(101)}', '${U(1)}', '{}');
  INSERT INTO sits(id, user_id, property_id, status) VALUES ('${U(201)}', '${U(1)}', '${U(101)}', 'draft');
`);
await assert.rejects(db.query(`UPDATE sits SET status = 'published' WHERE id = '${U(201)}'`), refuse);
await assert.rejects(
  db.query(`INSERT INTO sits(user_id, property_id, status) VALUES ('${U(1)}', '${U(101)}', 'published')`),
  refuse,
);
{
  const { rows } = await db.query(`SELECT status FROM sits WHERE id = '${U(201)}'`);
  assert.equal(rows[0].status, 'draft');
}
passed.push('sans photo : brouillon vers publiée refusé, insertion publiée refusée');

// Le message porte l'indice sit_photo_required.
try {
  await db.query(`UPDATE sits SET status = 'published' WHERE id = '${U(201)}'`);
  assert.fail('attendu : refus');
} catch (e) {
  assert.equal(e.hint, 'sit_photo_required');
}
passed.push('indice sit_photo_required');

// 2 : photo dans la galerie du propriétaire : publication acceptée.
await db.exec(`
  INSERT INTO properties(id, user_id, photos) VALUES ('${U(102)}', '${U(2)}', NULL);
  INSERT INTO sits(id, user_id, property_id, status) VALUES ('${U(202)}', '${U(2)}', '${U(102)}', 'draft');
  INSERT INTO owner_gallery(user_id, url) VALUES ('${U(2)}', 'https://x/a.jpg');
  UPDATE sits SET status = 'published' WHERE id = '${U(202)}';
`);
passed.push('photo en galerie : publication acceptée');

// 3 : photo sur le logement.
await db.exec(`
  INSERT INTO properties(id, user_id, photos) VALUES ('${U(103)}', '${U(3)}', ARRAY['https://x/b.jpg']);
  INSERT INTO sits(id, user_id, property_id, status) VALUES ('${U(203)}', '${U(3)}', '${U(103)}', 'draft');
  UPDATE sits SET status = 'published' WHERE id = '${U(203)}';
`);
// 4 : couverture du logement seulement.
await db.exec(`
  INSERT INTO properties(id, user_id, photos, cover_photo_url) VALUES ('${U(104)}', '${U(4)}', '{}', 'https://x/c.jpg');
  INSERT INTO sits(user_id, property_id, status) VALUES ('${U(4)}', '${U(104)}', 'published');
`);
// 5 : couverture de l'annonce seulement.
await db.exec(`
  INSERT INTO properties(id, user_id, photos) VALUES ('${U(105)}', '${U(5)}', '{}');
  INSERT INTO sits(user_id, property_id, status, cover_photo_url) VALUES ('${U(5)}', '${U(105)}', 'published', 'https://x/d.jpg');
`);
passed.push('photo du logement, couverture du logement ou de l\'annonce : publication acceptée');

// 6 : couverture vide (espaces) : refusée.
await assert.rejects(
  db.query(`INSERT INTO sits(user_id, property_id, status, cover_photo_url) VALUES ('${U(1)}', '${U(101)}', 'published', '   ')`),
  refuse,
);
passed.push('couverture blanche : refusée');

// 7 : republication depuis annulée, sans photo : jamais bloquée.
//     Autres passages de statut sans photo : libres.
await db.exec(`
  ALTER TABLE sits DISABLE TRIGGER trg_guard_sit_publish_requires_photo;
  INSERT INTO sits(id, user_id, property_id, status) VALUES ('${U(207)}', '${U(1)}', '${U(101)}', 'published');
  ALTER TABLE sits ENABLE TRIGGER trg_guard_sit_publish_requires_photo;
  UPDATE sits SET status = 'confirmed' WHERE id = '${U(207)}';
  UPDATE sits SET status = 'cancelled' WHERE id = '${U(207)}';
  UPDATE sits SET status = 'published' WHERE id = '${U(207)}';
  UPDATE sits SET status = 'expired' WHERE id = '${U(207)}';
  UPDATE sits SET status = 'published' WHERE id = '${U(207)}';
  UPDATE sits SET title = 'Nouveau titre' WHERE id = '${U(207)}';
`);
{
  const { rows } = await db.query(`SELECT status FROM sits WHERE id = '${U(207)}'`);
  assert.equal(rows[0].status, 'published');
}
passed.push('republication (annulée ou expirée vers publiée) et changements hors statut : libres');

// 8 : brouillon sans photo qui reste brouillon ou passe en annulé : libre.
await db.exec(`
  UPDATE sits SET title = 'Brouillon' WHERE id = '${U(201)}';
  UPDATE sits SET status = 'cancelled' WHERE id = '${U(201)}';
`);
passed.push('brouillon sans photo modifiable et annulable');

// 9 : aucune ligne de production écrite par la migration.
{
  const { rows } = await db.query(`SELECT count(*)::int AS n FROM owner_noel_tokens`);
  assert.equal(rows[0].n, 1);
}

for (const p of passed) console.log(`ok  ${p}`);
console.log(`\n${passed.length} vérifications OK`);
