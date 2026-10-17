import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";

const sql = readFileSync(new URL("../supabase/prepared-migrations/20261017180000_refonte_articles_saisons.sql", import.meta.url), "utf8");
const guides = [{"id": "c97538a6-2f6b-436d-a34e-6df589a62315", "slug": "house-sitting-noel-fetes-fin-annee", "version": "2026-10-12 15:40:12.313533+00"}, {"id": "809eceed-88ac-4846-9f61-052d74530567", "slug": "house-sitting-week-end-court-sejour-aura", "version": "2026-10-12 14:10:21.205074+00"}].map(guide => {
  const source = readFileSync(new URL(`../docs/editorial/${guide.slug}.md`, import.meta.url), "utf8");
  const front = source.match(/^---\n([\s\S]*?)\n---\n/);
  const metadata = Object.fromEntries(front[1].split("\n").map(line => {
    const colon = line.indexOf(":");
    const value = line.slice(colon + 1).trim();
    return [line.slice(0, colon), value.startsWith('"') ? JSON.parse(value) : value];
  }));
  return { ...guide, metadata, content: source.slice(front[0].length).trim() };
});
const db = new PGlite();
const rows = async query => (await db.query(query)).rows;
try {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE TABLE public.articles (
      id uuid PRIMARY KEY, slug text, title text, excerpt text, content text,
      meta_title text, meta_description text, internal_links jsonb, tags text[],
      cover_image_url text, canonical_url text, author_name text,
      created_at timestamptz, published_at timestamptz, published boolean,
      noindex boolean, region text, hero_image_alt text, updated_at timestamptz
    );
  `);
  for (const guide of guides) {
    await db.query(`INSERT INTO articles VALUES ($1,$2,'Ancien','Résumé','Ancien contenu','Titre','Description','[]',ARRAY['vacances'],'photo',$3,'Elisa C.','2026-04-14','2026-04-14',true,false,NULL,'Ancienne description',$4)`, [guide.id, guide.slug, guide.metadata.canonical_url, guide.version]);
  }
  await db.exec(`INSERT INTO articles VALUES ('11111111-1111-1111-1111-111111111111','autre','Intact','','Autre','','','[]',ARRAY['autre'],'photo',NULL,'Elisa','2026-01-01','2026-01-01',true,false,NULL,'Autre image','2026-10-01')`);
  await db.query("UPDATE articles SET updated_at='2026-10-16' WHERE id=$1", [guides[0].id]);
  await assert.rejects(db.exec(sql), /Guide saisonnier 0 modifié/);
  await db.exec("ROLLBACK");
  await db.query("UPDATE articles SET updated_at=$2 WHERE id=$1", [guides[0].id, guides[0].version]);
  await db.query("UPDATE articles SET updated_at='2026-10-16' WHERE id=$1", [guides[1].id]);
  await assert.rejects(db.exec(sql), /Guide saisonnier 1 modifié/);
  await db.exec("ROLLBACK");
  assert.equal((await rows(`SELECT content FROM articles WHERE id='${guides[0].id}'`))[0].content, "Ancien contenu");
  assert.equal((await rows("SELECT to_regclass('public._backup_articles_saisons_20261017') AS backup"))[0].backup, null);
  await db.query("UPDATE articles SET updated_at=$2 WHERE id=$1", [guides[1].id, guides[1].version]);
  const before = await rows("SELECT * FROM articles ORDER BY id");
  await db.exec(sql);
  const after = await rows("SELECT * FROM articles ORDER BY id");
  const editable = new Set(["title", "excerpt", "content", "meta_title", "meta_description", "internal_links", "hero_image_alt", "updated_at"]);
  for (const guide of guides) {
    const actual = after.find(row => row.id === guide.id);
    const old = before.find(row => row.id === guide.id);
    assert.equal(actual.content, guide.content);
    for (const key of ["title", "excerpt", "meta_title", "meta_description", "hero_image_alt"]) {
      assert.equal(actual[key], guide.metadata[key], `${guide.slug} ${key}`);
    }
    for (const key of Object.keys(actual).filter(key => !editable.has(key))) {
      assert.deepEqual(actual[key], old[key], `${guide.slug} ${key}`);
    }
    assert.equal(actual.internal_links.some(link => link.url === `/actualites/${guides.find(other => other.id !== guide.id).slug}`), true);
  }
  assert.deepEqual(after.find(row => row.slug === "autre"), before.find(row => row.slug === "autre"));
  assert.deepEqual(await rows("SELECT * FROM public._backup_articles_saisons_20261017 ORDER BY id"), before.filter(row => row.slug !== "autre"));
  for (const role of ["anon", "authenticated"]) {
    assert.equal((await rows(`SELECT has_table_privilege('${role}','public._backup_articles_saisons_20261017','SELECT') AS allowed`))[0].allowed, false);
  }
  assert.equal((await rows("SELECT relrowsecurity FROM pg_class WHERE oid='public._backup_articles_saisons_20261017'::regclass"))[0].relrowsecurity, true);
  await db.exec(sql);
  assert.deepEqual(await rows("SELECT * FROM articles ORDER BY id"), after);
  assert.equal((await rows("SELECT count(*)::integer AS n FROM public._backup_articles_saisons_20261017"))[0].n, 2);
  console.log("Guides fêtes et week-end : versions concurrentes, atomicité, fidélité aux sources, champs conservés, maillage, sauvegarde privée et idempotence validés.");
} finally {
  await db.close();
}
