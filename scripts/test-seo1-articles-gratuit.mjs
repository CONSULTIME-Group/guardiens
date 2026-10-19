// Lot SEO1 : rejoue en local (PGlite) la migration préparée
// supabase/prepared-migrations/20261019121000_seo1_articles_gratuit.sql.
// Vérifie : garde de version, atomicité, exclusions intactes, phrases réelles
// relevées en base le 19/10/2026, sauvegarde privée et rejouabilité.
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";

const sql = readFileSync(new URL("../supabase/prepared-migrations/20261019121000_seo1_articles_gratuit.sql", import.meta.url), "utf8");
const cible = [...sql.matchAll(/\('([0-9a-f-]{36})'::uuid, '([^']+)', '([^']+)'::timestamptz\)/g)]
  .map(([, id, slug, version]) => ({ id, slug, version }));
assert.equal(cible.length, 118);

// Phrases relevées dans les articles publiés (SELECT du 19/10/2026).
const SAMPLES = [
  ["**La plateforme est actuellement 100 % gratuite pour les propriétaires et les gardiens.** Une participation aux frais de fonctionnement pourra être mise en place **au plus tôt au second semestre 2027, avec 30 jours de préavis**.\n\nSuite.",
   "**Guardiens est gratuit.**\n\nSuite."],
  ["Sur Guardiens, le gardien est hébergé sans rémunération et la plateforme est actuellement gratuite, selon les [conditions tarifaires](/tarifs).",
   "Sur Guardiens, le gardien est hébergé sans rémunération et Guardiens est gratuit, selon les [conditions tarifaires](/tarifs)."],
  ["Texte. La plateforme est **actuellement 100 % gratuite** ; elle facilite la mise en relation. Une contribution au fonctionnement pourra évoluer au plus tôt au second semestre 2027, avec trente jours de préavis. Fin.",
   "Texte. Guardiens est **gratuit** ; la plateforme facilite la mise en relation. Fin."],
  ["Avant.\n\nUne participation aux frais de fonctionnement pourra être mise en place au plus tôt au second semestre 2027, avec trente jours de préavis. Les [conditions actuelles](/tarifs) expliquent le modèle.\n\nLa plateforme est actuellement 100 % gratuite pour les deux rôles.",
   "Avant.\n\nLes [conditions actuelles](/tarifs) expliquent le modèle.\n\nGuardiens est gratuit."],
  ["Elle est actuellement 100 % gratuite pour les propriétaires et les gardiens. Les conditions tarifaires présentent le fonctionnement actuel et ses évolutions éventuelles. Une participation aux frais d’infrastructure pourra être envisagée au plus tôt au second semestre 2027, avec un préavis de 30 jours ; consultez la [page des tarifs](/tarifs) pour les conditions à jour.",
   "Guardiens est gratuit. Les conditions tarifaires présentent le fonctionnement actuel. Le fonctionnement est détaillé sur la [page tarifs](/tarifs)."],
  ["| Frais | Échange logement contre garde ; sur Guardiens, plateforme actuellement gratuite pour les deux rôles ; dépenses convenues | Prestation |",
   "| Frais | Échange logement contre garde ; Guardiens est gratuit ; dépenses convenues | Prestation |"],
  ["L’accès est actuellement 100 % gratuit pour les deux rôles. Une participation aux frais de fonctionnement pourra être mise en place **au plus tôt au second semestre 2027, avec 30 jours de préavis**. Les conditions à jour sont ici.",
   "Guardiens est gratuit. Les conditions à jour sont ici."],
];

const db = new PGlite();
const rows = async (q, p) => (await db.query(q, p)).rows;
try {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE TABLE public.articles (id uuid PRIMARY KEY, slug text, title text, excerpt text, content text,
      meta_title text, meta_description text, published boolean, noindex boolean, updated_at timestamptz);
  `);
  for (const [i, a] of cible.entries()) {
    const [content] = SAMPLES[i % SAMPLES.length];
    await db.query("INSERT INTO articles VALUES ($1,$2,'Titre','Résumé',$3,'Méta','Description',true,false,$4)", [a.id, a.slug, content, a.version]);
  }
  const exception = "Guardiens est actuellement 100 % gratuit. Une participation pourra être mise en place au plus tôt au second semestre 2027, avec 30 jours de préavis.";
  await db.query("INSERT INTO articles VALUES ('11111111-1111-1111-1111-111111111111','garde-maison-animaux-tahiti','Tahiti','',$1,'','',true,false,'2026-10-17')", [exception]);
  await db.query("INSERT INTO articles VALUES ('22222222-2222-2222-2222-222222222222','pet-sitting-valence-drome','Valence','',$1,'','',true,false,'2026-10-17')", [exception]);

  // Garde de version : un article modifié depuis le relevé arrête tout.
  await db.query("UPDATE articles SET updated_at='2026-10-19 08:00' WHERE id=$1", [cible[5].id]);
  await assert.rejects(db.exec(sql), /modifié depuis le 19\/10\/2026/);
  await db.exec("ROLLBACK");
  assert.equal((await rows("SELECT to_regclass('public._backup_articles_seo1_gratuit_20261019') AS t"))[0].t, null);
  await db.query("UPDATE articles SET updated_at=$2 WHERE id=$1", [cible[5].id, cible[5].version]);

  // Un article hors liste qui garde la tournure arrête tout (liste à refaire).
  await db.query("INSERT INTO articles VALUES ('33333333-3333-3333-3333-333333333333','nouvel-article','N','',$1,'','',true,false,'2026-10-19')", ["La plateforme est actuellement gratuite."]);
  await assert.rejects(db.exec(sql), /hors liste/);
  await db.exec("ROLLBACK");
  await db.exec("DELETE FROM articles WHERE id='33333333-3333-3333-3333-333333333333'");

  const before = await rows("SELECT * FROM articles ORDER BY id");
  await db.exec(sql);
  const after = await rows("SELECT * FROM articles ORDER BY id");
  for (const [i, a] of cible.entries()) {
    const row = after.find((r) => r.id === a.id);
    assert.equal(row.content, SAMPLES[i % SAMPLES.length][1], a.slug);
    const old = before.find((r) => r.id === a.id);
    for (const k of ["title", "excerpt", "meta_title", "meta_description", "published", "noindex"]) assert.deepEqual(row[k], old[k], `${a.slug} ${k}`);
  }
  for (const id of ["11111111-1111-1111-1111-111111111111", "22222222-2222-2222-2222-222222222222"]) {
    assert.deepEqual(after.find((r) => r.id === id), before.find((r) => r.id === id), "exclusion intacte");
  }
  assert.equal((await rows("SELECT count(*)::int AS n FROM public._backup_articles_seo1_gratuit_20261019"))[0].n, 118);
  for (const role of ["anon", "authenticated"]) {
    assert.equal((await rows(`SELECT has_table_privilege('${role}','public._backup_articles_seo1_gratuit_20261019','SELECT') AS ok`))[0].ok, false);
  }
  assert.equal((await rows("SELECT relrowsecurity FROM pg_class WHERE oid='public._backup_articles_seo1_gratuit_20261019'::regclass"))[0].relrowsecurity, true);

  // Rejouable : un second passage ne change rien.
  await db.exec(sql);
  assert.deepEqual(await rows("SELECT * FROM articles ORDER BY id"), after);
  console.log("SEO1 articles : garde de version, atomicité, exclusions, phrases réelles, sauvegarde privée et rejouabilité validées.");
} finally {
  await db.close();
}
