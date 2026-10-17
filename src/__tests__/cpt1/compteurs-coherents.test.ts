import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  communityTotals,
  FOUNDERS_ANIMALS,
  FOUNDERS_HOUSES,
  llmsTotalsLine,
  LLMS_TOTALS_LINE_RE,
} from "../../../supabase/functions/_shared/community-totals.js";

const read = (p: string) => readFileSync(p, "utf8");

describe("CPT1, compteurs cumulés", () => {
  it("socle des fondateurs plus gardes réalisées, socle seul pendant le chargement", () => {
    expect(communityTotals({ maisons_gardees: 6, animaux_accompagnes: 14 })).toEqual({ houses: 43, animals: 248 });
    expect(communityTotals(null)).toEqual({ houses: FOUNDERS_HOUSES, animals: FOUNDERS_ANIMALS });
    expect(communityTotals({ maisons_gardees: -3, animaux_accompagnes: Number.NaN })).toEqual({ houses: 37, animals: 234 });
  });

  it("ligne llms.txt datée au jour de Paris, reconnue sous ses deux formes", () => {
    const line = llmsTotalsLine({ houses: 43, animals: 248 }, new Date("2026-10-16T22:30:00Z"));
    expect(line).toBe("- Gardes réalisées depuis 2021 : 43 maisons gardées, 248 animaux accompagnés (au 17/10/2026).");
    expect(LLMS_TOTALS_LINE_RE.test(line)).toBe(true);
    expect(LLMS_TOTALS_LINE_RE.test("- Données fondateurs (2021-2026) : 37 maisons gardées, 234 animaux accompagnés.")).toBe(true);
    expect(LLMS_TOTALS_LINE_RE.test(read("public/llms.txt"))).toBe(true);
  });

  it("accueil, tableau de bord et observatoire passent par le même calcul", () => {
    for (const f of ["src/pages/Landing.tsx", "src/hooks/useCommunityPulse.ts", "src/pages/Observatoire.tsx"]) {
      expect(read(f)).toContain("communityTotals(");
    }
    expect(read("src/pages/Landing.tsx")).not.toMatch(/FOUNDER_BASE_(MAISONS|ANIMAUX)\s*=/);
    expect(read("scripts/generate-sitemap.mjs")).toContain("llmsTotalsLine(communityTotals(");
  });

  it("aucun compteur figé à 37 ou 234 sur l'observatoire ni dans llms.txt", () => {
    const obs = read("src/pages/Observatoire.tsx");
    expect(obs).not.toMatch(/value:\s*"(37|234)"/);
    expect(obs).not.toContain("« 37 maisons gardées »");
    expect(read("public/llms.txt")).not.toContain("Données fondateurs");
  });

  it("inscrits publics : comptes supprimés exclus, droits visiteurs gardés", () => {
    const sql = read("drizzle/migrations/0090_cpt1_inscrits_actifs.sql");
    expect(sql).toContain("p.account_status IS NULL OR p.account_status::text <> 'deleted'");
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION public.get_public_stats() TO anon, authenticated, service_role;");
    expect(sql).not.toMatch(/[—–]/);
  });
});
