import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Garde-fou : tous les `actionHref` déclarés dans WelcomeBackDigest doivent
 * pointer vers une route réellement déclarée dans App.tsx. Empêche toute
 * régression future de lien mort (404) sur les CTA d'Alma.
 */
describe("WelcomeBackDigest - actionHref link integrity", () => {
  const digestSrc = readFileSync(
    resolve(__dirname, "../components/ai/alma/WelcomeBackDigest.tsx"),
    "utf-8",
  );
  const appSrc = readFileSync(resolve(__dirname, "../App.tsx"), "utf-8");

  // Extraire toutes les routes déclarées dans App.tsx (path="/...").
  const routeRegex = /path="([^"]+)"/g;
  const declaredRoutes = new Set<string>();
  for (const m of appSrc.matchAll(routeRegex)) {
    declaredRoutes.add(m[1]);
  }

  // Extraire tous les actionHref: "/xxx" du digest.
  const hrefRegex = /actionHref:\s*(?:s\.[^?]+\?\s*)?"([^"]+)"(?:\s*:\s*"([^"]+)")?/g;
  const hrefs: string[] = [];
  for (const m of digestSrc.matchAll(hrefRegex)) {
    if (m[1]) hrefs.push(m[1]);
    if (m[2]) hrefs.push(m[2]);
  }

  it("extrait au moins un actionHref", () => {
    expect(hrefs.length).toBeGreaterThan(0);
  });

  it.each(hrefs)("actionHref %s résout vers une route déclarée dans App.tsx", (href) => {
    // On ignore querystring et hash pour la comparaison de chemin.
    const path = href.split("?")[0].split("#")[0];
    expect(
      declaredRoutes.has(path),
      `Le CTA Alma pointe vers "${href}" mais aucune route "${path}" n'est déclarée dans App.tsx. Corrigez WelcomeBackDigest.tsx.`,
    ).toBe(true);
  });
});
