import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";

const sql = readFileSync(new URL("../supabase/prepared-migrations/20261017150000_refonte_guides_garde.sql", import.meta.url), "utf8");
const guides = [
  { id: "aa8f86e2-079a-4566-9d95-743e0b1e972b", slug: "pension-chien-alternatives-guide", version: "2026-10-12 14:10:21.075742+00" },
  { id: "4f0c9ffe-1ed1-4612-8f81-f7986aac1272", slug: "vacances-longues-garde-animal-2-semaines", version: "2026-10-17 10:50:29.713254+00" },
].map(guide => {
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
      noindex boolean, region text, updated_at timestamptz
    );
  `);
  for (const guide of guides) {
    await db.query(`INSERT INTO articles VALUES ($1,$2,'Ancien','Résumé','Ancien contenu','Titre','Description','[]',ARRAY['vacances'],'photo',$3,'Elisa C.','2026-04-14','2026-04-14',true,false,NULL,$4)`, [guide.id, guide.slug, guide.metadata.canonical_url, guide.version]);
  }
  await db.exec(`INSERT INTO articles VALUES ('11111111-1111-1111-1111-111111111111','autre','Intact','','Autre','','','[]',ARRAY['autre'],'photo',NULL,'Elisa','2026-01-01','2026-01-01',true,false,NULL,'2026-10-01')`);
  await db.query("UPDATE articles SET updated_at='2026-10-16' WHERE id=$1", [guides[0].id]);
  await assert.rejects(db.exec(sql), /Guide 0 modifié/);
  await db.exec("ROLLBACK");
  await db.query("UPDATE articles SET updated_at=$2 WHERE id=$1", [guides[0].id, guides[0].version]);
  await db.query("UPDATE articles SET updated_at='2026-10-16' WHERE id=$1", [guides[1].id]);
  await assert.rejects(db.exec(sql), /Guide 1 modifié/);
  await db.exec("ROLLBACK");
  assert.equal((await rows(`SELECT content FROM articles WHERE id='${guides[0].id}'`))[0].content, "Ancien contenu");
  assert.equal((await rows("SELECT to_regclass('public._backup_articles_gardes_20261017') AS backup"))[0].backup, null);
  await db.query("UPDATE articles SET updated_at=$2 WHERE id=$1", [guides[1].id, guides[1].version]);
  const before = await rows("SELECT * FROM articles ORDER BY id");
  await db.exec(sql);
  const after = await rows("SELECT * FROM articles ORDER BY id");
  const editable = new Set(["title", "excerpt", "content", "meta_title", "meta_description", "internal_links", "updated_at"]);
  for (const guide of guides) {
    const actual = after.find(row => row.id === guide.id);
    const old = before.find(row => row.id === guide.id);
    assert.equal(actual.content, guide.content);
    for (const key of ["title", "excerpt", "meta_title", "meta_description"]) {
      assert.equal(actual[key], guide.metadata[key], `${guide.slug} ${key}`);
    }
    for (const key of Object.keys(actual).filter(key => !editable.has(key))) {
      assert.deepEqual(actual[key], old[key], `${guide.slug} ${key}`);
    }
    assert.equal(actual.internal_links.some(link => link.url === `/actualites/${guides.find(other => other.id !== guide.id).slug}`), true);
  }
  assert.match(after.find(row => row.id === guides[1].id).content, /\[faire garder sa maison en Nouvelle-Calédonie\]\(\/actualites\/garde-maison-animaux-nouvelle-caledonie\)/);
  assert.deepEqual(after.find(row => row.slug === "autre"), before.find(row => row.slug === "autre"));
  assert.deepEqual(await rows("SELECT * FROM public._backup_articles_gardes_20261017 ORDER BY id"), before.filter(row => row.slug !== "autre"));
  for (const role of ["anon", "authenticated"]) {
    assert.equal((await rows(`SELECT has_table_privilege('${role}','public._backup_articles_gardes_20261017','SELECT') AS allowed`))[0].allowed, false);
  }
  assert.equal((await rows("SELECT relrowsecurity FROM pg_class WHERE oid='public._backup_articles_gardes_20261017'::regclass"))[0].relrowsecurity, true);
  await db.exec(sql);
  assert.deepEqual(await rows("SELECT * FROM articles ORDER BY id"), after);
  assert.equal((await rows("SELECT count(*)::integer AS n FROM public._backup_articles_gardes_20261017"))[0].n, 2);
  console.log("Guides de garde : versions concurrentes, atomicité, fidélité aux sources, champs conservés, maillage, sauvegarde privée et idempotence validés.");
} finally {
  await db.close();
}
