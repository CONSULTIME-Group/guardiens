import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ProfileSidebar, { type SidebarSection } from "../ProfileSidebar";

const baseSection = (overrides: Partial<SidebarSection> = {}): SidebarSection => ({
  id: "mobility",
  num: 4,
  label: "Mobilité & Rayon",
  subtitle: "",
  missingCount: 0,
  complete: false,
  ...overrides,
});

const renderSidebar = (section: SidebarSection) =>
  render(
    <MemoryRouter>
      <ProfileSidebar
        firstName="Alice"
        city="Paris"
        completion={70}
        sections={[section]}
        activeSection={section.id}
        onSectionClick={() => {}}
        publicProfileUrl="/gardiens/123"
        role="sitter"
      />
    </MemoryRouter>
  );

describe("ProfileSidebar — affichage des champs manquants", () => {
  it("affiche la phrase « Il manque : … » quand un seul champ est manquant", () => {
    const section = baseSection({
      missingCount: 1,
      missingLabels: ["Permis ou véhicule"],
    });
    renderSidebar(section);

    // Au moins une occurrence de « Il manque : » (desktop + panneau mobile)
    const matches = screen.getAllByText(/Il manque :/i);
    expect(matches.length).toBeGreaterThanOrEqual(1);

    // Le label exact est présent
    expect(screen.getAllByText("Permis ou véhicule").length).toBeGreaterThanOrEqual(1);

    // Aucune liste à puces n'est rendue pour un seul champ manquant
    expect(document.querySelectorAll("ul").length).toBe(0);
  });

  it("affiche une liste à puces quand plusieurs champs sont manquants", () => {
    const labels = ["Permis ou véhicule", "Rayon d'intervention", "Moyens de transport"];
    const section = baseSection({
      missingCount: labels.length,
      missingLabels: labels,
    });
    renderSidebar(section);

    // Pas de phrase « Il manque : » quand il y a plusieurs champs
    expect(screen.queryByText(/Il manque :/i)).toBeNull();

    // Une liste <ul> est rendue (au minimum une, mobile + desktop)
    const lists = document.querySelectorAll("ul");
    expect(lists.length).toBeGreaterThanOrEqual(1);

    // Chaque label apparaît au moins une fois dans une liste
    for (const label of labels) {
      expect(screen.getAllByText(new RegExp(label)).length).toBeGreaterThanOrEqual(1);
    }

    // Vérifie qu'au moins un <li> contient un label attendu
    const firstList = lists[0];
    const items = within(firstList as HTMLElement).getAllByRole("listitem");
    expect(items.length).toBeGreaterThanOrEqual(2);
  });

  it("ne rend aucun encart de champs manquants quand la section est complète", () => {
    const section = baseSection({
      complete: true,
      missingCount: 0,
      missingLabels: [],
    });
    renderSidebar(section);

    expect(screen.queryByText(/Il manque :/i)).toBeNull();
    // Aucun <ul> de champs manquants
    expect(document.querySelectorAll("ul").length).toBe(0);
  });
});
