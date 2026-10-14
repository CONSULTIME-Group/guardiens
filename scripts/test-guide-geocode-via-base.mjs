// Lot GL5 (14/10/2026) : centre d'un guide hors BAN cherché par la base.
// Vérifie sur PGlite (schéma net simulé) l'adresse fixe, la liste fermée des
// paramètres et les droits (clé service seule).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
const migration = readFileSync(new URL('../supabase/prepared-migrations/20261014120000_gl5_centre_par_la_base.sql', import.meta.url), 'utf8');
const passed = [];
await db.exec(`
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
  CREATE SCHEMA net;
  CREATE TABLE net.calls(id bigserial PRIMARY KEY, url text, params jsonb, timeout int);
  CREATE FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds int) RETURNS bigint
    LANGUAGE sql AS $$ INSERT INTO net.calls(url, params, timeout) VALUES (url, params, timeout_milliseconds) RETURNING id $$;
`);
await db.exec(migration);

const id = (await db.query(`SELECT guide_geocode_enqueue('{"format":"jsonv2","q":"Taravao","countrycodes":"fr","limit":"10"}'::jsonb) AS id`)).rows[0].id;
const call = (await db.query(`SELECT url, params, timeout FROM net.calls WHERE id=$1`, [id])).rows[0];
assert.equal(call.url, 'https://nominatim.openstreetmap.org/search');
assert.equal(call.params.q, 'Taravao');
assert.equal(call.params.countrycodes, 'fr');
assert.equal(call.timeout, 15000);
passed.push('Recherche envoyée à Nominatim, paramètres transmis');

await assert.rejects(db.query(`SELECT guide_geocode_enqueue('{"q":"x","url":"https://evil"}'::jsonb)`), /paramètres refusés/);
await assert.rejects(db.query(`SELECT guide_geocode_enqueue('{"format":"jsonv2"}'::jsonb)`), /paramètres refusés/);
await assert.rejects(db.query(`SELECT guide_geocode_enqueue(jsonb_build_object('q', repeat('x', 300)))`), /paramètres refusés/);
await assert.rejects(db.query(`SELECT guide_geocode_enqueue('[1]'::jsonb)`), /paramètres refusés/);
passed.push('Paramètre hors liste, sans recherche, trop long ou mal formé : refusé');

const grants = (await db.query(`
  SELECT array_agg(DISTINCT g.grantee::text ORDER BY g.grantee::text) AS who
  FROM pg_proc p
  JOIN LATERAL aclexplode(p.proacl) a ON true
  JOIN LATERAL (SELECT CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END AS grantee) g ON true
  WHERE p.proname = 'guide_geocode_enqueue' AND a.privilege_type = 'EXECUTE'`)).rows[0].who;
assert.ok(!grants.includes('anon') && !grants.includes('authenticated') && !grants.includes('PUBLIC'), String(grants));
assert.ok(grants.includes('service_role'));
passed.push('Exécution réservée à la clé service');

for (const p of passed) console.log(`ok - ${p}`);
console.log(`${passed.length}/${passed.length} guide-geocode-via-base`);
