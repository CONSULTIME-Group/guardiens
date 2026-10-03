// Teste la migration reelle ; l'extension pg_cron est remplacee par son contrat local.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
const root = new URL('../', import.meta.url);
const migration = readFileSync(new URL('supabase/prepared-migrations/20261003183000_single_seo_cache_consumer.sql', root), 'utf8');
const health = readFileSync(new URL('scripts/fixtures/admin-cron-health-before-seo-20261003.sql', root), 'utf8');
const fixtures = [
  ['nominal', '', true],
  ['consommateur principal desactive', "UPDATE cron.job SET active=false WHERE jobid=2", false],
  ['horaire principal modifie', "UPDATE cron.job SET schedule='*/5 * * * *' WHERE jobid=2", false],
  ['doublon deja desactive', 'UPDATE cron.job SET active=false WHERE jobid=1', false],
  ['supervision modifiee', "CREATE OR REPLACE FUNCTION admin_cron_health() RETURNS jsonb LANGUAGE plpgsql AS $$ BEGIN RETURN '[]'::jsonb; END; $$", false],
];
for (const [name, change, success] of fixtures) {
  const db = new PGlite();
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA cron; CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT NULL::uuid $$;
    CREATE FUNCTION public.has_role(uuid,text) RETURNS boolean LANGUAGE sql AS $$ SELECT current_setting('role') IS DISTINCT FROM 'anon' $$;
    CREATE TABLE cron.job(jobid bigint PRIMARY KEY, jobname text, active boolean, schedule text);
    INSERT INTO cron.job VALUES (1,'flush-prerender-cache',true,'*/15 * * * *'),
      (2,'consume-seo-dirty-hourly',true,'10,25,40,55 * * * *'),(3,'autre-job',true,'0 * * * *');
    CREATE FUNCTION cron.alter_job(job_id bigint,schedule text DEFAULT NULL,command text DEFAULT NULL,database text DEFAULT NULL,username text DEFAULT NULL,active boolean DEFAULT NULL)
    RETURNS void LANGUAGE sql AS $$ UPDATE cron.job SET active=$6 WHERE jobid=$1 $$;
    CREATE TABLE cron_run_log(edge_name text,started_at timestamptz,finished_at timestamptz,status text,error_message text);
    CREATE TABLE push_delivery_jobs(status text, available_at timestamptz, expires_at timestamptz);
    INSERT INTO cron_run_log VALUES ('consume-seo-dirty',now(),now(),'partial',NULL),
      ('detect-deploy-and-mark-dirty',now(),now(),'success',NULL);
  `);
  await db.exec(health);
  if (change) await db.exec(change);
  const before = (await db.query('SELECT * FROM cron.job ORDER BY jobid')).rows;
  await db.exec('BEGIN');
  let error;
  try { await db.exec(migration); await db.exec('COMMIT'); }
  catch (e) { error = e; await db.exec('ROLLBACK'); }
  assert.equal(!error, success, `${name}: ${error?.message || 'la migration aurait du refuser'}`);
  const jobs = (await db.query('SELECT * FROM cron.job ORDER BY jobid')).rows;
  if (success) {
    assert.deepEqual(jobs, before.map((j) => j.jobid === 1 ? { ...j, active: false } : j));
    const backup = (await db.query('SELECT kind,name,data FROM _backup_prerender_jobs_20261003_1830')).rows;
    assert.equal(backup.length, 3);
    assert.equal(backup.some((r) => 'command' in r.data), false);
    assert.equal((await db.query("SELECT has_table_privilege('anon','_backup_prerender_jobs_20261003_1830','SELECT') AS allowed")).rows[0].allowed, false);
    assert.equal((await db.query("SELECT relrowsecurity AS enabled FROM pg_class WHERE oid='_backup_prerender_jobs_20261003_1830'::regclass")).rows[0].enabled, true);
    const result = (await db.query('SELECT admin_cron_health() AS result')).rows[0].result;
    assert.equal(result.some((r) => r.edge_name === 'flush-prerender-cache'), false);
    assert.equal(result.find((r) => r.edge_name === 'detect-deploy-and-mark-dirty').state, 'ok');
    const consumer = result.find((r) => r.edge_name === 'consume-seo-dirty');
    assert.equal(consumer.state, 'degraded'); assert.equal(consumer.partial_7d, 1); assert.equal(consumer.failed_7d, 0);
    await db.exec('SET ROLE anon');
    await assert.rejects(db.query('SELECT admin_cron_health()'), /Not authorized/);
    await db.exec('RESET ROLE');
  } else {
    assert.deepEqual(jobs, before);
    assert.equal((await db.query("SELECT to_regclass('_backup_prerender_jobs_20261003_1830') AS relation")).rows[0].relation, null);
  }
  await db.close(); console.log(`OK ${name}`);
}
console.log('5 scenarios SQL reussis, 0 echec');
