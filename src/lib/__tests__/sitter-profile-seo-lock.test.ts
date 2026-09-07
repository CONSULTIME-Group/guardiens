/**
 * Verrous SEO des fiches gardien publiques `/gardiens/:id` (07/09/2026).
 *
 * 1. PageMeta est le seul endroit qui lève le drapeau sans condition. La fiche
 *    déclare ses métadonnées en attente avant son chargement, et le repli global
 *    respecte ce verrou.
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

const sourceFiles = (directory: string): string[] =>
  fs.readdirSync(path.resolve(root, directory), { withFileTypes: true }).flatMap((entry) => {
    const relative = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(relative);
    return /\.(ts|tsx)$/.test(entry.name) && !entry.name.includes(".test.")
      ? [relative]
      : [];
  });

describe("fiche gardien publique, verrous SEO", () => {
  it("PageMeta est le seul endroit qui lève le drapeau sans condition", () => {
    const assignments = sourceFiles("src").flatMap((file) =>
      read(file)
        .split("\n")
        .map((line, index) => ({ file, line, index }))
        .filter(({ line }) => /prerenderReady\s*=\s*true/.test(line) && !line.trim().startsWith("//")),
    );
    const allowedConditionalFiles = new Set([
      "src/main.tsx",
      "src/pages/CityPage.tsx",
      "src/pages/GuideDetail.tsx",
      "src/pages/PublicSitDetail.tsx",
    ]);

    expect(assignments.filter(({ file }) => file === "src/components/PageMeta.tsx")).toHaveLength(1);
    assignments
      .filter(({ file }) => file !== "src/components/PageMeta.tsx")
      .forEach(({ file, index }) => {
        expect(allowedConditionalFiles.has(file), `${file} ne doit pas lever le drapeau ici`).toBe(true);
        const source = read(file).split("\n");
        const context = source.slice(Math.max(0, index - 6), index + 1).join("\n");
        expect(context, `${file}:${index + 1} doit conditionner le drapeau`).toMatch(/\bif\s*\(|\bif\s+/);
      });
  });

  it("le repli global attend et respecte les métadonnées déclarées", () => {
    const main = read("src/main.tsx");
    expect(main).toMatch(/if\s*\(window\.prerenderMetaPending\)\s*return/);
    expect(main).toMatch(/setTimeout\(markPrerenderReady,\s*10000\)/);
    expect(read(PAGE)).toContain("window.prerenderMetaPending = true");
    expect(read("src/components/PageMeta.tsx")).toMatch(
      /prerenderMetaPending\s*=\s*false;[\s\S]{0,100}prerenderReady\s*=\s*true/,
    );
  });

  it("l'indexabilité ne lit pas la galerie chargée sous condition de session", () => {
    const src = read(PAGE);
    const call = src.slice(src.indexOf("isSitterProfileIndexable({"));
    const block = call.slice(0, call.indexOf("});") + 3);
    expect(block).toContain("galleryCount");
    const code = block
      .split("\n")
      .filter((l) => !l.trim().startsWith("//"))
      .join("\n");
    expect(code).not.toContain("gallery.length");

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
