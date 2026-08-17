import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { LANG_STORAGE_KEY } from "@/lib/langStorageKey";

/**
 * Garde-fou issu d'une régression réelle : une seule clé de stockage de
 * langue peut être écrite dans le code. Deux clés concurrentes (« lang » et
 * « guardiens.lang ») avaient verrouillé des visiteurs en anglais. Depuis le
 * 17/08/2026 le produit est monolingue français, mais la clé unique reste
 * verrouillée : elle sert au repli propre des anciennes variantes ?lang=.
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
