import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { MemoryRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import i18n from "@/i18n";
import LangUrlSync from "@/components/LangUrlSync";
import { getStoredLang } from "@/lib/lang";

/**
 * Navigation interne en contexte monolingue : une visite arrivée par un lien
 * `?lang=en` (ancienne URL encore connue de Google) rend le français, et les
 * pages suivantes restent en français. Aucun lien interne ne porte le
 * paramètre `lang` : il n'existe plus qu'une seule langue.
 */
const NAV_DEFS = [
  { to: "/annonces", label: "Voir les annonces" },
  { to: "/petites-missions", label: "Voir les petites missions" },
  { to: "/", label: "Retour accueil" },
] as const;

const Page = ({ to, label }: { to?: string; label?: string }) => {
  const location = useLocation();
  return (
    <div>
      <span data-testid="path">{location.pathname}</span>
      {to && label ? <Link to={to}>{label}</Link> : null}
    </div>
  );
};

const renderAt = (initial: string) =>
  render(
    <MemoryRouter initialEntries={[initial]}>
      <LangUrlSync />
      <Routes>
        <Route path="/" element={<Page to="/annonces" label="Voir les annonces" />} />
        <Route path="/annonces" element={<Page to="/petites-missions" label="Voir les petites missions" />} />
        <Route path="/petites-missions" element={<Page to="/" label="Retour accueil" />} />
      </Routes>
    </MemoryRouter>,
  );

describe("navigation interne monolingue", () => {
  beforeEach(async () => {
    window.localStorage.clear();
    await i18n.changeLanguage("fr");
    document.documentElement.setAttribute("lang", "fr");
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it("arrivée par ?lang=en : français immédiat, conservé à chaque clic", async () => {
    renderAt("/?lang=en");
    await waitFor(() => expect(i18n.language).toBe("fr"));
    expect(document.documentElement.getAttribute("lang")).toBe("fr");

    for (const step of NAV_DEFS) {
      fireEvent.click(screen.getByText(step.label));
      await waitFor(() => expect(screen.getByTestId("path").textContent).toBe(step.to));
      expect(i18n.language).toBe("fr");
      expect(document.documentElement.getAttribute("lang")).toBe("fr");
    }
    expect(getStoredLang()).toBe("fr");
  });

  it("aucun lien interne ne porte le paramètre lang", () => {
    renderAt("/");
    for (const link of screen.getAllByRole("link")) {
      expect(link.getAttribute("href") ?? "").not.toContain("lang=");
    }
  });
});
