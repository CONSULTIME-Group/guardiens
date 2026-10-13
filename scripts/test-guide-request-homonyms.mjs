// Lots GL1 à GL3 (13/10/2026) : une demande de guide porte le pays et le lieu
// du propriétaire, un homonyme éloigné reçoit son propre slug, et un code
// postal étranger ne devient plus un département (« G0 » pour Saint Ludger).
// Exécute la migration préparée réelle sur une base PGlite.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
const migration = readFileSync(
  new URL('../supabase/prepared-migrations/20261013100000_gl_guides_lieux_sources.sql', import.meta.url),
  'utf8',
);
const passed = [];

await db.exec(`
  CREATE ROLE anon; CREATE ROLE authenticated;
  CREATE TABLE profiles(id text PRIMARY KEY, city text, postal_code text, country text NOT NULL DEFAULT 'FR', latitude double precision, longitude double precision);
  CREATE TABLE sits(id text PRIMARY KEY, user_id text, status text, created_at timestamptz DEFAULT now());
  CREATE TABLE city_guides(id text PRIMARY KEY, slug text UNIQUE, city text, postal_code text DEFAULT '', department text DEFAULT '', published boolean DEFAULT true);
  CREATE TABLE city_guide_places(id text PRIMARY KEY, city_guide_id text, name text, source_url text, created_at timestamptz DEFAULT now(), google_rating numeric, google_rating_count int);
  INSERT INTO city_guide_places VALUES ('p1','g-sp','Véto','https://www.openstreetmap.org/node/1','2026-09-01',4.5,10),('p2','g-sp','Véto','https://www.openstreetmap.org/node/1','2026-09-02',NULL,NULL),('p3','g-sp','Parc IA',NULL,'2026-09-01',4.1,3),('p4','g-sp','Parc IA bis',NULL,'2026-09-01',NULL,NULL);
  CREATE TABLE guide_requests(id serial PRIMARY KEY, city text NOT NULL, slug text NOT NULL UNIQUE, postal_code text, department text,
    status text NOT NULL DEFAULT 'pending', active_sits_count int NOT NULL DEFAULT 0, last_seen_at timestamptz DEFAULT now(),
    first_requested_at timestamptz DEFAULT now(), city_guide_id text);
  CREATE FUNCTION slugify_city(input text) RETURNS text LANGUAGE plpgsql IMMUTABLE AS $$
  DECLARE v text; BEGIN IF input IS NULL THEN RETURN NULL; END IF; v := lower(trim(input));
    v := translate(v, 'àáâãäåçèéêëìíîïñòóôõöùúûüýÿ', 'aaaaaaceeeeiiiinooooouuuuyy');
    v := regexp_replace(v, '[^a-z0-9]+', '-', 'g'); v := regexp_replace(v, '^-+|-+$', '', 'g'); RETURN v; END; $$;
  INSERT INTO profiles VALUES ('andree', 'Saint Ludger', 'G0M1W0', 'CA', 45.742131, -70.694618);
  -- Homonyme québécois plus récent d'un guide français : ne doit pas déplacer la demande de Laval (Mayenne).
  INSERT INTO profiles VALUES ('lav-fr', 'Laval', '53000', 'FR', 48.07, -0.77);
  INSERT INTO profiles VALUES ('lav-qc0', 'Laval', 'H7N 1A1', 'CA', 45.57, -73.69);
  INSERT INTO sits VALUES ('s-lav-fr', 'lav-fr', 'published', '2026-09-01');
  INSERT INTO sits VALUES ('s-lav-qc0', 'lav-qc0', 'published', '2026-10-01');
  INSERT INTO guide_requests(city, slug, postal_code, department, status) VALUES ('Laval', 'laval', '53000', '53', 'created');
  INSERT INTO sits VALUES ('s-andree', 'andree', 'published');
  INSERT INTO guide_requests(city, slug, postal_code, department, status) VALUES ('Saint Ludger', 'saint-ludger', 'G0M1W0', 'G0', 'created');
  INSERT INTO city_guides(id, slug, city, postal_code, department) VALUES ('g-sl', 'saint-ludger', 'Saint Ludger', 'G0M1W0', 'G0');
  INSERT INTO city_guides(id, slug, city, postal_code, department) VALUES ('g-sp', 'saint-pierre', 'Saint-Pierre', '97410', 'La Réunion');
`);
await db.exec(migration);
// Le déclencheur est créé par la migration d'avril, pas par celle-ci.
await db.exec(`CREATE TRIGGER trg_sit_upsert_guide_request AFTER INSERT OR UPDATE OF status, user_id ON sits
  FOR EACH ROW EXECUTE FUNCTION upsert_guide_request_from_sit();`);

let r = (await db.query(`SELECT country, latitude, longitude FROM guide_requests WHERE slug='saint-ludger'`)).rows[0];
assert.equal(r.country, 'CA');
assert.equal(r.latitude, 45.74);
assert.equal(r.longitude, -70.69);
passed.push('Rattrapage : la demande de Saint Ludger porte CA et un lieu arrondi au kilomètre');

r = (await db.query(`SELECT country FROM city_guides WHERE slug='saint-ludger'`)).rows[0];
assert.equal(r.country, 'CA');
passed.push('Rattrapage : le guide Saint Ludger passe en CA');

r = (await db.query(`SELECT country, latitude FROM guide_requests WHERE slug='laval'`)).rows[0];
assert.equal(r.country, 'FR');
assert.equal(r.latitude, 48.07);
passed.push('Rattrapage : un homonyme québécois plus récent ne déplace pas la demande de Laval (Mayenne)');

r = (await db.query(`SELECT id FROM city_guide_places ORDER BY id`)).rows.map((x) => x.id);
assert.deepEqual(r, ['p1', 'p3', 'p4']);
passed.push('Doublon de lieu sourcé retiré, lieux sans source intacts');
await assert.rejects(db.exec(`INSERT INTO city_guide_places VALUES ('p5','g-sp','Véto','https://www.openstreetmap.org/node/1',now(),NULL,NULL)`));
await db.exec(`INSERT INTO city_guide_places VALUES ('p6','g-sp','Autre',NULL,now(),NULL,NULL)`);
passed.push('Index unique : un lieu sourcé une seule fois par guide, plusieurs lieux sans source acceptés');
r = (await db.query(`SELECT count(*)::int AS n FROM city_guide_places WHERE google_rating IS NOT NULL OR google_rating_count IS NOT NULL`)).rows[0];
assert.equal(r.n, 0);
passed.push('Notes Google effacées');

const d = (await db.query(`SELECT round(guide_distance_km(45.764, 4.8357, 48.8566, 2.3522)::numeric) AS km`)).rows[0].km;
assert.equal(Number(d), 391);
passed.push('Distance Lyon Paris : 391 km');

// Un propriétaire à Saint-Pierre en Martinique ne rejoint pas le guide de La Réunion.
await db.exec(`UPDATE city_guides SET latitude=-21.34, longitude=55.48 WHERE slug='saint-pierre'`);
await db.exec(`INSERT INTO profiles VALUES ('mq', 'Saint-Pierre', '97250', 'FR', 14.743, -61.175)`);
await db.exec(`INSERT INTO sits VALUES ('s-mq', 'mq', 'published')`);
r = (await db.query(`SELECT slug, department, country, status FROM guide_requests WHERE city='Saint-Pierre'`)).rows;
assert.equal(r.length, 1);
assert.equal(r[0].slug, 'saint-pierre-972');
assert.equal(r[0].department, '972');
assert.equal(r[0].status, 'pending');
passed.push('Homonyme éloigné : demande saint-pierre-972, département 972');

// Un propriétaire à Saint-Pierre de La Réunion rejoint le guide existant.
await db.exec(`INSERT INTO profiles VALUES ('re', 'Saint-Pierre', '97410', 'FR', -21.33, 55.47)`);
await db.exec(`INSERT INTO sits VALUES ('s-re', 're', 'published')`);
r = (await db.query(`SELECT count(*)::int AS n FROM guide_requests WHERE slug='saint-pierre'`)).rows[0];
assert.equal(r.n, 0);
passed.push('Même lieu : aucune nouvelle demande, le guide existant suffit');

// Un propriétaire étranger sans guide : pays gardé, aucun département.
await db.exec(`INSERT INTO profiles VALUES ('ma', 'Essaouira', '', 'MA', 31.5085, -9.7595)`);
await db.exec(`INSERT INTO sits VALUES ('s-ma', 'ma', 'published')`);
r = (await db.query(`SELECT country, department, latitude FROM guide_requests WHERE slug='essaouira'`)).rows[0];
assert.equal(r.country, 'MA');
assert.equal(r.department, null);
assert.equal(r.latitude, 31.51);
passed.push('Étranger : pays MA, département vide, lieu arrondi');

// Homonyme à l'étranger d'un guide français : suffixe pays.
await db.exec(`INSERT INTO city_guides(id, slug, city, postal_code, department, latitude, longitude) VALUES ('g-lv', 'laval', 'Laval', '53000', 'Mayenne', 48.07, -0.77)`);
await db.exec(`INSERT INTO profiles VALUES ('qc', 'Laval', 'H7N 1A1', 'CA', 45.57, -73.69)`);
await db.exec(`INSERT INTO sits VALUES ('s-qc', 'qc', 'published')`);
r = (await db.query(`SELECT slug FROM guide_requests WHERE city='Laval' ORDER BY slug`)).rows;
assert.deepEqual(r.map((x) => x.slug), ['laval', 'laval-ca']);
passed.push('Laval (Québec) face au guide de Laval (Mayenne) : demande laval-ca');

const slug = (await db.query(`SELECT guide_homonym_slug('saint-pierre','FR','20000') AS s`)).rows[0].s;
assert.equal(slug, 'saint-pierre-20');
passed.push('Suffixe Corse : département tiré du code postal');

for (const p of passed) console.log(`ok - ${p}`);
console.log(`${passed.length}/${passed.length} guide-request-homonyms`);
