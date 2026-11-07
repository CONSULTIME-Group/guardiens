// Lot SEC2 (07/11/2026) : hero_weights et competences_validees ne se lisent
// plus en direct ; recette des droits par rôle (anon, membre, admin, service).
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const dir = new URL('../drizzle/migrations/', import.meta.url);
const file = process.env.SEC2_SQL ||
  new URL(readdirSync(dir).find((f) => /sec2.*\.sql$/.test(f)), dir);
const sql = readFileSync(file, 'utf8');

const ADMIN = '11111111-1111-4111-8111-111111111111';
const MEMBER = '22222222-2222-4222-8222-222222222222';
const db = new PGlite();
await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
CREATE SCHEMA auth; GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.role',true),'') $$;
CREATE TYPE public.app_role AS ENUM ('admin','moderator','user');
CREATE FUNCTION public.has_role(uuid, public.app_role) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT $1 = '${ADMIN}'::uuid AND $2 = 'admin' $$;
CREATE TABLE public.hero_weights (id int PRIMARY KEY, weight_animals int, weight_home int, weight_mutual_aid int, weight_village int, updated_at timestamptz DEFAULT now(), updated_by uuid);
INSERT INTO public.hero_weights VALUES (1, 40, 20, 20, 20, now(), '${ADMIN}');
ALTER TABLE public.hero_weights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hero_weights_read_all" ON public.hero_weights FOR SELECT USING (true);
CREATE POLICY "hero_weights_admin_update" ON public.hero_weights FOR UPDATE USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TABLE public.competences_validees (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), label text UNIQUE, categorie text, usage_count int DEFAULT 0, created_at timestamptz DEFAULT now());
INSERT INTO public.competences_validees (label, categorie, usage_count) VALUES ('Compostage','jardin',3),('Taille des haies','jardin',9),('Bricolage','maison',5),('Remise 100% bio','jardin',1);
ALTER TABLE public.competences_validees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "competences_validees_public_read" ON public.competences_validees FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "competences_validees_admin_write" ON public.competences_validees FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'));
GRANT ALL ON public.hero_weights, public.competences_validees TO anon, authenticated, service_role;
`);

// Avant : le constat du scanner est reproduit (anon lit tout).
await db.exec('SET ROLE anon');
assert.equal((await db.query('SELECT updated_by FROM public.hero_weights')).rows.length, 1);
assert.equal((await db.query('SELECT * FROM public.competences_validees')).rows.length, 4);
await db.exec('RESET ROLE');

await db.exec(sql);
await db.exec(sql); // rejouable

const as = async (role, sub) => {
  await db.exec('RESET ROLE');
  await db.query(`SELECT set_config('request.jwt.claim.sub', $1, false), set_config('request.jwt.claim.role', $2, false)`, [sub ?? '', role]);
  await db.exec(`SET ROLE ${role}`);
};
const denied = { code: '42501' };

// Visiteur : aucune table, seulement les quatre poids.
await as('anon');
await assert.rejects(db.query('SELECT * FROM public.hero_weights'), denied);
await assert.rejects(db.query('SELECT * FROM public.competences_validees'), denied);
await assert.rejects(db.query('SELECT * FROM public.list_validated_competences()'), denied);
const hero = (await db.query('SELECT * FROM public.get_hero_weights()')).rows;
assert.equal(hero.length, 1);
assert.deepEqual(Object.keys(hero[0]).sort(), ['updated_at', 'weight_animals', 'weight_home', 'weight_mutual_aid', 'weight_village']);
assert.equal(hero[0].weight_animals, 40);

// Membre : lecture directe vide, écriture sans effet ou refusée, fonction utile.
await as('authenticated', MEMBER);
assert.equal((await db.query('SELECT * FROM public.hero_weights')).rows.length, 0);
assert.equal((await db.query('UPDATE public.hero_weights SET weight_home = 99 RETURNING id')).rows.length, 0);
assert.equal((await db.query('SELECT * FROM public.competences_validees')).rows.length, 0);
await assert.rejects(db.query(`INSERT INTO public.competences_validees (label, categorie) VALUES ('Pirate','x')`), /row-level security/);
assert.equal((await db.query('SELECT * FROM public.get_hero_weights()')).rows[0].weight_home, 20);
const all = (await db.query('SELECT * FROM public.list_validated_competences()')).rows;
assert.deepEqual(all.map((r) => r.label), ['Taille des haies', 'Bricolage', 'Compostage', 'Remise 100% bio']);
assert.deepEqual(Object.keys(all[0]).sort(), ['categorie', 'label']);
assert.deepEqual((await db.query(`SELECT label FROM public.list_validated_competences('ha', 'jardin', 5)`)).rows, [{ label: 'Taille des haies' }]);
assert.deepEqual((await db.query(`SELECT label FROM public.list_validated_competences(NULL, NULL, 2)`)).rows.map((r) => r.label), ['Taille des haies', 'Bricolage']);
assert.deepEqual((await db.query(`SELECT label FROM public.list_validated_competences('%')`)).rows, [{ label: 'Remise 100% bio' }]);
assert.equal((await db.query(`SELECT * FROM public.list_validated_competences('_')`)).rows.length, 0);

// Jeton membre sans identifiant : rien.
await as('authenticated');
assert.equal((await db.query('SELECT * FROM public.list_validated_competences()')).rows.length, 0);

// Admin : table complète, écriture permise.
await as('authenticated', ADMIN);
assert.equal((await db.query('SELECT updated_by FROM public.hero_weights')).rows[0].updated_by, ADMIN);
assert.equal((await db.query('UPDATE public.hero_weights SET weight_home = 20 RETURNING id')).rows.length, 1);
assert.equal((await db.query('SELECT * FROM public.competences_validees')).rows.length, 4);
await db.query(`INSERT INTO public.competences_validees (label, categorie) VALUES ('Apiculture','jardin')`);

// Service : accès complet.
await as('service_role');
assert.equal((await db.query('SELECT * FROM public.competences_validees')).rows.length, 5);
assert.equal((await db.query('SELECT * FROM public.list_validated_competences()')).rows.length, 5);
assert.equal((await db.query('SELECT * FROM public.hero_weights')).rows.length, 1);

await db.close();
console.log('PASS SEC2: visiteur sans lecture directe (poids par fonction), membre par fonction seulement, admin et service complets, rejouable.');
