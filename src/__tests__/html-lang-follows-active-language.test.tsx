import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import i18n, { SUPPORTED_LANGS } from "@/i18n";
import PageMeta from "@/components/PageMeta";

/**
 * Verrou monolingue : <html lang> est « fr » partout et tout le temps,
 * aucune alternate hreflang n'est émise, og:locale est figé à fr_FR, et une
 * page publique reste « index, follow » même quand la visite arrive avec
 * `?lang=en` (ancienne variante encore connue de Google).
 */

const ROUTES = ["/", "/annonces", "/petites-missions", "/tarifs"] as const;

const renderMeta = (route: string) =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <PageMeta title="Titre" description="Description" path={route.split("?")[0]} />
    </MemoryRouter>,
  );

describe("html lang monolingue", () => {
  beforeEach(async () => {
    window.localStorage.clear();
    await i18n.changeLanguage("fr");
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it("le français est la seule langue du produit", () => {
    expect([...SUPPORTED_LANGS]).toEqual(["fr"]);
  });

  it.each(ROUTES)("%s : html lang fr, zéro alternate, index follow", (route) => {
    renderMeta(route);
    expect(document.documentElement.getAttribute("lang")).toBe("fr");
    expect(document.head.querySelectorAll('link[rel="alternate"][hreflang]')).toHaveLength(0);
    const robots = document.head.querySelector('meta[name="robots"]');
    expect(robots?.getAttribute("content")).toBe("index, follow");
    const ogLocale = document.head.querySelector('meta[property="og:locale"]');
    expect(ogLocale?.getAttribute("content")).toBe("fr_FR");
  });

  it("une visite ?lang=en garde html lang fr et une canonique sans paramètre", () => {
    renderMeta("/?lang=en");
    expect(document.documentElement.getAttribute("lang")).toBe("fr");
    const canonical = document.head.querySelector('link[rel="canonical"]');
    expect(canonical?.getAttribute("href")).toBe("https://guardiens.fr/");
  });
});
