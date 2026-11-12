import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

// Lots PAR1 à PAR3 (12/11/2026) : Paramètres dit l'état réel, se parcourt au
// téléphone et parle d'une seule voix.
const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");
const settings = read("src/pages/Settings.tsx");
const dir = "src/components/settings";
const parts = readdirSync(resolve(process.cwd(), dir)).filter((f) => f.endsWith(".tsx")).map((f) => read(`${dir}/${f}`));
const all = [settings, ...parts].join("\n");

describe("PAR1, l'écran dit l'état réel", () => {
  it("un enregistrement en échec remet l'ancien réglage, une réussite est confirmée", () => {
    expect(settings).toContain("setPrefs(previousPrefs);");
    expect(settings).toContain('toast.success("Réglage enregistré")');
  });

  it("chaque interrupteur porte un nom", () => {
    for (const source of [settings, ...parts]) {
      for (const tag of source.match(/<Switch\b.*?\/>/gs) ?? []) {
        expect(tag, tag).toMatch(/\b(id|aria-label)=/);
      }
    }
  });

  it("cibles de 44 px sous 768 px dans le contenu des paramètres", () => {
    expect(settings).toContain("data-settings-main");
    const css = read("src/index.css");
    expect(css).toMatch(/\[data-settings-main\] button:not\(\[role="switch"\]\)/);
    expect(css).toMatch(/\[data-settings-main\] input:not/);
  });
});

describe("PAR2, navigation au téléphone", () => {
  it("l'adresse suit la section et la liste remplace les pastilles", () => {
    expect(settings).toContain("setSearchParams({ section: id })");
    expect(settings).toContain('data-testid="settings-section-list"');
    expect(settings).toContain('data-testid="settings-back-to-list"');
    expect(settings).not.toContain("overflow-x-auto");
  });
});

describe("PAR3, une seule voix", () => {
  it("une icône par section", () => {
    const icons = [...settings.matchAll(/\{ id: "[a-z-]+", label: "[^"]+", icon: (\w+),/g)].map((m) => m[1]);
    expect(icons.length).toBe(15);
    expect(new Set(icons).size).toBe(15);
  });

  it("mots retirés et textes sans tiret long", () => {
    for (const word of ["Zone dangereuse", "Démarchage", "Sécurité & identité", "Aide & liens"]) {
      expect(all).not.toContain(word);
    }
    expect(all).not.toMatch(/>[^<{]*[–—][^<{]*</);
  });
});
