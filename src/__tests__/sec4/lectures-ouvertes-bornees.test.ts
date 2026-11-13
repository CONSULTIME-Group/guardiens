import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const SQL = readFileSync("drizzle/migrations/0151_sec4_lectures_ouvertes_bornees.sql", "utf8");
const SITE_FLAG_READERS = [
  "src/hooks/useFeatureFlag.ts",
  "src/pages/About.tsx",
  "src/hooks/useAffinityThresholdsBootstrap.ts",
  "src/components/admin/AffinityOnboardingFunnelCard.tsx",
];
const ALLOWED = new Set(["key", "enabled", "applies_since", "value_int"]);

describe("SEC4, lectures ouvertes bornées", () => {
  it("feature_flags n'est lisible que sur quatre colonnes", () => {
    expect(SQL).toMatch(/REVOKE ALL ON public\.feature_flags FROM PUBLIC, anon, authenticated;/);
    expect(SQL).toMatch(/GRANT SELECT \(key, enabled, applies_since, value_int\) ON public\.feature_flags TO anon, authenticated;/);
  });

  it("le site ne lit dans feature_flags que les colonnes accordées", () => {
    for (const file of SITE_FLAG_READERS) {
      const src = readFileSync(file, "utf8");
      const re = /from\("feature_flags"\)\s*\.select\("([^"]+)"\)/g;
      let m: RegExpExecArray | null;
      let seen = 0;
      while ((m = re.exec(src))) {
        seen += 1;
        for (const col of m[1].split(",").map((c) => c.trim())) expect(ALLOWED.has(col), `${file}: ${col}`).toBe(true);
      }
      expect(seen, file).toBeGreaterThan(0);
    }
  });

  it("visiteurs sans droit sur la galerie gardien ni sur reputation_config", () => {
    expect(SQL).toMatch(/REVOKE SELECT, INSERT, UPDATE, DELETE ON public\.sitter_gallery FROM anon;/);
    expect(SQL).toMatch(/REVOKE ALL ON public\.reputation_config FROM anon;/);
  });
});
