import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const src = readFileSync("cloudflare-worker-prerender.js", "utf8");

describe("Worker v7.8, miroir", () => {
  it("la copie servie aux robots ne cite plus les scripts du build, le JSON-LD reste", () => {
    expect(src).toContain(`rewriter.on('script[src^="/assets/"]', { element(el) { el.remove(); } });`);
    expect(src).not.toMatch(/rewriter\.on\('script'[,)]/);
  });
  it("connexion, inscription et espace privé reçus par un robot portent noindex", () => {
    expect(src).toContain("if (isBot && reasons.includes('non-indexable-route'))");
    expect(src).toContain("o.headers.set('x-robots-tag', 'noindex');");
  });
});
