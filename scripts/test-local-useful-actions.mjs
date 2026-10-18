import { after as afterAll, before as beforeAll, describe, it } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";


const a = "00000000-0000-4000-8000-000000000001";
const b = "00000000-0000-4000-8000-000000000002";
const c = "00000000-0000-4000-8000-000000000003";
let db;
const source = readFileSync(new URL("../supabase/prepared-migrations/20261018100000_local_useful_action_sources.sql", import.meta.url), "utf8");
async function asUser(id) {
  await db.exec("RESET ROLE");
  await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [id ?? ""]);
  await db.exec(id ? "SET ROLE authenticated" : "SET ROLE anon");
}
async function readSources() {
  const result = await db.query("SELECT public.local_useful_action_sources() AS data");
  return result.rows[0].data;
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
    GRANT USAGE ON SCHEMA auth TO anon, authenticated;
    CREATE TABLE profiles(id uuid PRIMARY KEY, latitude numeric, longitude numeric);
    CREATE TABLE owner_profiles(user_id uuid, competences text[], interests text[]);
    CREATE TABLE sitter_profiles(user_id uuid, competences text[], interests text[]);
    ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
    ALTER TABLE owner_profiles ENABLE ROW LEVEL SECURITY;
    ALTER TABLE sitter_profiles ENABLE ROW LEVEL SECURITY;
    CREATE POLICY own_profile ON profiles FOR SELECT TO authenticated USING(id=auth.uid());
    CREATE POLICY own_owner ON owner_profiles FOR SELECT TO authenticated USING(user_id=auth.uid());
    CREATE POLICY own_sitter ON sitter_profiles FOR SELECT TO authenticated USING(user_id=auth.uid());
    GRANT SELECT ON profiles,owner_profiles,sitter_profiles TO authenticated;
    INSERT INTO profiles VALUES ('${a}',45.76,4.83),('${b}',48.86,2.35),('${c}',null,null);
    INSERT INTO owner_profiles VALUES ('${a}',ARRAY['Arrosage plantes'],ARRAY['Nature']),('${b}',ARRAY['Compétence fictive B'],ARRAY['Réemploi']);
    INSERT INTO sitter_profiles VALUES ('${a}',ARRAY['Montage de meubles'],ARRAY['Nature']);
    CREATE TABLE missions (
      id uuid DEFAULT gen_random_uuid(), user_id uuid DEFAULT '${b}', slug text,
      title text, description text, city text DEFAULT 'Lyon', category text DEFAULT 'garden',
      latitude numeric DEFAULT 45.77, longitude numeric DEFAULT 4.83,
      status text DEFAULT 'open', mission_type text DEFAULT 'besoin', accepting_applications boolean DEFAULT true,
      date_needed date DEFAULT current_date+1, end_date date, created_at timestamptz DEFAULT now(),
      duration_estimate text DEFAULT 'Une heure', savoir_faire_attendus text[] DEFAULT '{}', savoir_faire_transmis text[] DEFAULT '{}', hidden boolean DEFAULT false
    );
    CREATE VIEW public_small_missions WITH (security_invoker=true) AS SELECT * FROM missions WHERE NOT hidden;
    CREATE TABLE public_animal_associations(slug text,name text,needs_details jsonb);
    GRANT SELECT ON public_small_missions,missions,public_animal_associations TO authenticated;
    INSERT INTO missions(title) VALUES ('Arrosage proche');
    INSERT INTO missions(title,latitude) VALUES ('Éloigné',46.5);
    INSERT INTO missions(title,user_id) VALUES ('Ma propre demande','${a}');
    INSERT INTO missions(title,hidden) VALUES ('Modérée',true);
    INSERT INTO missions(title,status) VALUES ('Terminée','completed');
    INSERT INTO missions(title,date_needed) VALUES ('Date passée',current_date-1);
    INSERT INTO missions(title,accepting_applications) VALUES ('Inscriptions closes',false);
    INSERT INTO missions(title,mission_type) VALUES ('Offre disponible','offre');
    INSERT INTO missions(title,latitude) VALUES ('Point absent',null);
    INSERT INTO missions(title,latitude,longitude) VALUES ('Action parisienne',48.86,2.35);
    INSERT INTO public_animal_associations VALUES
      ('locale','Association locale','[{"local_action":{"enabled":true,"latitude":45.78,"longitude":4.83}}]'),
      ('siege-lointain','Siège à Paris, action à Lyon','[{"local_action":{"enabled":true,"latitude":45.79,"longitude":4.83}}]'),
      ('lointaine','Action éloignée','[{"local_action":{"enabled":true,"latitude":48.86,"longitude":2.35}}]'),
      ('invalide','Données anciennes','[{"local_action":{"enabled":true,"latitude":"inconnue","longitude":4.83}}]'),
      ('invalide-geante','Hors limites','[{"local_action":{"enabled":true,"latitude":1e1000,"longitude":4.83}}]'),
      ('generale','Besoin général','[{"need":"benevoles"}]');
  `);
  await db.exec(source);
}, { timeout: 30_000 });
afterAll(async () => { await db?.close(); });

describe("Lecture SQL commune des actions locales", () => {
  it("respecte les RLS et ne renvoie que la localisation et les savoir-faire du titulaire", async () => {
    await asUser(a);
    const data = await readSources();
    assert.deepEqual(data.point, { latitude: 45.76, longitude: 4.83 });
    assert.deepEqual(data.skills, ["Arrosage plantes", "Montage de meubles"]);
    assert.deepEqual(data.interests, ["Nature"]);
    assert.deepEqual(data.missions.map(m => m.title), ["Arrosage proche"]);
  });
  it("sélectionne les associations sur leurs actions, et résiste aux coordonnées mal formées", async () => {
    await asUser(a);
    const data = await readSources();
    assert.deepEqual(data.associations.map(x => x.slug), ["locale", "siege-lointain"]);
  });
  it("change de périmètre quand le compte change", async () => {
    await asUser(b);
    const data = await readSources();
    assert.deepEqual(data.point, { latitude: 48.86, longitude: 2.35 });
    assert.deepEqual(data.skills, ["Compétence fictive B"]);
    assert.deepEqual(data.interests, ["Réemploi"]);
    // La demande parisienne est celle du titulaire, elle est donc exclue.
    assert.deepEqual(data.missions, []);
    assert.deepEqual(data.associations.map(x => x.slug), ["lointaine"]);
  });
  it("ne fait aucun repli national sans localisation", async () => {
    await asUser(c);
    const data = await readSources();
    assert.deepEqual(data, { point: null, skills: [], interests: [], missions: [], associations: [] });
  });
  it("refuse l'appel anonyme et n'élève pas les privilèges", async () => {
    await asUser(null);
    await assert.rejects(readSources, /permission denied/);
    await db.exec("RESET ROLE");
    const { rows } = await db.query("SELECT prosecdef FROM pg_proc WHERE oid='public.local_useful_action_sources()'::regprocedure");
    assert.equal(rows[0].prosecdef, false);
  });
  it("trie par distance avant le plafond, même parmi plus de 200 publications", async () => {
    await db.exec("RESET ROLE");
    await db.exec("INSERT INTO missions(title,latitude) SELECT 'Autre action '||n,45.90 FROM generate_series(1,220) n; INSERT INTO missions(title,latitude,created_at) VALUES ('La plus proche ancienne',45.761,now()-interval '2 months');");
    await asUser(a);
    const data = await readSources();
    assert.equal(data.missions.length, 200);
    assert.equal(data.missions[0].title, "La plus proche ancienne");
  });
});
