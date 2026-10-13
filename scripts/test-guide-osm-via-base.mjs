// Lot GL (13/10/2026) : Overpass interrogé depuis la base. Vérifie sur PGlite
// (schéma net simulé) la liste fermée des miroirs, le refus d'une requête hors
// format et les droits (clé service seule).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
const migration = readFileSync(new URL('../supabase/prepared-migrations/20261013133000_gl_osm_via_base.sql', import.meta.url), 'utf8');
const passed = [];
await db.exec(`
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
  CREATE SCHEMA net;
  CREATE TABLE net.calls(id bigserial PRIMARY KEY, url text, params jsonb, timeout int);
  CREATE TABLE net._http_response(id bigint PRIMARY KEY, status_code int, timed_out boolean, error_msg text, content text);
  CREATE FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds int) RETURNS bigint
    LANGUAGE sql AS $$ INSERT INTO net.calls(url, params, timeout) VALUES (url, params, timeout_milliseconds) RETURNING id $$;
`);
await db.exec(migration);

const id = (await db.query(`SELECT guide_osm_enqueue('[out:json][timeout:25];nwr(around:5000,45.74,-70.69)["amenity"="veterinary"];out center tags;', 1) AS id`)).rows[0].id;
const call = (await db.query(`SELECT url, params->>'data' AS data, timeout FROM net.calls WHERE id=$1`, [id])).rows[0];
assert.equal(call.url, 'https://overpass.openstreetmap.fr/api/interpreter');
assert.ok(call.data.startsWith('[out:json][timeout:25];nwr(around:5000'));
assert.equal(call.timeout, 28000);
passed.push('Requête envoyée au miroir demandé, délai 28 s');

const id2 = (await db.query(`SELECT guide_osm_enqueue('[out:json][x];', 9) AS id`)).rows[0].id;
assert.equal((await db.query(`SELECT url FROM net.calls WHERE id=$1`, [id2])).rows[0].url, 'https://overpass.openstreetmap.fr/api/interpreter');
passed.push('Index de miroir hors liste ramené dans la liste fermée');

await assert.rejects(db.query(`SELECT guide_osm_enqueue('DROP TABLE x', 0)`), /requête refusée/);
await assert.rejects(db.query(`SELECT guide_osm_enqueue('[out:json][' || repeat('x', 5000), 0)`), /requête refusée/);
passed.push('Requête hors format ou trop longue refusée');

await db.exec(`INSERT INTO net._http_response VALUES (${id}, 200, false, NULL, '{"elements":[]}')`);
const r = (await db.query(`SELECT * FROM guide_osm_result(${id})`)).rows[0];
assert.equal(r.status_code, 200);
assert.equal(r.content, '{"elements":[]}');
passed.push('Réponse relue par identifiant');

const grants = (await db.query(`
  SELECT p.proname, array_agg(DISTINCT g.grantee::text ORDER BY g.grantee::text) AS who
  FROM pg_proc p
  JOIN LATERAL aclexplode(p.proacl) a ON true
  JOIN LATERAL (SELECT CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END AS grantee) g ON true
  WHERE p.proname IN ('guide_osm_enqueue','guide_osm_result') AND a.privilege_type = 'EXECUTE'
  GROUP BY p.proname`)).rows;
for (const g of grants) {
  assert.ok(!g.who.includes('anon') && !g.who.includes('authenticated') && !g.who.includes('PUBLIC'), `${g.proname}: ${g.who}`);
  assert.ok(g.who.includes('service_role'), `${g.proname}: ${g.who}`);
}
assert.equal(grants.length, 2);
passed.push('Exécution réservée à la clé service');

for (const p of passed) console.log(`ok - ${p}`);
console.log(`${passed.length}/${passed.length} guide-osm-via-base`);
