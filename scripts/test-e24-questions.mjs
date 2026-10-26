// Lot E24 : recette SQL de la migration 0108 sur PGlite (visibilité des questions, contraintes).
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const db = new PGlite();
await db.exec(`
create role anon; create role authenticated; create role service_role;
create schema auth;
create table auth.users(id uuid primary key, email text);
create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
create table public.profiles(id uuid primary key, first_name text, account_status text default 'active');
create table public.seo_queue(path text);
create function public.enqueue_seo_url(p_path text) returns void language sql as $$ insert into public.seo_queue values (p_path) $$;
create table public.small_missions(id uuid primary key, user_id uuid, category text, status text, hidden_at timestamptz, moderation_hidden_at timestamptz, mission_type text default 'besoin', slug text);
create table public.conversations(id uuid primary key, owner_id uuid, sitter_id uuid);
create table public.email_deep_link_tokens(id uuid primary key default gen_random_uuid(), token text, user_id uuid, conversation_id uuid, target_path text, template_name text, message_id uuid, expires_at timestamptz, consumed_at timestamptz, created_at timestamptz default now());
`);
await db.exec(readFileSync("drizzle/migrations/0108_e24_questions_besoin.sql", "utf8"));
const F='00000000-0000-0000-0000-0000000000cc', H='00000000-0000-0000-0000-0000000000dd', S='00000000-0000-0000-0000-00000000000d';
const A='00000000-0000-0000-0000-00000000000a', O='00000000-0000-0000-0000-00000000000b', V='00000000-0000-0000-0000-00000000000c', M='00000000-0000-0000-0000-0000000000aa', P='00000000-0000-0000-0000-0000000000bb';
await db.exec(`insert into profiles values ('${A}','karim dupont'),('${O}','Martine'),('${V}','Sophie');
insert into profiles values ('${S}','Suspendu','suspended');
insert into small_missions values ('${M}','${O}','jardin','open',null,null,'besoin','rempoter-annecy'),('${P}','${O}','projet','open',null,null,'besoin',null),('${F}','${O}','jardin','open',null,null,'offre',null),('${H}','${O}','jardin','open',now(),null,'besoin',null);
insert into mission_questions(mission_id, asker_id, body, moderation) values ('${M}','${A}','Question publique ?','ok'),('${M}','${A}','Question privée ?','private'),('${P}','${A}','Sur un projet ?','ok'),('${F}','${A}','Sur une offre ?','ok'),('${H}','${A}','Sur un besoin masqué ?','ok'),('${M}','${S}','Question suspendue ?','ok');
insert into mission_questions(mission_id, asker_id, body, moderation, hidden_at) values ('${M}','${A}','Question masquée ?','ok', now());
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
for (const id of [F, H]) assert.equal(Number((await db.query(`select count(*)::int as n from get_mission_questions('${id}')`)).rows[0].n), 0, "offre et besoin masqué : aucune question");
// Plafonds recomptés sous verrou.
const ins = (body) => db.query(`select insert_mission_question('${M}','${V}','${body}','ok',3,10) as id`);
await ins("Première question ?"); await ins("Deuxième question ?"); await ins("Troisième question ?");
let limited = ""; try { await ins("Quatrième question ?"); } catch (e) { limited = String(e.message); }
assert.match(limited, /limit_mission/, "plafond par besoin");
assert.ok((await db.query(`select count(*)::int as n from seo_queue where path = '/petites-missions/rempoter-annecy'`)).rows[0].n > 0, "pré-rendu remis en file");
// Rôles des membres : aucune lecture ni écriture directe.
for (const role of ["anon", "authenticated"]) {
  await db.exec(`set role ${role}`);
  let denied = 0;
  try { await db.query(`select * from mission_questions`); } catch { denied++; }
  try { await db.query(`insert into mission_questions(mission_id, asker_id, body, moderation) values ('${M}','${A}','Directe ?','ok')`); } catch { denied++; }
  try { await db.query(`select insert_mission_question('${M}','${A}','Par la fonction ?','ok',3,10)`); } catch { denied++; }
  await db.exec(`reset role`);
  assert.equal(denied, 3, `${role} : lecture, écriture et enregistrement refusés`);
}
console.log("recette E24 : 16 contrôles verts");
