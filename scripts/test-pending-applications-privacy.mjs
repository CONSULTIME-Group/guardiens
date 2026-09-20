import {readFileSync} from 'node:fs';import assert from 'node:assert/strict';
const {PGlite}=await import(process.env.PGLITE_MODULE||'@electric-sql/pglite');const db=new PGlite();const root=new URL('../',import.meta.url);const passed=[];
const baseline=readFileSync(new URL('scripts/fixtures/detect-pending-applications-before.sql',root),'utf8');const sql=readFileSync(new URL('supabase/sql/pending/20260919_pending_applications_privacy.sql',root),'utf8');
await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;GRANT USAGE ON SCHEMA public TO anon,authenticated,service_role;
CREATE TYPE application_status AS ENUM('pending','viewed','discussing','accepted','rejected','cancelled');CREATE TYPE sit_status AS ENUM('draft','published','confirmed','in_progress','completed');
CREATE TABLE profiles(id uuid,first_name text,email text);CREATE TABLE sits(id uuid,title text,user_id uuid,start_date date,end_date date,status sit_status);
CREATE TABLE applications(id uuid,sit_id uuid,sitter_id uuid,created_at timestamptz,status application_status);
CREATE TABLE conversations(id uuid,sit_id uuid,sitter_id uuid);CREATE TABLE messages(conversation_id uuid,sender_id uuid,is_system boolean);
INSERT INTO profiles VALUES('11111111-1111-4111-8111-111111111111','Fixture','fixture@example.invalid');
INSERT INTO sits VALUES('22222222-2222-4222-8222-222222222222','Fixture','11111111-1111-4111-8111-111111111111',current_date+1,current_date+2,'published');
INSERT INTO applications VALUES('33333333-3333-4333-8333-333333333333','22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111',now()-interval '4 days','viewed');`);
await db.exec(baseline);await db.exec('GRANT EXECUTE ON FUNCTION detect_pending_applications() TO PUBLIC,anon,authenticated,service_role;');
const call=()=>db.query('SELECT * FROM detect_pending_applications()');const before=(await call()).rows;
const definition=async()=>(await db.query("SELECT pg_get_functiondef(oid) AS body,proowner,prosecdef,proconfig FROM pg_proc WHERE oid='detect_pending_applications()'::regprocedure")).rows;
const initial=await definition();assert.equal(before.length,1);
for(const role of ['anon','authenticated']){await db.exec(`SET ROLE ${role}`);assert.deepEqual((await call()).rows,before);await db.exec('RESET ROLE');passed.push(`Reproduces ${role} access before restriction`);}
await db.exec(sql);assert.deepEqual(await definition(),initial);passed.push('Body, owner and security unchanged');
for(const role of ['anon','authenticated']){await db.exec(`SET ROLE ${role}`);await assert.rejects(call(),{code:'42501'});await db.exec('RESET ROLE');passed.push(`${role} actually denied after restriction`);}
await db.exec('SET ROLE service_role');assert.deepEqual((await call()).rows,before);await db.exec('RESET ROLE');passed.push('Server receives identical private results');
await db.exec(sql);assert.deepEqual(await definition(),initial);passed.push('Repeat application preserves body and grants');
await db.exec('ALTER FUNCTION detect_pending_applications() SET search_path TO public,pg_temp');await assert.rejects(db.exec(sql),/definition changed/);await db.exec('ROLLBACK');passed.push('Unexpected definition aborts migration');
await db.close();console.log(JSON.stringify({passed:true,count:passed.length,tests:passed},null,2));
