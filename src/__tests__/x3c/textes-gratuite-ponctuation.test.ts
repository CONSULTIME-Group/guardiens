/**
 * Lot X3c : textes visibles (audit E du 13/10/2026).
 * E-09 : « Guardiens est gratuit », dit simplement, sans durée (FAQ d'accueil,
 *        donc JSON-LD FAQPage, et la même formule ailleurs).
 * E-10 : aucun abonnement offert ni payant à venir (Urgence, Parrainage).
 * E-11 : aucun tiret cadratin dans les objets des emails d'authentification
 *        ni sur l'image de partage des annonces.
 * P2 visibles : onglet « Gratuité », page Mon accès, schéma « Abonnement Gardien »
 *        retiré, « 2 ou 3 photos », comparatif sans « Payant ».
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
const fr = JSON.parse(readFileSync(join(__dirname, "..", "..", "..", "src/i18n/locales/fr/common.json"), "utf8"));

const root = join(__dirname, "..", "..", "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");
const DASHES = new RegExp("[\\u2013\\u2014]");

const PUBLIC_FILES = [
  "src/i18n/locales/fr/common.json",
  "src/pages/Observatoire.tsx",
  "src/pages/Parrainage.tsx",
  "src/pages/AlmaTips.tsx",
  "src/pages/DepartmentPage.tsx",
  "src/pages/ArticleInventaire.tsx",
  "src/pages/ArticleDetail.tsx",
  "src/pages/Settings.tsx",
  "src/pages/MySubscription.tsx",
  "src/pages/Pricing.tsx", // lot Y3 (P5-01)
  "src/pages/Messages.tsx",
  "src/components/city/CitySittersGrid.tsx",
  "src/components/profile/ProfileHero.tsx",
  "src/components/search/SearchHowItWorksAnon.tsx",
  "src/components/search/SearchSeoFooter.tsx",
  "src/components/premium/PremiumGateDialog.tsx",
  "src/components/premium/ActivateRoleDialog.tsx",
  "src/components/seo/StickyCTA.tsx",
  "src/components/dashboard/RoleActivationBanner.tsx",
  "src/data/siteRoutes.ts",
  "src/lib/pricing.ts",
  "src/config/articles-post-pivot.ts",
  "supabase/functions/refresh-articles-post-pivot/pillars.ts",
  "public/llms.txt",
];

const OUTDATED = [
  /phase de lancement/i,
  /évolution tarifaire/i,
  /deviendra payant/i,
  /abonnement payant/i,
  /abonnement offert/i,
];

describe("E-09 · Guardiens est gratuit, sans durée", () => {
  it("la FAQ d'accueil (et son JSON-LD) le dit simplement", () => {
    const faq = (fr as any).landing.faq;
    expect(faq.a2.startsWith("Guardiens est gratuit.")).toBe(true);
    expect(faq.a7.startsWith("Guardiens est gratuit")).toBe(true);
    expect(read("src/components/landing/HomeJsonLd.tsx")).toContain("t(`landing.faq.a${n}`");
  });

  for (const f of PUBLIC_FILES) {
    it(`${f} n'annonce ni durée ni passage au payant`, () => {
      const src = read(f);
      for (const re of OUTDATED) expect(src, `${f} ${re}`).not.toMatch(re);
    });
  }
});

describe("E-10 · récompenses sans abonnement", () => {
  it("page Gardien d'urgence", () => {
    const page = (fr as any).emergency_page;
    expect(page.adv4).not.toMatch(/abonnement/i);
    expect(page.faq10_a).not.toMatch(/abonnement/i);
    expect(page.faq12_a).not.toMatch(/abonnement/i);
  });

  it("parrainage : paliers à 3, 5 et 10 filleuls, sans mois offert", () => {
    const src = read("src/pages/Parrainage.tsx");
    expect(src).not.toMatch(/mois (d'accès )?offert/);
    expect(src).not.toContain("count: 1,");
    expect(src).toContain("À 3, 5 puis 10 filleuls, vous débloquez les paliers de récompense.");
  });
});

describe("E-11 · ponctuation des emails d'authentification et du partage", () => {
  it("objets des emails d'authentification", () => {
    const src = read("supabase/functions/auth-email-hook/index.ts");
    const block = src.slice(src.indexOf("const EMAIL_SUBJECTS"), src.indexOf("}", src.indexOf("const EMAIL_SUBJECTS")));
    expect(block).not.toMatch(DASHES);
    expect(block).toContain("'Bienvenue sur Guardiens : confirmez votre adresse'");
  });

  it("image de partage des annonces", () => {
    const src = read("supabase/functions/og-sit/index.ts");
    const line = src.split("\n").find((l) => l.includes("Publiée par")) ?? "";
    expect(line).not.toMatch(DASHES);
  });

  it("libellés Stripe", () => {
    const src = read("supabase/functions/create-checkout/index.ts");
    for (const l of src.split("\n").filter((x) => x.includes("name:"))) expect(l).not.toMatch(DASHES);
  });
});

describe("P2 · textes visibles", () => {
  it("réglages : onglet et section « Gratuité »", () => {
    const src = read("src/pages/Settings.tsx");
    expect(src).toContain('{ id: "billing", label: "Gratuité"');
    expect(src).not.toContain("Abonnement & facturation");
  });

  it("page Mon accès", () => {
    const src = read("src/pages/MySubscription.tsx");
    expect(src).toContain("getPricingBaseline()");
    expect(src).not.toContain("Aucun paiement");
    expect(src).not.toContain("30 jours à l'avance");
  });

  it("aucun schéma « Abonnement Gardien » dans les articles", () => {
    expect(read("src/pages/ArticleDetail.tsx")).not.toContain("Abonnement Gardien");
  });

  it("messagerie, carte d'annonce et comparatif", () => {
    expect(read("src/pages/Messages.tsx")).not.toContain("L'abonnement gardien");
    expect(read("src/components/dashboard/owner/MonAnnonceCard.tsx")).toContain("Ajoutez 2 ou 3 photos");
    const cmp = (fr as any).landing;
    expect(JSON.stringify(cmp)).not.toMatch(/Payant/);
  });
});
