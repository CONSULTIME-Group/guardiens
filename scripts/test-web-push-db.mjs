// Run with @electric-sql/pglite available in NODE_PATH. No production access.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { PGlite } = require('@electric-sql/pglite');
const db = new PGlite();
const passed = [];
const owner='11111111-1111-4111-8111-111111111111';
const sitter='22222222-2222-4222-8222-222222222222';
const outsider='33333333-3333-4333-8333-333333333333';
const conv='44444444-4444-4444-8444-444444444444';
const sit='55555555-5555-4555-8555-555555555555';
await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;
CREATE TYPE application_status AS ENUM ('pending','accepted','rejected');
CREATE TABLE conversations(id uuid PRIMARY KEY,owner_id uuid,sitter_id uuid);
CREATE TABLE messages(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),conversation_id uuid,sender_id uuid,is_system boolean DEFAULT false,moderation_hidden_at timestamptz,read_at timestamptz);
CREATE TABLE sits(id uuid PRIMARY KEY,user_id uuid);
CREATE TABLE applications(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),sit_id uuid,sitter_id uuid,status application_status DEFAULT 'pending',viewed_at timestamptz);
CREATE TABLE blocked_users(blocker_id uuid,blocked_id uuid);
INSERT INTO auth.users VALUES ('${owner}'),('${sitter}'),('${outsider}');
INSERT INTO conversations VALUES ('${conv}','${owner}','${sitter}');
INSERT INTO sits VALUES ('${sit}','${owner}');`);
const sql=readFileSync(new URL('../supabase/migrations/20260919090000_web_push.sql',import.meta.url),'utf8');
await db.exec(sql);
async function q(sql,params=[]) { return (await db.query(sql,params)).rows; }
const register=async (user=owner,endpoint='https://fcm.googleapis.com/fcm/send/fixture') => (await q(`SELECT push_upsert_subscription($1,$2,'fcm.googleapis.com','fixture-auth','fixture-key',true,true) AS id`,[user,endpoint]))[0].id;
const claim=()=>q('SELECT * FROM push_claim_jobs()');
async function test(name,fn) {
  await db.exec('BEGIN');
  try { await fn(); passed.push(name); }
  finally { await db.exec('ROLLBACK'); }
}
const message=(sender=sitter,extra='')=>db.exec(`INSERT INTO messages(conversation_id,sender_id${extra ? ','+extra.split('=')[0] : ''}) VALUES ('${conv}','${sender}'${extra ? ','+extra.split('=').slice(1).join('=') : ''});`);
await test('No subscriber means no job',async()=>{await message();assert.equal((await q('SELECT * FROM push_delivery_jobs')).length,0);});
await test('Human message queues one job and cooldown prevents repeats',async()=>{await register();await message();await message();assert.equal((await q('SELECT * FROM push_delivery_jobs')).length,1);assert.equal((await claim()).length,1);assert.equal((await claim()).length,0);});
await test('Application queues only its owner',async()=>{await register();await register(sitter,'https://fcm.googleapis.com/fcm/send/sitter');await db.exec(`INSERT INTO applications(sit_id,sitter_id) VALUES ('${sit}','${sitter}')`);const jobs=await claim();assert.equal(jobs.length,1);assert.equal(jobs[0].event_kind,'application');});
for(const [name,extra] of [['system','is_system=true'],['hidden','moderation_hidden_at=now()'],['read','read_at=now()']]) await test(`Exclude ${name} message`,async()=>{await register();await message(sitter,extra);assert.equal((await claim()).length,0);});
await test('Outsider cannot generate push',async()=>{await register();await message(outsider);assert.equal((await claim()).length,0);});
await test('Preferences revoked after queue prevent send',async()=>{await register();await message();await db.exec('UPDATE push_subscriptions SET opt_in_messages=false');assert.equal((await claim()).length,0);assert.equal((await q('SELECT status FROM push_delivery_jobs'))[0].status,'skipped');});
await test('Read after queue prevents send',async()=>{await register();await message();await db.exec('UPDATE messages SET read_at=now()');assert.equal((await claim()).length,0);});
await test('Block after queue prevents send',async()=>{await register();await message();await db.exec(`INSERT INTO blocked_users VALUES ('${owner}','${sitter}')`);assert.equal((await claim()).length,0);});
await test('Application viewed after queue prevents send',async()=>{await register();await db.exec(`INSERT INTO applications(sit_id,sitter_id,viewed_at) VALUES ('${sit}','${sitter}',now())`);assert.equal((await claim()).length,0);});
await test('Claim timeout is terminal and never replayed',async()=>{await register();await message();assert.equal((await claim()).length,1);await db.exec("UPDATE push_delivery_jobs SET claim_expires_at=now()-interval '1 minute'");assert.equal((await claim()).length,0);assert.equal((await q('SELECT status FROM push_delivery_jobs'))[0].status,'failed');});
await test('Explicit rejection backs off and respects maximum attempts',async()=>{await register();await message();let jobs=await claim();await q("SELECT push_close_job($1,'retry','http_429')",[jobs[0].job_id]);assert.equal((await claim()).length,0);await db.exec("UPDATE push_delivery_jobs SET available_at=now()-interval '1 minute',attempts=2");jobs=await claim();assert.equal(jobs[0].attempts,3);await q("SELECT push_close_job($1,'retry','http_429')",[jobs[0].job_id]);assert.equal((await claim()).length,0);assert.equal((await q('SELECT status FROM push_delivery_jobs'))[0].status,'failed');});
await test('One-hour expiration prevents send',async()=>{await register();await message();await db.exec("UPDATE push_delivery_jobs SET expires_at=now()-interval '1 minute'");assert.equal((await claim()).length,0);});
await test('Subscription cannot be transferred',async()=>{await register();await assert.rejects(register(sitter),{code:'42501'});});
await test('Maximum five active devices',async()=>{for(let i=0;i<5;i++)await register(owner,'https://fcm.googleapis.com/fcm/send/'+i);await assert.rejects(register(),{code:'54000'});});
await test('Reactivation also respects device limit',async()=>{const id=await register();await q('UPDATE push_subscriptions SET enabled=false WHERE id=$1',[id]);for(let i=0;i<5;i++)await register(owner,'https://fcm.googleapis.com/fcm/send/'+i);await assert.rejects(register(),{code:'54000'});});
await test('Member cannot read raw endpoints',async()=>{await register();await db.exec('SET LOCAL ROLE authenticated');await assert.rejects(q('SELECT * FROM push_subscriptions'),{code:'42501'});});
await test('Member cannot claim jobs',async()=>{await db.exec('SET LOCAL ROLE authenticated');await assert.rejects(claim(),{code:'42501'});});
await test('Member cannot read raw jobs',async()=>{await db.exec('SET LOCAL ROLE authenticated');await assert.rejects(q('SELECT * FROM push_delivery_jobs'),{code:'42501'});});
await test('Member cannot call service registration RPC',async()=>{await db.exec('SET LOCAL ROLE authenticated');await assert.rejects(register(),{code:'42501'});});
await test('Member only sees own sanitized subscription and cannot modify another',async()=>{const id=await register();await db.exec(`SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claim.sub='${sitter}'`);assert.equal((await q('SELECT * FROM push_my_subscriptions()')).length,0);assert.equal((await q('SELECT push_set_my_preferences($1,false,false) AS ok',[id]))[0].ok,false);assert.equal((await q('SELECT push_delete_my_subscription($1) AS ok',[id]))[0].ok,false);});
await test('Owner can disable categories and delete own subscription',async()=>{const id=await register();await db.exec(`SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claim.sub='${owner}'`);assert.equal((await q('SELECT * FROM push_my_subscriptions()')).length,1);assert.equal((await q('SELECT push_set_my_preferences($1,false,false) AS ok',[id]))[0].ok,true);assert.equal((await q('SELECT push_delete_my_subscription($1) AS ok',[id]))[0].ok,true);});
await test('Anonymous cannot list subscriptions',async()=>{await db.exec('SET LOCAL ROLE anon');await assert.rejects(q('SELECT * FROM push_my_subscriptions()'),{code:'42501'});});
await db.exec(sql);passed.push('Migration can be reapplied without backfill');
await db.close();
console.log(JSON.stringify({passed:passed.length,checks:passed},null,2));
