// Execute la migration reelle sur Postgres local, sans requete de production.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const root = new URL('../', import.meta.url);
const initial = 'supabase/migrations/20260907145826_42243f2c-6abe-4eea-9d8d-edaa9cb40fe2.sql';
const migration = process.argv[2] || 'supabase/migrations/20261003180000_profile_seo_lifecycle.sql';
const db = new PGlite();
const a = '11111111-0000-4000-8000-000000000001';
const b = '11111111-0000-4000-8000-000000000002';
const photo = '22222222-0000-4000-8000-000000000001';
await db.exec(`
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
  CREATE TABLE profiles (
    id uuid PRIMARY KEY, role text, first_name text, city text, bio text,
    avatar_url text, identity_verified boolean, postal_code text,
    account_status text DEFAULT 'active', profile_completion integer,
    departement_code text, certifications text[], is_founder boolean,
    completed_sits_count integer, hero_image_index integer, last_seen_at timestamptz,
    private_note text
  );
  CREATE TABLE sitter_profiles (
    user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    motivation text, animal_types text[], geographic_radius text, languages text[],
    sensitivities text, updated_at timestamptz
  );
  CREATE TABLE sitter_gallery (
    id uuid PRIMARY KEY, user_id uuid REFERENCES profiles(id) ON DELETE CASCADE, caption text
  );
`);
await db.exec(readFileSync(new URL(initial, root), 'utf8'));
if (migration !== initial) await db.exec(readFileSync(new URL(migration, root), 'utf8'));
const sql = (s) => db.exec(s);
const value = async (s) => (await db.query(s)).rows[0];
const stamp = async (id = a) => (await value(`SELECT seo_dirty_at::text AS date FROM profiles WHERE id='${id}'`)).date;
const clear = () => sql('UPDATE profiles SET seo_dirty_at = NULL');
const reset = async () => {
  await sql('TRUNCATE sitter_gallery, sitter_profiles, profiles CASCADE');
  await sql(`INSERT INTO profiles(id,role,first_name,bio,profile_completion) VALUES
    ('${a}','sitter','Test','Bio publique',60), ('${b}','both','Test 2','Bio publique',60)`);
  await clear();
};
const cases = [];
const test = (name, run) => cases.push({ name, run });

test('une modification de bio reste marquee', async () => {
  await sql(`UPDATE profiles SET bio='Nouvelle bio' WHERE id='${a}'`);
  assert.ok(await stamp());
});
test('creation d un profil gardien', async () => {
  await sql(`DELETE FROM profiles WHERE id='${a}'; INSERT INTO profiles(id,role) VALUES ('${a}','sitter')`);
  assert.ok(await stamp());
});
test('creation proprietaire seule sans render gardien', async () => {
  await sql(`DELETE FROM profiles WHERE id='${a}'; INSERT INTO profiles(id,role) VALUES ('${a}','owner')`);
  assert.equal(await stamp(), null);
});
test('sortie du role gardien', async () => {
  await sql(`UPDATE profiles SET role='owner' WHERE id='${a}'`);
  assert.ok(await stamp());
});
test('entree dans le role gardien', async () => {
  await sql(`UPDATE profiles SET role='owner' WHERE id='${a}'`); await clear();
  await sql(`UPDATE profiles SET role='both' WHERE id='${a}'`);
  assert.ok(await stamp());
});
test('suspension seule', async () => {
  await sql(`UPDATE profiles SET account_status='suspended' WHERE id='${a}'`);
  assert.ok(await stamp());
});
test('reactivation seule', async () => {
  await sql(`UPDATE profiles SET account_status='suspended' WHERE id='${a}'`); await clear();
  await sql(`UPDATE profiles SET account_status='active' WHERE id='${a}'`);
  assert.ok(await stamp());
});
test('franchissement du seuil de vue publique', async () => {
  await sql(`UPDATE profiles SET profile_completion=39 WHERE id='${a}'`);
  assert.ok(await stamp());
});
test('nouvelle modification pendant un recache ne peut pas etre acquittee par l ancienne date', async () => {
  await sql(`UPDATE profiles SET seo_dirty_at='2099-01-01 00:00:00+00' WHERE id='${a}'`);
  const old = await stamp();
  await sql(`UPDATE profiles SET bio='Encore une bio' WHERE id='${a}'`);
  assert.notEqual(await stamp(), old);
  await sql(`UPDATE profiles SET seo_dirty_at=NULL WHERE id='${a}' AND seo_dirty_at='${old}'::timestamptz`);
  assert.ok(await stamp());
  assert.equal((await value(`SELECT seo_dirty_at > '${old}'::timestamptz AS newer FROM profiles WHERE id='${a}'`)).newer, true);
});
test('acquittement de la bonne version sans reboucler', async () => {
  await sql(`UPDATE profiles SET bio='Encore une bio' WHERE id='${a}'`);
  const current = await stamp();
  await sql(`UPDATE profiles SET seo_dirty_at=NULL WHERE id='${a}' AND seo_dirty_at='${current}'::timestamptz`);
  assert.equal(await stamp(), null);
});
test('heartbeat et donnees privees sans render', async () => {
  await sql(`UPDATE profiles SET last_seen_at=now(), private_note='Prive' WHERE id='${a}'`);
  assert.equal(await stamp(), null);
});
test('creation des details gardien', async () => {
  await sql(`INSERT INTO sitter_profiles(user_id,motivation) VALUES ('${a}','Presentation')`);
  assert.ok(await stamp());
});
test('modification d un autre champ public gardien', async () => {
  await sql(`INSERT INTO sitter_profiles(user_id,motivation) VALUES ('${a}','Presentation')`); await clear();
  await sql(`UPDATE sitter_profiles SET languages=ARRAY['fr'] WHERE user_id='${a}'`);
  assert.ok(await stamp());
});
test('suppression des details gardien conserve la demande sur profiles', async () => {
  await sql(`INSERT INTO sitter_profiles(user_id,motivation) VALUES ('${a}','Presentation')`); await clear();
  await sql(`DELETE FROM sitter_profiles WHERE user_id='${a}'`);
  assert.ok(await stamp());
});
test('reaffectation des details marque les deux profils', async () => {
  await sql(`INSERT INTO sitter_profiles(user_id,motivation) VALUES ('${a}','Presentation')`); await clear();
  await sql(`UPDATE sitter_profiles SET user_id='${b}' WHERE user_id='${a}'`);
  assert.ok(await stamp(a)); assert.ok(await stamp(b));
});
test('un champ gardien prive ne marque pas', async () => {
  await sql(`INSERT INTO sitter_profiles(user_id,motivation) VALUES ('${a}','Presentation')`); await clear();
  await sql(`UPDATE sitter_profiles SET sensitivities='Prive', updated_at=now() WHERE user_id='${a}'`);
  assert.equal(await stamp(), null);
});
test('ajout d une photo', async () => {
  await sql(`INSERT INTO sitter_gallery(id,user_id,caption) VALUES ('${photo}','${a}','Legende')`);
  assert.ok(await stamp());
});
test('retrait de la derniere photo', async () => {
  await sql(`INSERT INTO sitter_gallery(id,user_id,caption) VALUES ('${photo}','${a}','Legende')`); await clear();
  await sql(`DELETE FROM sitter_gallery WHERE id='${photo}'`);
  assert.ok(await stamp());
});
test('reaffectation de photo marque les deux comptes', async () => {
  await sql(`INSERT INTO sitter_gallery(id,user_id,caption) VALUES ('${photo}','${a}','Legende')`); await clear();
  await sql(`UPDATE sitter_gallery SET user_id='${b}' WHERE id='${photo}'`);
  assert.ok(await stamp(a)); assert.ok(await stamp(b));
});
test('legende privee et reaffectation identique sans render', async () => {
  await sql(`INSERT INTO sitter_gallery(id,user_id,caption) VALUES ('${photo}','${a}','Legende')`); await clear();
  await sql(`UPDATE sitter_gallery SET caption='Autre legende', user_id='${a}' WHERE id='${photo}'`);
  assert.equal(await stamp(), null);
});
test('sauvegarde limitee a quatre definitions et fermee a anon', async () => {
  const backup = '_backup_profile_seo_triggers_20261003_1800';
  assert.equal((await value(`SELECT count(*)::integer AS n FROM ${backup}`)).n, 4);
  assert.equal((await value(`SELECT relrowsecurity AS enabled FROM pg_class WHERE oid='${backup}'::regclass`)).enabled, true);
  assert.equal((await value(`SELECT has_table_privilege('anon','${backup}','SELECT') AS allowed`)).allowed, false);
});
test('fonctions de trigger reservees et declenchement sous authenticated', async () => {
  for (const fn of ['mark_profile_seo_dirty', 'mark_sitter_profile_seo_dirty', 'mark_sitter_gallery_seo_dirty']) {
    assert.equal((await value(`SELECT has_function_privilege('anon','${fn}()','EXECUTE') AS allowed`)).allowed, false);
    assert.equal((await value(`SELECT has_function_privilege('service_role','${fn}()','EXECUTE') AS allowed`)).allowed, true);
  }
  await sql('GRANT SELECT, UPDATE ON profiles TO authenticated; SET ROLE authenticated');
  try { await sql(`UPDATE profiles SET bio='Modification du titulaire' WHERE id='${a}'`); }
  finally { await sql('RESET ROLE'); }
  assert.ok(await stamp());
});

let failures = 0;
for (const { name, run } of cases) {
  try { await reset(); await run(); console.log(`OK ${name}`); }
  catch (error) { failures++; console.error(`ECHEC ${name}: ${error.message}`); }
}
await db.close();
console.log(`${cases.length - failures} reussis, ${failures} echecs, ${cases.length} scenarios SQL`);
if (failures) process.exitCode = 1;
