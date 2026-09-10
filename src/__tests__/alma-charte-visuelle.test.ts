/**
 * Lot F : la charte Guardiens sur le chat d'Alma.
 * Le test lit les sources pour verrouiller les classes de charte, les cibles
 * tactiles et l'absence de valeurs en dur.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const read = (p: string) => fs.readFileSync(path.resolve(process.cwd(), p), "utf-8");

const dock = read("src/components/ai/alma/AlmaDock.tsx");
const thread = read("src/components/ai/alma/AlmaConversation.tsx");
const css = read("src/index.css");

describe("Alma, habillage charte", () => {
  it("le panneau replié utilise les classes de charte", () => {
    expect(dock).toContain("alma-panel");
    expect(dock).toContain("alma-badge");
    expect(dock).toContain("alma-voice");
    expect(dock).not.toContain("shadow-xl");
  });

  it("le fil utilise les bulles et la carte de charte", () => {
    expect(thread).toContain("alma-thread-card");
    expect(thread).toContain("alma-bubble-alma");
    expect(thread).toContain("alma-bubble-user");
    expect(thread).toContain("alma-field");
  });

  it("la phrase d'Alma passe en Playfair italique", () => {
    expect(css).toMatch(/\.alma-voice\s*\{[^}]*font-family:\s*var\(--font-heading\)/);
    expect(css).toMatch(/\.alma-voice\s*\{[^}]*font-style:\s*italic/);
  });

  it("les surfaces de charte n'utilisent aucune couleur en dur", () => {
    const block = css.slice(css.indexOf(".alma-panel"));
    expect(block).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it("l'attente se rend en trois points annoncés aux lecteurs d'écran", () => {
    expect(thread).toContain("alma-typing-dot");
    expect(thread).toContain("Alma prépare sa réponse.");
    expect(css).toMatch(/prefers-reduced-motion: no-preference/);
  });

  it("micro, envoi et fermeture tiennent la cible de 44px", () => {
    expect(thread).not.toContain("h-9 w-9");
    expect(dock).not.toContain("h-9 w-9");
    expect(thread.match(/h-11 w-11/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
  });
});
