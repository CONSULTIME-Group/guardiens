import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  aggregatePages,
  articleIndexStatus,
  articleSlugFromUrl,
  articlesWithoutImpressions,
  countByStatus,
  pagePath,
  pagesWithImpressions,
  positionsFromTopPages,
  priorityActions,
  topArticles,
  type SeoArticle,
} from "@/lib/admin/seoMetrics";

const read = (p: string) => readFileSync(p, "utf8");

const art = (slug: string, status: SeoArticle["status"] = "indexable", published_at = "2026-03-27T10:00:00Z"): SeoArticle => ({
  slug,
  title: slug,
  category: "conseil_proprio",
  published_at,
  created_at: published_at,
  status,
});

describe("SEO-A, chemins Google regroupés", () => {
  it("retire domaine, ancre, paramètre et barre finale", () => {
    expect(pagePath("https://guardiens.fr/actualites/c-est-quoi-le-house-sitting#prix")).toBe("/actualites/c-est-quoi-le-house-sitting");
    expect(pagePath("https://www.guardiens.fr/actualites/bengal-guide-race?lang=en")).toBe("/actualites/bengal-guide-race");
    expect(pagePath("https://guardiens.fr/house-sitting/lyon/")).toBe("/house-sitting/lyon");
    expect(pagePath("https://guardiens.fr/")).toBe("/");
    expect(articleSlugFromUrl("https://guardiens.fr/actualites/chien-reactif-agressif-garde-solutions#situations")).toBe("chien-reactif-agressif-garde-solutions");
  });

  it("compte une page une fois, ancres et variantes comprises (relevé du 15/11 : 525 lignes, 481 pages)", () => {
    const pages = [
      { page: "https://guardiens.fr/actualites/a", impressions: 10, clicks: 1 },
      { page: "https://guardiens.fr/actualites/a#prix", impressions: 5, clicks: 0 },
      { page: "https://guardiens.fr/actualites/a?lang=en", impressions: 2, clicks: 1 },
      { page: "https://guardiens.fr/actualites/b", impressions: 0, clicks: 0 },
    ];
    expect(pagesWithImpressions(pages)).toBe(1);
    expect(aggregatePages(pages).get("/actualites/a")).toEqual({ clicks: 2, impressions: 17 });
  });

  it("un article vu seulement par ses ancres n'est pas « sans impression »", () => {
    const list = articlesWithoutImpressions([art("a"), art("b")], [{ page: "https://guardiens.fr/actualites/a#prix", impressions: 3 }], new Date("2026-11-15"));
    expect(list.map((a) => a.slug)).toEqual(["b"]);
  });
});

describe("SEO-A, statut Google d'un article", () => {
  const redirected = new Set(["erreurs-premiere-garde"]);
  it("redirigé, noindex, canonique ailleurs, indexable", () => {
    expect(articleIndexStatus({ slug: "erreurs-premiere-garde", noindex: false }, redirected)).toBe("redirige");
    expect(articleIndexStatus({ slug: "house-sitting-lyon", noindex: true, canonical_url: "https://guardiens.fr/house-sitting/lyon" }, redirected)).toBe("noindex");
    expect(articleIndexStatus({ slug: "reseau-entraide-quartier-lyon-aura", canonical_url: "https://guardiens.fr/actualites/petites-missions-entraide-guardiens" }, redirected)).toBe("canonique_ailleurs");
    expect(articleIndexStatus({ slug: "persan-guide-race", canonical_url: "https://guardiens.fr/actualites/persan-guide-race" }, redirected)).toBe("indexable");
    expect(articleIndexStatus({ slug: "x", canonical_url: null }, redirected)).toBe("indexable");
  });

  it("répartition par statut", () => {
    expect(countByStatus([art("a"), art("b", "redirige"), art("c", "noindex"), art("d", "redirige")])).toEqual({
      indexable: 1, redirige: 2, noindex: 1, canonique_ailleurs: 0,
    });
  });
});

describe("SEO-A, actions prioritaires", () => {
  const totals = aggregatePages([
    { page: "https://guardiens.fr/actualites/definition", impressions: 6879, clicks: 23 },
    { page: "https://guardiens.fr/actualites/voyager", impressions: 1492, clicks: 9 },
    { page: "https://guardiens.fr/actualites/bon-ctr", impressions: 475, clicks: 21 },
    { page: "https://guardiens.fr/actualites/peu-vu", impressions: 4, clicks: 0 },
    { page: "https://guardiens.fr/actualites/redirige", impressions: 900, clicks: 0 },
  ]);
  const positions = positionsFromTopPages([
    { keys: ["https://guardiens.fr/actualites/voyager"], position: 40.4, ctr: 0.006 },
    { keys: ["https://guardiens.fr/actualites/definition"], position: 16.3, ctr: 0.003 },
  ]);
  const articles = [art("definition"), art("voyager"), art("bon-ctr"), art("peu-vu"), art("redirige", "redirige")];

  it("garde les articles indexables vus au moins 100 fois avec un taux de clic sous 1 %, du plus vu au moins vu", () => {
    const actions = priorityActions(articles, totals, positions);
    expect(actions.map((a) => a.article.slug)).toEqual(["definition", "voyager"]);
  });

  it("« Loin dans Google » seulement sur une position connue au-delà de 20, sinon « Titre à revoir »", () => {
    const actions = priorityActions(articles, totals, positions);
    expect(actions.find((a) => a.article.slug === "voyager")?.kind).toBe("loin");
    expect(actions.find((a) => a.article.slug === "definition")?.kind).toBe("titre");
  });

  it("un article ne porte qu'une action", () => {
    const actions = priorityActions(articles, totals, positions);
    expect(new Set(actions.map((a) => a.article.slug)).size).toBe(actions.length);
  });
});

describe("SEO-A, articles les plus cliqués", () => {
  it("lit la liste complète et rend dix lignes au plus, position vide quand elle est inconnue", () => {
    const pages = Array.from({ length: 30 }, (_, i) => ({ page: `https://guardiens.fr/actualites/a${i}`, impressions: 100 + i, clicks: i }));
    const rows = topArticles(Array.from({ length: 30 }, (_, i) => art(`a${i}`)), aggregatePages(pages), new Map());
    expect(rows).toHaveLength(10);
    expect(rows[0].article.slug).toBe("a29");
    expect(rows[0].position).toBeNull();
  });
});

describe("SEO-A, écrans", () => {
  it("l'onglet SEO passe par les statuts d'articles et la liste complète", () => {
    const src = read("src/pages/admin/AdminSEO.tsx");
    expect(src).toContain("useSeoArticles");
    expect(src).toContain("<PriorityActions actions={seoActions} />");
    expect(src).toContain("<TopArticlesTable rows={topArticleRows} />");
    expect(src).toContain("aggregatePages(allGscPages)");
  });

  it("la liste sans impression ne pousse que les articles indexables", () => {
    const src = read("src/components/admin/seo/NoImpressionActionable.tsx");
    expect(src).toContain('a.status === "indexable"');
    expect(src).toContain("no-impression-set-aside");
  });

  it("les clics Google ne figurent plus dans la synthèse", () => {
    expect(read("src/pages/admin/AdminTraffic.tsx")).not.toContain('title: "Clics SEO"');
  });

  it("le hook lit les redirections d'articles et les champs d'indexation", () => {
    const src = read("src/hooks/useSeoArticles.ts");
    expect(src).toContain('.from("redirects")');
    expect(src).toContain("noindex, canonical_url");
  });
});
