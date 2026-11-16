import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { EntraideFaq, EntraideHowItWorks, EntraideHubIntro } from "../EntraideHub";

vi.mock("@/components/missions/ExchangeHowItWorks", () => ({
  default: () => <section aria-label="Comment ça marche">Comment ça marche</section>,
}));

const renderContent = (showHelp: boolean, activeCount: number | null = null) => {
  const onNeed = vi.fn();
  const onHelp = vi.fn();
  render(
    <MemoryRouter>
      <EntraideHubIntro activeCount={activeCount} showHelp={showHelp} onNeed={onNeed} onHelp={onHelp} />
      <EntraideHowItWorks />
      <EntraideFaq />
    </MemoryRouter>,
  );
  return { onNeed, onHelp };
};

describe("EntraideHub, contenu explicite (lot E4)", () => {
  it("présente le modèle complet aux visiteurs sans compte", () => {
    const { onNeed, onHelp } = renderContent(true);
    expect(screen.getByRole("heading", { level: 1, name: "Entraide près de chez vous" })).toBeInTheDocument();
    // Lot ES1 : la phrase de l'ordinateur définit l'onglet, la phrase courte reste au téléphone.
    expect(screen.getByText(/Des coups de main entre gens du coin, gratuits entre membres/)).toBeInTheDocument();
    expect(screen.getByTestId("hub-phrase-short")).toHaveTextContent("Un potager, des courses, un trajet");
    expect(screen.getByText(/dix à la fois/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Comment ça se passe" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Questions fréquentes" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Faut-il payer pour utiliser l'Entraide ?" }));
    expect(screen.getByText(/^Guardiens est gratuit\. Entre membres/)).toBeInTheDocument();
    expect(screen.queryByText("Résiliable à tout moment")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Demander un coup de main" }));
    // Lot ES1 : « Proposer mon aide » est un seul lien, à toutes les largeurs.
    const help = screen.getAllByRole("button", { name: "Proposer mon aide" });
    expect(help).toHaveLength(1);
    expect(help[0]).toHaveAttribute("data-testid", "entraide-help-link");
    fireEvent.click(help[0]);
    expect(onNeed).toHaveBeenCalledOnce();
    expect(onHelp).toHaveBeenCalledOnce();
  });

  it("une personne qui aide déjà voit un seul bouton, la ville et le nombre", () => {
    renderContent(false, 78);
    expect(screen.getByRole("button", { name: "Demander un coup de main" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Proposer mon aide" })).not.toBeInTheDocument();
    // Lot ES1 (décision 5 du conseil du 16/11) : une ligne, les personnes actives ce mois-ci, lien vers les personnes.
    const stat = screen.getByTestId("hub-stat-line");
    expect(stat).toHaveTextContent("78 personnes actives ce mois-ci");
    expect(stat.querySelector("a")).toHaveAttribute("href", "#entraide-helpers-title");
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