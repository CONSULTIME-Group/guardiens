// Test SQL hors production (PGlite en mémoire) du lot annonces proches.
// Aucune connexion à la base réelle, aucun envoi.
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {PGlite}=require('@electric-sql/pglite');
const db=new PGlite();
const U=(n)=>`${String(n).repeat(8)}-${String(n).repeat(4)}-4${String(n).repeat(3)}-8${String(n).repeat(3)}-${String(n).repeat(12)}`;
const me=U(1), owner=U(2), sub=U(3), sub2=U(4), other=U(5);
await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;
CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
CREATE TYPE sit_status AS ENUM ('draft','published','cancelled');
CREATE TABLE profiles(id uuid PRIMARY KEY,latitude float8,longitude float8,account_status text DEFAULT 'active',suspended_at timestamptz);
CREATE TABLE sitter_profiles(user_id uuid PRIMARY KEY,geographic_radius int);
CREATE TABLE sits(id uuid PRIMARY KEY,user_id uuid,status sit_status,moderation_hidden_at timestamptz,end_date date);
CREATE TABLE blocked_users(blocker_id uuid,blocked_id uuid);
CREATE TABLE notifications(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid,type text,title text,body text,link text,read_at timestamptz,created_at timestamptz DEFAULT now());
CREATE TABLE push_subscriptions(id uuid PRIMARY KEY,user_id uuid,endpoint text,endpoint_host text,auth_key text,p256dh_key text,
  opt_in_messages boolean NOT NULL DEFAULT false,opt_in_applications boolean NOT NULL DEFAULT false,enabled boolean DEFAULT true,updated_at timestamptz,created_at timestamptz DEFAULT now());
CREATE FUNCTION haversine_km(lat1 float8,lng1 float8,lat2 float8,lng2 float8) RETURNS float8 LANGUAGE sql IMMUTABLE AS $$
  SELECT 6371*2*asin(sqrt(power(sin(radians(lat2-lat1)/2),2)+cos(radians(lat1))*cos(radians(lat2))*power(sin(radians(lng2-lng1)/2),2))) $$;
CREATE FUNCTION effective_search_radius(declared integer) RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN declared IS NULL OR declared = 30 THEN 100 ELSE declared END $$;
GRANT USAGE ON SCHEMA public TO anon,authenticated,service_role;
INSERT INTO auth.users VALUES('${me}'),('${owner}'),('${other}');
INSERT INTO profiles(id,latitude,longitude) VALUES('${me}',45.76,4.84),('${owner}',45.75,5.0),('${other}',43.3,5.37);
INSERT INTO sitter_profiles VALUES('${me}',30);
INSERT INTO push_subscriptions(id,user_id,endpoint,endpoint_host,auth_key,p256dh_key,opt_in_messages) VALUES
 ('${sub}','${me}','https://fcm.googleapis.com/a','fcm.googleapis.com','a','p',true),
 ('${sub2}','${me}','https://fcm.googleapis.com/b','fcm.googleapis.com','a','p',true);`);
await db.exec(readFileSync(new URL('../supabase/migrations/20260919090100_web_push_test.sql',import.meta.url),'utf8'));
await db.exec(readFileSync(new URL('../docs/migrations-en-attente/web_push_nearby_and_self_test.sql',import.meta.url),'utf8'));

let n=0;
const sit=async(opts={})=>{const id=crypto.randomUUID();await db.query(`INSERT INTO sits VALUES($1,$2,$3,NULL,current_date+5)`,[id,opts.owner??owner,opts.status??'published']);return id;};
const notify=async(id,user=me)=>{await db.query(`INSERT INTO notifications(user_id,type,title,body,link) VALUES($1,'new_sit_nearby','Nouvelle annonce : X','corps',$2)`,[user,'/sits/'+id]);};
const jobs=async()=>(await db.query('SELECT count(*)::int c FROM push_nearby_jobs')).rows[0].c;
const optIn=()=>db.exec(`UPDATE push_subscriptions SET opt_in_nearby_sits=true`);
const passed=[];
async function test(name,fn){await db.exec('BEGIN');try{await fn();passed.push(name);}finally{await db.exec('ROLLBACK');}}

await test('existing devices stay opted out, nothing queued',async()=>{
  const r=(await db.query('SELECT bool_or(opt_in_nearby_sits) v FROM push_subscriptions')).rows[0];assert.equal(r.v,false);
  await notify(await sit());assert.equal(await jobs(),0);});
await test('no backfill: notifications inserted before opt-in are never queued',async()=>{
  await notify(await sit());await optIn();assert.equal(await jobs(),0);});
await test('opt-in queues one job per active device',async()=>{await optIn();await notify(await sit());assert.equal(await jobs(),2);});
await test('dedup: same sit notified again (republication) is not queued twice',async()=>{
  await optIn();const s=await sit();await notify(s);await notify(s);assert.equal(await jobs(),2);});
await test('cap: 3 sits per member in 24h',async()=>{await optIn();
  for(let i=0;i<5;i++)await notify(await sit());
  assert.equal((await db.query('SELECT count(DISTINCT sit_id)::int c FROM push_nearby_jobs')).rows[0].c,3);});
await test('outside effective radius (30 km legacy = 100 km) is not "near"',async()=>{await optIn();
  await db.exec(`UPDATE profiles SET latitude=43.3,longitude=5.37 WHERE id='${owner}'`);await notify(await sit());assert.equal(await jobs(),0);});
await test('declared radius other than 30 is respected literally',async()=>{await optIn();
  await db.exec(`UPDATE sitter_profiles SET geographic_radius=5`);await notify(await sit());assert.equal(await jobs(),0);});
await test('missing coordinates: no invented distance, no push',async()=>{await optIn();
  await db.exec(`UPDATE profiles SET latitude=NULL WHERE id='${me}'`);await notify(await sit());assert.equal(await jobs(),0);});
await test('own sit, blocked owner, unpublished, hidden, expired: nothing',async()=>{await optIn();
  await db.exec(`UPDATE profiles SET latitude=45.75,longitude=5.0 WHERE id='${me}'`);
  await notify(await sit({owner:me}));
  await notify(await sit({status:'draft'}));
  const h=await sit();await db.query('UPDATE sits SET moderation_hidden_at=now() WHERE id=$1',[h]);await notify(h);
  const e=await sit();await db.query('UPDATE sits SET end_date=current_date-1 WHERE id=$1',[e]);await notify(e);
  await db.exec(`INSERT INTO blocked_users VALUES('${owner}','${me}')`);await notify(await sit());
  assert.equal(await jobs(),0);});
await test('deleted account: nothing',async()=>{await optIn();await db.exec(`UPDATE profiles SET account_status='deleted' WHERE id='${me}'`);await notify(await sit());assert.equal(await jobs(),0);});
await test('send-time recheck: read notification, unpublished sit or opt-out are skipped',async()=>{await optIn();
  const s=await sit();await notify(s);assert.equal(await jobs(),2);
  await db.exec(`UPDATE notifications SET read_at=now()`);
  assert.equal((await db.query('SELECT count(*)::int c FROM push_claim_nearby_jobs(20)')).rows[0].c,0);
  assert.equal((await db.query(`SELECT count(*)::int c FROM push_nearby_jobs WHERE status='skipped'`)).rows[0].c,2);});
await test('claim once, close, never reclaimed; ambiguous claim not replayed',async()=>{await optIn();
  await notify(await sit());
  const first=(await db.query('SELECT * FROM push_claim_nearby_jobs(20)')).rows;assert.equal(first.length,2);
  assert.equal((await db.query('SELECT count(*)::int c FROM push_claim_nearby_jobs(20)')).rows[0].c,0);
  assert.equal((await db.query('SELECT push_close_nearby_job($1,$2) ok',[first[0].job_id,'accepted'])).rows[0].ok,true);
  await db.exec(`UPDATE push_nearby_jobs SET claim_expires_at=now()-interval '1 minute' WHERE status='claimed'`);
  await db.query('SELECT * FROM push_claim_nearby_jobs(20)');
  assert.equal((await db.query(`SELECT last_error_code FROM push_nearby_jobs WHERE id<>$1`,[first[0].job_id])).rows[0].last_error_code,'claim_ambiguous');});
await test('notification insert never fails because of push errors',async()=>{await optIn();
  await db.query(`INSERT INTO notifications(user_id,type,link) VALUES($1,'new_sit_nearby','/sits/not-a-uuid')`,[me]);assert.equal(await jobs(),0);});
for(const role of ['anon','authenticated'])for(const q of ['SELECT * FROM push_nearby_jobs','SELECT * FROM push_claim_nearby_jobs(1)',`SELECT push_claim_self_test('${U(6)}','${me}','${sub}')`])
  await test(`${role} refused: ${q.slice(0,40)}`,async()=>{await db.exec(`SET LOCAL ROLE ${role}`);await assert.rejects(db.query(q),{code:'42501'});});
await test('member preference only on own device',async()=>{
  await db.exec(`GRANT USAGE ON SCHEMA auth TO authenticated;GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;SET LOCAL test.uid='${other}';SET LOCAL ROLE authenticated`);
  assert.equal((await db.query('SELECT push_set_my_nearby_preference($1,true) ok',[sub])).rows[0].ok,false);
  await db.exec(`RESET ROLE;SET LOCAL test.uid='${me}';SET LOCAL ROLE authenticated`);
  assert.equal((await db.query('SELECT push_set_my_nearby_preference($1,true) ok',[sub])).rows[0].ok,true);
  const rows=(await db.query('SELECT * FROM push_my_subscriptions_v2()')).rows;assert.equal(rows.length,2);assert.ok(!('endpoint' in rows[0]));});
await test('self test: owner only, once per request, 1 per 5 min, no opt-in required',async()=>{
  await db.exec(`UPDATE push_subscriptions SET opt_in_messages=false`);
  const c=async(r,u=me,s=sub)=>(await db.query('SELECT push_claim_self_test($1,$2,$3) ok',[r,u,s])).rows[0].ok;
  assert.equal(await c(U(6),other),false);
  assert.equal(await c(U(6)),true);assert.equal(await c(U(6)),false);assert.equal(await c(U(7)),false);
  await db.exec(`UPDATE push_test_attempts SET created_at=now()-interval '6 minutes'`);
  assert.equal(await c(U(6)),false);assert.equal(await c(U(7)),true);});
await db.close();console.log(JSON.stringify({passed:passed.length,checks:passed},null,2));
