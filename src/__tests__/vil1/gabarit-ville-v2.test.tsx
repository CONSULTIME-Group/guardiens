import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";
import {
  CITY_PILOT_V2,
  PILOT_V2_SLUGS,
  getCityPilotV2,
  pilotFaq,
  pilotIntro,
  pilotProofLine,
} from "@/data/cityPilotV2";
import { PUBLISH_VIA_VALUES, readPublishVia } from "@/lib/formPrefill";
import { ownerPublishHref } from "@/lib/almaVisitorSearch";

vi.mock("@/components/city/CitySittersGrid", () => ({
  default: (p: { variant?: string }) => <div data-testid="grid-mock" data-variant={p.variant} />,
}));
vi.mock("@/components/seo/NearbyCityLinks", () => ({ default: () => null }));
vi.mock("@/components/seo/PageBreadcrumb", () => ({ default: () => <nav data-testid="breadcrumb" /> }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));

import CityPilotV2Body from "@/components/city/CityPilotV2Body";

const TEMOINS = ["villeurbanne", "le-havre", "aix-en-provence", "avignon", "perpignan"];

describe("VIL1, liste fermée du pilote", () => {
  it("couvre les 5 pages pilotes et aucun témoin", () => {
    for (const p of PILOT_V2_SLUGS) expect(CITY_PILOT_V2[p]).toBeTruthy();
    expect(PILOT_V2_SLUGS).toHaveLength(5);
    for (const t of [...TEMOINS, "paris"]) expect(getCityPilotV2(t)).toBeNull();
  });
  it("garde les pages statiques hors pilote", () => {
    const src = readFileSync("src/data/cities.ts", "utf8");
    for (const slug of PILOT_V2_SLUGS) expect(src).not.toMatch(new RegExp(`slug:\\s*"${slug}"`));
  });
});

describe("VIL1, ligne de preuve", () => {
  it("ne montre jamais de zéro", () => {
    expect(pilotProofLine("Poitiers", 0, 0)).toBeNull();
    for (const [r, n] of [[0, 3], [3, 0], [2, 5], [1, 1]]) {
      expect(pilotProofLine("Poitiers", r, n)).not.toMatch(/\b0\b/);
    }
  });
  it("accorde au singulier et au pluriel", () => {
    expect(pilotProofLine("Poitiers", 1, 0)).toBe("1 gardien à Poitiers");
    expect(pilotProofLine("Poitiers", 0, 1)).toBe("1 gardien à proximité de Poitiers");
    expect(pilotProofLine("Poitiers", 12, 0)).toBe("12 gardiens à Poitiers");
    expect(pilotProofLine("Poitiers", 12, 30)).toBe("42 gardiens à proximité de Poitiers, dont 12 en ville");
  });
});

describe("VIL1, contenus", () => {
  const all = Object.entries(CITY_PILOT_V2).map(([slug, p]) => {
    const city = slug.charAt(0).toUpperCase() + slug.slice(1);
    const strings: string[] = [];
    const walk = (v: unknown) => {
      if (typeof v === "string") strings.push(v);
      else if (v && typeof v === "object") Object.values(v).forEach(walk);
    };
    walk({ intro: pilotIntro(city, p), faq: pilotFaq(city, p), p });
    return { slug, p, city, text: strings.join("\n") };
  });
  it("ouvre sur « home sitting »", () => {
    for (const { p, city } of all) expect(pilotIntro(city, p).startsWith(`Le home sitting à ${city}`)).toBe(true);
  });
  it("respecte la ponctuation et la doctrine", () => {
    for (const { text } of all) {
      expect(text).not.toMatch(/[—–]/);
      expect(text).not.toMatch(/\[|\]/);
      expect(text).toContain("Guardiens est gratuit.");
      expect(text).toContain("ouvrira bientôt");
      expect(text).not.toMatch(/(^|\s)0 €|gratuit pendant|gratuitement pour/);
    }
  });
  it("pose la rencontre comme facultative", () => {
    for (const { p, city } of all) expect(pilotFaq(city, p)[0].a).toMatch(/facultative/);
  });
  it("cite des sources https pour chaque guide vérifié", () => {
    for (const { p } of all) {
      if (!p.guide) continue;
      expect(p.guide.sources.length).toBeGreaterThan(0);
      for (const s of p.guide.sources) expect(s.url).toMatch(/^https:\/\//);
      expect(p.guide.verifiedOn).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    }
  });
});

describe("VIL1, publication depuis la ville", () => {
  it("accepte l'origine ville", () => {
    expect(PUBLISH_VIA_VALUES).toContain("ville");
    expect(readPublishVia(new URLSearchParams("via=ville"))).toBe("ville");
    expect(ownerPublishHref(false, "ville")).toBe("/sits/create?via=ville");
    expect(ownerPublishHref(true, "ville")).toBe(`/inscription?role=owner&redirect=${encodeURIComponent("/sits/create?via=ville")}`);
  });
});

describe("VIL1, rendu du gabarit", () => {
  const page = {
    slug: "poitiers",
    city: "Poitiers",
    department: "Vienne",
    h1_title: "Garde de maison et d'animaux à Poitiers",
    sitter_count: 12,
    nearby_sitter_count: 30,
  };
  const pilot = CITY_PILOT_V2.poitiers;
  const faq = pilotFaq("Poitiers", pilot);
  const renderPage = (over: Partial<typeof page> = {}, p = pilot, editorial: string | null = null) =>
    render(
      <MemoryRouter>
        <CityPilotV2Body
          page={{ ...page, ...over }}
          intro={pilotIntro((over.city ?? page.city), p)}
          guide={p.guide}
          faq={faq}
          editorial={editorial ? <p>{editorial}</p> : null}
          departmentCode="86"
          departmentPage={{ slug: "vienne", department: "Vienne" }}
          cityGuide={null}
        />
      </MemoryRouter>,
    );

  it("place l'écran 1 dans l'ordre de la maquette", () => {
    const { container } = renderPage();
    const hero = screen.getByTestId("city-v2-hero");
    expect(within(hero).getByRole("heading", { level: 1 })).toBeTruthy();
    expect(screen.getByTestId("city-v2-intro").textContent).toMatch(/^Le home sitting à Poitiers/);
    expect(screen.getByTestId("city-v2-proof").textContent).toBe("42 gardiens à proximité de Poitiers, dont 12 en ville");
    expect(screen.getByTestId("city-v2-publish").getAttribute("href")).toContain("via%3Dville");
    const order = ["breadcrumb", "city-v2-hero", "grid-mock", "city-v2-steps", "city-v2-guide", "city-v2-links", "city-v2-faq"].map(
      (id) => container.innerHTML.indexOf(`data-testid="${id}"`),
    );
    expect(order.every((v, i) => v >= 0 && (i === 0 || v > order[i - 1]))).toBe(true);
    expect(screen.getByTestId("grid-mock").getAttribute("data-variant")).toBe("v2");
  });

  it("masque la preuve à zéro", () => {
    renderPage({ sitter_count: 0, nearby_sitter_count: 0 });
    expect(screen.queryByTestId("city-v2-proof")).toBeNull();
  });

  it("rend une FAQ unique avec un + visible, identique au JSON-LD", () => {
    renderPage();
    const faqSection = screen.getByTestId("city-v2-faq");
    expect(within(faqSection).getAllByTestId("city-v2-faq-plus")).toHaveLength(faq.length);
    for (const f of faq) expect(within(faqSection).getByText(f.q)).toBeTruthy();
    const cityPage = readFileSync("src/pages/CityPage.tsx", "utf8");
    expect(cityPage).toMatch(/dbV2 \? pilotFaq\(dbPage\.city, dbV2\)/);
    expect(cityPage).toMatch(/mainEntity: dbFaqItems\.map/);
    expect(cityPage).toMatch(/faq=\{dbFaqItems\}/);
  });

  it("relie département, recherche, urgence et cadre juridique", () => {
    renderPage();
    const hrefs = within(screen.getByTestId("city-v2-links"))
      .getAllByRole("link")
      .map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/departement/vienne");
    expect(hrefs).toContain("/recherche-gardiens?ville=Poitiers");
    expect(hrefs).toContain("/gardien-urgence");
    expect(hrefs).toContain("/actualites/house-sitting-cadre-juridique-france");
  });

  it("garde le corps éditorial en base sans guide vérifié", () => {
    renderPage({ slug: "dunkerque", city: "Dunkerque" }, CITY_PILOT_V2.dunkerque, "La digue de Malo.");
    expect(screen.queryByTestId("city-v2-guide")).toBeNull();
    expect(screen.getByTestId("city-v2-editorial").textContent).toContain("La digue de Malo.");
  });
});
