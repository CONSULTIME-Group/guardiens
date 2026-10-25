import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { chunkPrerenderUrls, PRERENDER_BATCH_MAX } from "@/lib/admin/prerenderBatches";

const read = (p: string) => readFileSync(p, "utf8");

describe("errfix 25/10 : /admin/prerender envoie des paquets de 200 adresses au plus", () => {
  it("la borne du client est celle du serveur", () => {
    const server = read("supabase/functions/_shared/queue-prerender-refresh.ts");
    expect(server).toMatch(new RegExp(`limit = ${PRERENDER_BATCH_MAX}\\b`));
  });

  it("420 pages sélectionnées donnent trois paquets sous la borne, sans doublon ni perte", () => {
    const urls = Array.from({ length: 420 }, (_, i) => `https://guardiens.fr/p/${i}`);
    const batches = chunkPrerenderUrls([...urls, urls[0]]);
    expect(batches.map((b) => b.length)).toEqual([200, 200, 20]);
    expect(batches.flat()).toEqual(urls);
    expect(batches.every((b) => b.length >= 1 && b.length <= PRERENDER_BATCH_MAX)).toBe(true);
  });

  it("aucune adresse donne aucun appel", () => {
    expect(chunkPrerenderUrls([])).toEqual([]);
  });

  it("la page découpe avant d'appeler la fonction", () => {
    const page = read("src/pages/AdminPrerender.tsx");
    expect(page).toContain("chunkPrerenderUrls(urls)");
    expect(page).toContain("body: { urls: batches[i] }");
    expect(page).not.toMatch(/body: \{ urls \}/);
  });
});
