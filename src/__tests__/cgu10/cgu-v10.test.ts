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

import { legalVersionHeading } from "@/lib/legalPageVersion";
describe("COR1, en-tête de la v10 avant le 16/11", () => {
  it("nomme la version applicable aujourd'hui puis la v9", () => {
    expect(legalVersionHeading("cgu", "10", "2026-11-14")).toBe(
      "Version 10, publiée le 14 novembre 2026, en vigueur le 14 décembre 2026. La version 8 s'applique jusqu'au 16 novembre 2026, puis la version 9 jusqu'à cette date.",
    );
    expect(legalVersionHeading("cgu", "10", "2026-11-20")).toContain("La version 9 reste applicable jusqu'à cette date.");
  });
});

describe("CGU10b, audit juridique du 14/11", () => {
  const t = readFileSync("src/components/legal/TermsV10.tsx", "utf8");
  it("ce qui se passe hors de la Plateforme relève des membres", () => {
    expect(t).toContain("Hors de la Plateforme.</strong> Ce qui se déroule hors de la Plateforme relève des seuls membres concernés");
    expect(t).toContain("d'un coup de main, d'une sortie ou d'une rencontre entre membres, ou à leur occasion");
  });
  it("mise en avant décrite et neutre, Alma sans valeur d'engagement", () => {
    expect(t).toContain("«&nbsp;à la une&nbsp;» en page d'accueil, une seule à la fois");
    expect(t).toContain("ils ne valent ni vérification ni recommandation");
    expect(t).toContain("qui prévalent sur toute réponse différente");
  });
  it("concurrents et extraction, IA dans les contenus éditoriaux", () => {
    expect(t).toContain("pour le compte d'un service concurrent");
    expect(t).toContain("L.&nbsp;342-1 et L.&nbsp;342-2 du CPI");
    expect(t).toContain("qui en porte la responsabilité éditoriale");
  });
});
