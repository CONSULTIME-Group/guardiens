// Lot E24 : recette SQL de la migration 0107 sur PGlite (visibilité des questions, contraintes).
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const db = new PGlite();
await db.exec(`
create role anon; create role authenticated; create role service_role;
create schema auth;
create table auth.users(id uuid primary key, email text);
create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
create table public.profiles(id uuid primary key, first_name text);
create table public.small_missions(id uuid primary key, user_id uuid, category text, status text, hidden_at timestamptz, moderation_hidden_at timestamptz);
create table public.conversations(id uuid primary key, owner_id uuid, sitter_id uuid);
create table public.email_deep_link_tokens(id uuid primary key default gen_random_uuid(), token text, user_id uuid, conversation_id uuid, target_path text, template_name text, message_id uuid, expires_at timestamptz, consumed_at timestamptz, created_at timestamptz default now());
`);
await db.exec(readFileSync("drizzle/migrations/0107_e24_questions_besoin.sql", "utf8"));
const A='00000000-0000-0000-0000-00000000000a', O='00000000-0000-0000-0000-00000000000b', V='00000000-0000-0000-0000-00000000000c', M='00000000-0000-0000-0000-0000000000aa', P='00000000-0000-0000-0000-0000000000bb';
await db.exec(`insert into profiles values ('${A}','karim dupont'),('${O}','Martine'),('${V}','Sophie');
insert into small_missions values ('${M}','${O}','jardin','open',null,null),('${P}','${O}','projet','open',null,null);
insert into mission_questions(mission_id, asker_id, body, moderation) values ('${M}','${A}','Question publique ?','ok'),('${M}','${A}','Question privée ?','private'),('${P}','${A}','Sur un projet ?','ok');
update mission_questions set answer='Réponse privée', answer_moderation='private', answered_at=now() where body='Question publique ?';`);
const as = async (uid) => { await db.exec(`select set_config('request.jwt.claim.sub', '${uid ?? ""}', false)`); return (await db.query(`select body, answer, asker_first_name, is_mine, is_public from get_mission_questions('${M}')`)).rows; };
const visitor = await as(null);
assert.equal(visitor.length, 1, "visiteur : la seule question publique");
assert.equal(visitor[0].answer, null, "visiteur : réponse privée masquée");
assert.equal(visitor[0].asker_first_name, "Karim");
assert.equal((await as(V)).length, 1, "autre membre : la seule question publique");
const owner = await as(O);
assert.equal(owner.length, 2, "auteur : publique et privée");
assert.equal(owner[0].answer, "Réponse privée", "auteur : sa réponse");
const asker = await as(A);
assert.equal(asker.length, 2, "personne qui pose : ses deux questions");
assert.ok(asker.every((r) => r.is_mine));
await db.exec(`select set_config('request.jwt.claim.sub', '', false)`);
assert.equal(Number((await db.query(`select count(*)::int as n from get_mission_questions('${P}')`)).rows[0].n), 0, "projet : aucune question");
let bad = 0; try { await db.exec(`insert into mission_questions(mission_id, asker_id, body, moderation, answer) values ('${M}','${A}','Une autre ?','ok','x')`); } catch { bad++; }
try { await db.exec(`insert into mission_questions(mission_id, asker_id, body, moderation) values ('${M}','${A}','oui','ok')`); } catch { bad++; }
assert.equal(bad, 2, "contraintes : réponse sans date, question trop courte");
console.log("recette E24 : 9 contrôles verts");
