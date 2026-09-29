import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: vi.fn() } } }));

import { NotedView } from "@/pages/MaPeriode";
import OwnerDepartureAlmaCard, { departureCardVisible } from "@/components/dashboard/owner/OwnerDepartureAlmaCard";
import { computeReadiness, type DeparturePayload } from "@/lib/ownerDeparture";

const readiness = computeReadiness({
  city: "Lyon", latitude: 45.7, hasProperty: true, pets: [{ name: "Rex", species: "dog" }],
  galleryPhotoCount: 0, propertyPhotoCount: 0, draftStartDates: [], today: "2026-10-01",
});
const base = (o: Partial<DeparturePayload> = {}): DeparturePayload => ({
  ok: true, first_name: "Camille", city: "Lyon", pet_names: ["Rex"], readiness,
  nearby: { count: 12, sitters: [{ id: "s1", firstName: "Léa", distanceKm: 3 }] },
  period: "noel", answered_at: "2026-10-01T00:00:00Z", alma_state: "known", holdout: false, has_published: false, ...o,
});
const wrap = (el: React.ReactElement) => render(<MemoryRouter>{el}</MemoryRouter>);
const noDash = () => { expect(document.body.textContent).not.toMatch(/[\u2013\u2014]/); };

describe("Page C'est noté", () => {
  it("avec commune : titre, 60 %, gardiens proches, lien Noël prérempli", () => {
    wrap(<NotedView data={base()} />);
    expect(screen.getByText("C'est noté : Noël.")).toBeTruthy();
    expect(document.body.textContent).toContain("prête à 60 %");
    expect(screen.getByTestId("noted-nearby").textContent).toContain("12 gardiens à moins de 50 km de Lyon");
    expect(screen.getByText("Terminer mon annonce").closest("a")?.getAttribute("href")).toContain("debut=2026-12-19");
    noDash();
  });
  it("sans commune : invitation à ajouter la commune", () => {
    wrap(<NotedView data={base({ city: null, nearby: null })} />);
    expect(screen.getByTestId("noted-no-city")).toBeTruthy();
    noDash();
  });
  it("période plus tard", () => {
    wrap(<NotedView data={base({ period: "plus_tard", alma_state: "hidden" })} />);
    expect(screen.getByText("C'est noté.")).toBeTruthy();
    expect(screen.getByTestId("noted-later").textContent).toContain("Prenez votre temps.");
    expect(screen.getByTestId("noted-later").textContent).toContain("Votre réponse est enregistrée. Vous la retrouvez sur votre tableau de bord.");
    noDash();
  });
});

describe("Lot N7, /ma-periode", () => {
  it("annonce publiée à venir : « Voir mon annonce »", () => {
    wrap(<NotedView data={base({ upcoming_sit_id: "sit-1", has_published: true })} />);
    expect(screen.getByTestId("noted-see-sit").getAttribute("href")).toBe("/sits/sit-1");
    expect(screen.getByText("Voir mon annonce")).toBeTruthy();
  });
  it("aucune promesse de rappel daté", () => {
    wrap(<NotedView data={base({})} />);
    const t = document.body.textContent ?? "";
    for (const w of ["mi-novembre", "fin février", "mi-mai", "réécrit", "rappelle"]) expect(t).not.toContain(w);
    expect(t).toContain("Votre réponse est enregistrée.");
  });
});

describe("Carte Alma du dashboard", () => {
  it("état ask : cinq choix, clic enregistre", () => {
    const onPick = vi.fn();
    wrap(<OwnerDepartureAlmaCard data={base({ period: null, alma_state: "ask" })} onPick={onPick} />);
    expect(screen.getByTestId("owner-departure-card").dataset.state).toBe("ask");
    fireEvent.click(screen.getByText("Cet été"));
    expect(onPick).toHaveBeenCalledWith("ete");
  });
  it("état known : préparation affichée", () => {
    wrap(<OwnerDepartureAlmaCard data={base()} onPick={() => {}} />);
    expect(screen.getByTestId("owner-departure-card").dataset.state).toBe("known");
    expect(document.body.textContent).toContain("Votre annonce de Noël est prête à 60 %.");
    noDash();
  });
  it("état hidden, témoin, et disparition après publication", () => {
    expect(departureCardVisible(base({ alma_state: "hidden" }))).toBe(false);
    expect(departureCardVisible(base({ holdout: true }))).toBe(false);
    expect(departureCardVisible(base({ has_published: true }))).toBe(false);
    const { container } = wrap(<OwnerDepartureAlmaCard data={base({ has_published: true })} onPick={() => {}} />);
    expect(container.innerHTML).toBe("");
  });
});
