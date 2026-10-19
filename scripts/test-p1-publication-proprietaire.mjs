// Test SQL du lot P1 (19/10/2026) : seul le propriétaire publie son annonce.
//
// Base éphémère (PGlite), migration appliquée deux fois (rejouable), puis :
// publication refusée sans utilisateur connecté (mise à jour et insertion),
// publication forcée possible dans une transaction explicite, publication
// par une session (propriétaire ou admin) libre, autres transitions libres,
// création de brouillon côté serveur libre.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
const root = new URL('../', import.meta.url);
const migration = readFileSync(new URL('drizzle/migrations/0094_p1_publication_proprietaire.sql', root), 'utf8');
const passed = [];

await db.exec(`
  CREATE SCHEMA auth;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
    SELECT nullif(current_setting('fixture.uid', true), '')::uuid
  $$;
  CREATE TYPE sit_status AS ENUM ('draft', 'published', 'confirmed', 'in_progress', 'completed', 'cancelled', 'expired', 'archived');
  CREATE TABLE sits(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid,
    status sit_status NOT NULL DEFAULT 'draft', title text);
`);

await db.exec(migration);
await db.exec(migration);
passed.push('migration rejouable');

const OWNER = '00000000-0000-0000-0000-000000000001';
const ADMIN = '00000000-0000-0000-0000-000000000002';
const asUser = (uid) => db.exec(`SELECT set_config('fixture.uid', '${uid}', false)`);
const asServer = () => db.exec(`SELECT set_config('fixture.uid', '', false)`);
const draft = async () => (await db.query(`INSERT INTO sits(user_id, title) VALUES ($1, 'Garde') RETURNING id`, [OWNER])).rows[0].id;
const status = async (id) => (await db.query('SELECT status FROM sits WHERE id = $1', [id])).rows[0].status;

// Côté serveur, sans session : refus.
await asServer();
{
  const id = await draft();
  passed.push('brouillon créé côté serveur');
  await assert.rejects(
    db.query(`UPDATE sits SET status = 'published' WHERE id = $1`, [id]),
    /publication_reservee_au_proprietaire/,
  );
  assert.equal(await status(id), 'draft');
  passed.push('serveur : brouillon vers en ligne refusé');

  await assert.rejects(
    db.query(`INSERT INTO sits(user_id, status, title) VALUES ($1, 'published', 'Direct')`, [OWNER]),
    /publication_reservee_au_proprietaire/,
  );
  passed.push('serveur : insertion directe en ligne refusée');

  // Publication forcée, transaction explicite.
  await db.transaction(async (tx) => {
    await tx.query(`SELECT set_config('guardiens.publication_forcee', 'on', true)`);
    await tx.query(`UPDATE sits SET status = 'published' WHERE id = $1`, [id]);
  });
  assert.equal(await status(id), 'published');
  passed.push('publication forcée dans une transaction explicite');

  // Le réglage ne survit pas à la transaction.
  const other = await draft();
  await assert.rejects(
    db.query(`UPDATE sits SET status = 'published' WHERE id = $1`, [other]),
    /publication_reservee_au_proprietaire/,
  );
  passed.push('réglage limité à sa transaction');

  // Autres transitions côté serveur : libres.
  await db.query(`UPDATE sits SET status = 'confirmed' WHERE id = $1`, [id]);
  await db.query(`UPDATE sits SET status = 'published' WHERE id = $1`, [id]);
  assert.equal(await status(id), 'published');
  await db.query(`UPDATE sits SET status = 'expired' WHERE id = $1`, [id]);
  await db.query(`UPDATE sits SET status = 'archived' WHERE id = $1`, [other]);
  passed.push('serveur : retour en ligne après confirmation et autres transitions libres');

  await db.query(`UPDATE sits SET title = 'Nouveau titre' WHERE id = $1`, [other]);
  passed.push('serveur : mise à jour sans changement de statut libre');
}

// Session du propriétaire, puis session admin : libres.
{
  await asServer();
  const id = await draft();
  const id2 = await draft();
  await asUser(OWNER);
  await db.query(`UPDATE sits SET status = 'published' WHERE id = $1`, [id]);
  assert.equal(await status(id), 'published');
  await db.query(`INSERT INTO sits(user_id, status, title) VALUES ($1, 'published', 'Directe')`, [OWNER]);
  passed.push('propriétaire connecté : publication libre');
  await asUser(ADMIN);
  await db.query(`UPDATE sits SET status = 'published' WHERE id = $1`, [id2]);
  assert.equal(await status(id2), 'published');
  passed.push('admin connecté (Publier à la place) : publication libre');
}

for (const p of passed) console.log(`ok · ${p}`);
console.log(`${passed.length} vérifications`);
