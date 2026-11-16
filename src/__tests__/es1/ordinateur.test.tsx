/**
 * Lot ES1 (16/11/2026, conseil claude/conseil/2026-11-16-conseil-entraide-sorties-hub.md,
 * maquette Claude Design « Entraide & sorties, ordinateur et accueil, avant / après »,
 * « je valide les maquettes, go » de Jérémie) : la règle du téléphone (un geste,
 * puis la liste) vaut à l'ordinateur, sans aucun bloc rendu deux fois.
 */
import { readFileSync } from "node:fs";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { HUB_SHELL, HubBody, HubIdeas, HubWhy } from "@/components/outings/HubHeader";
import { ACTIVE_WINDOW_DAYS, activeHelpersLabel } from "@/lib/entraideIdeas";

const read = (path: string) => readFileSync(path, "utf8");
const PAGES = ["src/pages/EntraideHub.tsx", "src/pages/Sorties.tsx", "src/pages/ProjetsListing.tsx"];

describe("ES1, composants", () => {
  it("corps commun : avant, liste, après dans un seul arbre ; colonne de droite à partir de 1 024 px", () => {
    render(
      <MemoryRouter>
        <HubBody before={<p>mode</p>} list={<p>liste</p>} after={<p>idées</p>} />
      </MemoryRouter>,
    );
    const body = screen.getByTestId("hub-body");
    expect(body.className).toContain("lg:grid-cols-[minmax(0,1fr)_320px]");
    expect([...body.children].map((node) => node.getAttribute("data-testid"))).toEqual(["hub-body-before", "hub-body-list", "hub-body-after"]);
    expect(screen.getByTestId("hub-body-list").className).toContain("lg:col-start-1 lg:row-span-2");
    expect(screen.getByTestId("hub-body-before").className).toContain("lg:col-start-2 lg:row-start-1");
    expect(screen.getByTestId("hub-body-after").className).toContain("lg:col-start-2 lg:row-start-2");
  });

  it("le pourquoi et les idées ne sont jamais masqués selon la largeur", () => {
    render(
      <MemoryRouter>
        <HubWhy />
        <HubIdeas id="a" ideas={[]} onPick={() => undefined} />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("hub-why").className).not.toMatch(/\bhidden\b/);
    expect(screen.getByTestId("hub-ideas").className).not.toMatch(/\bhidden\b/);
  });

  it("enveloppe élargie à 1 152 px pour la colonne de droite", () => {
    expect(HUB_SHELL).toContain("max-w-6xl");
  });

  it("chiffre des personnes actives sur 30 jours (décision 5)", () => {
    expect(ACTIVE_WINDOW_DAYS).toBe(30);
    expect(activeHelpersLabel(1)).toBe("personne active ce mois-ci");
    expect(activeHelpersLabel(275)).toBe("personnes actives ce mois-ci");
  });
});

describe("ES1, pages", () => {
  it("chaque onglet : une seule fois les idées et le pourquoi, le pourquoi sous la liste, réglages en ligne", () => {
    for (const page of PAGES) {
      const src = read(page);
      expect(src, page).toContain("<HubBody");
      expect(src.split("<HubWhy />").length - 1, page).toBe(1);
      expect(src, page).not.toContain("placement=");
      expect(src, page).not.toContain("<HubSettings>");
      expect(src.indexOf("<HubWhy />"), page).toBeGreaterThan(src.indexOf("<HubBody"));
      expect(src.indexOf("<HubWhy />"), page).toBeLessThan(src.indexOf("<HubArticles"));
    }
    expect(read("src/pages/EntraideHub.tsx").split("<EntraideIdeas").length - 1).toBe(1);
  });

  it("Entraide : un seul bouton plein, la phrase de l'ordinateur définit l'onglet", () => {
    const hub = read("src/pages/EntraideHub.tsx");
    expect(hub).not.toContain('variant="outline" className="hidden h-[52px]');
    expect(hub).toContain("Des coups de main entre gens du coin, gratuits entre membres");
    expect(hub).toContain("after={<EntraideIdeas onPick={pickIdea} />}");
    expect(hub).toContain("before={!isAuthenticated ? <EntraideHowItWorks /> : undefined}");
  });
});
