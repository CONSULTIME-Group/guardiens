import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, waitFor, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import fs from "node:fs";
import path from "node:path";
import i18n, { SUPPORTED_LANGS } from "@/i18n";
import LangUrlSync from "@/components/LangUrlSync";
import PageMeta from "@/components/PageMeta";
import { getStoredLang, resolveInitialLang } from "@/lib/lang";
import { LANG_STORAGE_KEY, migrateLegacyLangStorage } from "@/lib/langStorageKey";

/**
 * Verrou du repli français après le retrait de toutes les langues
 * étrangères (allemand, italien, espagnol puis anglais le 17/08/2026).
 * Guardiens est monolingue : toute variante `?lang=xx` encore connue de
 * Google doit rendre la page française, `html lang="fr"`,
 * `robots: index, follow` sur une page indexable, canonique
 * auto-référente sans paramètre. Un choix « en » mémorisé dans
 * localStorage bascule proprement en français.
 */

const REMOVED_LANGS = ["en", "de", "it", "es", "xx"] as const;

const renderAt = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <LangUrlSync />
      <PageMeta title="Accueil" description="Page d'accueil" path="/" />
    </MemoryRouter>,
  );

describe("monolingue français : repli des variantes retirées", () => {
  beforeEach(async () => {
    window.localStorage.clear();
    await i18n.changeLanguage("fr");
    document.documentElement.setAttribute("lang", "fr");
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it("le français est la seule langue supportée", () => {
    expect([...SUPPORTED_LANGS]).toEqual(["fr"]);
  });

  it("aucun dictionnaire étranger ne subsiste sur le disque", () => {
    const localesDir = path.resolve(process.cwd(), "src/i18n/locales");
    const dirs = fs
      .readdirSync(localesDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
    expect(dirs).toEqual(["fr"]);
  });

  it.each(REMOVED_LANGS)(
    "?lang=%s rend le français, indexable, canonique sans paramètre",
    async (code) => {
      renderAt(`/?lang=${code}`);
      await waitFor(() => expect(i18n.language).toBe("fr"));
      expect(document.documentElement.getAttribute("lang")).toBe("fr");
      const robots = document.head.querySelector('meta[name="robots"]');
      expect(robots?.getAttribute("content")).toBe("index, follow");
      const canonical = document.head.querySelector('link[rel="canonical"]');
      expect(canonical?.getAttribute("href")).toBe("https://guardiens.fr/");
      // Le détecteur i18next peut déjà avoir mis « fr » en cache ; l'essentiel
      // est qu'aucune langue retirée ne soit jamais mémorisée.
      expect(getStoredLang() ?? "fr").toBe("fr");
    },
  );

  it("un choix « en » mémorisé dans localStorage est ignoré", async () => {
    window.localStorage.setItem(LANG_STORAGE_KEY, "en");
    expect(getStoredLang()).toBeNull();
    renderAt("/");
    await waitFor(() => expect(i18n.language).toBe("fr"));
    expect(document.documentElement.getAttribute("lang")).toBe("fr");
  });

  it("les anciennes clés héritées (lang, i18nextLng) ne migrent plus une langue retirée", () => {
    window.localStorage.clear();
    window.localStorage.setItem("lang", "en");
    migrateLegacyLangStorage(SUPPORTED_LANGS as readonly string[]);
    expect(window.localStorage.getItem(LANG_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem("lang")).toBeNull();
  });

  it("resolveInitialLang retourne toujours le français", () => {
    window.history.replaceState({}, "", "/?lang=en");
    expect(resolveInitialLang()).toBe("fr");
    window.history.replaceState({}, "", "/?lang=fr");
    expect(resolveInitialLang()).toBe("fr");
    window.history.replaceState({}, "", "/");
    window.localStorage.setItem(LANG_STORAGE_KEY, "en");
    expect(resolveInitialLang()).toBe("fr");
    window.history.replaceState({}, "", "/");
  });
});
