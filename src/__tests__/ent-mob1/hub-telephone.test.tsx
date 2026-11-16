/**
 * Lot ENT-MOB1 (16/11/2026, maquette « Entraide mobile, avant / après »,
 * « nettement mieux, c'est parfait, go » de Jérémie) : sous 768 px, les
 * trois onglets de la rubrique ouvrent sur un geste puis la liste.
 */
import { readFileSync } from "node:fs";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { HubHeader, HubIdeas, HubSettings, HubSettingsLine, HubStat, HubWhy } from "@/components/outings/HubHeader";
import { OUTING_COPY } from "@/lib/outings";

const read = (path: string) => readFileSync(path, "utf8");
const PAGES = ["src/pages/EntraideHub.tsx", "src/pages/Sorties.tsx", "src/pages/ProjetsListing.tsx"];

describe("ENT-MOB1, composants", () => {
  it("le chiffre : bloc à partir de 768 px, ligne courte avec geste second au téléphone", () => {
    render(
      <MemoryRouter>
        <HubStat value={86} label="personnes prêtes à aider autour de Lyon" mobileLabel="personnes prêtes à aider" href="#x" action="Les voir" aside={<button type="button">Proposer mon aide</button>} />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("hub-stat").className).toContain("hidden");
    expect(screen.getByTestId("hub-stat").className).toContain("md:flex");
    const line = screen.getByTestId("hub-stat-line");
    expect(line.className).toContain("md:hidden");
    expect(line.textContent).toBe("86 personnes prêtes à aiderProposer mon aide");
  });

  it("les réglages : pastilles à partir de 768 px, une ligne de 44 px au téléphone", () => {
    render(
      <MemoryRouter>
        <HubSettings><span>pastille</span></HubSettings>
        <HubSettingsLine summary="Autour de Lyon, 30 km" action="Changer" onClick={() => undefined} expanded={false} />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("hub-settings").className).toContain("hidden");
    const line = screen.getByTestId("hub-settings-line");
    expect(line.className).toContain("min-h-11");
    expect(line.className).toContain("md:hidden");
    expect(line.getAttribute("aria-expanded")).toBe("false");
    expect(line.textContent).toBe("Autour de Lyon, 30 kmChanger");
  });

  it("phrase courte au téléphone, phrase entière à partir de 768 px", () => {
    render(
      <MemoryRouter>
        <HubHeader title="T" phrase="Phrase longue." phraseShort="Courte." actions={null} />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("hub-phrase-short").className).toBe("md:hidden");
    expect(screen.getByText("Phrase longue.").className).toBe("hidden md:inline");
  });

  it("le pourquoi et les idées : en tête à partir de 768 px, en fin de page au téléphone", () => {
    render(
      <MemoryRouter>
        <HubWhy />
        <HubWhy placement="end" />
        <HubIdeas id="a" ideas={[]} onPick={() => undefined} />
        <HubIdeas id="b" placement="end" ideas={[]} onPick={() => undefined} />
      </MemoryRouter>,
    );
    const [whyTop, whyEnd] = screen.getAllByTestId("hub-why");
    expect(whyTop.className).toContain("hidden md:flex");
    expect(whyEnd.className).toContain("flex md:hidden");
    const [ideasTop, ideasEnd] = screen.getAllByTestId("hub-ideas");
    expect(ideasTop.className).toContain("hidden md:block");
    expect(ideasEnd.className).toContain("md:hidden");
  });
});

describe("ENT-MOB1, pages", () => {
  it("chaque onglet : fil d'Ariane réservé à 768 px et plus, réglages en ligne, idées et pourquoi après la liste", () => {
    for (const page of PAGES) {
      const src = read(page);
      expect(src, page).toMatch(/<div className="hidden md:block"><PageBreadcrumb /);
      expect(src, page).toContain("<HubSettingsLine");
      expect(src, page).toContain('<HubWhy placement="end" />');
      expect(src, page).toContain('placement="end"');
      expect(src, page).toContain("phraseShort=");
      expect(src.indexOf('<HubWhy placement="end" />'), page).toBeLessThan(src.indexOf("<HubArticles"));
    }
    const hub = read("src/pages/EntraideHub.tsx");
    expect(hub.indexOf('<EntraideIdeas onPick={pickIdea} placement="end" />')).toBeGreaterThan(hub.indexOf('id="entraide-needs-title"'));
    expect(hub.indexOf('<EntraideIdeas onPick={pickIdea} placement="end" />')).toBeLessThan(hub.indexOf('id="entraide-helpers-title"'));
  });

  it("Entraide : un seul bouton plein au téléphone, « Proposer mon aide » en lien", () => {
    const hub = read("src/pages/EntraideHub.tsx");
    expect(hub).toContain('variant="outline" className="hidden h-[52px] rounded-2xl text-base sm:h-12 md:inline-flex" onClick={onHelp}>Proposer mon aide');
    expect(hub).toContain('data-testid="entraide-help-link"');
  });

  it("textes courts sans tiret long", () => {
    expect(OUTING_COPY.sortiesIntroShort).toBe("Une belote, une balade : proposez un moment, les membres proches s'inscrivent.");
    for (const file of [...PAGES, "src/components/outings/HubHeader.tsx", "src/lib/outings.ts"]) {
      expect(read(file), file).not.toMatch(/[—–]/);
    }
  });
});
