import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  buildCoverageGapMessage,
  buildSeoTensionMessage,
  buildSittersFragment,
} from "@/lib/admin/cityCoverage";

/** SQL de la derniere migration definissant la detection par coordonnees. */
function coverageSql(): string {
  const dir = join(process.cwd(), "supabase/migrations");
  const file = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .reverse()
    .find((f) =>
      readFileSync(join(dir, f), "utf8").includes(
        "CREATE OR REPLACE FUNCTION public.detect_city_coverage_gaps",
      ),
    );
  expect(file, "migration detect_city_coverage_gaps introuvable").toBeTruthy();
  return readFileSync(join(dir, file as string), "utf8");
}

describe("libelles du signal ville", () => {
  it("n'annonce jamais 0 gardien quand il y en a dans le rayon", () => {
    const msg = buildCoverageGapMessage({
      city: "Grenoble",
      sittersCount: 12,
      verifiedSittersCount: 0,
      radiusKm: 30,
    });
    expect(msg).toContain("12 gardiens à 30 km");
    expect(msg).not.toMatch(/\b0 gardien/);
    expect(msg).not.toContain("aucun gardien");
  });

  it("affiche la verification a cote du compte, jamais a sa place", () => {
    expect(
      buildCoverageGapMessage({
        city: "Annecy",
        sittersCount: 16,
        verifiedSittersCount: 2,
        radiusKm: 30,
      }),
    ).toBe(
      "Annecy compte 16 gardiens à 30 km, dont 2 avec identité vérifiée. Cibler la ville en recrutement.",
    );
    expect(
      buildCoverageGapMessage({
        city: "Annecy",
        sittersCount: 7,
        verifiedSittersCount: 0,
        radiusKm: 30,
      }),
    ).toContain("aucun n'a encore vérifié son identité");
  });

  it("dit franchement le vide reel, avec le rayon", () => {
    expect(buildSittersFragment({ city: "Troyes", sittersCount: 0, verifiedSittersCount: 0, radiusKm: 30 })).toBe(
      "aucun gardien à 30 km",
    );
  });

  it("la tension SEO chiffre les deux cotes", () => {
    const msg = buildSeoTensionMessage({
      city: "Lyon",
      sittersCount: 84,
      verifiedSittersCount: 9,
      radiusKm: 30,
      impressions: 1296,
      ratio: 15.25,
    });
    expect(msg).toContain("1296 impressions");
    expect(msg).toContain("84 gardiens à 30 km");
  });

  it("aucun tiret cadratin dans les libelles", () => {
    const all = [
      buildCoverageGapMessage({ city: "Niort", sittersCount: 1, verifiedSittersCount: 1, radiusKm: 30 }),
      buildSeoTensionMessage({ city: "Niort", sittersCount: 1, verifiedSittersCount: 0, radiusKm: 30, impressions: 200, ratio: 100 }),
    ].join(" ");
    expect(all).not.toMatch(/[—–]/);
  });
});

describe("comptage SQL des gardiens autour d'une ville", () => {
  const sql = coverageSql();
  const body = sql.slice(
    sql.indexOf("CREATE OR REPLACE FUNCTION public.detect_city_coverage_gaps"),
    sql.indexOf("COMMENT ON FUNCTION public.detect_city_coverage_gaps"),
  );

  it("ignore identity_verified comme filtre", () => {
    expect(body).not.toMatch(/identity_verified\s*=\s*true/);
    // La verification reste renvoyee a titre indicatif.
    expect(body).toContain("identity_verified");
  });

  it("compte par coordonnees, jamais par profiles.city", () => {
    expect(body).toContain("p.latitude");
    expect(body).toContain("p.longitude");
    expect(body).not.toMatch(/GROUP BY LOWER\(p\.city\)/i);
    expect(body).not.toMatch(/p\.city\s+IS NOT NULL/i);
  });

  it("applique unaccent a toute comparaison de nom de ville", () => {
    const comparisons = body.match(/LOWER\((?:s|pg)\.city\)/g) ?? [];
    expect(comparisons.length).toBeGreaterThan(0);
    for (const c of comparisons) {
      expect(body).toContain(`public.unaccent(${c})`);
    }
  });

  it("ne conditionne pas le trou de couverture au trafic Google", () => {
    expect(body).not.toMatch(/impressions\s*>=/);
  });
});
