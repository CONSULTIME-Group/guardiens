import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { EntraideFaq, EntraideHowItWorks, EntraideHubIntro } from "../EntraideHub";

vi.mock("@/components/missions/ExchangeHowItWorks", () => ({
  default: () => <section aria-label="Comment ça marche">Comment ça marche</section>,
}));

const renderContent = (showHelp: boolean, city: string | null = null, countLine: string | null = null) => {
  const onNeed = vi.fn();
  const onHelp = vi.fn();
  render(
    <MemoryRouter>
      <EntraideHubIntro city={city} countLine={countLine} showHelp={showHelp} onNeed={onNeed} onHelp={onHelp} />
      <EntraideHowItWorks />
      <EntraideFaq />
    </MemoryRouter>,
  );
  return { onNeed, onHelp };
};

describe("EntraideHub, contenu explicite (lot E4)", () => {
  it("présente le modèle complet aux visiteurs sans compte", () => {
    const { onNeed, onHelp } = renderContent(true);
    expect(screen.getByRole("heading", { level: 1, name: "Entraide et coups de main près de chez vous" })).toBeInTheDocument();
    expect(screen.getByText(/Le potager à arroser, les courses, un trajet/)).toBeInTheDocument();
    expect(screen.getByText(/dix à la fois/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Comment ça se passe" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Questions fréquentes" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Faut-il payer pour utiliser l'Entraide ?" }));
    expect(screen.getByText(/^Guardiens est gratuit\. Entre membres/)).toBeInTheDocument();
    expect(screen.queryByText("Résiliable à tout moment")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Demander un coup de main" }));
    fireEvent.click(screen.getByRole("button", { name: "Proposer mon aide" }));
    expect(onNeed).toHaveBeenCalledOnce();
    expect(onHelp).toHaveBeenCalledOnce();
  });

  it("une personne qui aide déjà voit un seul bouton, la ville et le nombre", () => {
    renderContent(false, "Lyon", "Autour de Lyon, 78 personnes sont prêtes à donner un coup de main.");
    expect(screen.getByRole("button", { name: "Demander un coup de main" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Proposer mon aide" })).not.toBeInTheDocument();
    expect(screen.getByText("Entraide · autour de Lyon")).toBeInTheDocument();
    expect(screen.getByText(/78 personnes sont prêtes/)).toBeInTheDocument();
  });

  it("aucune tournure négative dans la FAQ", async () => {
    const source = await import("../EntraideHub?raw");
    expect(source.default).not.toContain("Aucun argent ne circule");
    expect(source.default).not.toContain("sans argent");
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