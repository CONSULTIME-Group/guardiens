/**
 * Lots ES2 et ES3 (16/11/2026, conseil claude/conseil/2026-11-16-conseil-entraide-sorties-hub.md,
 * « ok go je valide tout » de Jérémie) : la rubrique s'appelle « Entraide & sorties » partout où
 * un visiteur ou un robot la lit, /sorties a son aperçu et un lien dans le pied de page, et le hub
 * répond en 8 questions visibles, reprises par le JSON-LD FAQPage.
 */
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const read = (p: string) => fs.readFileSync(path.resolve(process.cwd(), p), "utf-8");
const common = JSON.parse(read("src/i18n/locales/fr/common.json"));

describe("ES2, nom de la rubrique", () => {
  it("menu public et colonne du pied de page", () => {
    expect(common.nav.small_missions).toBe("Entraide & sorties");
    expect(common.footer.sections.mutual_aid).toBe("Entraide & sorties");
    expect(common.footer.links.outings).toBe("Sorties près de chez vous");
  });

  it("le pied de page lie /sorties", () => {
    expect(read("src/components/layout/PublicFooter.tsx")).toContain('<Link to="/sorties" className={linkCls}>{t("footer.links.outings")}</Link>');
  });

  it("titre et description du hub", () => {
    const hub = read("src/pages/EntraideHub.tsx");
    expect(hub).toContain('title="Entraide et sorties près de chez vous | Guardiens"');
    expect(hub).toMatch(/description="Coups de main entre gens du coin[^"]*sorties à plusieurs \(belote/);
  });

  it("fil d'Ariane des trois onglets sous la rubrique", () => {
    expect(read("src/pages/EntraideHub.tsx")).toContain('items={[{ label: "Entraide & sorties" }]}');
    expect(read("src/pages/Sorties.tsx")).toContain('{ label: "Entraide & sorties", href: "/petites-missions" }, { label: "Sorties" }');
    expect(read("src/pages/ProjetsListing.tsx")).toContain('{ label: "Entraide & sorties", href: "/petites-missions" }, { label: "Chantiers participatifs" }');
  });

  it("/sorties a son image d'aperçu", () => {
    expect(fs.existsSync("public/og/og-sorties.jpg")).toBe(true);
    expect(read("src/data/siteConstants.ts")).toContain("og-sorties.jpg");
    expect(read("src/pages/Sorties.tsx")).toContain("image={SECTION_OG_IMAGES.sorties.url}");
  });

  it("llms.txt : belote rangée en sortie, sport à la place du vélo", () => {
    const llms = read("public/llms.txt");
    expect(llms).toContain("- [Entraide & sorties](/petites-missions):");
    expect(llms).not.toMatch(/trajets, jeux de société/);
    expect(llms).toContain("(belote, balade, sport, randonnée, atelier)");
  });
});

describe("ES3, référence du hub", () => {
  const hub = read("src/pages/EntraideHub.tsx");
  const faq = hub.slice(hub.indexOf("const FAQ = ["), hub.indexOf("] as const;"));

  it("8 questions, rendues à l'écran et dans le JSON-LD", () => {
    expect(faq.match(/\{ question: /g)).toHaveLength(8);
    expect(hub).toContain("{FAQ.map((item, index) => (");
    expect(hub).toContain("mainEntity: FAQ.map(");
  });

  it("doctrine : gratuit, rencontre au choix, garde d'enfants hors entraide", () => {
    expect(faq).toContain("Guardiens est gratuit.");
    expect(faq).toContain("La rencontre se décide entre vous");
    expect(faq).toContain("La garde d'enfants reste en dehors de l'entraide.");
  });

  it("encart chiffré daté et sourcé", () => {
    const why = read("src/components/outings/HubHeader.tsx");
    expect(why).toContain("près d'un tiers (32 %)");
    expect(why).toContain("étude Solitudes 2025, enquête de juillet 2025 auprès de plus de 3 000 personnes");
  });

  it("vocabulaire : ni « voisin », ni tiret long", () => {
    for (const text of [faq, read("public/llms.txt"), read("src/components/outings/HubHeader.tsx")]) {
      expect(text).not.toMatch(/voisin/i);
      expect(text).not.toMatch(/[—–]/);
    }
  });
});
