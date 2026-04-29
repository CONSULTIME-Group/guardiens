import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ContextualResources, { ContextualResourcesSkeleton } from "./ContextualResources";

const renderWithRouter = (ui: React.ReactElement) =>
  render(<MemoryRouter>{ui}</MemoryRouter>);

/**
 * Garantie structurelle : la section ContextualResources DOIT toujours rendre
 * exactement 3 cartes/items, quel que soit l'état (annonces/gardes), et ne
 * jamais retourner null — sinon le layout du dashboard saute.
 */
describe("ContextualResources", () => {
  const cases: Array<{ label: string; annoncesCount: number; gardesCount: number; expectedHeading: RegExp }> = [
    { label: "aucune annonce, aucune garde", annoncesCount: 0, gardesCount: 0, expectedHeading: /publier votre première annonce/i },
    { label: "annonce publiée mais aucune garde", annoncesCount: 1, gardesCount: 0, expectedHeading: /préparer votre première garde/i },
    { label: "annonces et gardes existantes", annoncesCount: 3, gardesCount: 5, expectedHeading: /optimiser vos prochaines gardes/i },
    // Cas limites
    { label: "valeurs très élevées", annoncesCount: 9999, gardesCount: 9999, expectedHeading: /optimiser vos prochaines gardes/i },
    { label: "valeurs négatives (défensif)", annoncesCount: -1, gardesCount: -5, expectedHeading: /préparer votre première garde/i },
  ];

  it.each(cases)(
    "rend toujours exactement 3 items et la section reste visible — $label",
    ({ annoncesCount, gardesCount, expectedHeading }) => {
      const { container } = renderWithRouter(
        <ContextualResources annoncesCount={annoncesCount} gardesCount={gardesCount} />
      );

      // Section structurelle présente
      const section = container.querySelector("section");
      expect(section).not.toBeNull();
      expect(section).toBeInTheDocument();

      // Heading attendu
      const heading = screen.getByRole("heading", { level: 2, name: expectedHeading });
      expect(heading).toBeInTheDocument();

      // Exactement 3 items dans la liste
      const list = screen.getByRole("list");
      const items = within(list).getAllByRole("listitem");
      expect(items).toHaveLength(3);

      // Exactement 3 liens vers /actualites/...
      const links = within(list).getAllByRole("link");
      expect(links).toHaveLength(3);
      links.forEach((link) => {
        expect(link.getAttribute("href")).toMatch(/^\/actualites\//);
      });
    }
  );

  it("ne retourne jamais null en mode chargement (skeleton structurel)", () => {
    const { container } = renderWithRouter(
      <ContextualResources annoncesCount={0} gardesCount={0} loading />
    );

    const section = container.querySelector("section");
    expect(section).not.toBeNull();
    expect(section).toHaveAttribute("aria-busy", "true");

    // Skeleton rend aussi 3 placeholders pour préserver la grille.
    // Le <ul> est aria-hidden (purement décoratif), donc on interroge le DOM
    // directement plutôt que via les rôles ARIA filtrés par testing-library.
    const items = section!.querySelectorAll("li");
    expect(items).toHaveLength(3);
  });

  it("ContextualResourcesSkeleton expose role=status pour les lecteurs d'écran", () => {
    const { container } = render(<ContextualResourcesSkeleton />);
    const section = container.querySelector("section");
    expect(section).not.toBeNull();
    expect(section).toHaveAttribute("role", "status");
    expect(section).toHaveAttribute("aria-live", "polite");
    expect(screen.getByText(/chargement des ressources contextuelles/i)).toBeInTheDocument();
  });

  it("chaque lien a un aria-label et un aria-describedby reliés au contenu", () => {
    renderWithRouter(<ContextualResources annoncesCount={0} gardesCount={0} />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(3);
    links.forEach((link) => {
      expect(link).toHaveAttribute("aria-label");
      const describedBy = link.getAttribute("aria-describedby");
      expect(describedBy).toBeTruthy();
      const desc = document.getElementById(describedBy!);
      expect(desc).not.toBeNull();
      expect(desc!.textContent?.length).toBeGreaterThan(0);
    });
  });
});
