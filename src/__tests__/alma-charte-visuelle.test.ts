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
  it("le dock replié conserve son apparence distincte", () => {
    expect(dock).toContain("bg-card/95");
    expect(dock).toContain("AlmaAvatarAnimated");
    expect(dock).not.toContain("shadow-xl");
  });

  it("le fil utilise du texte nu dans un tiroir papier", () => {
    expect(thread).toContain("alma-conversation-sheet");
    expect(thread).toContain("alma-turn-alma");
    expect(thread).toContain("alma-turn-user");
    expect(thread).toContain("alma-field");
    expect(thread).not.toContain("alma-bubble-alma");
    expect(thread).not.toContain("alma-bubble-user");
    expect(css).not.toContain("alma-bubble-alma");
    expect(css).not.toContain("alma-bubble-user");
  });

  it("la phrase d'Alma passe en Playfair italique", () => {
    expect(css).toMatch(/\.alma-voice\s*\{[^}]*font-family:\s*var\(--font-heading\)/);
    expect(css).toMatch(/\.alma-voice\s*\{[^}]*font-style:\s*italic/);
  });

  it("les surfaces de charte n'utilisent aucune couleur en dur", () => {
    const block = css.slice(css.indexOf(".alma-panel"));
    expect(block).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it("l'attente utilise six phrases et reste annoncée aux lecteurs d'écran", () => {
    expect(thread).not.toContain("alma-typing-dot");
    expect(css).not.toContain("alma-typing-dot");
    expect(thread).toContain("Je regarde.");
    expect(thread).toContain("Je cherche dans mes notes.");
    expect(thread).toContain("Deux secondes, je vérifie.");
    expect(thread).toContain("Je relis, je veux être sûre.");
    expect(thread).toContain("Je fouille un peu.");
    expect(thread).toContain("J'y suis presque.");
    expect(thread).toContain("Alma prépare sa réponse.");
  });

  it("le micro et les actions tiennent la cible de 44px", () => {
    expect(thread).not.toContain("h-9 w-9");
    expect(dock).not.toContain("h-9 w-9");
    expect(thread).toContain("h-[46px] w-[46px]");
    expect(thread).toContain("min-h-11");
  });

  it("le panneau est un dialogue et aucun libellé d'action ne montre un chemin", () => {
    expect(thread).toContain("<SheetContent");
    expect(thread).toContain("<SheetTitle");
    expect(thread).toContain("title: menuLabel, kind: \"action\"");
    expect(thread).not.toMatch(/title:\s*"\//);
  });
});
