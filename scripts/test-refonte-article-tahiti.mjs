import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";

const sql = readFileSync(new URL("../supabase/prepared-migrations/20261017130000_refonte_article_tahiti.sql", import.meta.url), "utf8");
const draft = readFileSync(new URL("../docs/editorial/garde-maison-animaux-tahiti.md", import.meta.url), "utf8").replace(/^---\n[\s\S]*?\n---\n/, "").trim();
const db = new PGlite();
const target = "73c66d0c-ff0c-49c2-a584-04c89200f895";
const general = "6c52710a-3130-49dd-8856-47ec9233feae";
const originalGeneral = 'Avant\n\n## <a id="legislation"></a>Assurance, accord écrit et imprévus\n\nAprès';
try {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE TABLE public.articles (
      id uuid PRIMARY KEY, slug text, title text, excerpt text, content text,
      meta_title text, meta_description text, internal_links jsonb, cover_image_url text,
      canonical_url text, author_name text, published_at timestamptz,
      noindex boolean, updated_at timestamptz
    );
    INSERT INTO public.articles VALUES
      ('${target}','garde-maison-animaux-tahiti','Ancien','Ancien','Texte précédent','Ancien','Ancien','[]','photo',NULL,'Guardiens','2026-08-24 00:00:00+00',false,'2026-10-13'),
      ('${general}','c-est-quoi-le-house-sitting','Guide','Résumé','${originalGeneral.replaceAll("'", "''")}','Titre général','Description','[]','photo guide',NULL,'Jérémie','2026-06-15',false,'2026-10-12 13:55:16.430034+00'),
      ('11111111-1111-1111-1111-111111111111','autre','Autre','','Intact','','','[]','',NULL,'Elisa','2026-06-01',false,'2026-10-01');
  `);
  await assert.rejects(db.exec(sql), /Guide Tahiti modifié/);
  await db.exec("ROLLBACK");
  await db.exec(`UPDATE articles SET updated_at='2026-10-12 15:10:15.65643+00' WHERE id='${target}'; UPDATE articles SET updated_at='2026-10-13' WHERE id='${general}';`);
  await assert.rejects(db.exec(sql), /Guide général modifié/);
  await db.exec("ROLLBACK");
  assert.equal((await db.query(`SELECT content FROM articles WHERE id='${target}'`)).rows[0].content,"Texte précédent");
  assert.equal((await db.query("SELECT to_regclass('public._backup_articles_tahiti_20261017') AS backup")).rows[0].backup,null);
  await db.exec(`UPDATE articles SET updated_at='2026-10-12 13:55:16.430034+00' WHERE id='${general}';`);
  await db.exec(sql);
  const after = (await db.query(`SELECT * FROM articles WHERE id='${target}'`)).rows[0];
  assert.equal(after.content.trim(),draft);
  assert.equal(after.canonical_url,null);
  assert.equal(after.noindex,false);
  assert.equal(after.author_name,"Guardiens");
  assert.equal(after.cover_image_url,"photo");
  assert.equal(new Date(after.published_at).toISOString(),"2026-08-24T00:00:00.000Z");
  const linked = (await db.query(`SELECT * FROM articles WHERE id='${general}'`)).rows[0];
  assert.equal(linked.content.split("/actualites/garde-maison-animaux-tahiti").length-1,1);
  assert.equal(linked.title,"Guide");
  assert.equal(linked.meta_title,"Titre général");
  assert.equal(linked.meta_description,"Description");
  assert.equal(linked.content.replace(/Le lieu du séjour change aussi la préparation\.[\s\S]*?avant de partir\.\n\n/,""),originalGeneral);
  assert.equal((await db.query("SELECT content FROM articles WHERE slug='autre'")).rows[0].content,"Intact");
  assert.equal((await db.query("SELECT count(*)::integer AS n FROM public._backup_articles_tahiti_20261017")).rows[0].n,2);
  assert.equal((await db.query("SELECT has_table_privilege('anon','public._backup_articles_tahiti_20261017','SELECT') AS allowed")).rows[0].allowed,false);
  assert.equal((await db.query("SELECT has_table_privilege('authenticated','public._backup_articles_tahiti_20261017','SELECT') AS allowed")).rows[0].allowed,false);
  assert.equal((await db.query("SELECT relrowsecurity FROM pg_class WHERE oid='public._backup_articles_tahiti_20261017'::regclass")).rows[0].relrowsecurity,true);
  await db.exec(sql);
  assert.equal((await db.query("SELECT count(*)::integer AS n FROM public._backup_articles_tahiti_20261017")).rows[0].n,2);
  assert.equal(new Date((await db.query(`SELECT updated_at FROM articles WHERE id='${target}'`)).rows[0].updated_at).getTime(),new Date(after.updated_at).getTime());
  assert.equal(new Date((await db.query(`SELECT updated_at FROM articles WHERE id='${general}'`)).rows[0].updated_at).getTime(),new Date(linked.updated_at).getTime());
  console.log("Tahiti : atomicité des deux articles, gardes de version, lien entrant unique, sauvegarde privée et idempotence validés.");
} finally {
  await db.close();
}
