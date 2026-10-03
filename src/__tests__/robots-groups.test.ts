import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { readRobotsConfig, buildRobotsTxt, isAllowed, parseRobots, selectGroupRules } from "../../scripts/robots-lib.mjs";

const root = path.resolve(__dirname, "../..");
const routesSrc = fs.readFileSync(path.join(root, "src/data/siteRoutes.ts"), "utf-8");
const robots = fs.readFileSync(path.join(root, "public/robots.txt"), "utf-8");
const sitemapPaths = [...fs.readFileSync(path.join(root, "public/sitemap.xml"), "utf-8").matchAll(/<loc>https:\/\/guardiens\.fr([^<]*)<\/loc>/g)].map((m) => m[1] || "/");

const ALLOWED_UAS = ["Googlebot", "Googlebot-Image", "Bingbot", "OAI-SearchBot", "GPTBot", "ClaudeBot", "PerplexityBot", "UnBotQuelconque/1.0"];
const PRIVATE = ["/admin", "/admin/users", "/dashboard", "/messages", "/messages/abc", "/sits", "/sits/123", "/settings", "/auth/confirm", "/review/x", "/house-guide/x", "/profile", "/mon-abonnement"];
const PUBLIC_NOINDEX = ["/login", "/inscription", "/search", "/recherche", "/recherche-gardiens", "/gardiens/00000000-0000-0000-0000-000000000000"];

describe("robots.txt, interprétation par groupe le plus spécifique", () => {
  it("le fichier servi est celui généré", () => {
    expect(buildRobotsTxt(readRobotsConfig(routesSrc))).toBe(robots);
  });

  it.each(ALLOWED_UAS)("%s : chemins privés bloqués", (ua) => {
    for (const p of PRIVATE) expect(isAllowed(robots, ua, p), `${ua} ${p}`).toBe(false);
  });

  it.each(ALLOWED_UAS)("%s : pages publiques noindex explorables", (ua) => {
    for (const p of PUBLIC_NOINDEX) expect(isAllowed(robots, ua, p), `${ua} ${p}`).toBe(true);
  });

  it.each(ALLOWED_UAS)("%s : paramètres de suivi bloqués", (ua) => {
    expect(isAllowed(robots, ua, "/tarifs?utm_source=x")).toBe(false);
  });

  it(`les ${sitemapPaths.length} URL du plan du site restent explorables pour tous`, () => {
    expect(sitemapPaths.length).toBeGreaterThan(600);
    for (const ua of ALLOWED_UAS) for (const p of sitemapPaths) expect(isAllowed(robots, ua, p), `${ua} ${p}`).toBe(true);
  });

  it("ByteSpider et cohere-ai bloqués partout", () => {
    for (const ua of ["ByteSpider", "cohere-ai"]) {
      expect(isAllowed(robots, ua, "/")).toBe(false);
      expect(isAllowed(robots, ua, "/tarifs")).toBe(false);
    }
  });

  it("Googlebot ne retombe pas sur un groupe Allow: / isolé", () => {
    const rules = selectGroupRules(parseRobots(robots), "Googlebot");
    expect(rules.some((r: { allow: boolean; path: string }) => !r.allow && r.path === "/admin")).toBe(true);
  });

  it("l'interpréteur reproduit le défaut de l'ancien format (groupes nommés isolés)", () => {
    const old = "User-agent: Googlebot\nAllow: /\n\nUser-agent: *\nAllow: /\nDisallow: /admin\n";
    expect(isAllowed(old, "Googlebot", "/admin")).toBe(true);
    expect(isAllowed(old, "Autre", "/admin")).toBe(false);
  });
});

describe("lecture structurelle de siteRoutes.ts", () => {
  const base = readRobotsConfig(routesSrc);

  it("indépendante de l'indentation et des retours à la ligne", () => {
    const variants = [
      routesSrc.replace(/^ +/gm, ""),
      routesSrc.replace(/^ +/gm, "        "),
      routesSrc.replace(/^( *)/gm, "$1$1\t"),
      routesSrc.replace(/",\n\s*"/g, '", "'),
    ];
    for (const v of variants) expect(readRobotsConfig(v)).toEqual(base);
  });

  it("ignore les commentaires et chaînes dans les commentaires du tableau", () => {
    expect(base.privatePaths).not.toContain("/annonces/");
    expect(base.privatePaths).toContain("/sits");
  });

  it("refuse une route publique noindex ajoutée aux chemins privés", () => {
    expect(() => buildRobotsTxt({ ...base, privatePaths: [...base.privatePaths, "/login"] })).toThrow();
    expect(() => buildRobotsTxt({ ...base, privatePaths: [...base.privatePaths, "/recherche"] })).toThrow();
  });

  it("aucune route index:false n'est transformée en Disallow", () => {
    for (const p of ["/login", "/inscription", "/recherche"]) expect(robots).not.toMatch(new RegExp(`^Disallow: ${p}$`, "m"));
  });
});
