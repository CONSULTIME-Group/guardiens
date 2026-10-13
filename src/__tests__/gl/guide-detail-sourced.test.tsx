/**
 * Lots GL2 et GL3 (13/10/2026) : la page guide n'affiche que des lieux
 * sourcés une fois le guide sourcé, avec lien d'itinéraire et fiche Google,
 * sans recopier de note Google, et déclare le vrai pays dans ses données
 * structurées. Un guide pas encore sourcé garde son affichage (aucun guide
 * vidé pendant le rattrapage).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@/i18n";
import { visibleGuidePlaces } from "@/lib/guidePlaces";

let tables: Record<string, unknown> = {};
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    channel: () => { const c: any = { on: () => c, subscribe: () => c }; return c; },
    removeChannel: () => Promise.resolve(),
    rpc: () => Promise.resolve({ data: null, error: null }),
    from: (table: string) => {
      const b: any = new Proxy({}, {
        get: (_t, k: string) => {
          const res = () => Promise.resolve({ data: tables[table] ?? null, error: null });
          if (k === "then") return (ok: any, ko: any) => res().then(ok, ko);
          if (k === "maybeSingle" || k === "single") return () => res();
          return () => b;
        },
      });
      return b;
    },
  },
}));
vi.mock("@/hooks/useCityPageExists", () => ({ useCityPageExists: () => false }));
vi.mock("@/hooks/useDepartmentPageExists", () => ({ useDepartmentPageExists: () => false }));
vi.mock("@/components/city/HouseSittingGuideInsert", () => ({ default: () => null }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null, hasSession: false, activeRole: null }) }));

import GuideDetail from "@/pages/GuideDetail";

const GUIDE = {
  id: "g-sl", slug: "saint-ludger", city: "Saint Ludger", postal_code: "G0M1W0", department: "Québec",
  intro: "Intro", ideal_for: "Idéal pour les gardiens qui aiment la forêt.", leash_rule: null, leash_rule_source: null,
  country: "CA", places_sourced_at: "2026-10-13T10:00:00Z", published: true,
};
const place = (id: string, extra: Record<string, unknown>) => ({
  id, city_guide_id: "g-sl", address: "Lac-Mégantic", latitude: 45.7, longitude: -70.6, description: "Texte.",
  dogs_welcome: false, leash_required: null, tips: null, google_rating: 4.8, google_place_id: null, source_url: null,
  distance_km: null, ...extra,
});
const PLACES = [
  place("fake", { category: "dog_park", name: "Parc Canin de la Forêt de Saint-Ludger", address: "Chemin de la Forêt, 76000 Saint-Ludger" }),
  place("vet-far", { category: "vet", name: "Clinique Beauce", source_url: "https://www.openstreetmap.org/node/7", distance_km: 45 }),
  place("vet-near", { category: "vet", name: "Hôpital vétérinaire du Granit", source_url: "https://www.openstreetmap.org/node/6", distance_km: 25, google_place_id: "ChIJabc" }),
  place("forest", { category: "general_park", name: "Forêt de Saint-Ludger", source_url: "https://www.openstreetmap.org/way/1", distance_km: 2 }),
];

const renderGuide = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={["/guides/saint-ludger"]}>
        <Routes><Route path="/guides/:slug" element={<GuideDetail />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe("GL3, page d'un guide sourcé", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
    tables = { city_guides: GUIDE, city_guide_places: PLACES, articles: [] };
  });

  it("affiche les seuls lieux sourcés, le plus proche d'abord, avec itinéraire et fiche Google", async () => {
    renderGuide();
    await screen.findByText("Hôpital vétérinaire du Granit");
    expect(screen.queryByText("Parc Canin de la Forêt de Saint-Ludger")).toBeNull();
    expect(screen.getByText("Forêt de Saint-Ludger")).toBeTruthy();
    const vets = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(vets.indexOf("Hôpital vétérinaire du Granit")).toBeLessThan(vets.indexOf("Clinique Beauce"));

    const routes = screen.getAllByRole("link", { name: /Itinéraire/ });
    expect(routes).toHaveLength(3);
    expect(routes.some((a) => a.getAttribute("href")?.includes("destination_place_id=ChIJabc"))).toBe(true);
    const reviews = screen.getAllByRole("link", { name: /Avis sur Google Maps/ });
    expect(reviews).toHaveLength(1);
    expect(screen.getAllByRole("link", { name: /Source : OpenStreetMap/ })).toHaveLength(3);
    // Aucune note Google recopiée.
    expect(document.body.textContent).not.toContain("4.8");
  });

  it("déclare le vrai pays dans les données structurées, avec la source", async () => {
    renderGuide();
    await screen.findByText("Hôpital vétérinaire du Granit");
    await waitFor(() => {
      const ld = [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => s.textContent ?? "");
      const list = ld.find((t) => t.includes("ItemList"));
      expect(list).toBeTruthy();
      expect(list).toContain('"addressCountry":"CA"');
      expect(list).not.toContain('"addressCountry":"FR"');
      expect(list).toContain("https://www.openstreetmap.org/node/6");
      expect(list).not.toContain("76000");
    });
  });
});

describe("GL3, rattrapage sans page vide", () => {
  it("un guide français pas encore sourcé garde son affichage", () => {
    const out = visibleGuidePlaces(PLACES as any, { places_sourced_at: null, country: "FR" });
    expect(out).toHaveLength(4);
  });
  it("un guide à l'étranger n'affiche jamais de lieu sans source, même avant son passage", () => {
    const out = visibleGuidePlaces(PLACES as any, { places_sourced_at: null, country: "CA" });
    expect(out.map((p) => p.id)).not.toContain("fake");
  });
  it("un lieu à plus de 52 km du centre est écarté, sourcé ou non", () => {
    const far = { ...PLACES[1], id: "oise", latitude: 49.26, longitude: 2.48 };
    const out = visibleGuidePlaces([...PLACES, far] as any, { places_sourced_at: "x", latitude: 45.74, longitude: -70.69 });
    expect(out.map((p) => p.id)).not.toContain("oise");
    expect(out.map((p) => p.id)).toContain("vet-near");
  });
  it("un lieu sourcé au nom d'un lieu de la sélection d'un guide refondu n'est pas répété", () => {
    const curated = { ...PLACES[0], id: "tete-or", name: "Parc de la Tête d'Or", category: "general_park" };
    const dup = { ...PLACES[3], id: "tete-or-osm", name: "Parc de la Tête d’Or ", source_url: "https://www.openstreetmap.org/way/9" };
    const out = visibleGuidePlaces([curated, dup] as any, { places_sourced_at: "x" }, new Set(["tete-or"]));
    expect(out.map((p) => p.id)).toEqual(["tete-or"]);
  });
  it("un guide sourcé garde la sélection d'un guide refondu", () => {
    const out = visibleGuidePlaces(PLACES as any, { places_sourced_at: "x" }, new Set(["fake"]));
    expect(out.map((p) => p.id)).toEqual(["fake", "vet-near", "vet-far", "forest"]);
  });
});
