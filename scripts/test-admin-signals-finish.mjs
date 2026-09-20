import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const {PGlite}=await import(process.env.PGLITE_MODULE||'@electric-sql/pglite');
const db=new PGlite();const root=new URL('../',import.meta.url);const passed=[];
const baseline=readFileSync(new URL('scripts/fixtures/admin-signals-before-finish.sql',root),'utf8');
const migration=readFileSync(new URL('supabase/migrations/20260919130000_finish_admin_signal_recovery.sql',root),'utf8');
const lot3=readFileSync(new URL('drizzle/migrations/0006_admin_signal_business_recovery.sql',root),'utf8');
await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;GRANT USAGE ON SCHEMA public TO anon,authenticated,service_role;
CREATE TABLE admin_signals(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),signal_type text,entity_type text,entity_id uuid,metadata jsonb DEFAULT '{}',severity text DEFAULT 'critical',detected_at timestamptz DEFAULT now()-interval '3 days',resolved_at timestamptz,action_taken text);
CREATE TABLE profiles(id uuid DEFAULT gen_random_uuid(),identity_document_url text,latitude double precision,longitude double precision,role text,identity_verified boolean DEFAULT false,profile_completion integer);
CREATE TABLE sits(id uuid,status text,start_date date,end_date date);
CREATE TABLE applications(id uuid,sit_id uuid,sitter_id uuid,status text);
CREATE TABLE analytics_events(id uuid DEFAULT gen_random_uuid(),user_id uuid,event_type text);
CREATE TABLE cron_run_log(id uuid DEFAULT gen_random_uuid(),edge_name text,started_at timestamptz,finished_at timestamptz,status text,metrics jsonb,error_message text);
CREATE TABLE sitter_digest_queue(status text,queued_at timestamptz);
CREATE TABLE seo_city_pages(id uuid,published boolean,latitude double precision,longitude double precision);`);

await db.exec(baseline);await db.exec('REVOKE ALL ON FUNCTION auto_resolve_admin_signals() FROM PUBLIC,anon,authenticated;GRANT EXECUTE ON FUNCTION auto_resolve_admin_signals() TO service_role;');
const id='11111111-1111-4111-8111-111111111111';
const call=()=>db.query('SELECT * FROM auto_resolve_admin_signals()');
const meta=async()=>(await db.query("SELECT proacl::text,proowner,prosecdef,proconfig FROM pg_proc WHERE oid='auto_resolve_admin_signals()'::regprocedure")).rows;
const before=await meta();
await db.exec(`INSERT INTO admin_signals(signal_type,entity_type,entity_id) VALUES('stale_draft','sit','${id}')`);
assert.deepEqual((await call()).rows,[]);passed.push('Reproduces stale signal after its draft has disappeared');
const beforeRows=(await db.query('SELECT * FROM admin_signals')).rows;
await db.exec(migration);assert.deepEqual(await meta(),before);assert.deepEqual((await db.query('SELECT * FROM admin_signals')).rows,beforeRows);passed.push('Migration preserves rights and does not reconcile any row by itself');
await db.exec(lot3);assert.deepEqual(await meta(),before);assert.deepEqual((await db.query('SELECT * FROM admin_signals')).rows,beforeRows);passed.push('Business-recovery migration preserves rights and reconciles nothing by itself');

await db.exec('TRUNCATE admin_signals');
async function scenario(name,type,entity,setup='',resolved=false,severity='critical'){
 await db.exec('BEGIN');try{
  await db.exec(`INSERT INTO admin_signals(id,signal_type,entity_type,entity_id) VALUES('${id}','${type}','${entity}','${id}');`);
  if(setup)await db.exec(setup);
  await db.exec('SET LOCAL ROLE service_role');await call();await db.exec('RESET ROLE');
  const row=(await db.query('SELECT resolved_at,severity,detected_at FROM admin_signals WHERE id=$1',[id])).rows[0];
  assert.equal(row.resolved_at!==null,resolved,name);assert.equal(row.severity,severity,name);passed.push(name);
 }finally{await db.exec('ROLLBACK');}
}
const draft=(start,end)=>`INSERT INTO sits VALUES('${id}','draft',${start},${end});`;
await scenario('Missing draft is no longer actionable','stale_draft','sit','',true);
await scenario('Expired draft is no longer actionable','stale_draft','sit',draft('current_date-3','current_date-1'),true);
await scenario('Draft ending today remains actionable','stale_draft','sit',draft('current_date-3','current_date'));
await scenario('Draft whose end is still future remains actionable','stale_draft','sit',draft('current_date-3','current_date+2'));
await scenario('Draft with missing start follows existing detector semantics','stale_draft','sit',draft('NULL','current_date-1'));
await scenario('Undated draft remains actionable','stale_draft','sit',draft('NULL','NULL'));
await scenario('Wrong draft entity type is excluded','stale_draft','other');
for(const status of ['accepted','rejected','cancelled'])await scenario(`Concluded application ${status} closes its discussion signal`,'stalled_discussion','application',`INSERT INTO applications(id,status) VALUES('${id}','${status}');`,true);
for(const status of ['pending','viewed','discussing'])await scenario(`Open application ${status} keeps its discussion signal`,'stalled_discussion','application',`INSERT INTO applications(id,status) VALUES('${id}','${status}');`);
await scenario('Missing application is not assumed concluded','stalled_discussion','application');
await scenario('Wrong discussion entity type is excluded','stalled_discussion','other',`INSERT INTO applications(id,status) VALUES('${id}','accepted');`);
const city=(n=0)=>`UPDATE admin_signals SET metadata='{"radius_km":30,"sitters_count":0}';INSERT INTO seo_city_pages VALUES('${id}',true,45,5);INSERT INTO profiles(latitude,longitude,role) SELECT 45,5,'sitter' FROM generate_series(1,${n});`;
await scenario('Zero local sitters stays critical','city_coverage_gap','city',city());
for(const n of [1,2])await scenario(`${n} local sitters changes severity without closing`,'city_coverage_gap','city',city(n),false,'warning');
await scenario('Three unverified local sitters close coverage gap','city_coverage_gap','city',city(3),true);
await scenario('Far-away sitters do not close coverage gap','city_coverage_gap','city',city(3)+'UPDATE profiles SET longitude=10;');
await scenario('Owners are not counted as sitters','city_coverage_gap','city',city(3)+"UPDATE profiles SET role='owner';");
await scenario('Both-role profiles count','city_coverage_gap','city',city(3)+"UPDATE profiles SET role='both';",true);
await scenario('Unlocated profiles do not count','city_coverage_gap','city',city(3)+'UPDATE profiles SET latitude=NULL;');
await scenario('Unpublished city is not assumed recovered','city_coverage_gap','city',city(3)+'UPDATE seo_city_pages SET published=false;');
await scenario('Missing city is not assumed recovered','city_coverage_gap','city',city(3)+'DELETE FROM seo_city_pages;');
await scenario('Invalid city coordinates cannot certify recovery','city_coverage_gap','city',city(3)+'UPDATE seo_city_pages SET latitude=120;');
await scenario('Missing radius is excluded','city_coverage_gap','city',city(3)+"UPDATE admin_signals SET metadata='{}';");
await scenario('Different radius is excluded','city_coverage_gap','city',city(3)+"UPDATE admin_signals SET metadata='{\"radius_km\":60}';");
await scenario('SEO tension is a distinct signal','city_seo_tension','city',city(3));
await scenario('Wrong city entity type is excluded','city_coverage_gap','other',city(3));
await db.exec('BEGIN');
await db.exec(`INSERT INTO admin_signals(id,signal_type,entity_type,entity_id) VALUES('${id}','city_coverage_gap','city','${id}');`+city(1));
const detected=(await db.query('SELECT detected_at FROM admin_signals')).rows;
await call();const once=(await db.query('SELECT * FROM admin_signals')).rows;await call();assert.deepEqual((await db.query('SELECT * FROM admin_signals')).rows,once);assert.deepEqual((await db.query('SELECT detected_at FROM admin_signals')).rows,detected);await db.exec('ROLLBACK');passed.push('City refresh is idempotent and preserves original detection date');
await scenario('Nurturing recovery rule is preserved','nurturing_run_anomaly','cron_run',`UPDATE admin_signals SET entity_id='00000000-0000-0000-0000-000000000000',metadata='{ "trigger":"3_runs_non_success" }';INSERT INTO cron_run_log(edge_name,started_at,finished_at,status,metrics) SELECT 'evaluate-journeys',now()-(15+n*60)*interval '1 minute',now()-(14+n*60)*interval '1 minute','success','{"errors":0,"enrolled":1,"capped":false}' FROM generate_series(0,2)n;`,true);
const backlog=`UPDATE admin_signals SET metadata='{"source":"sitter-daily-digest"}';INSERT INTO cron_run_log(edge_name,started_at,finished_at,status,metrics) VALUES('send-sitter-daily-digest',now()-interval '1 hour',now()-interval '59 minutes','success','{"queue_remaining":0,"sitters_processed":0,"reason":"empty_queue"}');`;
await scenario('Digest recovery rule is preserved','digest_queue_morning_backlog','system',backlog,true);
await scenario('Old queued digest still blocks recovery','digest_queue_morning_backlog','system',backlog+"INSERT INTO sitter_digest_queue VALUES('queued',now()-interval '1 day');");
for(const status of ['pending','viewed'])await scenario(`Pending-application alert remains open for ${status}`,'pending_application','application',`INSERT INTO applications(id,status) VALUES('${id}','${status}');`);
await scenario('Pending-application alert closes once discussion starts','pending_application','application',`INSERT INTO applications(id,status) VALUES('${id}','discussing');`,true);
await scenario('Existing published-draft rule is preserved' ,'stale_draft','sit',`INSERT INTO sits(id,status) VALUES('${id}','published');`,true);
await scenario('Existing delivery expiry rule is preserved','notification_delivery_failed','system',"UPDATE admin_signals SET detected_at=now()-interval '4 days';",true);

// ---- LOT 3 : fermeture sur condition metier observable ----
const starve=`UPDATE admin_signals SET metadata='{"source":"sitter-daily-digest"}';`;
const run=(edge,metrics,age='1 hour')=>`INSERT INTO cron_run_log(edge_name,started_at,finished_at,status,metrics) VALUES('${edge}',now()-interval '${age}',now()-interval '${age}'+interval '1 minute','success','${metrics}');`;
await scenario('Claim starvation stays open without any later run','sit_notification_claim_starvation','system',starve);
await scenario('Claim starvation stays open while claims are still refused','sit_notification_claim_starvation','system',starve+run('send-sitter-daily-digest','{"claim_skipped":3}'));
await scenario('Claim starvation closes on a later run without refusal','sit_notification_claim_starvation','system',starve+run('send-sitter-daily-digest','{"claim_skipped":0}'),true);
await scenario('Claim starvation closes on a later empty-queue run','sit_notification_claim_starvation','system',starve+run('sitter-daily-digest','{"reason":"empty_queue"}'),true);
await scenario('A run older than detection never closes claim starvation','sit_notification_claim_starvation','system',starve+run('send-sitter-daily-digest','{"claim_skipped":0}','4 days'));
await scenario('Another edge run never closes claim starvation','sit_notification_claim_starvation','system',starve+run('send-alert-digest','{"claim_skipped":0}'));
await scenario('Claim starvation without source is excluded','sit_notification_claim_starvation','system',run('send-sitter-daily-digest','{"claim_skipped":0}'));

const unconf=(status,appStatus)=>`INSERT INTO sits(id,status) VALUES('${id}','${status}');`+(appStatus?`INSERT INTO applications(id,sit_id,status) VALUES('${id}','${id}','${appStatus}');`:'');
for(const st of ['pending','viewed','discussing'])await scenario(`Published sit with a ${st} application stays unconfirmed`,'owner_sit_unconfirmed','sit',unconf('published',st));
await scenario('Confirmed sit closes its unconfirmed signal','owner_sit_unconfirmed','sit',unconf('confirmed','discussing'),true);
await scenario('Cancelled sit closes its unconfirmed signal','owner_sit_unconfirmed','sit',unconf('cancelled','discussing'),true);
await scenario('Accepted application closes the unconfirmed signal','owner_sit_unconfirmed','sit',unconf('published','accepted'),true);
await scenario('Published sit without open application closes the signal','owner_sit_unconfirmed','sit',unconf('published'),true);
await scenario('Deleted sit closes its unconfirmed signal','owner_sit_unconfirmed','sit','',true);
await scenario('Wrong unconfirmed entity type is excluded','owner_sit_unconfirmed','other',unconf('confirmed'));

await scenario('Digest queue stalled stays open while an older entry waits','digest_queue_stalled','system',"INSERT INTO sitter_digest_queue VALUES('queued',now()-interval '5 days');");
await scenario('Digest queue stalled stays open on an undated waiting entry','digest_queue_stalled','system',"INSERT INTO sitter_digest_queue VALUES('queued',NULL);");
await scenario('Digest queue stalled closes once the entry is sent','digest_queue_stalled','system',"INSERT INTO sitter_digest_queue VALUES('sent',now()-interval '5 days');",true);
await scenario('Digest queue stalled closes when only newer entries wait','digest_queue_stalled','system',"INSERT INTO sitter_digest_queue VALUES('queued',now());",true);

const sitter=(extra='')=>`INSERT INTO profiles(id,role,identity_verified,profile_completion) VALUES('${id}','sitter',true,80);${extra}`;
await scenario('Dormant sitter stays open without any application','dormant_sitter','profile',sitter());
await scenario('Dormant sitter closes once the sitter applies','dormant_sitter','profile',sitter(`INSERT INTO applications(id,sitter_id,status) VALUES('${id}','${id}','pending');`),true);
await scenario('Dormant sitter closes when the profile no longer exists','dormant_sitter','profile','',true);
await scenario('Dormant sitter closes when the profile left the sitter role','dormant_sitter','profile',`INSERT INTO profiles(id,role,identity_verified,profile_completion) VALUES('${id}','owner',true,80);`,true);
await scenario('Dormant sitter closes when identity is no longer verified','dormant_sitter','profile',`INSERT INTO profiles(id,role,identity_verified,profile_completion) VALUES('${id}','sitter',false,80);`,true);
await scenario('Dormant sitter closes when completion fell below the threshold','dormant_sitter','profile',`INSERT INTO profiles(id,role,identity_verified,profile_completion) VALUES('${id}','both',true,40);`,true);
await scenario('Wrong dormant entity type is excluded','dormant_sitter','other',sitter());

const affinity=(evt)=>`INSERT INTO profiles(id,role) VALUES('${id}','sitter');`+(evt?`INSERT INTO analytics_events(user_id,event_type) VALUES('${id}','${evt}');`:'');
await scenario('Affinity onboarding stays open while only started','affinity_onboarding_stale','profile',affinity('affinity_onboarding_started'));
await scenario('Affinity onboarding closes once completed','affinity_onboarding_stale','profile',affinity('affinity_onboarding_completed'),true);
await scenario('Affinity onboarding of another member does not close the signal','affinity_onboarding_stale','profile',affinity('affinity_onboarding_started')+"INSERT INTO analytics_events(user_id,event_type) VALUES('22222222-2222-4222-8222-222222222222','affinity_onboarding_completed');");
await scenario('Affinity onboarding closes when the profile no longer exists','affinity_onboarding_stale','profile','',true);
await scenario('Wrong affinity entity type is excluded','affinity_onboarding_stale','other',affinity('affinity_onboarding_completed'));

await scenario('Suspicious account is never auto-resolved','suspicious_account','profile',sitter(`INSERT INTO applications(id,sitter_id,status) VALUES('${id}','${id}','accepted');INSERT INTO analytics_events(user_id,event_type) VALUES('${id}','affinity_onboarding_completed');`));
await scenario('Suspicious account stays open even without a profile','suspicious_account','profile');
await scenario('Rehoming listing review stays human','animal_rehoming_listing','sit',`INSERT INTO sits(id,status) VALUES('${id}','cancelled');`);
await scenario('Identity review stays human','identity_needs_review','profile',`INSERT INTO profiles(id,identity_document_url) VALUES('${id}','https://example.org/doc');`);

for(const role of ['anon','authenticated']){await db.exec(`SET ROLE ${role}`);await assert.rejects(call(),{code:'42501'});await db.exec('RESET ROLE');}passed.push('Public reconciliation remains forbidden');
await assert.rejects(db.exec(migration),/changed since review/);await db.exec('ROLLBACK');assert.deepEqual(await meta(),before);passed.push('Guard blocks stale migration without modifying rights');
await db.close();console.log(JSON.stringify({passed:true,count:passed.length,tests:passed},null,2));
