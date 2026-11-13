/**
 * Lot SORT11 (13/11/2026) : les trois onglets de la rubrique « Entraide &
 * sorties » partagent le même en-tête (demande de Jérémie : « un peu
 * d'harmonie », maquettes H1 à H6 du canevas Claude Design).
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { helpersPulseLine } from "@/lib/entraideIdeas";
import { OUTING_COPY } from "@/lib/outings";

const read = (path: string) => readFileSync(path, "utf8");
const PAGES = ["src/pages/EntraideHub.tsx", "src/pages/Sorties.tsx", "src/pages/ProjetsListing.tsx"];

describe("SORT11, même squelette", () => {
  it("les trois pages posent la même enveloppe, les onglets, l'en-tête et les idées", () => {
    for (const page of PAGES) {
      const src = read(page);
      expect(src, page).toContain("HUB_SHELL");
      expect(src, page).toContain("<div className={HUB_TABS}><EntraideSortiesTabs");
      expect(src, page).toContain("<HubHeader");
      expect(src, page).toContain("<HubSettingsLine");
    }
    expect(read("src/pages/Sorties.tsx")).toContain("<HubIdeas");
    expect(read("src/pages/ProjetsListing.tsx")).toContain("<HubIdeas");
    expect(read("src/components/entraide/EntraideIdeas.tsx")).toContain("<HubIdeas");
  });

  it("ordre commun : onglets, en-tête, idées, liste", () => {
    for (const [page, markers] of [
      ["src/pages/Sorties.tsx", ["<EntraideSortiesTabs", "<HubHeader", "<HubIdeas", "Sorties à venir"]],
      ["src/pages/ProjetsListing.tsx", ["<EntraideSortiesTabs", "<HubHeader", "<HubIdeas", "Chantiers ouverts"]],
      ["src/pages/EntraideHub.tsx", ["<EntraideSortiesTabs active", "<EntraideHubIntro\n", "<EntraideIdeas", "Besoins ouverts"]],
    ] as const) {
      const src = read(page);
      const positions = markers.map((marker) => src.indexOf(marker));
      for (const position of positions) expect(position, page).toBeGreaterThan(-1);
      expect([...positions].sort((a, b) => a - b), page).toEqual(positions);
    }
  });

  it("titres courts et parallèles", () => {
    expect(read("src/pages/EntraideHub.tsx")).toContain('title="Entraide près de chez vous"');
    expect(OUTING_COPY.sortiesTitle).toBe("Sorties près de chez vous");
    expect(read("src/pages/ProjetsListing.tsx")).toContain('title="Chantiers près de chez vous"');
    // Le titre s'équilibre sur deux lignes quand l'écran est étroit : jamais un mot seul.
    expect(read("src/components/outings/HubHeader.tsx")).toContain("[text-wrap:balance]");
  });

  it("le chiffre tient en une ligne courte", () => {
    expect(helpersPulseLine(86, "Lyon")).toBe("86 personnes prêtes à aider autour de Lyon");
    expect(helpersPulseLine(1, "Lyon")).toBe("1 personne prête à aider autour de Lyon");
    expect(helpersPulseLine(12, "vous")).toBe("12 personnes prêtes à aider autour de chez vous");
    expect(helpersPulseLine(792, null)).toBe("792 personnes prêtes à aider sur Guardiens");
    expect(helpersPulseLine(0, "Lyon")).toBeNull();
  });

  it("réglages repliés sur une ligne, cible de 44 px, détail annoncé", () => {
    const header = read("src/components/outings/HubHeader.tsx");
    expect(header).toContain("aria-expanded={open}");
    expect(header).toContain("min-h-11");
    expect(header).toContain('hidden={!open}');
  });

  it("une idée de sortie ouvre le formulaire sur l'activité, une idée de chantier sur son titre", () => {
    expect(read("src/pages/Sorties.tsx")).toContain("/sorties/proposer?categorie=");
    expect(read("src/pages/SortieCreate.tsx")).toContain('searchParams.get("categorie")');
    expect(read("src/pages/ProjetsListing.tsx")).toContain("/projets/publier?titre=");
  });

  it("lot SORT12 : les chantiers s'affichent dans la même carte en ligne, deux colonnes à l'ordinateur", () => {
    const page = read("src/pages/ProjetsListing.tsx");
    expect(page).toContain("<ProjetRow key={p.id} projet={p} />");
    expect(page).toContain('className="grid gap-3 md:grid-cols-2"');
    expect(read("src/pages/Sorties.tsx")).toContain('className="grid gap-3 md:grid-cols-2"');
    const row = read("src/components/outings/ProjetRow.tsx");
    const card = read("src/components/outings/OutingCard.tsx");
    const shell = 'className="relative flex gap-3.5 rounded-2xl border border-border bg-card p-3.5"';
    expect(row).toContain(shell);
    expect(card).toContain(shell);
    expect(row).not.toMatch(/[—–]/);
  });

  it("ponctuation et vocabulaire", () => {
    for (const file of [...PAGES, "src/components/outings/HubHeader.tsx"]) {
      expect(read(file), file).not.toMatch(/[—–]/);
    }
    expect(read("src/components/outings/HubHeader.tsx")).not.toMatch(/voisin/i);
  });
});
