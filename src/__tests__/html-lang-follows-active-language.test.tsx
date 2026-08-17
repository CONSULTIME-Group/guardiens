import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, waitFor, cleanup } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import i18n, { loadLanguage } from "@/i18n";
import PageMeta from "@/components/PageMeta";

/**
 * Non régression du 09/08/2026 : la page d'accueil rendait son interface en
 * anglais tout en déclarant `documentElement.lang = "fr"`. La cause était dans
 * PageMeta, qui repliait l'attribut sur le français dès que la page ne
 * déclarait pas de variante traduite. C'est `noindex` qui traite ce cas, jamais
 * l'attribut de langue, qui doit décrire ce qui est réellement affiché.
 *
 * Ce test échoue si l'attribut cesse de suivre la langue active, sur la home et
 * sur trois autres routes publiques, avec et sans variantes déclarées.
 */

const ROUTES: Array<{ path: string; translated?: readonly string[] }> = [
  { path: "/", translated: ["en", "es"] },
  { path: "/annonces" },
  { path: "/petites-missions" },
  { path: "/tarifs", translated: ["en"] },
];

const renderRoute = (path: string, translated?: readonly string[]) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path={path}
          element={
            <PageMeta
              title="Titre de contrôle"
              description="Description de contrôle."
              path={path}
              translatedLangs={translated}
            />
          }
        />
      </Routes>
    </MemoryRouter>,
  );

describe("documentElement.lang suit la langue active", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(async () => {
    cleanup();
    vi.restoreAllMocks();
    await i18n.changeLanguage("fr");
  });

  for (const lng of ["fr", "en"] as const) {
    for (const { path, translated } of ROUTES) {
      it(`${path} en ${lng}`, async () => {
        await loadLanguage(lng);
        await i18n.changeLanguage(lng);
        document.documentElement.setAttribute("lang", "xx");

        renderRoute(path, translated);

        await waitFor(() =>
          expect(document.documentElement.getAttribute("lang")).toBe(lng),
        );
      });
    }
  }
});
