/**
 * Verrous SEO des fiches gardien publiques `/gardiens/:id` (07/09/2026).
 *
 * 1. `window.prerenderReady = true` ne doit jamais être posé par la page :
 *    au moment où l'effet de chargement se termine, `loading` vaut encore true
 *    et le DOM ne porte que le squelette (ni H1, ni bio, ni title, ni
 *    canonical). PageMeta est seul maître du drapeau, il le lève une fois monté.
 *
 * 2. L'indexabilité ne doit jamais dépendre d'une donnée chargée sous
 *    condition d'authentification. La galerie (`gallery`) n'est chargée que
 *    pour un membre connecté, donc `gallery.length` vaut toujours 0 côté bot :
 *    le calcul lit le compte anonyme (RPC `gallery_photo_count`), et le
 *    générateur de sitemap lit la vue publique `public_sitter_gallery_counts`.
 */
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const root = path.resolve(__dirname, "../../..");
const read = (p: string) => fs.readFileSync(path.resolve(root, p), "utf-8");

const PAGE = "src/pages/PublicSitterProfile.tsx";
const SITEMAP = "scripts/generate-sitemap.mjs";

describe("fiche gardien publique, verrous SEO", () => {
  it("ne pose jamais prerenderReady, PageMeta en est seul maître", () => {
    const src = read(PAGE);
    const hits = src
      .split("\n")
      .filter((l) => /prerenderReady\s*=\s*true/.test(l) && !l.trim().startsWith("//"));
    expect(hits).toEqual([]);
  });

  it("PageMeta reste bien le porteur du drapeau", () => {
    expect(read("src/components/PageMeta.tsx")).toMatch(/prerenderReady\s*=\s*true/);
  });

  it("l'indexabilité ne lit pas la galerie chargée sous condition de session", () => {
    const src = read(PAGE);
    const call = src.slice(src.indexOf("isSitterProfileIndexable({"));
    const block = call.slice(0, call.indexOf("});") + 3);
    expect(block).toContain("galleryCount");
    expect(block).not.toContain("gallery.length");
  });

  it("le compte de photos est chargé sans condition de session", () => {
    const src = read(PAGE);
    const idx = src.indexOf('rpc("gallery_photo_count"');
    expect(idx).toBeGreaterThan(-1);
    // Les 400 caractères qui précèdent l'appel ne doivent porter aucune garde
    // de session : le bot anonyme doit recevoir le compte lui aussi.
    const before = src.slice(Math.max(0, idx - 400), idx);
    expect(before).not.toMatch(/if\s*\(\s*!?\s*(auth\?\.)?hasSession\s*\)\s*\{[^}]*$/);
  });

  it("le sitemap lit le compte public, jamais la table sitter_gallery", () => {
    const src = read(SITEMAP);
    expect(src).toContain("public_sitter_gallery_counts");
    expect(src).not.toContain('from("sitter_gallery")');
  });
});
