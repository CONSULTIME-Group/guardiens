import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { EntraideFaq, EntraideHubIntro, filterPublicHelpers } from "../EntraideHub";

vi.mock("@/components/missions/ExchangeHowItWorks", () => ({
  default: () => <section aria-label="Comment ça marche">Comment ça marche</section>,
}));

const renderContent = (isAuthenticated: boolean) => {
  const onNeed = vi.fn();
  const onHelp = vi.fn();
  render(
    <MemoryRouter>
      <EntraideHubIntro isAuthenticated={isAuthenticated} onNeed={onNeed} onHelp={onHelp} />
      <EntraideFaq />
    </MemoryRouter>,
  );
  return { onNeed, onHelp };
};

describe("EntraideHub, contenu explicite", () => {
  it("présente le modèle complet aux visiteurs sans compte", () => {
    const { onNeed, onHelp } = renderContent(false);
    expect(screen.getByRole("heading", { name: /Et si, à quelques kilomètres/ })).toBeInTheDocument();
    expect(screen.getByText(/Arroser quelques plantes. Nourrir un chat./)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Concrètement" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Comment ça marche" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Questions fréquentes" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Faut-il payer pour utiliser l'Entraide ?" }));
    expect(screen.getByText("L'Entraide est ouverte à tous les membres, pour 0 €. Vous convenez ensemble d'un service ou d'une attention.")).toBeInTheDocument();
    expect(screen.queryByText("Résiliable à tout moment")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "J'ai besoin d'un coup de main" }));
    fireEvent.click(screen.getByRole("button", { name: "Je veux bien donner un coup de main" }));
    expect(onNeed).toHaveBeenCalledOnce();
    expect(onHelp).toHaveBeenCalledOnce();
  });

  it("conserve le bouton membre et masque Comment ça marche", () => {
    renderContent(true);
    expect(screen.getByRole("button", { name: "J'ai besoin d'un coup de main" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Comment ça marche" })).not.toBeInTheDocument();
  });

  it("recherche instantanément dans le prénom, la ville et le coup de main", () => {
    const helpers = [
      { id: "1", first_name: "Camille", avatar_url: null, city: "Lyon", latitude_approx: null, longitude_approx: null, helps_with: "Arroser les plantes" },
      { id: "2", first_name: "Alex", avatar_url: null, city: "Annecy", latitude_approx: null, longitude_approx: null, helps_with: "Monter un meuble" },
    ];
    expect(filterPublicHelpers(helpers, "plantes").map((helper) => helper.id)).toEqual(["1"]);
    expect(filterPublicHelpers(helpers, "annecy").map((helper) => helper.id)).toEqual(["2"]);
  });

  it("garde un JSON-LD Person sans coordonnées", async () => {
    const source = await import("../EntraideHub?raw");
    expect(source.default).toContain('"@type": "Person"');
    expect(source.default).not.toContain('"latitude"');
    expect(source.default).not.toContain('"longitude"');
    expect(source.default).not.toContain('"@type": "Offer"');
  });
});