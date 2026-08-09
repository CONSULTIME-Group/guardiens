import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter, Link, Routes, Route } from "react-router-dom";
import i18n from "@/i18n";
import LangUrlSync from "@/components/LangUrlSync";
import { NAV_DEFS } from "@/components/layout/PublicHeader";
import { getStoredLang } from "@/lib/lang";

/**
 * Garde-fou de bout en bout sur la persistance de la langue.
 *
 * On ne teste plus la présence de `?lang` sur les liens : les liens nus sont
 * désormais le comportement attendu. Ce qui doit tenir, c'est que la langue
 * survive à chaque navigation du routeur, puis à un rechargement complet.
 */

const Harness = ({ entry }: { entry: string }) => (
  <MemoryRouter initialEntries={[entry]}>
    <LangUrlSync />
    <nav aria-label="publique">
      {NAV_DEFS.map((l) => (
        <Link key={l.to} to={l.to}>
          {l.key}
        </Link>
      ))}
      <Link to="/guides/lyon">guide-ville</Link>
    </nav>
    <Routes>
      <Route path="*" element={<p>page</p>} />
    </Routes>
  </MemoryRouter>
);

const htmlLang = () => document.documentElement.getAttribute("lang");

describe("persistance de la langue à travers la navigation", () => {
  beforeEach(async () => {
    cleanup();
    window.localStorage.clear();
    document.documentElement.setAttribute("lang", "fr");
    await i18n.changeLanguage("fr");
  });

  it("reste en anglais après chaque clic de la navigation publique", async () => {
    render(<Harness entry="/?lang=en" />);
    await waitFor(() => expect(htmlLang()).toBe("en"));
    expect(getStoredLang()).toBe("en");

    for (const def of NAV_DEFS) {
      fireEvent.click(screen.getByRole("link", { name: def.key }));
      await waitFor(() => expect(htmlLang()).toBe("en"));
    }
    fireEvent.click(screen.getByRole("link", { name: "guide-ville" }));
    await waitFor(() => expect(htmlLang()).toBe("en"));
  });

  it("retrouve l'anglais après un rechargement complet sur une route profonde sans paramètre", async () => {
    window.localStorage.setItem("guardiens.lang", "en");
    // Rechargement : nouveau montage, aucune querystring, langue courante fr.
    render(<Harness entry="/guides/lyon" />);
    await waitFor(() => expect(htmlLang()).toBe("en"));
  });

  it("repasse en français quand un lien explicite ?lang=fr arrive après un choix anglais", async () => {
    window.localStorage.setItem("guardiens.lang", "en");
    await i18n.changeLanguage("en");
    document.documentElement.setAttribute("lang", "en");

    render(<Harness entry="/?lang=fr" />);
    await waitFor(() => expect(htmlLang()).toBe("fr"));
    expect(getStoredLang()).toBe("fr");
  });
});
