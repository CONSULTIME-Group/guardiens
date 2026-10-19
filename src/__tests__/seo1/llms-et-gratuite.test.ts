/**
 * Lot SEO1 (19/10/2026) : /llms.txt dit vrai, le gabarit d'article dit
 * « Guardiens est gratuit » (exception datée des quatre refontes du 17/10),
 * la checklist légale calcule la comparaison tarifaire, et le SQL préparé des
 * articles exclut les slugs décidés.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { LLMS_TOTALS_LINE_RE } from "../../../supabase/functions/_shared/community-totals.js";
import { ownerGuideFreeLine, DATED_PRICING_COMMITMENT_SLUGS, FREE_LINE } from "@/lib/articleFreeLine";
import {
  EXPAT_OWNER_ARTICLE_SLUG,
  REUNION_OWNER_ARTICLE_SLUG,
  TAHITI_OWNER_ARTICLE_SLUG,
  CALEDONIE_OWNER_ARTICLE_SLUG,
} from "@/components/articles/ArticleRenderer";
import { priceComparisonCheck } from "@/lib/admin/priceComparisonCheck";

const root = join(__dirname, "..", "..", "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");
const DASHES = new RegExp("[\\u2013\\u2014]");

describe("/llms.txt", () => {
  const llms = read("public/llms.txt");
  const lines = llms.split("\n");

  it("ni « prix affiché » ni « pas de bannière requise »", () => {
    expect(llms).not.toMatch(/prix affiché/i);
    expect(llms).not.toMatch(/pas de bannière requise/i);
    expect(llms).not.toMatch(/cookies strictement nécessaires/i);
  });

  it("ligne 3 : Guardiens est gratuit", () => {
    expect(lines[2]).toMatch(/^> /);
    expect(lines[2]).toContain("Guardiens est gratuit");
  });

  it("règle cookies réelle : mesure d'audience chargée après accord dans le bandeau (cookieConsent.ts)", () => {
    const rgpd = lines.find((l) => l.startsWith("- Conformité RGPD"))!;
    expect(rgpd).toMatch(/bandeau/);
    expect(rgpd).toMatch(/Google Analytics 4/);
    expect(rgpd).toMatch(/après un accord explicite/);
    expect(rgpd).toMatch(/6 mois/);
    expect(read("src/lib/cookieConsent.ts")).toMatch(/après un accord\s+\* explicite donné dans le bandeau|après un accord/);
  });

  it("ligne des compteurs CPT1 conservée (décision du 17/10/2026)", () => {
    expect(LLMS_TOTALS_LINE_RE.test(llms)).toBe(true);
    expect(llms).toMatch(/43 maisons gardées/);
  });

  it("départements couverts : comptés sur les pages qui ont une ville publiée", () => {
    const gen = read("scripts/generate-sitemap.mjs");
    expect(gen).toMatch(/départements couverts/);
    const data = read("supabase/functions/_shared/sitemap-data.js");
    expect(data).toContain("departmentsWithPublishedCity(cities)");
    expect(llms).toMatch(/\d+ départements couverts\./);
    expect(llms).not.toContain("100 départements couverts");
  });

  it("aucun tiret cadratin ni demi-cadratin", () => {
    expect(llms).not.toMatch(DASHES);
  });
});

describe("gabarit d'article : Guardiens est gratuit", () => {
  it("la ligne sous le bouton propriétaire dit « Guardiens est gratuit. »", () => {
    expect(ownerGuideFreeLine("garde-chien-faire-garder-son-chien")).toBe("Guardiens est gratuit.");
    expect(FREE_LINE).not.toMatch(/actuellement|2027|préavis/);
    const src = read("src/pages/ArticleDetail.tsx");
    expect(src).not.toContain("Plateforme actuellement 100 % gratuite.");
    expect(src).toContain("{ownerGuideFreeLine(article.slug)}");
  });

  it("exception du 17/10/2026 : les quatre refontes gardent leur engagement daté", () => {
    const four = [EXPAT_OWNER_ARTICLE_SLUG, REUNION_OWNER_ARTICLE_SLUG, TAHITI_OWNER_ARTICLE_SLUG, CALEDONIE_OWNER_ARTICLE_SLUG];
    expect([...DATED_PRICING_COMMITMENT_SLUGS].sort()).toEqual([...four].sort());
    for (const slug of four) expect(ownerGuideFreeLine(slug)).toMatch(/actuellement/);
  });
});

describe("checklist légale : comparaison tarifaire calculée", () => {
  it("plus de ligne écrite en dur", () => {
    const src = read("src/pages/admin/AdminLegal.tsx");
    expect(src).not.toContain("Comparaison tarifaire avec clause de bonne foi");
    expect(src).toContain("priceComparisonCheck(");
    expect(src).toContain('.like("content", PRICE_COMPARISON_RULE.price)');
  });

  it("OK seulement à zéro article, sinon la liste des slugs, jamais OK en échec de lecture", () => {
    expect(priceComparisonCheck({ isLoading: false, isError: false, data: [] }).state).toBe("ok");
    const alert = priceComparisonCheck({ isLoading: false, isError: false, data: ["a", "b"] });
    expect(alert.state).toBe("alert");
    expect(alert.label).toContain("2 articles publiés citent");
    expect(alert.slugs).toEqual(["a", "b"]);
    expect(priceComparisonCheck({ isLoading: false, isError: true }).state).toBe("error");
    expect(priceComparisonCheck({ isLoading: true, isError: false }).state).toBe("loading");
  });
});

describe("SQL préparé des articles (non appliqué)", () => {
  const path = "supabase/prepared-migrations/20261019121000_seo1_articles_gratuit.sql";
  const sql = read(path);

  it("préparé hors drizzle, transactionnel, avec sauvegarde datée", () => {
    expect(existsSync(join(root, path))).toBe(true);
    expect(sql).toMatch(/^BEGIN;$/m);
    expect(sql).toMatch(/^COMMIT;$/m);
    expect(sql).toContain("_backup_articles_seo1_gratuit_20261019");
    expect(sql).toContain("REVOKE ALL ON public._backup_articles_seo1_gratuit_20261019 FROM PUBLIC, anon, authenticated");
  });

  it("118 articles listés, aucun slug d'exception ni comparatif", () => {
    const listed = [...sql.matchAll(/\('[0-9a-f-]{36}'::uuid, '([^']+)', '[^']+'::timestamptz\)/g)].map((m) => m[1]);
    expect(listed).toHaveLength(118);
    const excluded = [...DATED_PRICING_COMMITMENT_SLUGS, "garde-animaux-savoie-guide", "garde-chat-domicile-lyon",
      "ou-faire-garder-chien-lyon-vacances", "pension-chien-alternatives-guide", "pet-sitting-grenoble-chartreuse",
      "pet-sitting-saint-etienne-loire", "pet-sitting-valence-drome", "vacances-longues-garde-animal-2-semaines",
      "veterinaire-urgence-lyon-guide"];
    for (const slug of excluded) {
      expect(listed).not.toContain(slug);
      expect(sql).toContain(`('${slug}')`);
    }
  });

  it("rejoué en local par scripts/test-seo1-articles-gratuit.mjs", () => {
    expect(read("scripts/test-seo1-articles-gratuit.mjs")).toContain("20261019121000_seo1_articles_gratuit.sql");
  });
});
