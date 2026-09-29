import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { displayText, templateDisplayName, digestToResume } from "@/lib/admin/labels";

const CASES: Array<[string, string]> = [
  ["Digest quotidien gardiens", "Résumé quotidien gardiens"],
  ["Digest hebdo entraide", "Résumé hebdomadaire entraide"],
  ["Digest hebdo à proximité", "Résumé hebdomadaire à proximité"],
  ["Digest demandes d'analyse (admin)", "Résumé des demandes d'analyse (admin)"],
  ["Digest hebdo", "Résumé hebdomadaire"],
  ["Digest quotidien", "Résumé quotidien"],
  ["Digest", "Résumé"],
  ["Digest quotidien gardien", "Résumé quotidien gardien"],
];
const BAD = /Résumé quotidien hebdo|Résumé quotidien quotidien|quotidien quotidien/i;

describe("A14, traduction de Digest", () => {
  it.each(CASES)("%s", (src, out) => {
    expect(displayText(src)).toBe(out);
    expect(templateDisplayName(src)).toBe(out);
  });
  it("aucun libellé d'admin_cron_health ne produit de doublon", () => {
    const sql = readFileSync("supabase/migrations/20260920110000_admin_cron_health_partial.sql", "utf8");
    const labels = [...sql.matchAll(/\('[a-z0-9-]+',\s*\d+,\s*'([^']+)'\)/g)].map((m) => m[1]);
    expect(labels.length).toBeGreaterThan(5);
    for (const l of labels) {
      expect(displayText(l)).not.toMatch(BAD);
      expect(digestToResume(l)).not.toMatch(/Digest/);
    }
  });
});
