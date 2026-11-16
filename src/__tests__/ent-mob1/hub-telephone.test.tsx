/**
 * Lot ENT-MOB1 (16/11/2026, maquette « Entraide mobile, avant / après »,
 * « nettement mieux, c'est parfait, go » de Jérémie) : sous 768 px, les
 * trois onglets de la rubrique ouvrent sur un geste puis la liste.
 * Lot ES1 (même jour) : la règle s'étend à l'ordinateur, voir src/__tests__/es1/.
 * Restent ici les garanties propres au téléphone.
 */
import { readFileSync } from "node:fs";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { HubHeader, HubSettingsLine, HubStat } from "@/components/outings/HubHeader";
import { OUTING_COPY } from "@/lib/outings";

const read = (path: string) => readFileSync(path, "utf8");
const PAGES = ["src/pages/EntraideHub.tsx", "src/pages/Sorties.tsx", "src/pages/ProjetsListing.tsx"];

describe("ENT-MOB1, composants", () => {
  it("le chiffre : une ligne courte avec le geste second au bout", () => {
    render(
      <MemoryRouter>
        <HubStat value={86} label="personnes actives ce mois-ci" href="#x" aside={<button type="button">Proposer mon aide</button>} />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("hub-stat-line").textContent).toBe("86 personnes actives ce mois-ciProposer mon aide");
  });

  it("les réglages : une ligne de 44 px", () => {
    render(
      <MemoryRouter>
        <HubSettingsLine summary="Autour de Lyon, 30 km" action="Changer" onClick={() => undefined} expanded={false} />
      </MemoryRouter>,
    );
    const line = screen.getByTestId("hub-settings-line");
    expect(line.className).toContain("min-h-11");
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
});

describe("ENT-MOB1, pages", () => {
  it("chaque onglet : fil d'Ariane réservé à 768 px et plus, phrase courte", () => {
    for (const page of PAGES) {
      const src = read(page);
      expect(src, page).toMatch(/<div className="hidden md:block"><PageBreadcrumb /);
      expect(src, page).toContain("phraseShort=");
    }
  });

  it("textes courts sans tiret long", () => {
    expect(OUTING_COPY.sortiesIntroShort).toBe("Une belote, une balade : proposez un moment, les membres proches s'inscrivent.");
    for (const file of [...PAGES, "src/components/outings/HubHeader.tsx", "src/lib/outings.ts"]) {
      expect(read(file), file).not.toMatch(/[—–]/);
    }
  });
});
