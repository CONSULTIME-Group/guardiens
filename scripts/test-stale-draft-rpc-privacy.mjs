import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
const root = new URL('../', import.meta.url);
const baseline = readFileSync(new URL('scripts/fixtures/detect-stale-drafts-before.sql', root), 'utf8');
const migration = readFileSync(new URL('supabase/sql/pending/20260919_stale_draft_rpc_privacy.sql', root), 'utf8');
const passed = [];
await db.exec(`
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
  GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
  CREATE TYPE sit_status AS ENUM ('draft','published');
  CREATE TABLE profiles(id uuid PRIMARY KEY, first_name text,email text);
  CREATE TABLE sits(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),title text,city text,
    start_date date,end_date date,user_id uuid,status sit_status,created_at timestamptz);
  INSERT INTO profiles VALUES('11111111-1111-4111-8111-111111111111','Fixture','fixture@example.invalid');
  INSERT INTO sits(title,city,start_date,end_date,user_id,status,created_at)
  SELECT 'Fixture '||n,'Fixture',current_date+n,current_date+n+1,
    '11111111-1111-4111-8111-111111111111','draft',now()-interval '4 days'
  FROM generate_series(1,2) n;
  INSERT INTO sits(title,user_id,status,created_at,start_date,end_date) VALUES
    ('Recent','11111111-1111-4111-8111-111111111111','draft',now(),current_date+10,current_date+11),
    ('Expired','11111111-1111-4111-8111-111111111111','draft',now()-interval '5 days',current_date-2,current_date-1),
    ('Published','11111111-1111-4111-8111-111111111111','published',now()-interval '5 days',current_date+2,current_date+3);
`);
await db.exec(baseline);
await db.exec(`REVOKE ALL ON FUNCTION detect_stale_drafts() FROM PUBLIC;
  GRANT EXECUTE ON FUNCTION detect_stale_drafts() TO anon,authenticated,service_role;
  CREATE FUNCTION unrelated_detector() RETURNS integer LANGUAGE sql AS 'SELECT 1';`);
const run = () => db.query('SELECT * FROM detect_stale_drafts() ORDER BY sit_title');
const meta = async () => (await db.query("SELECT pg_get_functiondef(oid) AS definition,proowner,prosecdef,proconfig,provolatile FROM pg_proc WHERE oid='detect_stale_drafts()'::regprocedure")).rows;
const beforeMeta = await meta();
const beforeRows = (await run()).rows;
assert.equal(beforeRows.length,2);
for (const role of ['anon','authenticated']) {
  await db.exec(`SET ROLE ${role}`);
  assert.deepEqual((await run()).rows,beforeRows);
  await db.exec('RESET ROLE');
  passed.push(`Reproduces private row access by ${role} before the patch`);
}
const tableRows = (await db.query('SELECT * FROM sits ORDER BY title')).rows;
await db.exec(migration);
assert.deepEqual(await meta(),beforeMeta);
passed.push('Function body, owner, volatility, SECURITY DEFINER and search_path unchanged');
assert.deepEqual((await db.query('SELECT * FROM sits ORDER BY title')).rows,tableRows);
passed.push('Migration does not change any business row');
for (const role of ['anon','authenticated']) {
  await db.exec(`SET ROLE ${role}`);
  await assert.rejects(run(),{code:'42501'});
  assert.equal((await db.query('SELECT unrelated_detector() AS result')).rows[0].result,1);
  await db.exec('RESET ROLE');
  passed.push(`${role} is denied the private detector; unrelated functions unchanged`);
}
await db.exec('SET ROLE service_role');
assert.deepEqual((await run()).rows,beforeRows);
await db.exec('RESET ROLE');
passed.push('Server caller receives the exact same eligible drafts after the patch');
const acl = async () => (await db.query("SELECT proacl::text FROM pg_proc WHERE oid='detect_stale_drafts()'::regprocedure")).rows;
const afterAcl = await acl();
await db.exec(migration);
assert.deepEqual(await acl(),afterAcl);
passed.push('Repeated application preserves the restricted permissions');
await db.exec('GRANT EXECUTE ON FUNCTION detect_stale_drafts() TO PUBLIC');
await db.exec(migration);
assert.deepEqual(await acl(),afterAcl);
passed.push('PUBLIC grants are removed as well as direct role grants');

// Drift must abort rather than silently applying a reviewed ACL change to new code.
await db.exec("ALTER FUNCTION detect_stale_drafts() SET search_path TO public, pg_temp");
await assert.rejects(db.exec(migration),/changed since review/);
await db.exec('ROLLBACK');
await db.exec(baseline);
assert.deepEqual(await meta(),beforeMeta);
passed.push('Definition drift aborts the migration');

await db.exec('REVOKE EXECUTE ON FUNCTION detect_stale_drafts() FROM service_role');
await assert.rejects(db.exec(migration),/Missing service_role/);
await db.exec('ROLLBACK');
await db.exec('GRANT EXECUTE ON FUNCTION detect_stale_drafts() TO service_role');
passed.push('Missing preexisting service permission requires review');

// A hidden inherited grant must not turn this migration into a false success.
await db.exec(`CREATE ROLE legacy_reader; GRANT legacy_reader TO authenticated;
  GRANT EXECUTE ON FUNCTION detect_stale_drafts() TO legacy_reader;`);
await assert.rejects(db.exec(migration),/Unexpected effective permissions/);
await db.exec('ROLLBACK');
await db.exec('REVOKE EXECUTE ON FUNCTION detect_stale_drafts() FROM legacy_reader');
passed.push('Inherited access is detected and transactionally rejected');
assert.deepEqual(await meta(),beforeMeta);
await db.close();
console.log(JSON.stringify({passed:true,count:passed.length,engine:'PGlite PostgreSQL',production_changed:false,tests:passed},null,2));
