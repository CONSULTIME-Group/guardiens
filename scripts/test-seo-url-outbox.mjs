// Execute les vrais triggers et reservations dans Postgres local.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { unaccent } from '@electric-sql/pglite/contrib/unaccent';
const db = new PGlite({ extensions: { unaccent } });
await db.exec('CREATE EXTENSION unaccent');
const a='11111111-0000-4000-8000-000000000001';
const b='11111111-0000-4000-8000-000000000002';
await db.exec(`
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
  CREATE TABLE prerender_family_state(family text PRIMARY KEY,last_hash text,last_global_hash text,last_marked_at timestamptz);
  CREATE TABLE prerender_recache_log(created_at timestamptz DEFAULT now());
  CREATE TABLE profiles(id uuid PRIMARY KEY,role text,bio text,city text,seo_dirty_at timestamptz,last_seen_at timestamptz);
  CREATE TABLE articles(id uuid PRIMARY KEY,slug text,title text,published boolean,noindex boolean,seo_dirty_at timestamptz,private_note text);
  CREATE TABLE seo_city_pages(id uuid PRIMARY KEY,slug text,published boolean,seo_dirty_at timestamptz,city text);
  CREATE TABLE city_guides(id uuid PRIMARY KEY,slug text,published boolean,seo_dirty_at timestamptz,city text);
  CREATE TABLE seo_department_pages(id uuid PRIMARY KEY,slug text,published boolean,seo_dirty_at timestamptz);
  CREATE TABLE sits(id uuid PRIMARY KEY,slug text,title text,status text,accepting_applications boolean,user_id uuid);
  CREATE TABLE small_missions(id uuid PRIMARY KEY,slug text,title text,description text,category text,status text,view_count integer);
  CREATE TABLE animal_associations(id uuid PRIMARY KEY,slug text,status text,internal_note text);
  CREATE TABLE sitter_profiles(user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,motivation text,sensitivities text,updated_at timestamptz);
  CREATE TABLE sitter_gallery(id uuid PRIMARY KEY,user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,caption text);
  CREATE TABLE reviews(id uuid PRIMARY KEY,reviewee_id uuid,published boolean,comment text);
  CREATE TABLE badge_attributions(id uuid PRIMARY KEY,user_id uuid,badge_id text);
  CREATE TABLE properties(id uuid PRIMARY KEY,user_id uuid,description text);
  CREATE TABLE pets(id uuid PRIMARY KEY,property_id uuid,name text);
  CREATE TABLE owner_gallery(id uuid PRIMARY KEY,user_id uuid,photo_url text,caption text);
  CREATE TABLE breed_profiles(id uuid PRIMARY KEY,breed text,species text,temperament text,generated_at timestamptz);
  CREATE TABLE city_guide_places(id uuid PRIMARY KEY,city_guide_id uuid,name text,google_rating_attempted_at timestamptz);
  CREATE VIEW public_profiles AS SELECT id FROM profiles;
  CREATE VIEW public_small_missions AS SELECT * FROM small_missions;
  CREATE VIEW public_animal_associations AS SELECT * FROM animal_associations WHERE status='published';
  CREATE FUNCTION trg_recache_prerender() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$;
  CREATE TRIGGER articles_recache_prerender BEFORE UPDATE ON articles FOR EACH ROW EXECUTE FUNCTION trg_recache_prerender();
  INSERT INTO profiles(id,role) VALUES ('${a}','sitter'),('${b}','owner');
  INSERT INTO articles(id,slug,published) VALUES ('${a}','old',true);
  INSERT INTO city_guides(id,slug,published) VALUES ('${a}','guide',true);
`);
await db.exec(readFileSync(new URL('../supabase/prepared-migrations/20261003213000_seo_url_outbox.sql',import.meta.url),'utf8'));
await db.exec(readFileSync(new URL('../supabase/prepared-migrations/20261003223500_seo_public_content_fields.sql',import.meta.url),'utf8'));
const query=async(s)=>(await db.query(s)).rows;
const paths=async()=>(await query('SELECT path FROM seo_url_outbox ORDER BY path')).map(r=>r.path);
const clear=()=>db.exec('TRUNCATE seo_url_outbox');
const contains=async(...expected)=>{const actual=await paths();for(const p of expected)assert(actual.includes(p),`adresse absente ${p}`);};
const tests=[];const test=(name,run)=>tests.push([name,run]);
test('suppression physique conserve la fiche et ses hubs',async()=>{
  await db.exec(`DELETE FROM profiles WHERE id='${a}'`);await contains(`/gardiens/${a}`,'/','/house-sitting');
  await db.exec(`INSERT INTO profiles(id,role) VALUES ('${a}','sitter')`);
});
test('ancien slug et nouvelle demande survivent au renommage',async()=>{
  await db.exec(`UPDATE articles SET slug='new' WHERE id='${a}'`);
  await contains('/actualites/old','/actualites','/');
  assert((await query(`SELECT seo_dirty_at FROM articles WHERE id='${a}'`))[0].seo_dirty_at);
});
test('modification concurrente ne reutilise pas la date deja lue',async()=>{
  await db.exec(`UPDATE articles SET seo_dirty_at='2099-01-01' WHERE id='${a}'`);
  await db.exec(`UPDATE articles SET title='Nouveau titre' WHERE id='${a}'`);
  assert((await query(`SELECT seo_dirty_at>'2099-01-01'::timestamptz AS newer FROM articles WHERE id='${a}'`))[0].newer);
});
test('depublication seule avance le marqueur',async()=>{
  await db.exec(`UPDATE articles SET seo_dirty_at=NULL WHERE id='${a}';UPDATE articles SET published=false WHERE id='${a}'`);
  assert((await query(`SELECT seo_dirty_at FROM articles WHERE id='${a}'`))[0].seo_dirty_at);
});
test('donnee privee ou acquittement sans nouvelle file',async()=>{
  await db.exec(`UPDATE articles SET private_note='prive',seo_dirty_at=NULL WHERE id='${a}'`);assert.deepEqual(await paths(),[]);
  await db.exec(`UPDATE profiles SET last_seen_at=now() WHERE id='${a}'`);assert.deepEqual(await paths(),[]);
});
test('nouvelle fiche et hub sont marques',async()=>{
  await db.exec(`INSERT INTO seo_city_pages(id,slug,published) VALUES ('${a}','city',true)`);await contains('/house-sitting/city','/house-sitting','/');
});
test('suppression article ne perd pas son adresse',async()=>{
  await db.exec(`DELETE FROM articles WHERE id='${a}'`);await contains('/actualites/new','/actualites','/');
});
test('changement de categorie garde les anciennes routes et UUID',async()=>{
  await db.exec(`INSERT INTO small_missions(id,slug,category,status) VALUES ('${a}','mission','entraide','open')`);await clear();
  await db.exec(`UPDATE small_missions SET category='projet',slug='projet' WHERE id='${a}'`);
  await contains('/petites-missions/mission','/projets/projet','/petites-missions/projet',`/petites-missions/${a}`,`/projets/${a}`,'/projets','/petites-missions','/');
});
test('vue de mission ne genere pas de facture',async()=>{
  await db.exec(`UPDATE small_missions SET view_count=20 WHERE id='${a}'`);assert.deepEqual(await paths(),[]);
});
test('annonce conserve la variante UUID et slug apres suppression',async()=>{
  await db.exec(`INSERT INTO sits(id,slug,title,status,accepting_applications) VALUES ('${a}','annonce','Annonce','published',true)`);await clear();
  await db.exec(`DELETE FROM sits WHERE id='${a}'`);await contains('/annonces/annonce',`/annonces/${a}`,'/annonces','/');
});
test('profil proprietaire deja public invalidable apres acquittement',async()=>{
  await db.exec(`UPDATE profiles SET bio='Nouvelle presentation' WHERE id='${b}'`);await contains(`/gardiens/${b}`,'/','/house-sitting');
});
test('suppression en cascade de galerie conserve une demande profil',async()=>{
  await db.exec(`INSERT INTO sitter_gallery VALUES ('${a}','${a}','Prive');`);await clear();
  await db.exec(`DELETE FROM profiles WHERE id='${a}'`);await contains(`/gardiens/${a}`);
});
test('avis publie et retrait ecusson invalidant',async()=>{
  await db.exec(`INSERT INTO reviews VALUES ('${a}','${b}',true,'Avis public'); INSERT INTO badge_attributions VALUES ('${a}','${b}','confiance')`);
  await contains(`/gardiens/${b}`);await clear();
  await db.exec(`DELETE FROM badge_attributions WHERE id='${a}'`);await contains(`/gardiens/${b}`);
});
test('lieu local modifie : guide et hub conserves',async()=>{
  await db.exec(`INSERT INTO city_guide_places VALUES ('${a}','${a}','Lieu',NULL)`);await contains('/guides/guide','/guides');
});
test('dedup monotone et CAS de la mauvaise version protege',async()=>{
  await db.exec("SELECT enqueue_seo_url('/projets/old')");
  const old=(await query("SELECT dirty_at::text AS d,first_dirty_at::text AS first FROM seo_url_outbox WHERE path='/projets/old'"))[0];
  await db.exec("SELECT enqueue_seo_url('/projets/old')");
  await db.exec(`DELETE FROM seo_url_outbox WHERE path='/projets/old' AND dirty_at='${old.d}'`);
  const current=(await query("SELECT first_dirty_at::text AS first FROM seo_url_outbox WHERE path='/projets/old'"))[0];
  assert.equal(current.first,old.first);
});
test('transaction source annulee : aucune invalidation fantome',async()=>{
  await db.exec('BEGIN');await db.exec("SELECT enqueue_seo_url('/projets/rollback')");await db.exec('ROLLBACK');assert.deepEqual(await paths(),[]);
});
test('verrou empeche deux consommateurs puis autorise apres liberation',async()=>{
  assert.equal((await query(`SELECT seo_acquire_consumer('${a}') AS ok`))[0].ok,true);
  assert.equal((await query(`SELECT seo_acquire_consumer('${b}') AS ok`))[0].ok,false);
  await db.exec(`SELECT seo_release_consumer('${b}')`);
  assert.equal((await query(`SELECT seo_acquire_consumer('${b}') AS ok`))[0].ok,false);
  await db.exec(`SELECT seo_release_consumer('${a}')`);
  assert.equal((await query(`SELECT seo_acquire_consumer('${b}') AS ok`))[0].ok,true);
});
test('plafond mensuel 18000 reserve avant tout appel',async()=>{
  await db.exec(`SELECT seo_release_consumer('${b}');SELECT seo_acquire_consumer('${a}');INSERT INTO prerender_recache_log VALUES (now()),(now())`);
  assert.equal((await query(`SELECT seo_reserve_render('${a}') AS ok`))[0].ok,true);
  assert.equal((await query('SELECT attempts FROM seo_render_budget'))[0].attempts,3);
  await db.exec('UPDATE seo_render_budget SET attempts=17999 WHERE true');
  assert.equal((await query(`SELECT seo_reserve_render('${a}') AS ok`))[0].ok,true);
  assert.equal((await query(`SELECT seo_reserve_render('${a}') AS ok`))[0].ok,false);
  assert.equal((await query('SELECT attempts FROM seo_render_budget'))[0].attempts,18000);
});
test('verrou expire refuse la reservation et peut etre repris',async()=>{
  await db.exec("UPDATE seo_consumer_lease SET expires_at=now()-interval '1 minute' WHERE singleton");
  await assert.rejects(query(`SELECT seo_reserve_render('${a}')`),/lease expired/);
  assert.equal((await query(`SELECT seo_acquire_consumer('${b}') AS ok`))[0].ok,true);
});
test('race renommee : ancienne et nouvelle adresse plus hub',async()=>{
  await db.exec(`INSERT INTO breed_profiles VALUES ('${a}','Épagneul','Chien','Calme',now())`);await clear();
  await db.exec(`UPDATE breed_profiles SET breed='Épagneul breton' WHERE id='${a}'`);
  await contains('/races/chien-epagneul','/races/chien-epagneul-breton','/races');
});
test('logement et animal : fiche annonce dependante sans donnees privees dans la file',async()=>{
  await db.exec(`INSERT INTO properties VALUES ('${a}','${b}','Logement');
    INSERT INTO sits(id,slug,status,user_id) VALUES ('${b}','dependent','published','${b}')`);await clear();
  await db.exec(`INSERT INTO pets VALUES ('${a}','${a}','Animal')`);
  await contains('/annonces/dependent',`/annonces/${b}`,`/gardiens/${b}`,'/');
});
test('photo proprietaire et retrait : annonce et profil actualises',async()=>{
  await db.exec(`INSERT INTO owner_gallery VALUES ('${a}','${b}','photo.jpg','legende')`);await clear();
  await db.exec(`DELETE FROM owner_gallery WHERE id='${a}'`);await contains('/annonces/dependent',`/gardiens/${b}`);
});
test('ville du profil : invalide les deux fiches geographiques',async()=>{
  await db.exec(`UPDATE seo_city_pages SET city='Ville ancienne' WHERE id='${a}';
    INSERT INTO seo_city_pages(id,slug,published,city) VALUES ('${b}','city-new',true,'Ville nouvelle');
    UPDATE profiles SET city='Ville ancienne' WHERE id='${b}'`);await clear();
  await db.exec(`UPDATE profiles SET city='Ville nouvelle' WHERE id='${b}'`);
  await contains('/house-sitting/city','/house-sitting/city-new');
});
test('demande manuelle atomique : lot invalide annule toutes les insertions',async()=>{
  await assert.rejects(query("SELECT seo_enqueue_urls(ARRAY['/projets/good','//outside.test'])"),/check constraint/);
  assert.deepEqual(await paths(),[]);
  assert.equal((await query("SELECT seo_enqueue_urls(ARRAY['/projets/good','/projets/good']) AS n"))[0].n,2);
  assert.equal((await paths()).length,1);
});
test('gabarits : sonde sans mutation, vrai marquage des profils et anciennes routes',async()=>{
  assert.equal((await query("SELECT seo_queue_template_family('projets',true) AS n"))[0].n,4);
  assert.deepEqual(await paths(),[]);
  assert.equal((await query("SELECT seo_queue_template_family('projets',false) AS n"))[0].n,4);
  await contains('/projets/projet',`/projets/${a}`,`/petites-missions/${a}`,'/petites-missions/projet');
  // UNION peut compter quatre chemins distincts selon le jeu de donnees.
});
test('gabarits profils : seuls les profils publics sont marques, budget restant avant reseau',async()=>{
  await db.exec(`UPDATE profiles SET seo_dirty_at=NULL WHERE id='${b}'`);await clear();
  assert.equal((await query("SELECT seo_queue_template_family('sitters',true) AS n"))[0].n,1);
  assert.deepEqual(await paths(),[]);
  await db.exec("SELECT seo_queue_template_family('sitters',false)");
  assert((await query(`SELECT seo_dirty_at FROM profiles WHERE id='${b}'`))[0].seo_dirty_at);
});
test('champs geographiques et date publique avancent la version pendant un recache',async()=>{
  await db.exec(`ALTER TABLE city_guides ADD postal_code text;
    ALTER TABLE seo_city_pages ADD department text;
    ALTER TABLE seo_department_pages ADD region text;
    ALTER TABLE articles ADD published_at timestamptz;
    CREATE TRIGGER guides_recache BEFORE UPDATE ON city_guides FOR EACH ROW EXECUTE FUNCTION trg_recache_prerender();
    CREATE TRIGGER cities_recache BEFORE UPDATE ON seo_city_pages FOR EACH ROW EXECUTE FUNCTION trg_recache_prerender();
    CREATE TRIGGER departments_recache BEFORE UPDATE ON seo_department_pages FOR EACH ROW EXECUTE FUNCTION trg_recache_prerender();
    INSERT INTO articles(id,slug,published) VALUES ('${a}','date',true);
    INSERT INTO seo_department_pages(id,slug,published) VALUES ('${a}','region',true);`);
  for (const [table,field,value] of [['city_guides','postal_code',"'69001'"],['seo_city_pages','department',"'Rhone'"],['seo_department_pages','region',"'Auvergne'"],['articles','published_at',"'2026-10-03'::timestamptz"]]) {
    await db.exec(`UPDATE ${table} SET seo_dirty_at='2099-01-01' WHERE id='${a}'`);
    await db.exec(`UPDATE ${table} SET ${field}=${value} WHERE id='${a}'`);
    assert((await query(`SELECT seo_dirty_at>'2099-01-01'::timestamptz AS newer FROM ${table} WHERE id='${a}'`))[0].newer);
  }
  assert.equal((await query("SELECT count(*)::integer AS n FROM _backup_content_seo_trigger_20261003_2235"))[0].n,1);
  assert.equal((await query("SELECT has_table_privilege('anon','_backup_content_seo_trigger_20261003_2235','SELECT') AS allowed"))[0].allowed,false);
});
test('file et reservations privees, RPC interdite a anon',async()=>{
  for(const t of ['seo_url_outbox','seo_render_budget','seo_consumer_lease','_backup_content_seo_trigger_20261003_2130']){
    assert.equal((await query(`SELECT relrowsecurity AS rls FROM pg_class WHERE oid='${t}'::regclass`))[0].rls,true);
    assert.equal((await query(`SELECT has_table_privilege('anon','${t}','SELECT') AS allowed`))[0].allowed,false);
  }
  await db.exec('SET ROLE anon');await assert.rejects(query("SELECT enqueue_seo_url('/projets/private')"),/permission denied/);await db.exec('RESET ROLE');
});
test('chemins hors site refuses par la contrainte',async()=>{
  await assert.rejects(query("SELECT enqueue_seo_url('//outside.test/path')"),/check constraint/);
  await assert.rejects(query("SELECT enqueue_seo_url('/projets/../admin')"),/check constraint/);
});
for(const[name,run]of tests){await clear();await run();console.log(`OK ${name}`);}
await db.close();console.log(`${tests.length} scenarios SQL reussis, 0 echec`);
