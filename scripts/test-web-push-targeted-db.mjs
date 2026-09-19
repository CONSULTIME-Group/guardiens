import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {PGlite}=require('@electric-sql/pglite');
const db=new PGlite();
await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;
CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE TABLE public.push_subscriptions(id uuid PRIMARY KEY,user_id uuid,enabled boolean,opt_in_messages boolean);
GRANT USAGE ON SCHEMA public TO anon,authenticated,service_role;
INSERT INTO auth.users VALUES('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');
INSERT INTO push_subscriptions VALUES('33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111',true,true);`);
await db.exec(readFileSync(new URL('../supabase/sql/pending/20260919_web_push_test.sql',import.meta.url),'utf8'));
const user='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222',sub='33333333-3333-4333-8333-333333333333',id='44444444-4444-4444-8444-444444444444',id2='55555555-5555-4555-8555-555555555555';
const claim=async(r=id,u=user,s=sub)=>(await db.query('SELECT public.push_claim_test($1,$2,$3) ok',[r,u,s])).rows[0].ok;
const passed=[];
async function test(name,fn){await db.exec('BEGIN');try{await fn();passed.push(name);}finally{await db.exec('ROLLBACK');}}
for(const role of ['anon','authenticated'])await test(`${role} cannot claim or read audit`,async()=>{
  await db.exec(`SET LOCAL ROLE ${role}`);await assert.rejects(claim(),{code:'42501'});
});
for(const role of ['anon','authenticated'])await test(`${role} cannot read audit`,async()=>{
  await db.exec(`SET LOCAL ROLE ${role}`);await assert.rejects(db.query('SELECT * FROM public.push_test_attempts'),{code:'42501'});
});
await test('RLS enabled and forced',async()=>{const r=(await db.query("SELECT relrowsecurity,relforcerowsecurity FROM pg_class WHERE oid='public.push_test_attempts'::regclass")).rows[0];assert.equal(r.relrowsecurity,true);assert.equal(r.relforcerowsecurity,true);});
await test('service claim works once and never replays',async()=>{await db.exec('SET LOCAL ROLE service_role');assert.equal(await claim(),true);assert.equal(await claim(),false);});
await test('different request is rate limited',async()=>{assert.equal(await claim(),true);assert.equal(await claim(id2),false);assert.equal((await db.query('SELECT count(*)::int n FROM push_test_attempts')).rows[0].n,1);});
await test('wrong owner cannot claim',async()=>{assert.equal(await claim(id,other),false);});
await test('disabled device cannot claim',async()=>{await db.exec('UPDATE push_subscriptions SET enabled=false');assert.equal(await claim(),false);});
await test('opt-out cannot claim',async()=>{await db.exec('UPDATE push_subscriptions SET opt_in_messages=false');assert.equal(await claim(),false);});
await test('unknown subscription cannot claim',async()=>{assert.equal(await claim(id,user,id2),false);});
await test('old request stays consumed after cooldown, new request permitted',async()=>{assert.equal(await claim(),true);await db.exec("UPDATE push_test_attempts SET created_at=now()-interval '6 minutes'");assert.equal(await claim(),false);assert.equal(await claim(id2),true);});
await db.close();console.log(JSON.stringify({passed:passed.length,checks:passed},null,2));
