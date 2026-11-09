/**
 * Lot ERRFIX du 09/11/2026 (« go erreur inscription » de Jérémie) :
 * 1. la récursion « Maximum call stack size exceeded » vue sur /inscription
 *    puis /dashboard vient d'un script que Chrome sur iPhone injecte lui-même ;
 * 2. la lecture des articles qui citent un article échouait en 400.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { isBrowserInjectedRecursion } from "@/lib/errorLogger";

const read = (p: string) => readFileSync(p, "utf8");
const CRIOS = "Mozilla/5.0 (iPhone; CPU iPhone OS 26_4_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/157.0.7795.0 Mobile/15E148 Safari/604.1";
// Pile relevée le 09/11/2026 à 18 h 08 (error_logs 62df8148), tronquée.
const STACK = [
  "@https://guardiens.fr/inscription:195:68",
  "@https://guardiens.fr/inscription:192:249",
  "@https://guardiens.fr/inscription:195:39",
  "@https://guardiens.fr/inscription:202:358",
  "Bk@https://guardiens.fr/house-sitting/strasbourg:231:392",
  "zk@https://guardiens.fr/house-sitting/strasbourg:231:70",
  "Bk@https://guardiens.fr/house-sitting/strasbourg:231:418",
].join("\n");

describe("récursion d'un script de Chrome sur iPhone", () => {
  it("reconnue : CriOS, débordement de pile, aucune frame dans un fichier du site", () => {
    expect(isBrowserInjectedRecursion("RangeError: Maximum call stack size exceeded.", STACK, CRIOS)).toBe(true);
  });

  it("une frame dans un fichier .js du site la garde comme erreur du site", () => {
    const ours = `${STACK}\nrender@https://guardiens.fr/assets/index-AbC123.js:12:345`;
    expect(isBrowserInjectedRecursion("RangeError: Maximum call stack size exceeded.", ours, CRIOS)).toBe(false);
  });

  it("Safari, Chrome sur ordinateur ou un autre message : erreur du site", () => {
    const safari = CRIOS.replace(/CriOS\/[\d.]+ /, "Version/26.4 ");
    expect(isBrowserInjectedRecursion("RangeError: Maximum call stack size exceeded.", STACK, safari)).toBe(false);
    expect(isBrowserInjectedRecursion("RangeError: Maximum call stack size exceeded.", STACK, "Mozilla/5.0 (Windows NT 10.0) Chrome/142.0")).toBe(false);
    expect(isBrowserInjectedRecursion("TypeError: x is undefined", STACK, CRIOS)).toBe(false);
    expect(isBrowserInjectedRecursion("RangeError: Maximum call stack size exceeded.", "", CRIOS)).toBe(false);
  });

  it("enregistrée en « script tiers », hors du voyant Erreurs du site, avec son explication à l'écran", () => {
    const logger = read("src/lib/errorLogger.ts");
    expect(logger).toContain('? "browser_injected"');
    expect(read("src/pages/admin/AdminErrors.tsx")).toContain("Script du navigateur (Chrome sur iPhone)");
  });
});

describe("articles qui citent celui-ci", () => {
  it("le filtre internal_links part en JSON, jamais en tableau Postgres", () => {
    const src = read("src/pages/ArticleDetail.tsx");
    expect(src).toContain('.contains("internal_links", JSON.stringify([{ url: `/actualites/${slug}` }]))');
    expect(src).not.toMatch(/\.contains\("internal_links", \[\{/);
  });
});
