import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  buildCoverageGapMessage,
  buildSeoTensionMessage,
  buildSittersFragment,
  buildVerifiedFragment,
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
  it("n'annonce jamais zero gardien quand il y en a dans le rayon", () => {
    for (const n of [1, 2, 7, 12, 16, 84]) {
      const msg = buildCoverageGapMessage({
        city: "Grenoble",
        sittersCount: n,
        verifiedSittersCount: 0,
        radiusKm: 30,
      });
      expect(msg).toContain(`${n} gardien`);
      expect(msg).not.toMatch(/\b0 gardien/);
      expect(msg).not.toMatch(/aucun gardien/i);
      expect(msg).not.toContain("seulement");
    }
  });

  it("dit franchement le vide reel", () => {
    expect(
      buildCoverageGapMessage({
        city: "Troyes",
        sittersCount: 0,
        verifiedSittersCount: 0,
        radiusKm: 30,
      }),
    ).toBe("Aucun gardien autour de Troyes. Cibler la ville en recrutement.");
    expect(
      buildSittersFragment({ city: "Troyes", sittersCount: 0, verifiedSittersCount: 0, radiusKm: 30 }),
    ).toBe("aucun gardien à moins de 30 km");
  });

  it("garde la verification hors de la phrase principale", () => {
    const metrics = { city: "Annecy", sittersCount: 16, verifiedSittersCount: 2, radiusKm: 30 };
    expect(buildCoverageGapMessage(metrics)).not.toContain("vérifiée");
    expect(buildVerifiedFragment(metrics)).toBe("Dont 2 avec identité vérifiée.");
    expect(
      buildVerifiedFragment({ ...metrics, verifiedSittersCount: 0 }),
    ).toBe("Aucune identité vérifiée pour l'instant.");
  });

  it("la tension SEO chiffre les deux cotes", () => {
    expect(
      buildSeoTensionMessage({
        city: "Grenoble",
        sittersCount: 12,
        verifiedSittersCount: 1,
        radiusKm: 30,
        impressions: 663,
      }),
    ).toContain("Grenoble attire 663 impressions pour 12 gardiens à moins de 30 km");
  });

  it("aucun tiret cadratin dans les libelles", () => {
    const all = [
      buildCoverageGapMessage({ city: "Niort", sittersCount: 1, verifiedSittersCount: 1, radiusKm: 30 }),
      buildSeoTensionMessage({ city: "Niort", sittersCount: 1, verifiedSittersCount: 0, radiusKm: 30, impressions: 200 }),
    ].join(" ");
    expect(all).not.toMatch(/[—–]/);
  });
});

describe("producteur hebdomadaire des signaux villes", () => {
  const src = readFileSync(
    join(process.cwd(), "supabase/functions/nudge-untapped-cities/index.ts"),
    "utf8",
  );

  it("appelle les deux detections par coordonnees", () => {
    expect(src).toContain("detect_city_coverage_gaps");
    expect(src).toContain("detect_city_seo_tension");
  });

  it("n'appelle plus l'ancienne detection ni le type de signal associe", () => {
    expect(src).not.toContain("detect_untapped_cities");
    expect(src).not.toContain("untapped_city");
  });

  it("ecrit sitters_count et city_page_id dans les metadonnees", () => {
    expect(src).toContain("sitters_count: g.sitters_count");
    expect(src).toContain("city_page_id: g.city_page_id");
    expect(src).toContain("sitters_count: t.sitters_count");
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
