import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { EntraideFaq, EntraideHubIntro } from "../EntraideHub";

vi.mock("@/components/missions/ExchangeHowItWorks", () => ({
  default: () => <section aria-label="Comment ça marche">Comment ça marche</section>,
}));

const renderContent = (isAuthenticated: boolean) => {
  const onPublish = vi.fn();
  const onCategoryChange = vi.fn();
  render(
    <MemoryRouter>
      <EntraideHubIntro isAuthenticated={isAuthenticated} onPublish={onPublish} category="all" onCategoryChange={onCategoryChange} />
      <EntraideFaq />
    </MemoryRouter>,
  );
  return { onPublish, onCategoryChange };
};

describe("EntraideHub, contenu explicite", () => {
  it("présente le modèle complet aux visiteurs sans compte", () => {
    const { onPublish, onCategoryChange } = renderContent(false);
    expect(screen.getByText(/Un coup de main près de chez vous, contre un coup de main en retour/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Concrètement" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Comment ça marche" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Questions fréquentes" })).toBeInTheDocument();
    expect(screen.getByText("L'Entraide est ouverte à tous les membres, pour 0 €. Vous convenez ensemble d'un service ou d'une attention.")).toBeInTheDocument();
    expect(screen.queryByText("Résiliable à tout moment")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Promener un chien" }));
    expect(onCategoryChange).toHaveBeenCalledWith("animals");
    fireEvent.click(screen.getByRole("button", { name: "Demander ou proposer un coup de main" }));
    expect(onPublish).toHaveBeenCalledOnce();
  });

  it("conserve le bouton membre et masque Comment ça marche", () => {
    renderContent(true);
    expect(screen.getByRole("button", { name: "Publier" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Comment ça marche" })).not.toBeInTheDocument();
  });
});