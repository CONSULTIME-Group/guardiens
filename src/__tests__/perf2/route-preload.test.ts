/**
 * Lot perf 2 : fichiers de /annonces et des fiches préchargés dès le HTML,
 * jamais sur les autres adresses.
 */
import { describe, expect, it } from "vitest";
import { ROUTE_PRELOADS, collectRouteFiles, routePreloadScript } from "../../../scripts/vite-plugin-route-preload.mjs";

const chunk = (fileName: string, facadeModuleId: string | null, imports: string[] = [], isEntry = false) =>
  ({ type: "chunk", fileName, facadeModuleId, imports, isEntry });

describe("préchargement par adresse (lot perf 2)", () => {
  it("prend la page et ses imports, jamais les fichiers de l'entrée ni le dictionnaire complet (lot perf 8)", () => {
    const chunks = [
      chunk("assets/index.js", "/x/src/main.tsx", ["assets/vendor-react.js"], true),
      chunk("assets/vendor-react.js", null),
      chunk("assets/common.js", "/x/src/i18n/locales/fr/common.json?raw"),
      chunk("assets/PublicListings.js", "/x/src/pages/PublicListings.tsx", ["assets/vendor-react.js", "assets/rules.js"]),
      chunk("assets/rules.js", "/x/src/lib/sitSearchRules.ts"),
      chunk("assets/SearchSitter.js", "/x/src/components/search/SearchSitter.tsx", ["assets/rules.js", "assets/card.js"]),
      chunk("assets/card.js", "/x/src/components/search/listing/SearchListingCard.tsx"),
      chunk("assets/PublicSitDetail.js", "/x/src/pages/PublicSitDetail.tsx", ["assets/rules.js"]),
    ];
    const files = collectRouteFiles(chunks, ROUTE_PRELOADS[0].roots);
    expect(files.sort()).toEqual(["assets/PublicListings.js", "assets/SearchSitter.js", "assets/card.js", "assets/rules.js"]);
    expect(collectRouteFiles(chunks, ROUTE_PRELOADS[1].roots).sort()).toEqual(["assets/PublicSitDetail.js", "assets/rules.js"]);
  });

  it("une racine absente fait échouer le build", () => {
    expect(() => collectRouteFiles([chunk("assets/index.js", "/x/src/main.tsx", [], true)], ["src/pages/Nope.tsx"])).toThrow(/racine introuvable/);
  });

  it("adresses visées : liste et fiche publiques seulement", () => {
    const match = (path: string) => ROUTE_PRELOADS.findIndex((r: { pattern: string }) => new RegExp(r.pattern).test(path));
    expect(match("/annonces")).toBe(0);
    expect(match("/annonces/")).toBe(0);
    expect(match("/annonces/garde-a-lyon-abc123")).toBe(1);
    expect(match("/annonces/international")).toBe(-1);
    expect(match("/annonces/demo/chalet")).toBe(-1);
    expect(match("/")).toBe(-1);
    expect(match("/sits/abc")).toBe(-1);
  });

  it("script en ligne : priorité basse, aucun rel=\"modulepreload\" écrit dans le HTML (verrou P2)", () => {
    const html = routePreloadScript([["^/annonces/?$", ["assets/a.js"]]]);
    expect(html).toMatch(/fetchPriority='low'/);
    expect(html).not.toMatch(/rel="modulepreload"/);
    expect(html).toMatch(/^<script data-route-preload>/);
  });

  it("le script ajoute les liens sur la bonne adresse seulement", () => {
    const html = routePreloadScript([["^/annonces/?$", ["assets/a.js", "assets/b.js"]]]);
    const body = html.replace(/^<script[^>]*>/, "").replace(/<\/script>$/, "");
    document.head.querySelectorAll("link[rel=modulepreload]").forEach((l) => l.remove());
    window.history.replaceState(null, "", "/annonces");
    new Function(body)();
    const links = [...document.head.querySelectorAll("link[rel=modulepreload]")].map((l) => l.getAttribute("href"));
    expect(links).toEqual(["/assets/a.js", "/assets/b.js"]);
    document.head.querySelectorAll("link[rel=modulepreload]").forEach((l) => l.remove());
    window.history.replaceState(null, "", "/");
    new Function(body)();
    expect(document.head.querySelectorAll("link[rel=modulepreload]")).toHaveLength(0);
  });
});
