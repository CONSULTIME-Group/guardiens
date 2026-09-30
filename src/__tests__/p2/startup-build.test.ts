/**
 * Lot P2 « Démarrage rapide » : verrous sur le build de production.
 *
 * Construit l'application dans un dossier temporaire (ou lit P2_BUILD_DIR
 * s'il est fourni) puis vérifie : entrée sous 300 Ko (plafond relevé au
 * lot P2b, prix de l'absence de régression), au plus 14 modulepreload dans
 * index.html, aucun module admin, éditeur, graphique ou
 * carte dans l'entrée, outils de diagnostic absents du build.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { MISSIONS_CITIES } from "@/data/missionsCityContent";
import { MISSIONS_CITY_INDEX } from "@/data/missionsCityIndex";
import * as siteRoutes from "@/data/siteRoutes";
import * as siteConstants from "@/data/siteConstants";

let dir = process.env.P2_BUILD_DIR ?? "";
let entry = "";
let entryCode = "";
let allCode = "";
let html = "";

beforeAll(() => {
  if (!dir || !existsSync(join(dir, "index.html"))) {
    dir = mkdtempSync(join(tmpdir(), "p2-build-"));
    execSync(`npx vite build --outDir ${dir} --logLevel error`, { stdio: "ignore", timeout: 290_000 });
  }
  html = readFileSync(join(dir, "index.html"), "utf8");
  const src = html.match(/<script[^>]+type="module"[^>]+src="\/assets\/(index-[^"]+\.js)"/)?.[1];
  entry = join(dir, "assets", src ?? "");
  entryCode = readFileSync(entry, "utf8");
  const assets = join(dir, "assets");
  allCode = readdirSync(assets).filter((f) => f.endsWith(".js")).map((f) => readFileSync(join(assets, f), "utf8")).join("\n");
}, 300_000);

describe("P2, build de production", () => {
  it("fichier d'entrée sous 300 Ko", () => {
    expect(statSync(entry).size).toBeLessThanOrEqual(300 * 1024);
  });

  it("au plus 14 modulepreload dans index.html", () => {
    expect((html.match(/rel="modulepreload"/g) ?? []).length).toBeLessThanOrEqual(14);
  });

  it("aucun module admin, éditeur, graphique ou carte dans l'entrée", () => {
    // Imports statiques de l'entrée (les import() paresseux ne comptent pas).
    const staticImports = [...entryCode.matchAll(/(?:^|[;\n}])\s*import\s*(?:[^"'()]*?from\s*)?["']([^"']+)["']/g)].map((m) => m[1]);
    expect(staticImports.length).toBeGreaterThan(0);
    for (const marker of ["recharts", "leaflet", "map", "Admin", "ArticleEditor", "lottie", "tiptap", "Chart"]) {
      expect(staticImports.filter((i) => i.includes(marker)), marker).toEqual([]);
    }
    for (const marker of ["recharts-wrapper", "leaflet-container", "maplibregl", "lottie-web"]) {
      expect(entryCode.includes(marker), marker).toBe(false);
    }
    // Le contenu des villes n'est plus dans l'entrée (le dictionnaire y est revenu au lot P2b).
    expect(entryCode.includes("Pourquoi cela compte à Lyon")).toBe(false);
  });

  it("bandeau de diagnostic et outil de débogage OAuth absents", () => {
    expect(allCode.includes("Restart preview")).toBe(false);
    expect(allCode.includes("preview-restart-button")).toBe(false);
    expect(allCode.includes("__oauthLog")).toBe(false);
  });
});

describe("P2b, préchargement membre sans exécution", () => {
  it("repères remplacés par la liste des fichiers AppLayout et Dashboard", () => {
    expect(entryCode.includes('"__P2B_PRELOAD_')).toBe(false);
    expect(/assets\/AppLayout-[^"\\]+\.js/.test(entryCode)).toBe(true);
    expect(/assets\/Dashboard-[^"\\]+\.js/.test(entryCode)).toBe(true);
  });
});

describe("P2, index léger des villes entraide", () => {
  it("identique au contenu complet (slugs, ordre, noms)", () => {
    expect(MISSIONS_CITY_INDEX.map((c) => [c.slug, c.cityName])).toEqual(
      Object.values(MISSIONS_CITIES).map((c) => [c.slug, c.cityName]),
    );
  });
});

describe("P2, constantes du site", () => {
  it("siteConstants identique à siteRoutes", () => {
    expect(siteConstants.SITE_URL).toBe(siteRoutes.SITE_URL);
    expect(siteConstants.DEFAULT_OG_IMAGE).toBe(siteRoutes.DEFAULT_OG_IMAGE);
  });
});
