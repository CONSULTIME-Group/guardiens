/**
 * Lot J2b : /cgu et /cgs choisissent leur version selon la date de Paris
 * (src/config/legalVersions.ts), ?version= force la lecture d'une version
 * publiée, et aucun repère de relecture de l'arène ne subsiste.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

vi.mock("@/components/layout/PublicHeader", () => ({ default: () => null }));
vi.mock("@/components/layout/PublicFooter", () => ({ default: () => null }));

import Terms from "@/pages/Terms";
import Cgs from "@/pages/Cgs";
import { selectLegalPageVersion, legalVersionHeading } from "@/lib/legalPageVersion";
import { LEGAL_VERSIONS, versionInForce } from "@/config/legalVersions";

/** Midi à Paris, pour rester loin des changements de jour. */
const at = (day: string) => new Date(`${day}T10:00:00Z`);

const BEFORE = "2026-10-20"; // v9 et v3 publiées, pas encore en vigueur
const AFTER = "2026-11-20"; // v9 et v3 en vigueur

function renderAt(day: string, Page: () => JSX.Element, url: string) {
  vi.setSystemTime(at(day));
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Page />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const V8 = /Version 8, dernière mise à jour : 14 octobre 2026/;
const V9 = "Version 9, publiée le 16 octobre 2026, en vigueur le 16 novembre 2026. La version 8 reste applicable jusqu'à cette date.";
const V2 = /Version 2, dernière mise à jour : 14 octobre 2026/;
const V3 = "Version 3, publiée le 16 octobre 2026, en vigueur le 16 novembre 2026. La version 2 reste applicable jusqu'à cette date.";

describe("J2b · /cgu", () => {
  it("avant le 16/11/2026 : version 8 et encadré vers la version 9", () => {
    renderAt(BEFORE, Terms, "/cgu");
    expect(screen.getByText(V8)).toBeTruthy();
    expect(screen.queryByText(V9)).toBeNull();
    const note = screen.getByTestId("legal-version-notice");
    expect(note.textContent).toContain("Une nouvelle version des CGU entre en vigueur le 16 novembre 2026");
    const link = screen.getByRole("link", { name: "Lire la version 9" });
    expect(link.getAttribute("href")).toBe("/cgu?version=9");
  });

  it("après le 16/11/2026 : version 9 et lien discret vers la version 8", () => {
    renderAt(AFTER, Terms, "/cgu");
    expect(screen.getByText(V9)).toBeTruthy();
    expect(screen.queryByText(V8)).toBeNull();
    expect(screen.queryByText(/Une nouvelle version des CGU/)).toBeNull();
    const link = screen.getByRole("link", { name: "Version précédente (version 8)" });
    expect(link.getAttribute("href")).toBe("/cgu?version=8");
  });

  it("le jour d'entrée en vigueur (heure de Paris), la version 9 s'applique", () => {
    vi.setSystemTime(new Date("2026-11-15T23:30:00Z")); // 16/11 à 0 h 30 à Paris
    render(
      <MemoryRouter initialEntries={["/cgu"]}>
        <Terms />
      </MemoryRouter>,
    );
    expect(screen.getByText(V9)).toBeTruthy();
  });

  it("?version=9 force la version 9 avant son entrée en vigueur", () => {
    renderAt(BEFORE, Terms, "/cgu?version=9");
    expect(screen.getByText(V9)).toBeTruthy();
    expect(screen.queryByText(V8)).toBeNull();
    expect(screen.getByRole("link", { name: "Lire la version 8, en vigueur aujourd'hui" }).getAttribute("href")).toBe(
      "/cgu?version=8",
    );
  });

  it("?version=8 force la version 8 après l'entrée en vigueur de la version 9", () => {
    renderAt(AFTER, Terms, "/cgu?version=8");
    expect(screen.getByText(V8)).toBeTruthy();
    expect(screen.queryByText(V9)).toBeNull();
    expect(screen.getByTestId("legal-version-notice").textContent).toContain(
      "Cette version a été remplacée par la version 9, en vigueur depuis le 16 novembre 2026.",
    );
    expect(screen.getByRole("link", { name: "Lire la version en vigueur" }).getAttribute("href")).toBe("/cgu");
  });

  it("une version inconnue ou pas encore publiée laisse la version en vigueur", () => {
    renderAt(BEFORE, Terms, "/cgu?version=42");
    expect(screen.getByText(V8)).toBeTruthy();
    cleanup();
    renderAt("2026-10-15", Terms, "/cgu?version=9");
    expect(screen.getByText(V8)).toBeTruthy();
    expect(screen.queryByText(V9)).toBeNull();
  });

  it("la version 9 reprend le texte validé (articles clés)", () => {
    renderAt(AFTER, Terms, "/cgu");
    expect(screen.getByText("13 bis. Évolution, interruption et arrêt du service")).toBeTruthy();
    expect(screen.getByText("7.4 Aide aux devoirs")).toBeTruthy();
    expect(screen.getByText(/Guardiens est gratuit\s*: la diligence due par Guardiens/)).toBeTruthy();
    // Décision 3 retenue : acceptation expresse, la variante tacite est retirée.
    expect(document.body.textContent).toContain("le membre accepte la nouvelle version par une case à cocher");
    expect(document.body.textContent).not.toContain("qui poursuit l'usage de son compte après la date d'effet accepte");
  });
});

describe("J2b · /cgs", () => {
  it("avant le 16/11/2026 : version 2 et encadré vers la version 3", () => {
    renderAt(BEFORE, Cgs, "/cgs");
    expect(screen.getByText(V2)).toBeTruthy();
    expect(screen.queryByText(V3)).toBeNull();
    expect(screen.getByTestId("legal-version-notice").textContent).toContain(
      "Une nouvelle version des CGS entre en vigueur le 16 novembre 2026",
    );
    expect(screen.getByRole("link", { name: "Lire la version 3" }).getAttribute("href")).toBe("/cgs?version=3");
  });

  it("après le 16/11/2026 : version 3 et lien discret vers la version 2", () => {
    renderAt(AFTER, Cgs, "/cgs");
    expect(screen.getByText(V3)).toBeTruthy();
    expect(screen.queryByText(V2)).toBeNull();
    expect(screen.getByRole("link", { name: "Version précédente (version 2)" }).getAttribute("href")).toBe("/cgs?version=2");
  });

  it("?version=3 et ?version=2 forcent la version", () => {
    renderAt(BEFORE, Cgs, "/cgs?version=3");
    expect(screen.getByText(V3)).toBeTruthy();
    expect(screen.queryByText(V2)).toBeNull();
    cleanup();
    renderAt(AFTER, Cgs, "/cgs?version=2");
    expect(screen.getByText(V2)).toBeTruthy();
    expect(screen.queryByText(V3)).toBeNull();
  });

  it("la version 3 dit « Guardiens est gratuit » et laisse le chapitre Abonnement hors ligne", () => {
    renderAt(AFTER, Cgs, "/cgs");
    expect(screen.getByText("2. Guardiens est gratuit")).toBeTruthy();
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/Chapitre II|Abonnement|rétractation/);
  });
});

describe("J2b · calendrier et en-têtes", () => {
  it("en-têtes calculés depuis legalVersions.ts", () => {
    expect(legalVersionHeading("cgu", "9")).toBe(V9);
    expect(legalVersionHeading("cgs", "3")).toBe(V3);
  });

  it("confidentialité version 6 en vigueur dès sa publication, sans nouvelle acceptation", () => {
    const v6 = LEGAL_VERSIONS.find((v) => v.document === "privacy" && v.version === "6");
    expect(v6).toEqual({ document: "privacy", version: "6", publishedOn: "2026-10-16", effectiveOn: "2026-10-16", requiresReaccept: false });
    expect(versionInForce("privacy", "2026-10-16").version).toBe("6");
    expect(versionInForce("privacy", "2026-10-15").version).toBe("5");
  });

  it("selectLegalPageVersion suit la date de Paris", () => {
    expect(selectLegalPageVersion("cgu", null, "2026-11-15").shown.version).toBe("8");
    expect(selectLegalPageVersion("cgu", null, "2026-11-16").shown.version).toBe("9");
  });
});

describe("J2b · repères de relecture et rédaction", () => {
  const root = join(__dirname, "..", "..", "..");
  const files = [
    ...readdirSync(join(root, "src/components/legal")).map((f) => `src/components/legal/${f}`),
    "src/pages/Terms.tsx",
    "src/pages/Cgs.tsx",
    "src/pages/Privacy.tsx",
    "src/pages/MentionsLegales.tsx",
  ];

  for (const f of files) {
    it(`${f} : aucun repère « [négation nécessaire] » ni « [décision à confirmer »`, () => {
      const src = readFileSync(join(root, f), "utf8");
      expect(src).not.toContain("[négation nécessaire");
      expect(src).not.toContain("[décision à confirmer");
      expect(src).not.toContain("[Variante");
      expect(src).not.toMatch(/\[date de publication/);
    });
  }

  it("rendu : aucun repère dans les quatre versions affichées", () => {
    for (const [Page, url] of [
      [Terms, "/cgu?version=8"],
      [Terms, "/cgu?version=9"],
      [Cgs, "/cgs?version=2"],
      [Cgs, "/cgs?version=3"],
    ] as const) {
      renderAt(AFTER, Page, url);
      const text = document.body.textContent ?? "";
      expect(text, url).not.toContain("[négation nécessaire");
      expect(text, url).not.toContain("[décision à confirmer");
      cleanup();
    }
  });

  it("versions 9 et 3 : ni tiret long, ni vocabulaire proscrit", () => {
    for (const f of ["src/components/legal/TermsV9.tsx", "src/components/legal/CgsV3.tsx", "src/components/legal/LegalVersionNotice.tsx"]) {
      const src = readFileSync(join(root, f), "utf8");
      expect(src, f).not.toMatch(/[–—]/);
      expect(src, f).not.toMatch(/\bvoisin(e|s|age)?\b|\bà vie\b|pour toujours|petites? missions?|\boffert\b|sans engagement/i);
    }
  });
});
