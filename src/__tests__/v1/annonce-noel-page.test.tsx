import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

// Lot V1 : page /annonce-noel/:token, parcours des écrans.

const invoke = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: (...a: unknown[]) => invoke(...a) },
    auth: { getSession: async () => ({ data: { session: null } }) },
    from: () => ({ insert: async () => ({}) }),
    storage: { from: () => ({ uploadToSignedUrl: async () => ({ error: null }) }) },
  },
}));

import AnnonceNoel from "@/pages/AnnonceNoel";

const TOKEN = "a".repeat(64);
const state = (o: Record<string, unknown> = {}) => ({
  ok: true, state: "valid", first_name: "Camille", city: "Draveil", has_city: true, variant: "logement",
  has_property: false, property_type: null, pets: [], pets_answered: false,
  dates: { start: "2026-12-19", end: "2027-01-03" }, dates_answered: false, questions: false,
  photo_count: 0, photo_url: null, published: false, draft: null,
  nearby: { count: 90, label: "90 gardiens à moins de 50 km de Draveil", sitters: [{ id: "s1", firstName: "Tom", distanceKm: 3 }] },
  ...o,
});

const open = (search = "") =>
  render(
    <MemoryRouter initialEntries={[`/annonce-noel/${TOKEN}${search}`]}>
      <Routes><Route path="/annonce-noel/:token" element={<AnnonceNoel />} /></Routes>
    </MemoryRouter>,
  );

const modes = () => invoke.mock.calls.map((c) => (c[1] as { body: { mode: string } }).body.mode);
const noDash = () => expect(document.body.textContent).not.toMatch(/[–—]/);

beforeEach(() => invoke.mockReset());

describe("Page de Noël", () => {
  it("sans logement : la question du logement", async () => {
    invoke.mockResolvedValue({ data: state(), error: null });
    open();
    expect(await screen.findByTestId("noel-step-logement")).toBeTruthy();
    expect(screen.getByTestId("noel-progress").textContent).toContain("1 sur 3");
    noDash();
  });

  it("?type=house depuis l'email : logement créé, puis les animaux", async () => {
    invoke
      .mockResolvedValueOnce({ data: state(), error: null })
      .mockResolvedValueOnce({ data: state({ has_property: true, property_type: "house", questions: true }), error: null });
    open("?type=house");
    expect(await screen.findByTestId("noel-step-pets")).toBeTruthy();
    expect(screen.getByText("Une maison, c'est noté")).toBeTruthy();
    expect(modes()).toEqual(["peek", "property"]);
    expect((invoke.mock.calls[1][1] as { body: { type: string } }).body.type).toBe("house");
  });

  it("animaux : chaque animal choisi a son prénom, puis les dates", async () => {
    invoke
      .mockResolvedValueOnce({ data: state({ has_property: true, property_type: "house", questions: true }), error: null })
      .mockResolvedValueOnce({ data: state({ has_property: true, property_type: "house", questions: true, pets_answered: true }), error: null });
    open();
    await screen.findByTestId("noel-step-pets");
    fireEvent.click(screen.getByText("Un chien"));
    fireEvent.change(screen.getByPlaceholderText("Prénom du chien"), { target: { value: "Rex" } });
    fireEvent.click(screen.getByText("Continuer"));
    expect(await screen.findByTestId("noel-step-dates")).toBeTruthy();
    expect((invoke.mock.calls[1][1] as { body: unknown }).body).toMatchObject({ mode: "pets", pets: [{ kind: "dog", name: "Rex" }] });
  });

  it("variante photo : droit à la photo, appareil ouvert directement", async () => {
    invoke.mockResolvedValue({ data: state({ variant: "photo", has_property: true, property_type: "house" }), error: null });
    open("?etape=photo");
    expect(await screen.findByTestId("noel-step-photo")).toBeTruthy();
    expect(screen.getByTestId("noel-camera").getAttribute("capture")).toBe("environment");
    expect(screen.getByText("Prendre une photo")).toBeTruthy();
    expect(screen.getByText("Choisir dans ma galerie")).toBeTruthy();
    noDash();
  });

  it("tout est là : l'annonce se prépare et « Publier mon annonce » mène à la fiche", async () => {
    const draft = { id: "sit-1", status: "draft", title: "Garde de Mila pendant les fêtes, à Draveil", start_date: "2026-12-19", end_date: "2027-01-03", text: "Départ pour les fêtes.", cover_photo_url: "https://x/p.jpg" };
    invoke
      .mockResolvedValueOnce({ data: state({ variant: "pret", has_property: true, property_type: "house", photo_count: 1, pets: [{ name: "mila", species: "dog" }] }), error: null })
      .mockResolvedValueOnce({ data: state({ variant: "pret", has_property: true, property_type: "house", photo_count: 1, pets: [{ name: "mila", species: "dog" }], draft }), error: null });
    open();
    expect(await screen.findByTestId("noel-step-ready")).toBeTruthy();
    expect(modes()).toEqual(["peek", "prepare"]);
    expect(document.body.textContent).toContain("Du 19 décembre au 3 janvier · Maison · Mila");
    expect(screen.getByTestId("noel-ready-nearby").textContent).toContain("90 gardiens à moins de 50 km la découvrent dès sa publication.");
    expect(screen.getByTestId("noel-publish").getAttribute("href")).toBe("/sits/sit-1?publier=1");
    expect(screen.getByText("Modifier le texte ou les dates").closest("a")?.getAttribute("href")).toBe("/sits/sit-1/edit");
    noDash();
  });

  it("sans commune : « Ajoutez votre commune »", async () => {
    const draft = { id: "sit-2", status: "draft", title: "Garde de ma maison pendant les fêtes", start_date: "2026-12-19", end_date: "2027-01-03", text: "x", cover_photo_url: null };
    invoke.mockResolvedValue({ data: state({ has_city: false, city: null, has_property: true, property_type: "apartment", photo_count: 1, draft, nearby: null }), error: null });
    open();
    expect(await screen.findByTestId("noel-ready-no-city")).toBeTruthy();
  });

  it("jeton expiré ou annonce déjà en ligne", async () => {
    invoke.mockResolvedValue({ data: { ok: false, state: "expired" }, error: null });
    const a = open();
    expect(await screen.findByTestId("noel-error")).toBeTruthy();
    a.unmount();
    invoke.mockReset();
    invoke.mockResolvedValue({ data: state({ published: true }), error: null });
    open();
    expect(await screen.findByTestId("noel-published")).toBeTruthy();
  });

  it("dates : d'autres dates demandent un départ et un retour valides", async () => {
    invoke.mockResolvedValue({ data: state({ has_property: true, questions: true, pets_answered: true }), error: null });
    open();
    await screen.findByTestId("noel-step-dates");
    fireEvent.click(screen.getByText("D'autres dates"));
    const btn = screen.getByText("Continuer").closest("button")!;
    expect(btn.disabled).toBe(true);
    fireEvent.click(screen.getByText("Noël, du 20 au 27 décembre"));
    await waitFor(() => expect(screen.getByText("Continuer").closest("button")!.disabled).toBe(false));
  });
});
