import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { EntraideFaq, EntraideHubIntro } from "../EntraideHub";

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
    expect(screen.getByText("L'Entraide est ouverte à tous les membres. Vous convenez ensemble d'un service ou d'une attention en retour.")).toBeInTheDocument();
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

  it("masque la phrase de disponibilité vide sur la carte uniquement", async () => {
    const source = await import("@/components/entraide/EntraideCards?raw");
    expect(source.default).toContain("compact ? (");
    expect(source.default).toContain("helper.helps_with?.trim() &&");
    expect(source.default).toContain('helper.helps_with?.trim() || "Disponible pour un coup de main"');
  });

  it("publie un JSON-LD limité à la FAQ, sans fiche Person", async () => {
    const source = await import("../EntraideHub?raw");
    expect(source.default).not.toContain('"@type": "Person"');
    expect(source.default).not.toContain('"latitude"');
    expect(source.default).not.toContain('"longitude"');
    expect(source.default).not.toContain('"@type": "Offer"');
  });
});