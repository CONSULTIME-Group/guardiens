// Test SQL du contexte de relance propriétaire, lot N2.
//
// Vérifie sur une base éphémère que la fonction compte tous les gardiens
// actifs à moins de 30 km, renvoie trois cartes ordonnées, et que son
// exécution reste réservée au service_role.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
const root = new URL('../', import.meta.url);
const migration = readFileSync(new URL('scripts/fixtures/owner-nurturing-context-0016.sql', root), 'utf8');
const passed = [];

await db.exec(`
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
  GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
  CREATE TABLE profiles(
    id uuid PRIMARY KEY,
    first_name text,
    city text,
    postal_code text,
    avatar_url text,
    role text,
    account_status text,
    identity_verified boolean,
    profile_completion integer,
    last_seen_at timestamptz,
    latitude double precision,
    longitude double precision
  );
  CREATE FUNCTION public.haversine_km(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
  RETURNS double precision LANGUAGE sql IMMUTABLE AS $$
    SELECT 2 * 6371 * asin(sqrt(
      power(sin(radians(lat2 - lat1) / 2), 2) +
      cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
    ));
  $$;
`);

// Lyon.
const OWNER = '00000000-0000-4000-8000-000000000000';
await db.exec(`
  INSERT INTO profiles(id, first_name, city, postal_code, role, account_status, profile_completion, latitude, longitude)
  VALUES ('${OWNER}', 'Patricia', 'Lyon', '69003', 'owner', 'active', 80, 45.764, 4.8357);
`);

// Un degré de latitude vaut environ 111,2 km.
const sitter = (n, over = {}) => {
  const o = {
    first_name: `Gardien${n}`, city: 'Lyon', avatar_url: null, role: 'sitter',
    account_status: 'active', identity_verified: false, completion: 10,
    last_seen: '2026-01-01', km: 5, ...over,
  };
  const id = `00000000-0000-4000-8000-0000000000${String(n).padStart(2, '0')}`;
  return `INSERT INTO profiles(id, first_name, city, avatar_url, role, account_status, identity_verified, profile_completion, last_seen_at, latitude, longitude)
    VALUES ('${id}', '${o.first_name}', '${o.city}', ${o.avatar_url ? `'${o.avatar_url}'` : 'NULL'}, '${o.role}', '${o.account_status}', ${o.identity_verified}, ${o.completion}, '${o.last_seen}', ${45.764 + o.km / 111.2}, 4.8357);`;
};

await db.exec([
  // Profil incomplet, identité absente, vu il y a longtemps : compté quand même.
  sitter(1, { km: 3 }),
  sitter(2, { km: 8, role: 'both' }),
  // Vérifié avec photo : passe devant malgré une distance plus grande.
  sitter(3, { km: 20, identity_verified: true, avatar_url: 'https://exemple.test/a.jpg', last_seen: '2026-02-01' }),
  sitter(4, { km: 12, last_seen: '2026-09-01' }),
  // Hors périmètre : trop loin, compte suspendu, rôle propriétaire.
  sitter(5, { km: 45 }),
  sitter(6, { km: 4, account_status: 'suspended' }),
  sitter(7, { km: 4, role: 'owner' }),
].join('\n'));

await db.exec(migration);

const ctx = (await db.query(`SELECT public.get_owner_nurturing_context('${OWNER}') AS c`)).rows[0].c;

assert.equal(ctx.nearby_sitters_count, 4);
passed.push('Le compteur retient les quatre gardiens actifs à moins de 30 km, complétion et identité comprises');

assert.equal(ctx.radius_km, 30);
assert.equal(ctx.city, 'Lyon');
passed.push('Ville et rayon restent au contrat attendu');

assert.equal(ctx.top_3_sitters.length, 3);
assert.deepEqual(ctx.top_3_sitters.map((s) => s.first_name), ['Gardien3', 'Gardien4', 'Gardien1']);
passed.push('Les trois cartes suivent identité vérifiée avec photo, puis dernière visite, puis distance');

const card = ctx.top_3_sitters[0];
assert.deepEqual(Object.keys(card).sort(), ['avatar_url', 'city', 'distance_km', 'first_name', 'id', 'url']);
assert.equal(card.distance_km, 20);
assert.match(card.url, /^https:\/\/guardiens\.fr\/gardiens\//);
passed.push('Une carte porte le prénom, la ville, la distance arrondie et le lien, sans coordonnées');

assert.equal(ctx.top_3_sitter_names.length, 3);
passed.push('top_3_sitter_names reste disponible pour la compatibilité');

// Droits effectifs.
for (const role of ['anon', 'authenticated']) {
  await db.exec(`SET ROLE ${role}`);
  await assert.rejects(db.query(`SELECT public.get_owner_nurturing_context('${OWNER}')`), { code: '42501' });
  await db.exec('RESET ROLE');
  passed.push(`${role} reste privé de la fonction`);
}
await db.exec('SET ROLE service_role');
const asService = (await db.query(`SELECT public.get_owner_nurturing_context('${OWNER}') AS c`)).rows[0].c;
assert.equal(asService.nearby_sitters_count, 4);
await db.exec('RESET ROLE');
passed.push('service_role obtient le même contexte');

// Propriétaire sans coordonnées : contrat stable, compteur à zéro.
const NOGEO = '00000000-0000-4000-8000-0000000000ff';
await db.exec(`INSERT INTO profiles(id, first_name, role, account_status, profile_completion) VALUES ('${NOGEO}', 'Sans lieu', 'owner', 'active', 20);`);
const empty = (await db.query(`SELECT public.get_owner_nurturing_context('${NOGEO}') AS c`)).rows[0].c;
assert.equal(empty.nearby_sitters_count, 0);
assert.deepEqual(empty.top_3_sitters, []);
passed.push('Un propriétaire sans coordonnées reçoit un contexte vide et valide');

for (const line of passed) console.log(`ok  ${line}`);
console.log(`\n${passed.length} assertions vertes`);
