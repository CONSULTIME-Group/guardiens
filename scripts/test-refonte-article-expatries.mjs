import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";

const sql = readFileSync(new URL("../supabase/prepared-migrations/20261017110000_refonte_article_expatries.sql", import.meta.url), "utf8");
const db = new PGlite();
try {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE TABLE public.articles (
      id uuid PRIMARY KEY, slug text, title text, excerpt text, content text,
      meta_title text, meta_description text, internal_links jsonb, cover_image_url text,
      canonical_url text, author_name text, published_at timestamptz,
      noindex boolean, updated_at timestamptz
    );
    INSERT INTO public.articles VALUES (
      'f641ed2f-a744-4113-a2d8-9c3b95f2bcc1', 'expat-proprietaire-faire-garder-maison-etranger',
      'Avant', 'Avant', 'Texte précédent', 'Avant', 'Avant', '[]', 'photo précédente',
      'https://guardiens.fr/actualites/expat-proprietaire-faire-garder-maison-etranger',
      'Jérémie', '2026-06-15 06:28:25.380426+00', false, '2026-10-13 00:00:00+00'
    ), (
      '11111111-1111-1111-1111-111111111111', 'autre-article', 'Autre', '', 'Intact', '', '', '[]', '',
      'https://guardiens.fr/actualites/autre-article', 'Elisa', '2026-06-01', false, '2026-10-01'
    );
  `);
  await assert.rejects(db.exec(sql), /Article modifié depuis la préparation/);
  await db.exec("ROLLBACK");
  assert.equal((await db.query("SELECT content FROM articles WHERE slug = 'expat-proprietaire-faire-garder-maison-etranger'")).rows[0].content, "Texte précédent");
  await db.exec("UPDATE articles SET updated_at = '2026-10-12 13:40:17.694355+00' WHERE slug = 'expat-proprietaire-faire-garder-maison-etranger'");
  await db.exec(sql);
  const result = (await db.query("SELECT * FROM articles WHERE slug = 'expat-proprietaire-faire-garder-maison-etranger'")).rows[0];
  assert.match(result.content, /Les billets pour rentrer en France/);
  assert.match(result.content, /second semestre 2027/);
  assert.equal(result.noindex, false);
  assert.equal(result.author_name, "Jérémie");
  assert.equal(result.canonical_url, "https://guardiens.fr/actualites/expat-proprietaire-faire-garder-maison-etranger");
  assert.equal(new Date(result.published_at).toISOString(), "2026-06-15T06:28:25.380Z");
  assert.equal((await db.query("SELECT content FROM articles WHERE slug = 'autre-article'")).rows[0].content, "Intact");
  const backup = (await db.query("SELECT content FROM public._backup_article_expat_20261017")).rows;
  assert.deepEqual(backup, [{ content: "Texte précédent" }]);
  assert.equal((await db.query("SELECT has_table_privilege('anon', 'public._backup_article_expat_20261017', 'SELECT') AS allowed")).rows[0].allowed, false);
  assert.equal((await db.query("SELECT has_table_privilege('authenticated', 'public._backup_article_expat_20261017', 'SELECT') AS allowed")).rows[0].allowed, false);
  assert.equal((await db.query("SELECT relrowsecurity FROM pg_class WHERE oid = 'public._backup_article_expat_20261017'::regclass")).rows[0].relrowsecurity, true);
  await db.exec(sql);
  assert.equal((await db.query("SELECT count(*)::integer AS n FROM public._backup_article_expat_20261017")).rows[0].n, 1);
  assert.equal(new Date((await db.query("SELECT updated_at FROM articles WHERE slug = 'expat-proprietaire-faire-garder-maison-etranger'")).rows[0].updated_at).getTime(), new Date(result.updated_at).getTime());
  console.log("Refonte expatriés : garde de version, sauvegarde privée, ciblage et idempotence validés.");
} finally {
  await db.close();
}
