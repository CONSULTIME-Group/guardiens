// Lot L1 : la migration 0053 ne bloque que le PASSAGE en publication sans
// commune. Une annonce déjà publiée sans commune (cas réel 85315487) reste
// modifiable. Exécute le fichier de migration réel sur une base PGlite.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
const migration = readFileSync(new URL('../drizzle/migrations/0053_sit_publish_requires_city.sql', import.meta.url), 'utf8');
const MSG = 'Indiquez la commune de votre logement pour que les gardiens sachent où se trouve la garde.';
const passed = [];
await db.exec(`
  CREATE TYPE sit_status AS ENUM ('draft','published','confirmed','in_progress','completed','cancelled','archived','expired');
  CREATE TABLE sits(id text PRIMARY KEY, city text, specific_expectations text, status sit_status NOT NULL DEFAULT 'draft');
  INSERT INTO sits VALUES ('legacy-published', NULL, 'Ancienne description', 'published');
  INSERT INTO sits VALUES ('draft-no-city', NULL, 'Brouillon', 'draft');
  INSERT INTO sits VALUES ('draft-city', 'Zellwiller', 'Brouillon', 'draft');
`);
await db.exec(migration);

await db.exec(`UPDATE sits SET specific_expectations = 'Nouvelle description' WHERE id = 'legacy-published'`);
assert.equal((await db.query(`SELECT specific_expectations FROM sits WHERE id='legacy-published'`)).rows[0].specific_expectations, 'Nouvelle description');
passed.push('Annonce publiée sans commune : la description reste modifiable');

await db.exec(`UPDATE sits SET status = 'confirmed' WHERE id = 'legacy-published'`);
assert.equal((await db.query(`SELECT status FROM sits WHERE id='legacy-published'`)).rows[0].status, 'confirmed');
passed.push('Annonce publiée sans commune : passage publiée vers confirmée non bloqué');

await assert.rejects(db.exec(`UPDATE sits SET status = 'published' WHERE id = 'draft-no-city'`), (e) => e.message.includes(MSG));
assert.equal((await db.query(`SELECT status FROM sits WHERE id='draft-no-city'`)).rows[0].status, 'draft');
passed.push('Brouillon sans commune : publication refusée avec le message exact');

await db.exec(`UPDATE sits SET specific_expectations = 'Brouillon modifié' WHERE id = 'draft-no-city'`);
passed.push('Brouillon sans commune : modification hors publication autorisée');

await db.exec(`UPDATE sits SET status = 'published' WHERE id = 'draft-city'`);
passed.push('Brouillon avec commune : publication acceptée');

await assert.rejects(db.exec(`INSERT INTO sits VALUES ('insert-published', '  ', 'x', 'published')`), (e) => e.message.includes(MSG));
passed.push('Insertion directe en publiée sans commune refusée');

for (const p of passed) console.log(`ok - ${p}`);
console.log(`${passed.length}/${passed.length} sit-publish-requires-city`);
