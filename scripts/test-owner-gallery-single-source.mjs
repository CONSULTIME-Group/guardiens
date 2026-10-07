// Lot L2 : garde-fou et synchronisation de la Galerie, sur le fichier de
// migration réel (0054) exécuté dans une base PGlite.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
const migration = readFileSync(new URL('../drizzle/migrations/0054_l2_owner_gallery_single_source.sql', import.meta.url), 'utf8');
const U = '11111111-1111-4111-8111-111111111111';
const V = '22222222-2222-4222-8222-222222222222';
const url = (u, n) => `https://x/storage/v1/object/public/property-photos/${u}/owner-gallery/${n}.webp`;
const MSG = "Cette photo doit d'abord être ajoutée à la Galerie de votre profil propriétaire.";
const passed = [];
await db.exec(`
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
  CREATE SCHEMA auth;
  CREATE TABLE auth.ctx(uid uuid);
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS 'SELECT uid FROM auth.ctx LIMIT 1';
  CREATE TYPE sit_status AS ENUM ('draft','published','archived');
  CREATE TABLE owner_gallery(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, photo_url text NOT NULL, position int NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now());
  CREATE TABLE properties(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, photos text[], cover_photo_url text, description text);
  CREATE TABLE sits(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, title text, status sit_status, cover_photo_url text);
  CREATE TABLE profiles(id uuid PRIMARY KEY, avatar_url text);
  CREATE TABLE pets(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), photo_url text);
  -- Ligne historique avec un lien mort : la migration ne doit pas la bloquer.
  INSERT INTO properties(user_id, photos, cover_photo_url) VALUES ('${V}', ARRAY['${url(V,'dead')}'], '${url(V,'dead')}');
`);
await db.exec(migration);

await db.exec(`UPDATE properties SET description = 'ok' WHERE user_id = '${V}'`);
passed.push('Ligne existante : modification hors photos toujours possible');

await assert.rejects(db.exec(`INSERT INTO properties(user_id, photos) VALUES ('${U}', ARRAY['${url(U,'a')}'])`), (e) => e.message.includes(MSG));
passed.push('Refus : URL absente de la Galerie dans properties.photos');

await db.exec(`INSERT INTO owner_gallery(user_id, photo_url, position, created_at) VALUES
  ('${U}','${url(U,'a')}',0,'2026-10-01'),('${U}','${url(U,'b')}',1,'2026-10-02'),('${U}','${url(U,'c')}',2,'2026-10-03')`);
await db.exec(`INSERT INTO properties(user_id, photos, cover_photo_url) VALUES ('${U}', ARRAY['${url(U,'a')}','${url(U,'b')}'], '${url(U,'b')}')`);
passed.push('Accepte : URL présentes dans la Galerie du propriétaire');

await assert.rejects(db.exec(`INSERT INTO owner_gallery(user_id, photo_url) VALUES ('${U}','${url(U,'a')}')`), /duplicate|unique/i);
passed.push('Aucun doublon de photo_url par propriétaire');

await assert.rejects(db.exec(`UPDATE properties SET cover_photo_url = '${url(V,'dead')}' WHERE user_id = '${U}'`), (e) => e.message.includes(MSG));
passed.push("Refus : URL d'un autre propriétaire en couverture");

await db.exec(`INSERT INTO sits(user_id,title,status,cover_photo_url) VALUES
  ('${U}','Publiée','published','${url(U,'b')}'),('${U}','Archivée','archived','${url(U,'b')}'),('${U}','Animal','published','https://x/property-photos/${U}/pets/p.jpg')`);
await db.exec(`DELETE FROM owner_gallery WHERE photo_url = '${url(U,'b')}'`);
let p = (await db.query(`SELECT photos, cover_photo_url FROM properties WHERE user_id='${U}'`)).rows[0];
assert.deepEqual(p.photos, [url(U,'a')]);
assert.equal(p.cover_photo_url, url(U,'c'));
const s = (await db.query(`SELECT title, cover_photo_url FROM sits ORDER BY title`)).rows;
assert.equal(s.find((r) => r.title === 'Publiée').cover_photo_url, url(U,'c'));
assert.equal(s.find((r) => r.title === 'Archivée').cover_photo_url, url(U,'c'));
assert.ok(s.find((r) => r.title === 'Animal').cover_photo_url.includes('/pets/'));
passed.push('Suppression : retirée du logement, couvertures logement et annonces (tous statuts) passent à la suivante');

await db.exec(`DELETE FROM owner_gallery WHERE photo_url = '${url(U,'c')}'`);
p = (await db.query(`SELECT cover_photo_url FROM properties WHERE user_id='${U}'`)).rows[0];
assert.equal(p.cover_photo_url, url(U,'a'));
passed.push('Dernière photo supprimée : retour à la première de la Galerie');

await db.exec(`DELETE FROM owner_gallery WHERE photo_url = '${url(U,'a')}'`);
p = (await db.query(`SELECT photos, cover_photo_url FROM properties WHERE user_id='${U}'`)).rows[0];
assert.deepEqual(p.photos, []);
assert.equal(p.cover_photo_url, null);
assert.equal((await db.query(`SELECT count(*)::int n FROM sits WHERE cover_photo_url IS NULL`)).rows[0].n, 2);
passed.push('Galerie vide : couvertures à vide');

await db.exec(`INSERT INTO auth.ctx VALUES ('${U}')`);
await db.exec(`INSERT INTO profiles VALUES ('${U}', '${url(U,'avatar')}')`);
const ref = async (u) => (await db.query(`SELECT owner_photo_still_referenced($1) r`, [u])).rows[0].r;
assert.equal(await ref(url(U,'a')), false);
assert.equal(await ref(url(U,'avatar')), true);
assert.equal(await ref(url(V,'dead')), true);
passed.push('Fichier supprimable seulement sans référence, et seulement dans son propre dossier');

for (const x of passed) console.log(`ok - ${x}`);
console.log(`${passed.length}/${passed.length} owner-gallery-single-source`);
