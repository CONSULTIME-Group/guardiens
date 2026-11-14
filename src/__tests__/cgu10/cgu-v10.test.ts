import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LEGAL_VERSIONS } from "@/config/legalVersions";

const v10 = readFileSync("src/components/legal/TermsV10.tsx", "utf8");
const mails = readFileSync("src/pages/admin/AdminMassEmails.tsx", "utf8");

describe("CGU10, les sorties dans les CGU", () => {
  it("version 10 publiée le 14/11, en vigueur 30 jours plus tard, avec réacceptation", () => {
    expect(LEGAL_VERSIONS).toContainEqual({ document: "cgu", version: "10", publishedOn: "2026-11-14", effectiveOn: "2026-12-14", requiresReaccept: true });
  });
  it("article 7 bis complet, définitions et accords entre membres", () => {
    for (let i = 1; i <= 9; i++) expect(v10, `7 bis.${i}`).toContain(`7 bis.${i} `);
    expect(v10).toContain(">Sortie</strong>");
    expect(v10).toContain("Chaque garde, chaque coup de main et chaque sortie forme un accord");
    expect(v10).toContain("Guardiens n'encaisse et ne reverse aucune somme.");
    expect(v10).not.toMatch(/[—–]/);
    expect(v10).not.toMatch(/\bvoisins?\b/i);
  });
  it("préavis prêt dans les envois groupés", () => {
    expect(mails).toContain('key: "cgu_v10_preavis"');
    expect(mails).toContain('ctaUrl: "https://guardiens.fr/cgu?version=10"');
    const body = mails.slice(mails.indexOf("const CGU_V10_BODY"), mails.indexOf("const CAMPAIGN_PRESETS"));
    expect(body).not.toMatch(/[—–]/);
    expect(body).toContain("14 décembre 2026");
  });
});
