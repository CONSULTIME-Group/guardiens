/**
 * Lien contextuel vers la fiche de race depuis « Votre famille » (25/08/2026).
 *
 * Règle non négociable : jamais de lien mort. Le lien n'apparaît que si la
 * race est renseignée ET qu'une fiche existe réellement, avec la même
 * résolution que PetAdviceSection (breed_profiles, slug, route /races).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: (_col: string, species: string) =>
          Promise.resolve({
            data: species === "dog" ? [{ breed: "berger australien" }] : [],
          }),
      }),
    }),
  },
}));

vi.mock("@/components/pets/PetsEditor", () => ({
  default: () => <div data-testid="pets-editor" />,
}));

import OwnerFamilySection from "@/components/dashboard/owner/OwnerFamilySection";
import type { Pet } from "@/components/dashboard/owner/types";

const pet = (extra: Partial<Pet> = {}): Pet => ({
  id: "p1",
  name: "Rex",
  species: "dog",
  breed: "Berger Australien",
  age: 3,
  photo_url: null,
  property_id: "prop1",
  ...extra,
});

const renderSection = (pets: Pet[]) =>
  render(
    <MemoryRouter>
      <OwnerFamilySection
        pets={pets}
        propertyIds={["prop1"]}
        onPetsChanged={() => {}}
        getNextSitForPet={() => undefined}
      />
    </MemoryRouter>,
  );

describe("Votre famille, lien vers la fiche de race", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("affiche le lien quand la race a une fiche publiée, avec la bonne URL", async () => {
    renderSection([pet()]);
    const link = await screen.findByRole("link", { name: /race de Rex/i });
    expect(link).toHaveAttribute("href", "/races/dog-berger-australien");
    expect(link.textContent).toContain("Le guide du Berger Australien");
  });

  it("n'affiche aucun lien quand la race est absente", async () => {
    renderSection([pet({ breed: null })]);
    await waitFor(() => expect(screen.getByText("Rex")).toBeInTheDocument());
    expect(screen.queryByRole("link", { name: /guide/i })).not.toBeInTheDocument();
  });

  it("n'affiche aucun lien quand la race n'a pas de fiche", async () => {
    renderSection([pet({ breed: "Race inventée du dimanche" })]);
    await waitFor(() => expect(screen.getByText("Rex")).toBeInTheDocument());
    expect(screen.queryByRole("link", { name: /guide/i })).not.toBeInTheDocument();
  });

  it("n'affiche aucun lien pour une espèce sans catalogue de fiches", async () => {
    renderSection([pet({ species: "fish", breed: "Poisson rouge" })]);
    await waitFor(() => expect(screen.getByText("Rex")).toBeInTheDocument());
    expect(screen.queryByRole("link", { name: /guide/i })).not.toBeInTheDocument();
  });

  it("le clic sur le lien race n'ouvre pas l'éditeur, le clic sur la tuile l'ouvre", async () => {
    renderSection([pet()]);
    const link = await screen.findByRole("link", { name: /race de Rex/i });
    fireEvent.click(link);
    expect(screen.queryByTestId("pets-editor")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Modifier Rex" }));
    await waitFor(() =>
      expect(screen.getByTestId("pets-editor")).toBeInTheDocument(),
    );
  });

  it("le lien n'est jamais imbriqué dans le bouton d'édition", async () => {
    renderSection([pet()]);
    const link = await screen.findByRole("link", { name: /race de Rex/i });
    expect(link.closest("button")).toBeNull();
  });
});
