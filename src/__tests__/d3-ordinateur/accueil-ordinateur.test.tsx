/**
 * Lot D3 (09/11/2026, arène claude/arene/2026-11-09-dashboards-desktop,
 * maquette Claude Design « Tableaux de bord ordinateur v2 », « parfait go »
 * de Jérémie) : accueil ordinateur, premier écran utile.
 * Verrous : phrase de situation d'abord, un seul pas (aucun second pas
 * concurrent à droite, aucune garde en double), récit en mise en page
 * ordinateur avant la première annonce, garde mise en avant au récit,
 * menu en contour sur l'accueil, « Guardiens aujourd'hui » à la place du
 * pouls sur ordinateur, ligne entraide du téléphone sans mot proscrit.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";
import { pickOwnerCockpitLine } from "@/lib/ownerCockpitLine";
import { ownerNextStep, sitterNextStep } from "@/lib/dashboardNextStep";
import { entraideLineCopy } from "@/components/dashboard/story/EntraideLine";
import { starHeadline, starCtaLabel } from "@/components/dashboard/sitter/SitterMatchSection";
import { sidebarPublishVariant } from "@/components/layout/Navigation";
import { reassuranceRows, REASSURANCE_FOOTER } from "@/components/dashboard/shared/ReassuranceRailCard";
import StoryHero from "@/components/dashboard/story/StoryHero";
import { resolveOwnerStory } from "@/lib/dashboardStory";
import { buildOwnerStoryInput } from "@/lib/ownerStoryInput";

vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));

afterEach(cleanup);

const read = (p: string) => readFileSync(p, "utf8");

describe("D3, ligne de l'accueil propriétaire", () => {
  it("la situation passe avant le compte de proximité", () => {
    expect(
      pickOwnerCockpitLine({
        situation: "2 candidatures attendent votre réponse.",
        nearby: "117 gardiens sont inscrits à moins de 30 km de Lyon.",
        digest: "3 nouvelles personnes se sont inscrites.",
        fallback: "Bienvenue.",
      }),
    ).toBe("2 candidatures attendent votre réponse.");
  });
  it("sans situation : proximité, puis ligne de visite, puis accueil", () => {
    expect(pickOwnerCockpitLine({ situation: null, nearby: "117 gardiens.", digest: "3 inscrits.", fallback: "Bienvenue." })).toBe("117 gardiens.");
    expect(pickOwnerCockpitLine({ situation: null, nearby: null, digest: "3 inscrits.", fallback: "Bienvenue." })).toBe("3 inscrits.");
    expect(pickOwnerCockpitLine({ situation: null, nearby: null, digest: null, fallback: "Bienvenue." })).toBe("Bienvenue.");
  });
  it("OwnerDashboard passe par pickOwnerCockpitLine", () => {
    const src = read("src/components/dashboard/OwnerDashboard.tsx");
    expect(src).toContain("pickOwnerCockpitLine({");
    expect(src).toContain("situation: situationLine");
  });
});

describe("D3, un seul pas par écran", () => {
  it("propriétaire sans annonce en ligne : la colonne de droite ne propose ni publication ni coup de main", () => {
    for (const starVariant of ["publish", "draft", "applications", null]) {
      const step = ownerNextStep({ profileCompletion: 94, action: { hasActiveSit: false, nearbySittersCount: 9, starVariant } });
      expect(step?.ctaLabel).not.toBe("Publier mon annonce de garde");
      expect(step?.ctaLabel).not.toBe("Demander un coup de main");
    }
    expect(ownerNextStep({ profileCompletion: 100, action: { hasActiveSit: false, nearbySittersCount: 9, starVariant: "publish" } })).toBeNull();
  });

  it("gardien : la colonne de droite ne reprend aucune garde de la colonne principale, commune mise en forme", () => {
    const listings = [
      { id: "a", title: "Vedette", city: "Lyon" },
      { id: "b", title: "Une garde de 2 chiens et 1 chat", city: "Saint vulbas" },
      { id: "c", title: "Aussi", city: "Marlhes" },
      { id: "d", title: "Une autre", city: "saint genis laval" },
    ];
    const step = sitterNextStep({
      hasAvatar: true,
      hasBio: true,
      postalCode: "69005",
      profileCompletion: 94,
      action: { nearbyListings: listings, nearbyMissions: [], starSitId: "a", shownSitIds: ["a", "b", "c"] },
    })!;
    expect(step.ctaTo).toBe("/sits/d");
    expect(step.phrase).toContain("à Saint-Genis-Laval");
  });

  it("menu latéral : « Publier » en contour sur l'accueil seulement", () => {
    expect(sidebarPublishVariant("/dashboard")).toBe("outline");
    expect(sidebarPublishVariant("/sits")).toBe("default");
  });

  it("bandeau entraide en contour sur ordinateur (le téléphone a son suivi d'entraide depuis le lot L10)", () => {
    for (const f of ["src/components/dashboard/OwnerDashboard.tsx", "src/components/dashboard/SitterDashboard.tsx"]) {
      expect(read(f)).toMatch(/isDesktopRail \? \(\s*<DeferredMount minHeight=\{160\}>\s*<OwnerEntraideBand[^>]*ctaTone="outline"/);
    }
  });

  it("« Voir les autres candidatures » mène à l'annonce quand elles portent sur la même", () => {
    expect(read("src/components/dashboard/owner/OwnerStarSection.tsx")).toContain("`/sits/${featured.sit_id}#candidatures`");
  });
});

describe("D3, récit sur ordinateur avant la première annonce", () => {
  const story = resolveOwnerStory(
    buildOwnerStoryInput({
      today: "2026-11-09",
      sits: [],
      pets: [{ name: "Rex" }, { name: "Resa" }],
      awaitingApps: [],
      sitterProfiles: {},
      pendingReviews: [],
      latestDraft: null,
      ongoingSit: null,
      period: "noel",
      city: "Lyon",
      nearbySittersCount: 117,
    } as any),
  );

  it("titre en h2 (l'accueil porte le h1), bouton à sa largeur, mesure notée desktop", () => {
    render(
      <MemoryRouter>
        <StoryHero story={story} layout="desktop" periodPicker={{ value: "noel", onPick: () => {} }} />
      </MemoryRouter>,
    );
    expect(story.chapter).toBe("first_listing");
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe(story.title);
    const cta = screen.getByTestId("story-cta");
    expect(cta.className).not.toContain("w-full");
    expect(cta.textContent).toBe("Commencer mon annonce");
    expect(screen.getByTestId("story-hero").getAttribute("data-layout")).toBe("desktop");
    expect(screen.getByTestId("story-periods")).toBeTruthy();
  });

  it("téléphone inchangé : h1 et bouton pleine largeur par défaut", () => {
    render(
      <MemoryRouter>
        <StoryHero story={story} />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(story.title);
    expect(screen.getByTestId("story-cta").className).toContain("w-full");
  });

  it("le récit ordinateur remplace la vedette « Publier » et la carte « Vous partez quand ? »", () => {
    const src = read("src/components/dashboard/OwnerDashboard.tsx");
    expect(src).toContain('layout="desktop"');
    expect(src).toContain("{!desktopFirstListing && (");
    expect(src).toContain('primaryAction?.action !== "publish_draft"');
  });
});

describe("D3, garde mise en avant au récit", () => {
  it("phrase du récit, prénom sur le bouton", () => {
    expect(starHeadline({ city: "chazay d'azergues", title: "Nous recherchons…" })).toBe("Une maison attend son gardien à Chazay-d'Azergues.");
    // Lot D3b : sans commune d'annonce, celle du propriétaire ; sinon une phrase courte, le titre passe dessous.
    expect(starHeadline({ city: null, place_city: "chazay d'azergues", title: "Nous recherchons…" })).toBe("Une maison attend son gardien à Chazay-d'Azergues.");
    expect(starHeadline({ city: null, title: "Garde de 2 chats" })).toBe("Une maison attend son gardien.");
    expect(starCtaLabel("laurence")).toBe("Découvrir chez Laurence");
    expect(starCtaLabel(null)).toBe("Découvrir cette garde");
  });
});

describe("D3, Guardiens aujourd'hui", () => {
  it("chiffres réels, lignes à zéro masquées, gardiens à proximité en tête", () => {
    const rows = reassuranceRows({ totalInscrits: 1830, maisonsGardees: 44, animauxAccompagnes: 0, nearby: { count: 117, radiusKm: 30, city: "Lyon" } });
    expect(rows.map((r) => r.key)).toEqual(["nearby", "members", "houses"]);
    expect(rows[0].label).toBe("gardiens à moins de 30 km de Lyon");
    expect(reassuranceRows({ totalInscrits: 0, maisonsGardees: 0, animauxAccompagnes: 0 })).toEqual([]);
  });
  it("phrase de bas de carte dans la doctrine", () => {
    expect(REASSURANCE_FOOTER).toBe("Guardiens est gratuit. Une rencontre avant la garde reste toujours facultative.");
  });
  it("sur ordinateur, la carte remplace la ligne du pouls, le téléphone garde la ligne", () => {
    for (const f of ["src/components/dashboard/OwnerDashboard.tsx", "src/components/dashboard/SitterDashboard.tsx"]) {
      const src = read(f);
      // Lot D5 : un DashboardBlock de mesure peut envelopper le bloc.
      expect(src).toMatch(/\{isDesktopRail && (\(\s*)?(<DashboardBlock[^>]*>\s*)?<ReassuranceRailCard/);
      expect(src).toMatch(/\{!isDesktopRail && \(\s*(<DashboardBlock[^>]*>\s*)?<DeferredMount minHeight=\{40\}>\s*<CommunityPulseLine/);
    }
  });
});

describe("D3, ligne entraide du téléphone", () => {
  it("jamais de mot proscrit, « Entre deux gardes » réservé au gardien", () => {
    const sitter = entraideLineCopy({ helpersCount: 85, radiusKm: 30 });
    const owner = entraideLineCopy({ helpersCount: 85, radiusKm: 30, space: "owner" });
    expect(sitter.text).toBe("Entre deux gardes, 85 personnes prêtes à aider à moins de 30 km.");
    expect(owner.text).toBe("Pour un coup de main, 85 personnes prêtes à aider à moins de 30 km.");
    for (const t of [sitter.text, owner.text, entraideLineCopy({ helpersCount: 0, radiusKm: 30 }).text, entraideLineCopy({ helpersCount: 0, radiusKm: 30, space: "owner" }).text]) {
      expect(t).not.toMatch(/voisin/i);
    }
    expect(entraideLineCopy({ helpersCount: 1, radiusKm: 15, space: "owner" }).text).toBe("Pour un coup de main, 1 personne prête à aider à moins de 15 km.");
  });
});

describe("D3, textes", () => {
  it("aucun tiret long ni mot proscrit dans les fichiers du lot", () => {
    for (const f of [
      "src/lib/ownerCockpitLine.ts",
      "src/components/dashboard/shared/ReassuranceRailCard.tsx",
      "src/components/dashboard/story/EntraideLine.tsx",
      "src/components/dashboard/sitter/SitterMatchSection.tsx",
      "src/lib/dashboardNextStep.ts",
    ]) {
      const src = read(f);
      expect(src).not.toMatch(/[–—]/);
      expect(src).not.toMatch(/voisin/i);
    }
  });
});
