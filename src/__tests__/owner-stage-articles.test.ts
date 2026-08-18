import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { OWNER_STAGE_ARTICLES } from "@/lib/ownerArticleStages";

/**
 * Garde-fou : vérifie que chaque slug du mapping OWNER_STAGE_ARTICLES
 * (lectures du moment du dashboard propriétaire) existe parmi les articles
 * publiés. Un renommage d'article en base doit casser ce test plutôt que
 * d'afficher des liens morts dans le dashboard.
 *
 * Dépend du contenu de la base de production : listé dans les
 * excludedFiles du test-guard, à lancer via npm run test:data.
 */
const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL || "https://erhccyqevdyevpyctsjj.supabase.co";
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyaGNjeXFldmR5ZXZweWN0c2pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MjMzMzQsImV4cCI6MjA4OTk5OTMzNH0.ltBQtcouoqd5tuv_wQXb92x5Q5YYa9mkEQvZUx0wLTY";

const EXPECTED_VARIANTS = [
  "publish",
  "stalled",
  "applications",
  "next-sit",
  "ongoing",
  "review",
  "verify",
  "pets",
  "explore",
] as const;

describe("OwnerStageReadings — mapping OWNER_STAGE_ARTICLES", () => {
  it("couvre exactement les 9 variantes d'action prioritaire", () => {
    expect(Object.keys(OWNER_STAGE_ARTICLES).sort()).toEqual([...EXPECTED_VARIANTS].sort());
  });

  it("les libellés visibles respectent les contraintes rédactionnelles", () => {
    const forbidden = /[—–]|voisin/i;
    for (const stage of Object.values(OWNER_STAGE_ARTICLES)) {
      expect(stage.eyebrow).not.toMatch(forbidden);
      expect(stage.title).not.toMatch(forbidden);
    }
  });

  it("tous les slugs du mapping existent parmi les articles publiés", async () => {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const { data: articles, error } = await supabase
      .from("articles")
      .select("slug")
      .eq("published", true);
    expect(error).toBeNull();
    expect(articles).toBeTruthy();

    const validSlugs = new Set(articles!.map((a) => a.slug));
    const missing: string[] = [];

    for (const [variant, stage] of Object.entries(OWNER_STAGE_ARTICLES)) {
      for (const slug of stage.slugs) {
        if (!validSlugs.has(slug)) {
          missing.push(`${variant} → /actualites/${slug}`);
        }
      }
    }

    if (missing.length > 0) {
      throw new Error(
        `Slugs OWNER_STAGE_ARTICLES absents des articles publiés (${missing.length}) :\n${missing
          .map((m) => `  ${m}`)
          .join("\n")}`
      );
    }
    expect(missing).toEqual([]);
  }, 30_000);
});
