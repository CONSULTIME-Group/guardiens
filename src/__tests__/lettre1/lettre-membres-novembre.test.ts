import { describe, it, expect } from "vitest";
import { readFileSync, statSync } from "node:fs";

const read = (p: string) => readFileSync(p, "utf8");
const DIR = "supabase/functions/_shared/transactional-email-templates";
const TPL = read(`${DIR}/lettre-membres-novembre.tsx`);

describe("gabarit lettre-membres-novembre (lot LETTRE1)", () => {
  it("objet, aperçu et texte validés par Jérémie le 17/11/2026", () => {
    expect(TPL).toContain("export const LETTRE_MEMBRES_SUBJECT = 'Guardiens grandit grâce à vous : quoi de neuf ?'");
    expect(TPL).toContain("Entraide, sorties, projets participatifs : Guardiens devient bien plus que la garde de maison. Et nous avons une question pour vous.");
    expect(TPL).toContain("Qu'est-ce qu'il vous faudrait pour utiliser Guardiens encore plus ? Qu'est-ce qui vous manque ?");
    expect(TPL).toContain("Répondez simplement à cet email, quelques lignes suffisent.");
    expect(TPL).toContain("Racontez votre expérience, quelle qu'elle soit.");
    expect(TPL).toContain("Guardiens est gratuit.");
  });

  it("ponctuation et vocabulaire de la doctrine", () => {
    expect(TPL).not.toMatch(/[–—]/);
    expect(TPL.toLowerCase()).not.toMatch(/voisin/);
    expect(TPL).not.toMatch(/Vous avez apprécié/);
  });

  it("liens réels et images servies par guardiens.fr/email", () => {
    expect(TPL).toContain("https://guardiens.fr/petites-missions?");
    expect(TPL).toContain("https://guardiens.fr/sorties/proposer?");
    expect(TPL).toContain("https://guardiens.fr/projets/publier?");
    expect(TPL).toContain("https://g.page/r/CcG68dHWYoHIEAE/review");
    expect(TPL).toContain("https://youtu.be/idfxB9_qqkM");
    expect(TPL).toContain("const IMG = 'https://guardiens.fr/email'");
    expect(TPL).not.toMatch(/\.webp|<svg/i);
    for (const f of ["entraide-mains-bandeau", "tout-au-nord-vignette", "elisa", "jeremie"]) {
      expect(statSync(`public/email/${f}.jpg`).size).toBeGreaterThan(1000);
    }
  });

  it("inscrit au registre, expédié par les fondateurs, catégorie produit", () => {
    expect(read(`${DIR}/registry.ts`)).toContain("'lettre-membres-novembre': lettreMembresNovembre,");
    const sender = read("supabase/functions/_shared/sender-address.ts");
    const founders = sender.slice(sender.indexOf("FOUNDER_CAMPAIGN_TEMPLATES"), sender.indexOf("FOUNDER_SENDER_NAME"));
    expect(founders).toContain('"lettre-membres-novembre"');
    const cats = read("supabase/functions/_shared/email-categories.ts");
    expect(cats).toContain("'lettre-membres-novembre',");
  });

  it("préréglage de l'admin, sans envoi automatique", () => {
    const admin = read("src/pages/admin/AdminMassEmails.tsx");
    const preset = admin.slice(admin.indexOf('key: "lettre_membres_novembre"'), admin.indexOf('utmCampaign: "lettre_membres_novembre"'));
    expect(preset).toContain('template_name: "lettre-membres-novembre"');
    expect(preset).toContain("respect_product_optout: true");
    expect(preset).toContain("exclude_admins: true");
    expect((preset.match(/"[0-9a-f-]{36}"/g) ?? []).length).toBe(25);
  });
});
