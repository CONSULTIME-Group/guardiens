// Lot GL4 (14/10/2026) : file du protocole de génération des guides.
// Exécute la migration préparée réelle sur PGlite : table des requêtes
// OpenStreetMap (suppression en cascade, clé service seule) et file SEO
// relancée par la bascule « sourcé » d'un guide.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
const migration = readFileSync(new URL('../supabase/prepared-migrations/20261014000000_gl4_protocole_guides.sql', import.meta.url), 'utf8');
const passed = [];
await db.exec(`
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
  CREATE TABLE city_guides(id uuid PRIMARY KEY, slug text, city text, postal_code text, intro text, ideal_for text,
    department text, published boolean, leash_rule text, leash_rule_source text, places_sourced_at timestamptz,
    country text DEFAULT 'FR', latitude double precision, longitude double precision);
  CREATE TABLE seo_queue(path text);
  CREATE FUNCTION queue_public_seo_change() RETURNS trigger LANGUAGE plpgsql AS $$
  DECLARE fields text[] := string_to_array(TG_ARGV[2], ','); o jsonb := to_jsonb(OLD); n jsonb := to_jsonb(NEW);
  BEGIN
    IF TG_OP = 'UPDATE' AND NOT EXISTS (SELECT 1 FROM unnest(fields) f WHERE o->f IS DISTINCT FROM n->f) THEN RETURN NEW; END IF;
    INSERT INTO seo_queue VALUES (TG_ARGV[0] || NEW.slug);
    RETURN NEW;
  END $$;
  INSERT INTO city_guides(id, slug, city) VALUES ('00000000-0000-0000-0000-000000000001', 'saint-ludger', 'Saint Ludger');
`);
await db.exec(migration);

await db.exec(`INSERT INTO guide_osm_requests(city_guide_id, round, radius, statement, net_id)
  VALUES ('00000000-0000-0000-0000-000000000001', 0, 5000, 'nwr(around:5000,45.74,-70.69)["amenity"="veterinary"]["name"];', 12)`);
const r = (await db.query(`SELECT status, tries, mirror, dry_run FROM guide_osm_requests`)).rows[0];
assert.deepEqual(r, { status: 'sent', tries: 1, mirror: 0, dry_run: false });
passed.push('Requête enregistrée : envoyée, premier essai');

await assert.rejects(db.exec(`UPDATE guide_osm_requests SET status = 'perdue'`));
passed.push('Statut hors liste refusé');

await db.exec(`UPDATE city_guides SET places_sourced_at = now() WHERE slug = 'saint-ludger'`);
assert.equal((await db.query(`SELECT count(*)::int AS n FROM seo_queue WHERE path = '/guides/saint-ludger'`)).rows[0].n, 1);
passed.push('Bascule « sourcé » : page remise dans la file SEO');

await db.exec(`UPDATE city_guides SET pipeline_lock_until = now(), places_source_passes = 1 WHERE slug = 'saint-ludger'`);
assert.equal((await db.query(`SELECT count(*)::int AS n FROM seo_queue`)).rows[0].n, 1);
passed.push('Verrou et compteur de passages : aucun prérendu inutile');

await db.exec(`DELETE FROM city_guides`);
assert.equal((await db.query(`SELECT count(*)::int AS n FROM guide_osm_requests`)).rows[0].n, 0);
passed.push('Guide supprimé : ses requêtes partent avec lui');

const acl = (await db.query(`SELECT relacl::text AS acl FROM pg_class WHERE relname = 'guide_osm_requests'`)).rows[0].acl;
assert.ok(acl.includes('service_role=') && !acl.includes('anon=') && !acl.includes('authenticated='), acl);
passed.push('Table réservée à la clé service');

for (const p of passed) console.log(`ok - ${p}`);
console.log(`${passed.length}/${passed.length} guide-protocole-gl4`);
