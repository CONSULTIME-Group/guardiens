import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import LiveListingsStrip from "@/components/landing/LiveListingsStrip";

const fixture = vi.hoisted(() => ({ sits: [] as any[], missions: [] as any[], loading: false }));
vi.mock("@/hooks/useRecentPublishedSits", () => ({
  useRecentPublishedSits: () => ({ data: fixture.sits, isLoading: fixture.loading }),
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  from: () => {
    const chain: any = { select: () => chain, eq: () => chain, order: () => chain,
      limit: () => Promise.resolve({ data: fixture.missions }) };
    return chain;
  },
} }));

const sit = (id: string, latitude = 45.75) => ({
  id, slug: `garde-${id}`, title: `Garde ${id}`, city: "Lyon", start_date: null, end_date: null,
  cover_photo_url: null, daily_routine: "", owner: { latitude, longitude: 4.85 },
});
const mission = (id: string) => ({ id, slug: `besoin-${id}`, title: `Besoin ${id}`, city: "Lyon",
  date_needed: null, photos: [], latitude: 45.75, longitude: 4.85 });
const graph = (container: HTMLElement) => {
  const script = container.querySelector('script[type="application/ld+json"]');
  return script ? JSON.parse(script.textContent!) : null;
};
const visiblePaths = (container: HTMLElement) => Array.from(container.querySelectorAll('[data-testid="live-listings-list"] a')).map((a) => a.getAttribute("href"));
const schemaPaths = (container: HTMLElement) => graph(container)?.itemListElement.map((item: any) => new URL(item.url).pathname);

beforeEach(() => { fixture.sits = []; fixture.missions = []; fixture.loading = false; });
afterEach(cleanup);

describe("ItemList de l'accueil issu des vraies cartes", () => {
  it("déclare exactement les quatre gardes et deux besoins visibles, dans leur ordre", async () => {
    fixture.sits = Array.from({ length: 7 }, (_, i) => sit(String(i)));
    fixture.missions = Array.from({ length: 3 }, (_, i) => mission(String(i)));
    const { container } = render(<MemoryRouter><LiveListingsStrip /></MemoryRouter>);
    await waitFor(() => expect(visiblePaths(container)).toHaveLength(6));
    expect(schemaPaths(container)).toEqual(visiblePaths(container));
    expect(graph(container).numberOfItems).toBe(6);
    expect(graph(container).itemListElement.map((item: any) => item.name)).toEqual(
      Array.from(container.querySelectorAll('[data-testid="live-listings-list"] h3')).map((h) => h.textContent));
  });

  it("suit le tri par proximité après changement de ville", async () => {
    fixture.sits = [sit("loin", 48.85), sit("proche", 45.75), sit("autre", 47.5)];
    const { container, rerender } = render(<MemoryRouter><LiveListingsStrip /></MemoryRouter>);
    await waitFor(() => expect(visiblePaths(container)).toHaveLength(3));
    rerender(<MemoryRouter><LiveListingsStrip origin={{ lat: 45.75, lng: 4.85, city: "lyon" }} /></MemoryRouter>);
    expect(schemaPaths(container)).toEqual(visiblePaths(container));
    expect(schemaPaths(container)[0]).toBe("/annonces/garde-proche");
    expect(graph(container).name).toBe("En ce moment près de Lyon");
  });

  it("ne laisse aucun ItemList pendant le chargement ou après une liste vide", async () => {
    fixture.sits = [sit("1")]; fixture.loading = true;
    const { container, rerender } = render(<MemoryRouter><LiveListingsStrip /></MemoryRouter>);
    expect(graph(container)).toBeNull();
    fixture.loading = false;
    rerender(<MemoryRouter><LiveListingsStrip /></MemoryRouter>);
    await waitFor(() => expect(graph(container)?.numberOfItems).toBe(1));
    fixture.sits = [];
    rerender(<MemoryRouter><LiveListingsStrip /></MemoryRouter>);
    expect(graph(container)).toBeNull();
  });

  it("préserve les titres tout en neutralisant une fermeture de script dans le HTML sérialisé", async () => {
    fixture.sits = [{ ...sit("1"), title: '</script><img src=x onerror="alert(1)">' }];
    const { container } = render(<MemoryRouter><LiveListingsStrip /></MemoryRouter>);
    await waitFor(() => expect(graph(container)?.numberOfItems).toBe(1));
    expect(graph(container).itemListElement[0].name).toBe(fixture.sits[0].title);
    expect(container.querySelector('script[type="application/ld+json"]')!.innerHTML).not.toContain("</script>");
    expect(container.querySelector("img[onerror]")).toBeNull();
  });
});
