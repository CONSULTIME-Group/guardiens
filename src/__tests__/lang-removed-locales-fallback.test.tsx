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
 * Verrou du repli après suppression de l'allemand et de l'italien (17/08/2026).
 *
 * Contexte SEO : les variantes `?lang=de` et `?lang=it` connues de Google
 * renvoyaient `noindex, follow` avec une canonique vers la page française,
 * combinaison déconseillée (le noindex peut retomber sur la cible). Elles
 * doivent désormais rendre la page française : `html lang="fr"`,
 * `index, follow` sur une page indexable, canonique auto-référente sans
 * paramètre.
 *
 * Ce test échoue si :
 *   - `de` ou `it` réapparaissent dans les langues supportées ou sur disque ;
 *   - une visite `?lang=de|it` ne retombe pas sur un rendu français indexable ;
 *   - un choix mémorisé (même valide, ex. `en`) prime sur le repli français
 *     quand le paramètre explicite n'est plus supporté ;
 *   - un reste de stockage (`guardiens.lang` ou clés héritées) bloque un
 *     utilisateur sur une langue disparue.
 */

const LOCALES_DIR = path.resolve(process.cwd(), "src/i18n/locales");

const Harness = ({ entry }: { entry: string }) => (
  <MemoryRouter initialEntries={[entry]}>
    <LangUrlSync />
    <PageMeta
      title="Titre de contrôle"
      description="Description de contrôle."
      path="/"
      translatedLangs={["en", "es"]}
    />
  </MemoryRouter>
);

const htmlLang = () => document.documentElement.getAttribute("lang");
const robotsMeta = () =>
  document.head.querySelector('meta[name="robots"]')?.getAttribute("content") ?? null;
const canonicalHref = () =>
  document.head.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? null;

const cleanHead = () => {
  document.head
    .querySelectorAll('meta[name="robots"], link[rel="canonical"], link[rel="alternate"]')
    .forEach((n) => n.remove());
};

describe("repli après retrait de de/it", () => {
  beforeEach(async () => {
    cleanup();
    window.localStorage.clear();
    cleanHead();
    document.documentElement.setAttribute("lang", "fr");
    window.history.replaceState({}, "", "/");
    await i18n.changeLanguage("fr");
  });

  afterEach(async () => {
    cleanup();
    cleanHead();
    window.history.replaceState({}, "", "/");
    await i18n.changeLanguage("fr");
  });

  it("les langues supportées sont exactement fr, en, es", () => {
    expect([...SUPPORTED_LANGS]).toEqual(["fr", "en", "es"]);
  });

  it("les dictionnaires de et it n'existent plus sur disque", () => {
    // On verrouille les fichiers, pas les dossiers : un watcher peut laisser
    // un dossier vide derrière lui, sans common.json il est inerte.
    expect(fs.existsSync(path.join(LOCALES_DIR, "de", "common.json"))).toBe(false);
    expect(fs.existsSync(path.join(LOCALES_DIR, "it", "common.json"))).toBe(false);
    for (const dir of ["de", "it"]) {
      const full = path.join(LOCALES_DIR, dir);
      if (fs.existsSync(full)) {
        expect(fs.readdirSync(full), `dossier ${dir} non vide`).toEqual([]);
      }
    }
    expect(fs.readdirSync(LOCALES_DIR).sort()).toEqual(["en", "es", "fr"]);
  });

  for (const removed of ["de", "it"]) {
    it(`?lang=${removed} rend le français : html lang, index follow, canonique sans paramètre`, async () => {
      render(<Harness entry={`/?lang=${removed}`} />);

      await waitFor(() => expect(i18n.language).toBe("fr"));
      await waitFor(() => expect(htmlLang()).toBe("fr"));
      await waitFor(() => expect(robotsMeta()).toBe("index, follow"));
      expect(canonicalHref()).toBe("https://guardiens.fr/");
      // Comme tout choix explicite, le repli français est mémorisé par le
      // détecteur i18next. Jamais la langue disparue.
      expect(getStoredLang()).toBe("fr");
    });
  }

  it("un choix mémorisé valide (en) ne prime pas sur un paramètre retiré : ?lang=de rend le français", async () => {
    window.localStorage.setItem(LANG_STORAGE_KEY, "en");
    await i18n.changeLanguage("en");

    render(<Harness entry="/?lang=de" />);

    await waitFor(() => expect(i18n.language).toBe("fr"));
    await waitFor(() => expect(htmlLang()).toBe("fr"));
    await waitFor(() => expect(robotsMeta()).toBe("index, follow"));
    expect(canonicalHref()).toBe("https://guardiens.fr/");
  });

  it("un reste de stockage « de » n'est ni lu ni conservé : repli français propre", async () => {
    window.localStorage.setItem(LANG_STORAGE_KEY, "de");
    expect(getStoredLang()).toBeNull();

    render(<Harness entry="/" />);

    // Rien n'est appliqué : la langue active reste le français du beforeEach.
    await waitFor(() => expect(htmlLang()).toBe("fr"));
    expect(i18n.language).toBe("fr");
  });

  it("une clé héritée « lang=it » n'est pas migrée et est supprimée", () => {
    // Le détecteur i18next écrit la langue active en cache à chaque bascule :
    // on repart d'un stockage vide pour isoler la migration.
    window.localStorage.clear();
    window.localStorage.setItem("lang", "it");
    migrateLegacyLangStorage(SUPPORTED_LANGS as readonly string[]);
    expect(window.localStorage.getItem(LANG_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem("lang")).toBeNull();
  });

  it("resolveInitialLang retourne fr pour un paramètre retiré, même avec un choix mémorisé", () => {
    window.localStorage.setItem(LANG_STORAGE_KEY, "en");
    window.history.replaceState({}, "", "/?lang=de");
    expect(resolveInitialLang()).toBe("fr");
    window.history.replaceState({}, "", "/?lang=it");
    expect(resolveInitialLang()).toBe("fr");
  });

  it("resolveInitialLang conserve le comportement nominal : paramètre supporté, puis stockage", () => {
    window.history.replaceState({}, "", "/?lang=es");
    expect(resolveInitialLang()).toBe("es");
    window.history.replaceState({}, "", "/");
    window.localStorage.setItem(LANG_STORAGE_KEY, "en");
    expect(resolveInitialLang()).toBe("en");
  });
});
