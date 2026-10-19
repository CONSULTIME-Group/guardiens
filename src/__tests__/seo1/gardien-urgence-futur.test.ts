/**
 * Lot SEO1 (19/10/2026) : 0 gardien d'urgence en base, le service est « à
 * venir ». Les textes publics le décrivent au futur (doctrine Y3 et C1).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "..", "..", "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");
const fr = JSON.parse(read("src/i18n/locales/fr/common.json"));
const page = fr.emergency_page as Record<string, string>;

const PRESENT_TENSE = [
  "Notification automatique envoyée",
  "peut relayer votre gardien titulaire",
  "une alerte prioritaire peut être envoyée",
  "Une alerte prioritaire peut être envoyée",
  "sont notifiés en priorité",
  "Activez l'alerte Guardiens",
  "peuvent recevoir une alerte prioritaire.",
  "Les gardiens d'urgence sont alertés",
  "Sollicités automatiquement",
  "Les demandes d'urgence passent en tête",
  "Vous (ou un proche) activez l'alerte",
];

const SURFACES = [
  "src/i18n/locales/fr/common.json",
  "src/pages/Observatoire.tsx",
  "src/pages/DepartmentPage.tsx",
  "src/pages/EmergencySitter.tsx",
  "src/components/sits/views/SitFooterReassurance.tsx",
  "src/components/messages/HelpButton.tsx",
  "src/data/siteRoutes.ts",
];

describe("gardien d'urgence au futur", () => {
  for (const f of SURFACES) {
    it(`${f} : aucun service décrit au présent`, () => {
      const src = read(f);
      for (const p of PRESENT_TENSE) expect(src, `${f} : ${p}`).not.toContain(p);
    });
  }

  it("/gardien-urgence : étapes et propriétaires au futur", () => {
    expect(page.step2_desc).toMatch(/partira/);
    expect(page.step2_title).toMatch(/seront alertés/);
    expect(page.owner_card1_desc).toMatch(/passeront/);
    expect(page.owner_card3_desc).toMatch(/seront sollicités/);
    expect(page.hero_lead).toMatch(/pourront être alertés/);
  });

  it("FAQ de /gardien-urgence (aussi lue en JSON-LD) au futur", () => {
    for (const n of [3, 5, 6, 7, 11]) expect(page[`faq${n}_a`], `faq${n}_a`).toMatch(/(sera|seront|pourrez|pourra|activerez|préciserez|configurerez|ouverture du réseau|réseau sera ouvert)/);
    expect(page.faq1_a).toMatch(/Quand le réseau sera ouvert/);
  });

  it("fiche annonce, départements, observatoire : « à venir »", () => {
    expect(fr.sit_detail.why_3).toMatch(/à venir/);
    expect(read("src/pages/DepartmentPage.tsx")).toMatch(/gardien d'urgence<\/Link> est à venir/);
    expect(read("src/pages/Observatoire.tsx")).toMatch(/<strong>Gardien d'Urgence<\/strong> est à venir/);
    expect(read("src/components/sits/views/SitFooterReassurance.tsx")).toMatch(/est à venir/);
  });

  it("meta de /gardien-urgence : arrive bientôt", () => {
    expect(read("src/data/siteRoutes.ts")).toMatch(/Le réseau des gardiens d'urgence Guardiens arrive bientôt/);
    expect(page.meta_description).toMatch(/arrive bientôt/);
  });

  it("rencontre toujours facultative", () => {
    expect(page.faq3_a).toMatch(/si vous le souhaitez/);
  });

  it("aucun tiret cadratin ni demi-cadratin ajouté", () => {
    const dashes = new RegExp("[\\u2013\\u2014]");
    for (const v of Object.values(page)) expect(v).not.toMatch(dashes);
    for (const f of SURFACES.slice(1)) expect(read(f)).not.toMatch(dashes);
  });
});
