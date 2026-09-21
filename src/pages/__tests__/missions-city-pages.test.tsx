import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { MISSIONS_CITIES } from "@/data/missionsCityContent";
import MissionsCityPage, { cityAvailabilityLabel } from "../MissionsCityPage";

type TableRows = Record<string, unknown[]>;
let rows: TableRows = {};
let proofVisible = true;

const queryFor = (table: string) => {
  const query = {
    select: () => query,
    eq: () => query,
    not: () => query,
    order: () => query,
    range: () => query,
    then: (resolve: (value: { data: unknown[]; error: null }) => unknown) => Promise.resolve(resolve({ data: rows[table] || [], error: null })),
  };
  return query;
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: (table: string) => queryFor(table) },
}));
vi.mock("@/components/layout/PublicHeader", () => ({ default: () => <header /> }));
vi.mock("@/components/layout/PublicFooter", () => ({ default: () => <footer /> }));
vi.mock("@/components/seo/PageBreadcrumb", () => ({ default: () => null }));
vi.mock("@/components/PageMeta", () => ({
  default: ({ title, path, jsonLd }: { title: string; path: string; jsonLd: object[] }) => (
    <div data-testid="page-meta" data-title={title} data-path={path}>{JSON.stringify(jsonLd)}</div>
  ),
}));
vi.mock("@/components/entraide/EntraideMap", () => ({
  default: ({ needs, helpers }: { needs: unknown[]; helpers: unknown[] }) => <div data-testid="city-map">{needs.length}:{helpers.length}</div>,
}));
vi.mock("@/components/entraide/EntraideCards", () => ({
  NeedCard: ({ need }: { need: { title: string } }) => <article>{need.title}</article>,
  HelperCard: ({ helper }: { helper: { first_name: string } }) => <article>{helper.first_name}</article>,
}));
vi.mock("@/components/entraide/EntraideProofs", () => ({
  default: () => proofVisible ? <section>Preuve locale</section> : null,
}));

const nearbyProfiles = (citySlug: string, count: number) => Array.from({ length: count }, (_, index) => ({
  id: `profile-${index}`,
  latitude_approx: MISSIONS_CITIES[citySlug].coordinates.lat,
  longitude_approx: MISSIONS_CITIES[citySlug].coordinates.lng,
}));

const renderCity = (citySlug: string) => render(
  <MemoryRouter initialEntries={[`/petites-missions/${citySlug}`]}>
    <MissionsCityPage citySlug={citySlug} />
  </MemoryRouter>,
);

describe("pages villes Entraide", () => {
  beforeEach(() => {
    proofVisible = true;
    rows = {
      public_profiles: [],
      public_small_missions: [],
      public_helpers: [],
      public_mission_response_counts: [],
    };
  });
  afterEach(cleanup);

  for (const citySlug of ["lyon", "marseille", "strasbourg"]) {
    it(`rend le gabarit, la FAQ, le JSON-LD et la canonique de ${citySlug}`, async () => {
      const city = MISSIONS_CITIES[citySlug];
      rows.public_profiles = nearbyProfiles(citySlug, 5);
      renderCity(citySlug);

      expect(screen.getByRole("heading", { level: 1, name: city.h1 })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "J'ai besoin d'un coup de main" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Je veux bien aider" })).toBeInTheDocument();
      expect(screen.getByTestId("page-meta")).toHaveAttribute("data-path", `/petites-missions/${citySlug}`);
      expect(screen.getByTestId("page-meta")).toHaveAttribute("data-title", city.metaTitle);
      expect(screen.getByTestId("page-meta").textContent).toContain('"@type":"FAQPage"');
      expect(screen.getByTestId("page-meta").textContent).toContain(city.faq[0].q);
      await waitFor(() => expect(screen.getByText(`5 personnes disponibles autour de ${city.cityName}`)).toBeInTheDocument());
    });
  }

  it("filtre besoins et personnes à trente kilomètres et masque un bloc de preuves vide", async () => {
    const city = MISSIONS_CITIES.lyon;
    proofVisible = false;
    rows.public_profiles = nearbyProfiles("lyon", 4);
    rows.public_small_missions = [
      { id: "near", slug: "besoin-proche", title: "Besoin proche", city: "Lyon", date_needed: null, end_date: null, latitude: city.coordinates.lat, longitude: city.coordinates.lng },
      { id: "far", slug: "besoin-lointain", title: "Besoin lointain", city: "Paris", date_needed: null, end_date: null, latitude: 48.8566, longitude: 2.3522 },
    ];
    rows.public_helpers = [
      { id: "helper-near", first_name: "Camille", avatar_url: null, city: "Lyon", latitude_approx: city.coordinates.lat, longitude_approx: city.coordinates.lng, helps_with: "Arroser les plantes" },
      { id: "helper-far", first_name: "Alex", avatar_url: null, city: "Paris", latitude_approx: 48.8566, longitude_approx: 2.3522, helps_with: "Porter un colis" },
    ];
    rows.public_mission_response_counts = [{ mission_id: "near", response_count: 2 }];
    renderCity("lyon");

    await waitFor(() => expect(screen.getByText("Besoin proche")).toBeInTheDocument());
    expect(screen.queryByText("Besoin lointain")).not.toBeInTheDocument();
    expect(screen.getByText("Camille")).toBeInTheDocument();
    expect(screen.queryByText("Alex")).not.toBeInTheDocument();
    expect(screen.getByText("La carte se remplit avec les coups de main du coin.")).toBeInTheDocument();
    expect(screen.queryByText("Preuve locale")).not.toBeInTheDocument();
    expect(screen.getByTestId("city-map")).toHaveTextContent("1:1");
  });

  it("garde le seuil du compteur explicite", () => {
    expect(cityAvailabilityLabel(4, "Lyon")).toBe("La carte se remplit avec les coups de main du coin.");
    expect(cityAvailabilityLabel(5, "Lyon")).toBe("5 personnes disponibles autour de Lyon");
  });

  it("conserve les textes validés sans chiffre arabe ni tiret interdit", () => {
    for (const city of Object.values(MISSIONS_CITIES)) {
      expect(city.sections).toHaveLength(4);
      for (const section of city.sections) {
        expect(section.body).not.toMatch(/[0-9]/);
        expect(`${section.heading}${section.body}`).not.toMatch(/[—–]/);
      }
    }
  });
});