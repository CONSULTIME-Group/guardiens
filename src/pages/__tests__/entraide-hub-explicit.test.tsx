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
    expect(screen.getByRole("heading", { level: 1, name: "Entraide et coups de main près de chez vous" })).toBeInTheDocument();
    expect(screen.getByText(/Arroser des plantes, nourrir un chat/)).toBeInTheDocument();
    expect(screen.queryByText(/Dix personnes/)).not.toBeInTheDocument();
    expect(screen.getByText(/aux membres disponibles près de chez vous/)).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Comment ça marche" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Questions fréquentes" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Faut-il payer pour utiliser l'Entraide ?" }));
    expect(screen.getByText(/^Non. L'Entraide est gratuite/)).toBeInTheDocument();
    expect(screen.queryByText("Résiliable à tout moment")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Demander de l'aide" }));
    fireEvent.click(screen.getByRole("button", { name: "Proposer mon aide" }));
    expect(onNeed).toHaveBeenCalledOnce();
    expect(onHelp).toHaveBeenCalledOnce();
  });

  it("conserve le bouton membre et masque Comment ça marche", () => {
    renderContent(true);
    expect(screen.getByRole("button", { name: "Demander de l'aide" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Comment ça marche" })).not.toBeInTheDocument();
  });

  it("masque la phrase de disponibilité vide, liste et carte", async () => {
    const source = await import("@/components/entraide/EntraideCards?raw");
    expect(source.default).toContain("helper.helps_with?.trim() &&");
    expect(source.default).not.toContain("Disponible pour un coup de main");
  });

  it("publie un JSON-LD limité à la FAQ, sans fiche Person", async () => {
    const source = await import("../EntraideHub?raw");
    expect(source.default).not.toContain('"@type": "Person"');
    expect(source.default).not.toContain('"latitude"');
    expect(source.default).not.toContain('"longitude"');
    expect(source.default).not.toContain('"@type": "Offer"');
  });
});