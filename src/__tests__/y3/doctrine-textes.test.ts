/**
 * Lot Y3 : doctrine des textes (audit passe 5 du 13/10/2026).
 * Verrouille, sur les fichiers corrigés par le lot :
 *  - aucun tiret cadratin ni demi-cadratin dans un texte (commentaires exclus) ;
 *  - « Guardiens est gratuit », dit simplement : ni « pour les propriétaires »,
 *    ni « offert », ni « gratuit pour vous », ni facturation annoncée (/tarifs) ;
 *  - rencontre toujours facultative, jamais une étape ou une condition ;
 *  - les fondateurs ne cherchent pas de gardien pour quelqu'un ;
 *  - aucune comparaison avec la pension ou un pet-sitter ;
 *  - seuil de profil 40 % ;
 *  - aucune promesse de fonction absente (SMS, téléphone, 24/7, protocoles) ;
 *  - voix d'Alma : « échange en temps et en savoir-faire » plutôt que « gratuit ».
 * Lecture des fichiers seulement : aucun module Deno n'est importé.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "..", "..", "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");
const fr = JSON.parse(read("src/i18n/locales/fr/common.json"));

/** Retire les commentaires JS, JSX et HTML pour ne garder que le texte et le code. */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1");
}

const T = "supabase/functions/_shared/transactional-email-templates/";

const PUBLIC_FILES = [
  "src/pages/Pricing.tsx",
  "src/pages/FAQ.tsx",
  "src/pages/CityPage.tsx",
  "src/pages/DepartmentPage.tsx",
  "src/pages/ArticleDetail.tsx",
  "src/pages/ArticleInventaire.tsx",
  "src/pages/PublicSitDetail.tsx",
  "src/pages/DemoSitDetail.tsx",
  "src/pages/DevenirHomeSitter.tsx",
  "src/pages/Observatoire.tsx",
  "src/pages/CreateSit.tsx",
  "src/components/landing/ConfianceSection.tsx",
  "src/components/landing/HomeJsonLd.tsx",
  "src/components/city/CityHero.tsx",
  "src/components/seo/CitySchemaOrg.tsx",
  "src/components/seo/LocalExpertise.tsx",
  "src/components/search/SearchMapView.tsx",
  "src/components/missions/ExchangeHowItWorks.tsx",
  "src/components/dashboard/owner/SpotlightForYouPanel.tsx",
  "src/components/dashboard/owner/SpotlightNearbyPanel.tsx",
  "src/components/dashboard/owner/NearbyOwnerSittersCard.tsx",
  "src/components/owner-profile/PhotoJourneyDialog.tsx",
  "src/data/cities.ts",
  "src/data/cityContent.ts",
  "src/data/authors.ts",
  "src/lib/missionSitRedirect.ts",
  "src/lib/photoJourney.ts",
  "public/llms.txt",
];

const EMAIL_FILES = [
  "_alma-signoff.tsx",
  "owner-no-sit-j3.tsx",
  "owner-no-sit-j10.tsx",
  "onboarding-j1.tsx",
  "sitter-encourage-candidature.tsx",
  "seasonal-nurture.tsx",
  "owner-noel-2026.tsx",
  "referral-boost-monthly.tsx",
  "founder-personal-notice.tsx",
  "summer-listing-reminder.tsx",
  "sitter-mutual-aid-invite.tsx",
  "mission-daily-digest.tsx",
  "helper-to-guard.tsx",
  "review-reminder.tsx",
].map((f) => T + f);

const ALL = [...PUBLIC_FILES, ...EMAIL_FILES, "src/i18n/locales/fr/common.json"];

describe("Y3 · ponctuation", () => {
  for (const f of ALL) {
    it(`${f} : aucun tiret cadratin ni demi-cadratin hors commentaires`, () => {
      expect(stripComments(read(f))).not.toMatch(/[–—]/);
    });
  }
});

describe("Y3 · Guardiens est gratuit, dit simplement", () => {
  const RESTRICTED = [
    /0\s*€ pour les propriétaires/i,
    /Propriétaires : 0\s*€/,
    /gratuite? pour les propriétaires/i,
    /offert aux propriétaires/i,
    /Guardiens est offert/i,
    /gratuit pour vous/i,
    /sans engagement/i,
    /gratuit pour le moment/i,
    /S'abonner pour postuler/,
  ];
  for (const f of ALL) {
    it(`${f} : aucune gratuité restreinte ni vocabulaire d'abonnement`, () => {
      const src = stripComments(read(f));
      for (const re of RESTRICTED) expect(src, `${f} ${re}`).not.toMatch(re);
    });
  }

  it("/tarifs : « Guardiens est gratuit », sans facturation annoncée (JSON-LD compris)", () => {
    const src = read("src/pages/Pricing.tsx");
    expect(src).toContain("Guardiens est gratuit");
    expect(src).toContain('a: "Guardiens est gratuit, pour tous les membres."');
    for (const re of [/factur/i, /30 jours/, /maintenant/i, /reste gratuit/i, /aujourd'hui/i, /tant que/i]) {
      expect(src, String(re)).not.toMatch(re);
    }
  });

  it("FAQ : le bloc tarifs mène à /tarifs, plus à l'article tarifs 2026", () => {
    expect(read("src/pages/FAQ.tsx")).not.toContain("/actualites/nouveaux-tarifs-2026");
    expect(fr.faq.pricing_cta_title).toBe("Guardiens est gratuit");
  });

  it("données structurées des pages ville, département, annonce et article", () => {
    for (const f of [
      "src/components/seo/CitySchemaOrg.tsx",
      "src/pages/DepartmentPage.tsx",
      "src/pages/PublicSitDetail.tsx",
      "src/pages/CityPage.tsx",
    ]) {
      const src = read(f);
      expect(src, f).not.toContain('eligibleCustomerType: "Owner"');
      expect(src, f).toContain('description: "Guardiens est gratuit."');
    }
    expect(read("src/pages/ArticleDetail.tsx")).toContain('"priceRange": "Guardiens est gratuit"');
  });

  it("carte des annonces : un visiteur est invité à créer son profil", () => {
    const src = read("src/components/search/SearchMapView.tsx");
    expect(src).toContain("Créer mon profil pour postuler");
    expect(src).toContain('to="/inscription?role=sitter"');
    expect(read("src/components/search/SearchSitter.tsx")).toContain("isLoggedIn={!!user}");
  });
});

describe("Y3 · rencontre toujours facultative", () => {
  const MANDATORY = [
    /vous vous rencontrez\s+avant de vous engager/i,
    /Rencontrez les candidats/,
    /Vous rencontrez chaque candidat/i,
    /rencontre physique préalable à toute garde/i,
    /la rencontre avant décision/i,
    /après les avoir rencontrés/i,
    /obligation systématique/i,
    /sans rencontrer l'animal d'abord/i,
    /Trois conditions pour se faire confiance/,
    /C'est cette rencontre physique qui fait la différence/,
    /Vous vous rencontrez, vous rendez service/,
    /Prévoyez le temps d'une rencontre/,
  ];
  const FILES = [
    ...ALL,
    "src/pages/Terms.tsx",
    // Lot J2b : le texte des CGU vit dans un composant par version.
    "src/components/legal/TermsV8.tsx",
    "src/components/legal/TermsV9.tsx",
    "src/components/legal/CgsV3.tsx",
    "src/pages/MentionsLegales.tsx",
    "supabase/functions/_shared/alma-system-prompt.ts",
  ];
  for (const f of FILES) {
    it(`${f} : aucune rencontre imposée`, () => {
      const src = stripComments(read(f));
      for (const re of MANDATORY) expect(src, `${f} ${re}`).not.toMatch(re);
    });
  }

  it("le prompt d'Alma décrit une rencontre proposée et facultative", () => {
    const src = read("supabase/functions/_shared/alma-system-prompt.ts");
    expect(src).toContain("une rencontre préalable se propose, elle reste toujours facultative.");
    expect(src).toContain("la rencontre proposée si les deux le souhaitent");
  });
});

describe("Y3 · fondateurs, comparaisons, chiffres et fonctions réelles", () => {
  it("personne ne cherche de gardien pour le propriétaire", () => {
    expect(read("src/components/dashboard/owner/SpotlightForYouPanel.tsx")).not.toMatch(/nous cherchons des gardiens/i);
  });

  it("aucune comparaison avec la pension ou un pet-sitter sur les fichiers du lot", () => {
    for (const f of [
      "src/pages/DepartmentPage.tsx",
      "src/pages/CityPage.tsx",
      "src/data/cityContent.ts",
      "src/data/demoListings.ts",
      T + "seasonal-nurture.tsx",
      "public/llms.txt",
    ]) {
      const src = stripComments(read(f));
      expect(src, f).not.toMatch(/\bpensions?\b/i);
      expect(src, f).not.toMatch(/contrairement/i);
      expect(src, f).not.toMatch(/pet-sitter/i);
    }
    expect(fr.emergency_page.story2_text).not.toMatch(/pension/i);
    expect(read("src/pages/CreateSit.tsx")).not.toContain("plutôt qu'à une pension");
  });

  it("seuil de profil : 40 %, dans le code, l'email d'accueil et la base d'Alma", () => {
    expect(read("src/hooks/useAccessLevel.ts")).toContain("export const MIN_COMPLETION_TO_APPLY = 40;");
    const j1 = read(T + "onboarding-j1.tsx");
    expect(j1).toContain("à partir de 40 %");
    expect(j1).not.toMatch(/60\s*%/);
    expect(read("supabase/functions/_shared/alma-site-knowledge.ts")).not.toMatch(/60\s*%/);
  });

  it("email j10 : aucune statistique non sourcée", () => {
    const src = read(T + "owner-no-sit-j10.tsx");
    expect(src).not.toMatch(/une annonce sur deux/i);
    expect(src).not.toMatch(/48\s*(&nbsp;)?\s*h/);
  });

  it("page Gardien d'urgence : ni SMS, ni téléphone, ni 24/7, ni dashboard", () => {
    const page = fr.emergency_page as Record<string, string>;
    for (const [k, v] of Object.entries(page)) {
      if (!/^faq\d+_a$|^sitter_subtitle$/.test(k)) continue;
      expect(v, k).not.toMatch(/\bSMS\b/);
      expect(v, k).not.toMatch(/téléphone/i);
      expect(v, k).not.toMatch(/24\/7/);
      expect(v, k).not.toMatch(/dashboard/i);
    }
    expect(page.faq9_a).not.toMatch(/garantie/i);
  });

  it("pages ville : le réseau d'urgence est présenté comme à venir", () => {
    const city = read("src/pages/CityPage.tsx");
    expect(city).not.toContain("Une alerte prioritaire peut être envoyée");
    expect(city).not.toContain("Filet de sécurité local");
    expect(city).not.toContain("solliciter les gardiens d'urgence éligibles");
    expect(read("src/components/city/CityHero.tsx")).not.toContain("Gardiens d'urgence");
  });

  it("pages ville : des conseils au propriétaire, plus de protocole des gardiens", () => {
    expect(read("src/data/cities.ts")).not.toMatch(/nos gardiens/i);
    expect(stripComments(read("src/components/seo/LocalExpertise.tsx"))).not.toMatch(/nos gardiens/i);
    expect(read("src/components/seo/LocalSpotsGrid.tsx")).not.toMatch(/nos gardiens/i);
  });
});

describe("Y3 · voix et vocabulaire", () => {
  it("signature Alma des emails : échange en temps et en savoir-faire, sans « gratuit »", () => {
    const src = stripComments(read(T + "_alma-signoff.tsx"));
    expect(src).toContain("Un échange en temps et en savoir-faire.");
    expect(src).not.toMatch(/gratuit/i);
  });

  it("parcours photo au vouvoiement", () => {
    for (const f of ["src/lib/photoJourney.ts", "src/components/owner-profile/PhotoJourneyDialog.tsx"]) {
      const src = stripComments(read(f));
      expect(src, f).not.toMatch(/\b(tu|toi)\b/i);
      expect(src, f).not.toMatch(/Réessaie\b|Recule\b|Ouvre les rideaux/);
    }
  });

  it("« tableau de bord » et « affinité » plutôt que « dashboard » et « matching » dans les textes", () => {
    expect(read("src/pages/CreateSit.tsx")).not.toContain("depuis votre dashboard");
    expect(read("src/pages/Dashboard.tsx")).not.toContain('"Le dashboard');
    for (const f of ["src/components/profile/StepPreferences.tsx", "src/components/owner-profile/OwnerStepIdentity.tsx"]) {
      expect(read(f), f).not.toContain("pour un bon matching");
    }
    expect(fr.landing.toc.matching).toBe("Affinité");
  });

  it("gardiens « à proximité » côté propriétaire", () => {
    const j3 = read(T + "owner-no-sit-j3.tsx");
    expect(j3).toContain("gardiens à proximité de ${cityLabel}");
    expect(j3).not.toContain("habitent autour de");
    expect(read("src/components/dashboard/owner/NearbyOwnerSittersCard.tsx")).toContain("Gardiens à proximité");
    expect(stripComments(read("src/components/dashboard/owner/SpotlightNearbyPanel.tsx"))).not.toContain("près de chez vous");
    expect(stripComments(read(T + "owner-noel-2026.tsx"))).not.toMatch(/près de chez vous|proches de chez vous/i);
  });

  it("aucun emoji dans l'email de demande d'avis", () => {
    expect(read(T + "review-reminder.tsx")).not.toMatch(/[⭐\u{1F31F}]/u);
  });
});
