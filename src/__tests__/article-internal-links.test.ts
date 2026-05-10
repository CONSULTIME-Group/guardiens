import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";

/**
 * Garde-fou : vérifie que tous les liens internes /actualites/<slug>
 * présents dans le contenu des articles publiés (notamment les blocs
 * « Pour aller plus loin » et « Articles liés ») pointent vers un
 * article publié & indexable. Empêche de livrer des liens cassés
 * après une régénération de FAQ ou un changement de slug.
 */
const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL || "https://erhccyqevdyevpyctsjj.supabase.co";
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyaGNjeXFldmR5ZXZweWN0c2pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MjMzMzQsImV4cCI6MjA4OTk5OTMzNH0.ltBQtcouoqd5tuv_wQXb92x5Q5YYa9mkEQvZUx0wLTY";

const ACTUALITES_LINK_RE = /\/actualites\/([a-z0-9][a-z0-9-]*[a-z0-9])(?=[\s)"'<#?]|$)/gi;

describe("Articles — liens internes /actualites/<slug>", () => {
  it("tous les slugs cités existent et sont publiés", async () => {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const { data: articles, error } = await supabase
      .from("articles")
      .select("slug, content, published, noindex")
      .eq("published", true);
    expect(error).toBeNull();
    expect(articles).toBeTruthy();

    const validSlugs = new Set(articles!.map((a) => a.slug));
    const broken: { source: string; target: string }[] = [];

    for (const a of articles!) {
      if (!a.content) continue;
      const seen = new Set<string>();
      let m: RegExpExecArray | null;
      while ((m = ACTUALITES_LINK_RE.exec(a.content)) !== null) {
        const target = m[1].toLowerCase();
        if (seen.has(target)) continue;
        seen.add(target);
        if (target === a.slug) continue; // self-link toléré
        if (!validSlugs.has(target)) {
          broken.push({ source: a.slug, target });
        }
      }
    }

    if (broken.length > 0) {
      const lines = broken.map((b) => `  ❌ ${b.source} → /actualites/${b.target}`).join("\n");
      throw new Error(`Liens internes cassés détectés (${broken.length}) :\n${lines}`);
    }
    expect(broken).toEqual([]);
  }, 30_000);
});
