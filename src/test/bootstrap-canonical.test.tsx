import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import PageMeta from "@/components/PageMeta";
import { normalizePathname } from "@/lib/seo";

/**
 * Verrous de la canonique de bootstrap (script inline dans index.html).
 *
 * 1. Le script est présent dans index.html, placé après le script de preview
 *    .lovable.app, et reproduit la normalisation de src/lib/seo.ts.
 * 2. Exécution réelle du script extrait d'index.html : la canonique posée
 *    est identique à ce que normalizePathname produit, sans query string.
 * 3. PageMeta remplace la canonique de bootstrap au montage : une seule
 *    balise link[rel="canonical"] subsiste, et la branche noCanonical les
 *    retire toutes.
 */

const html = readFileSync(resolve(process.cwd(), "index.html"), "utf8");
const inlineScripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const bootstrapScript = inlineScripts.find((s) => s.includes("data-bootstrap-canonical"));

const runBootstrap = () => {
  if (!bootstrapScript) throw new Error("script bootstrap introuvable dans index.html");
  new Function(bootstrapScript)();
};

const clearCanonicals = () => {
  document.head.querySelectorAll('link[rel="canonical"]').forEach((n) => n.remove());
};

describe("index.html : script de canonique de bootstrap", () => {
  it("est présent dans index.html", () => {
    expect(bootstrapScript).toBeDefined();
    expect(html).toContain('setAttribute("data-bootstrap-canonical", "true")');
  });

  it("s'exécute après le script de preview .lovable.app", () => {
    const previewIdx = html.indexOf("endsWith('.lovable.app')");
    const bootstrapIdx = html.indexOf("data-bootstrap-canonical");
    expect(previewIdx).toBeGreaterThan(-1);
    expect(bootstrapIdx).toBeGreaterThan(previewIdx);
  });

  it("ne fait rien si une canonique est déjà présente", () => {
    expect(bootstrapScript).toContain("querySelector('link[rel=\"canonical\"]')");
  });

  it("reproduit la normalisation de src/lib/seo.ts et n'ajoute jamais de query string", () => {
    expect(bootstrapScript).toContain("split(/[?#]/)[0]");
    expect(bootstrapScript).toContain('replace(/\\/+/g, "/")');
    expect(bootstrapScript).toContain('replace(/\\/+$/g, "")');
    expect(bootstrapScript).toContain('"https://guardiens.fr" + normalized');
    expect(bootstrapScript).not.toContain("location.search");
  });
});

describe("canonique de bootstrap : exécution du script extrait d'index.html", () => {
  afterEach(() => {
    clearCanonicals();
    window.history.replaceState(null, "", "/");
  });

  it.each([
    ["/", "https://guardiens.fr/"],
    ["/tarifs", "https://guardiens.fr/tarifs"],
    ["/tarifs/", "https://guardiens.fr/tarifs"],
    ["/house-sitting/lyon", "https://guardiens.fr/house-sitting/lyon"],
    ["/faq?lang=en", "https://guardiens.fr/faq"],
    ["/recherche?ville=Lyon&rayon=15", "https://guardiens.fr/recherche"],
  ])("pose la canonique attendue pour %s", (path, expected) => {
    window.history.replaceState(null, "", path);
    clearCanonicals();
    runBootstrap();
    const link = document.head.querySelector('link[rel="canonical"]');
    // L'attendu est recalculé depuis la source de vérité : toute divergence
    // entre le script inline et normalizePathname fait échouer ce test.
    expect(expected).toBe(`https://guardiens.fr${normalizePathname(window.location.pathname)}`);
    expect(link?.getAttribute("href")).toBe(expected);
    expect(link?.getAttribute("data-bootstrap-canonical")).toBe("true");
  });

  it("n'écrase pas une canonique existante (comportement preview préservé)", () => {
    window.history.replaceState(null, "", "/tarifs");
    clearCanonicals();
    const pre = document.createElement("link");
    pre.setAttribute("rel", "canonical");
    pre.setAttribute("href", "https://guardiens.fr/tarifs?x=1");
    document.head.appendChild(pre);

    runBootstrap();

    const all = document.head.querySelectorAll('link[rel="canonical"]');
    expect(all.length).toBe(1);
    expect(all[0].getAttribute("href")).toBe("https://guardiens.fr/tarifs?x=1");
    expect(all[0].getAttribute("data-bootstrap-canonical")).toBeNull();
  });
});

describe("PageMeta : remplacement de la canonique de bootstrap", () => {
  afterEach(() => {
    cleanup();
    clearCanonicals();
    document.head.querySelectorAll("[data-page-meta]").forEach((n) => n.remove());
    window.history.replaceState(null, "", "/");
  });

  const insertBootstrapCanonical = () => {
    const link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    link.setAttribute("href", "https://guardiens.fr/bootstrap");
    link.setAttribute("data-bootstrap-canonical", "true");
    document.head.appendChild(link);
  };

  it("laisse exactement une canonique après montage, celle de PageMeta", async () => {
    insertBootstrapCanonical();
    render(
      <MemoryRouter initialEntries={["/tarifs"]}>
        <PageMeta title="Tarifs" description="Page des tarifs" path="/tarifs" />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        document.head.querySelector('link[rel="canonical"]')?.getAttribute("href"),
      ).toBe("https://guardiens.fr/tarifs");
    });

    const all = document.head.querySelectorAll('link[rel="canonical"]');
    expect(all.length).toBe(1);
    expect(all[0].getAttribute("data-page-meta")).toBe("true");
    expect(all[0].getAttribute("data-bootstrap-canonical")).toBeNull();
  });

  it("noCanonical retire aussi la canonique de bootstrap", async () => {
    insertBootstrapCanonical();
    render(
      <MemoryRouter initialEntries={["/page-introuvable"]}>
        <PageMeta title="Introuvable" description="Page introuvable" path="/page-introuvable" noCanonical />
      </MemoryRouter>,
    );

    // La meta robots est écrite dans le même effet que le retrait des
    // canoniques : sa présence garantit que l'effet a été exécuté.
    await waitFor(() => {
      expect(document.head.querySelector('meta[name="robots"]')).not.toBeNull();
    });

    expect(document.head.querySelectorAll('link[rel="canonical"]').length).toBe(0);
  });
});
