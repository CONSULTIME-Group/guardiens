import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";

const sql = readFileSync(new URL("../supabase/prepared-migrations/20261017140000_refonte_article_caledonie.sql", import.meta.url), "utf8");
const draft = readFileSync(new URL("../docs/editorial/garde-maison-animaux-nouvelle-caledonie.md", import.meta.url), "utf8").replace(/^---\n[\s\S]*?\n---\n/, "").trim();
const target = "e2e9d23b-17a2-4810-9001-adcf5c5db60f";
const incoming = "4f0c9ffe-1ed1-4612-8f81-f7986aac1272";
const marker = "## <a id=\"erreurs\"></a>Les 5 erreurs à éviter sur une garde longue";
const paragraph = "Vous devez aussi organiser la garde loin de votre lieu de séjour ? Notre guide pour [faire garder sa maison en Nouvelle-Calédonie](/actualites/garde-maison-animaux-nouvelle-caledonie) détaille les prix en F CFP, les déplacements et le relais à prévoir quand vous partez du Caillou.";
const beforeIncoming = "Avant\n\n" + marker + "\n\nAprès";
const db = new PGlite();
const rows = async (query) => (await db.query(query)).rows;
try {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE TABLE public.articles (
      id uuid PRIMARY KEY, slug text, title text, excerpt text, content text,
      meta_title text, meta_description text, internal_links jsonb, tags text[],
      cover_image_url text, canonical_url text, author_name text,
      published_at timestamptz, published boolean, noindex boolean, updated_at timestamptz
    );
    INSERT INTO public.articles VALUES
      ('${target}','garde-maison-animaux-nouvelle-caledonie','Ancien','Résumé','Texte précédent','Ancien','Ancien','[]',ARRAY['ancien'],'photo',NULL,'Guardiens','2026-08-24 08:09:10.402043+00',true,false,'2026-10-13'),
      ('${incoming}','vacances-longues-garde-animal-2-semaines','Guide','Résumé','${beforeIncoming.replaceAll("'","''")}','Titre entrant','Description','[]',ARRAY['longue garde'],'photo guide','https://guardiens.fr/actualites/vacances-longues-garde-animal-2-semaines','Elisa','2026-04-14 10:00:00+00',true,false,'2026-10-12 13:10:17.454465+00'),
      ('11111111-1111-1111-1111-111111111111','autre','Autre','','Intact','','','[]',ARRAY['autre'],'',NULL,'Elisa','2026-06-01 00:00:00+00',true,false,'2026-10-01');
  `);
  await assert.rejects(db.exec(sql), /Guide Calédonie modifié/);
  await db.exec("ROLLBACK");
  await db.exec(`UPDATE articles SET updated_at='2026-10-12 15:25:10.849806+00' WHERE id='${target}'; UPDATE articles SET updated_at='2026-10-13' WHERE id='${incoming}';`);
  await assert.rejects(db.exec(sql), /Guide longues gardes modifié/);
  await db.exec("ROLLBACK");
  assert.equal((await rows(`SELECT content FROM articles WHERE id='${target}'`))[0].content, "Texte précédent");
  assert.equal((await rows("SELECT to_regclass('public._backup_articles_caledonie_20261017') AS backup"))[0].backup, null);
  await db.exec(`UPDATE articles SET updated_at='2026-10-12 13:10:17.454465+00' WHERE id='${incoming}';`);
  const before = await rows("SELECT * FROM articles ORDER BY id");
  await db.exec(sql);
  const after = await rows("SELECT * FROM articles ORDER BY id");
  const changed = after.find(x=>x.id===target);
  const linked = after.find(x=>x.id===incoming);
  assert.equal(changed.content.trim(), draft);
  for (const key of ["canonical_url","noindex","published","author_name","cover_image_url","published_at"]) {
    assert.deepEqual(changed[key], before.find(x=>x.id===target)[key], key);
  }
  assert.equal(changed.meta_title, "Garde de maison en Nouvelle-Calédonie : prix et conseils");
  assert.equal(changed.tags.includes("leptospirose"), false);
  assert.equal(linked.content, beforeIncoming.replace(marker, paragraph+"\n\n"+marker));
  assert.equal(linked.content.split("/actualites/garde-maison-animaux-nouvelle-caledonie").length-1, 1);
  for (const key of Object.keys(linked).filter(k=>!["content","updated_at"].includes(k))) {
    assert.deepEqual(linked[key], before.find(x=>x.id===incoming)[key], key);
  }
  assert.deepEqual(after.find(x=>x.slug==="autre"), before.find(x=>x.slug==="autre"));
  assert.equal((await rows("SELECT count(*)::integer AS n FROM public._backup_articles_caledonie_20261017"))[0].n, 2);
  for (const role of ["anon","authenticated"]) {
    assert.equal((await rows(`SELECT has_table_privilege('${role}','public._backup_articles_caledonie_20261017','SELECT') AS allowed`))[0].allowed, false);
  }
  assert.equal((await rows("SELECT relrowsecurity FROM pg_class WHERE oid='public._backup_articles_caledonie_20261017'::regclass"))[0].relrowsecurity, true);
  await db.exec(sql);
  assert.deepEqual(await rows("SELECT * FROM articles ORDER BY id"), after);
  assert.equal((await rows("SELECT count(*)::integer AS n FROM public._backup_articles_caledonie_20261017"))[0].n, 2);
  console.log("Calédonie : atomicité, gardes de version, champs conservés, lien unique, sauvegarde privée et idempotence validés.");
} finally {
  await db.close();
}

