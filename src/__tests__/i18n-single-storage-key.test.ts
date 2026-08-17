import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { LANG_STORAGE_KEY } from "@/lib/langStorageKey";

/**
 * Deux garde-fous sur l'internationalisation, issus d'une régression réelle :
 *
 * 1. Une seule clé de stockage de langue peut être écrite dans le code. Deux
 *    clés concurrentes (« lang » et « guardiens.lang ») avaient verrouillé des
 *    visiteurs en anglais.
 * 2. Aucun rendu mixte possible : chaque dictionnaire doit couvrir toutes les
 *    clés du français, sinon un écran peut afficher un titre anglais au dessus
 *    d'un paragraphe français.
 */

const SRC = path.resolve(process.cwd(), "src");

const walk = (dir: string, out: string[] = []): string[] => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "locales") continue;
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
};

describe("une seule clé de stockage de langue", () => {
  it("aucun fichier n'écrit une clé de langue autre que la clé canonique", () => {
    const offenders: string[] = [];
    const writeRe = /(?:localStorage|sessionStorage)\s*\.\s*setItem\(\s*["'`]([^"'`]+)["'`]/g;
    const suspicious = /^(lang|language|locale|i18nextLng|i18next)$/i;

    for (const file of walk(SRC)) {
      const code = fs.readFileSync(file, "utf8");
      for (const match of code.matchAll(writeRe)) {
        const key = match[1];
        if (key !== LANG_STORAGE_KEY && suspicious.test(key)) {
          offenders.push(`${path.relative(SRC, file)} : ${key}`);
        }
      }
    }

    expect(offenders, `clés de langue concurrentes : ${offenders.join(", ")}`).toEqual([]);
  });

  it("le détecteur i18next pointe sur la clé canonique", () => {
    const code = fs.readFileSync(path.join(SRC, "i18n/index.ts"), "utf8");
    expect(code).toContain("lookupLocalStorage: LANG_STORAGE_KEY");
  });
});

const flatten = (obj: Record<string, unknown>, prefix = "", acc: string[] = []): string[] => {
  for (const [key, value] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      flatten(value as Record<string, unknown>, full, acc);
    } else {
      acc.push(full);
    }
  }
  return acc;
};

describe("aucun rendu mixte possible", () => {
  const localesDir = path.join(SRC, "i18n/locales");
  const fr = new Set(
    flatten(JSON.parse(fs.readFileSync(path.join(localesDir, "fr/common.json"), "utf8"))),
  );

  for (const lng of ["en", "es"]) {
    it(`le dictionnaire ${lng} couvre toutes les clés françaises`, () => {
      const keys = new Set(
        flatten(JSON.parse(fs.readFileSync(path.join(localesDir, `${lng}/common.json`), "utf8"))),
      );
      const missing = [...fr].filter((k) => !keys.has(k));
      expect(missing, `clés manquantes en ${lng} : ${missing.slice(0, 20).join(", ")}`).toEqual([]);
    });
  }
});
