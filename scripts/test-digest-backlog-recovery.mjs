import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Reuse a local PGlite install without changing application dependencies.
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
const root = new URL('../', import.meta.url);
const baseline = readFileSync(new URL('drizzle/migrations/0000_resolve_recovered_nurturing_signal.sql', root), 'utf8');
const migration = readFileSync(new URL('supabase/migrations/20260919120000_digest_backlog_recovery.sql', root), 'utf8');
const passed = [];
await db.exec(`
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
  GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
  CREATE TABLE admin_signals(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), signal_type text,
    entity_type text DEFAULT 'system', entity_id uuid DEFAULT gen_random_uuid(),
    metadata jsonb DEFAULT '{"source":"sitter-daily-digest"}',
    detected_at timestamptz DEFAULT now()-interval '2 days', resolved_at timestamptz, action_taken text);
  CREATE TABLE cron_run_log(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), edge_name text DEFAULT 'send-sitter-daily-digest',
    started_at timestamptz, finished_at timestamptz, status text, metrics jsonb, error_message text);
  CREATE TABLE sitter_digest_queue(status text, queued_at timestamptz);
  CREATE TABLE profiles(id uuid,identity_document_url text,latitude numeric,longitude numeric);
  CREATE TABLE sits(id uuid,status text);
  CREATE TABLE applications(id uuid,sit_id uuid,status text);
`);
await db.exec(baseline);
await db.exec(`REVOKE ALL ON FUNCTION auto_resolve_admin_signals() FROM PUBLIC,anon,authenticated;
  GRANT EXECUTE ON FUNCTION auto_resolve_admin_signals() TO service_role;`);
const target = '11111111-1111-4111-8111-111111111111';
const fullMetrics = {queue_remaining:0, queued_today_remaining:0, budget_reached:false, claim_skipped:0, errors:[]};
async function seed() {
  await db.exec(`INSERT INTO admin_signals(id,signal_type) VALUES ('${target}','digest_queue_morning_backlog');
    INSERT INTO cron_run_log(started_at,finished_at,status,metrics)
    VALUES(now()-interval '22 hours',now()-interval '22 hours'+interval '30 seconds','success',
      '{"queue_remaining":0,"sitters_processed":0,"reason":"empty_queue"}');`);
}
const call = () => db.query('SELECT * FROM auto_resolve_admin_signals()');
await seed();
assert.deepEqual((await call()).rows, []);
passed.push('Reproduces stale backlog alert with the production function');
const meta = async () => (await db.query("SELECT proacl::text,prosecdef,proconfig,proowner FROM pg_proc WHERE oid='auto_resolve_admin_signals()'::regprocedure")).rows;
const oldMeta = await meta();
const oldRows = (await db.query('SELECT * FROM admin_signals')).rows;
await db.exec(migration);
assert.deepEqual(await meta(), oldMeta);
assert.deepEqual((await db.query('SELECT * FROM admin_signals')).rows, oldRows);
passed.push('Migration preserves ACL, owner, SECURITY DEFINER and search_path, and changes no signal');
await db.exec('TRUNCATE admin_signals,cron_run_log,sitter_digest_queue');

async function scenario(name, setup = '', expected = false) {
  await db.exec('BEGIN');
  try {
    await seed();
    if (setup) await db.exec(setup);
    await db.exec('SET LOCAL ROLE service_role');
    await call();
    await db.exec('RESET ROLE');
    const row = (await db.query('SELECT resolved_at,action_taken FROM admin_signals WHERE id=$1',[target])).rows[0];
    assert.equal(row.resolved_at !== null, expected, name);
    if (expected) assert.equal(row.action_taken, 'auto_resolved_digest_backlog_recovered');
    passed.push(name);
  } finally { await db.exec('ROLLBACK'); }
}
const metrics = value => `UPDATE cron_run_log SET metrics='${JSON.stringify(value)}'::jsonb`;
await scenario('Recent nominal empty queue closes an old incident before the next morning digest', '', true);
await scenario('Complete processing with zero remaining and no error closes the incident', metrics(fullMetrics), true);
await scenario('New queue arrivals after recovery belong to the next digest', "INSERT INTO sitter_digest_queue VALUES('queued',now()-interval '10 hours')", true);
await scenario('Old queue rows already sent or skipped do not count as backlog', "INSERT INTO sitter_digest_queue VALUES('sent',now()-interval '3 days'),('skipped',now()-interval '3 days')", true);
await scenario('An old queued row prevents closure', "INSERT INTO sitter_digest_queue VALUES('queued',now()-interval '3 days')");
await scenario('A queued row arriving during recovery prevents closure', "INSERT INTO sitter_digest_queue SELECT 'queued',finished_at FROM cron_run_log");
await scenario('An unknown queue timestamp prevents closure', "INSERT INTO sitter_digest_queue VALUES('queued',NULL)");
await scenario('No run is insufficient evidence', 'DELETE FROM cron_run_log');
await scenario('A run older than 26 hours cannot certify recovery', "UPDATE cron_run_log SET started_at=now()-interval '27 hours',finished_at=now()-interval '27 hours'+interval '30 seconds'");
await scenario('A run before the incident cannot certify recovery', "UPDATE admin_signals SET detected_at=now()-interval '21 hours'");
await scenario('A future or corrupt timestamp cannot certify recovery', "UPDATE cron_run_log SET finished_at=now()+interval '1 hour'");
await scenario('Finish before start cannot certify recovery', "UPDATE cron_run_log SET finished_at=started_at-interval '1 second'");
await scenario('A newer failed run overrides an older healthy run', "INSERT INTO cron_run_log(started_at,finished_at,status) VALUES(now()-interval '1 hour',now(),'failed')");
await scenario('A running run cannot certify recovery', "UPDATE cron_run_log SET status='running',finished_at=NULL");
await scenario('A partial run cannot certify recovery', "UPDATE cron_run_log SET status='partial'");
await scenario('An error message blocks a run incorrectly marked success', "UPDATE cron_run_log SET error_message='permission denied'");
await scenario('A lock-held success does not prove queue recovery', metrics({reason:'lock_held',sitters_processed:0}));
await scenario('A non-empty queue metric blocks closure', metrics({...fullMetrics,queue_remaining:1}));
await scenario('Missing metrics fail closed', 'UPDATE cron_run_log SET metrics=NULL');
await scenario('Missing error metrics on processed runs fail closed', metrics({queue_remaining:0,budget_reached:false,queued_today_remaining:0,claim_skipped:0}));
await scenario('A string zero is not a reliable queue count', metrics({...fullMetrics,queue_remaining:'0'}));
await scenario('An error array blocks processed runs', metrics({...fullMetrics,errors:['failure']}));
await scenario('A budget-limited run cannot certify recovery', metrics({...fullMetrics,budget_reached:true}));
await scenario('Refused claims prevent closing a processed run', metrics({...fullMetrics,claim_skipped:1}));
await scenario('Remaining arrivals contradict a recovered processing run', metrics({...fullMetrics,queued_today_remaining:1}));
await scenario('An empty-queue reason cannot override recorded errors', metrics({reason:'empty_queue',queue_remaining:0,sitters_processed:0,errors:['failure']}));
await scenario('An empty-queue reason cannot override a budget limit', metrics({reason:'empty_queue',queue_remaining:0,sitters_processed:0,budget_reached:true}));
await scenario('A JSON null error field is not an omitted field', metrics({reason:'empty_queue',queue_remaining:0,sitters_processed:0,errors:null}));
await scenario('Unknown successful reason is insufficient', metrics({...fullMetrics,reason:'unknown'}));
await scenario('Unrelated signal types remain open', "UPDATE admin_signals SET signal_type='sit_notification_claim_starvation'");
await scenario('Other digest sources remain open', "UPDATE admin_signals SET metadata='{\"source\":\"nearby-daily-digest\"}'");
await scenario('Missing source remains open', "UPDATE admin_signals SET metadata='{}'");
await scenario('Non-system entity remains open', "UPDATE admin_signals SET entity_type='member'");
await scenario('Unrelated Edge failures do not change the evidence', "INSERT INTO cron_run_log(edge_name,started_at,status) VALUES('other-edge',now(),'failed')", true);

await db.exec('BEGIN');
await seed(); await call();
const closed = (await db.query('SELECT * FROM admin_signals')).rows;
assert.deepEqual((await call()).rows, []);
assert.deepEqual((await db.query('SELECT * FROM admin_signals')).rows, closed);
await db.exec('ROLLBACK');
passed.push('Repeated reconciliation preserves resolution date and reason');

await db.exec(`INSERT INTO admin_signals(signal_type,entity_type,entity_id,metadata)
  VALUES('nurturing_run_anomaly','cron_run','00000000-0000-0000-0000-000000000000','{"trigger":"3_runs_non_success"}');
  INSERT INTO cron_run_log(edge_name,started_at,finished_at,status,metrics)
  SELECT 'evaluate-journeys',now()-(15+n*60)*interval '1 minute',now()-(14+n*60)*interval '1 minute',
    'success','{"errors":0,"enrolled":2,"capped":false}' FROM generate_series(0,2) n;
  INSERT INTO sits VALUES('${target}','published');
  INSERT INTO admin_signals(signal_type,entity_id) VALUES('stale_draft','${target}');
  INSERT INTO admin_signals(signal_type,detected_at) VALUES
    ('notification_delivery_failed',now()-interval '4 days'),('notification_delivery_failed_burst',now()-interval '3 days');`);
assert.equal((await call()).rows.length, 4);
passed.push('Nurturing recovery, stale draft and both existing expiry rules are preserved');
for (const role of ['anon','authenticated']) {
  await db.exec(`SET ROLE ${role}`);
  await assert.rejects(call(), {code:'42501'});
  await db.exec('RESET ROLE');
}
passed.push('Anonymous and member execution stays denied');
await assert.rejects(db.exec(migration), /changed since review/);
await db.exec('ROLLBACK');
assert.deepEqual(await meta(), oldMeta);
passed.push('Stale baseline guard aborts a repeated migration without changing grants');
await db.close();
console.log(JSON.stringify({passed:true,count:passed.length,engine:'PGlite PostgreSQL',production_changed:false,tests:passed},null,2));
