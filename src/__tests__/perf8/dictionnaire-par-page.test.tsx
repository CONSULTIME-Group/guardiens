/**
 * Lot perf 8 : chaque fichier apporte les espaces du dictionnaire qu'il cite
 * (scripts/vite-plugin-i18n-namespaces.mjs), plus aucune page n'attend le
 * dictionnaire complet. Le contrôle sur le site réel (90 pages publiques,
 * texte identique, aucun recours au filet) est décrit dans AGENTS.md.
 */
import { describe, it, expect } from "vitest";
import { render, act, cleanup } from "@testing-library/react";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { BASE_NAMESPACES, i18nNamespacesPlugin, isScannedModule, namespacesIn, readDictionary } from "../../../scripts/vite-plugin-i18n-namespaces.mjs";
import { LiteI18n } from "@/i18n/lite";
import i18nApp from "@/i18n";
import { useTranslation } from "@/i18n/react";

const dict = readDictionary();
const NS = Object.keys(dict);

describe("perf8, espaces cités par un fichier", () => {
  it("clés écrites, préfixes de clés construites, guillemets, apostrophes et accents graves", () => {
    const code = [
      `t("landing.hero.title")`,
      "t(`emergency_page.${k}`)",
      `const K = { a: 'pricing.owner_card.title' }`,
      `<Trans i18nKey="register_page.accept_label" />`,
      `t("nav.login"); t("footer.x"); t("a11y.y"); t("article.z")`,
      `const s = "landing"; const u = "emergency_page"; t("inconnu.cle")`,
    ].join("\n");
    expect(namespacesIn(code, NS)).toEqual(["emergency_page", "landing", "pricing", "register_page"]);
  });

  it("les espaces de l'entrée ne sont jamais injectés", () => {
    expect(BASE_NAMESPACES).toEqual(["a11y", "article", "footer", "nav"]);
    expect(namespacesIn(`t("nav.login")`, NS)).toEqual([]);
  });

  it("fichiers analysés : sources de l'application seulement", () => {
    const root = "/r";
    expect(isScannedModule("/r/src/pages/Landing.tsx", root)).toBe(true);
    expect(isScannedModule("/r/src/i18n/index.ts", root)).toBe(false);
    expect(isScannedModule("/r/src/__tests__/a.test.tsx", root)).toBe(false);
    expect(isScannedModule("/r/node_modules/x/index.js", root)).toBe(false);
    expect(isScannedModule("\0i18n-ns:landing", root)).toBe(false);
    expect(isScannedModule("/r/src/i18n/locales/fr/common.json", root)).toBe(false);
  });

  it("le greffon injecte l'import de l'espace et le module virtuel l'enregistre", () => {
    const plugin = i18nNamespacesPlugin() as any;
    plugin.configResolved({ root: process.cwd() });
    const out = plugin.transform(`export const a = () => t("landing.hero.title");\n`, `${process.cwd()}/src/x.tsx`);
    expect(out.code.startsWith(`import "virtual:i18n-ns/landing";export const a`)).toBe(true);
    expect(out.code.split("\n").length).toBe(2);
    expect(plugin.resolveId("virtual:i18n-ns/landing")).toBe("\0i18n-ns:landing");
    const mod = plugin.load.call({ error: (m: string) => { throw new Error(m); } }, "\0i18n-ns:landing");
    expect(mod).toContain('addResourceBundle("fr", "common", JSON.parse(');
    const payload = JSON.parse(JSON.parse(mod.match(/JSON\.parse\(("(?:[^"\\]|\\.)*")\)/)[1]));
    expect(payload).toEqual({ landing: dict.landing });
    expect(() => plugin.load.call({ error: (m: string) => { throw new Error(m); } }, "\0i18n-ns:inconnu")).toThrow(/espace inconnu/);
    expect(plugin.transform(`const a = 1;`, `${process.cwd()}/src/y.ts`)).toBeNull();
    expect(plugin.config().define.__I18N_LAZY_NAMESPACES__).toBe(JSON.stringify(NS.filter((n) => !BASE_NAMESPACES.includes(n))));
  });
});

describe("perf8, filet d'un espace absent", () => {
  it("une clé dont l'espace manque prévient une fois par clé lue, jamais pour un espace chargé", () => {
    const e = new LiteI18n({ lng: "fr", supportedLngs: ["fr"], resources: { fr: { common: { nav: { login: "Connexion" } } } } });
    const calls: string[] = [];
    e.onMissingNamespace = (ns, key) => calls.push(`${ns}|${key}`);
    expect(e.t("landing.hero.title")).toBe("landing.hero.title");
    expect(e.t("nav.absente")).toBe("nav.absente");
    expect(e.t("nav.login")).toBe("Connexion");
    expect(calls).toEqual(["landing|landing.hero.title"]);
  });

  it("useTranslation redessine les textes quand le filet a chargé l'espace", () => {
    let renders = 0;
    const Probe = () => { renders++; const { t } = useTranslation(); return <span>{t("nav.login")}</span>; };
    render(<Probe />);
    const before = renders;
    act(() => { i18nApp.emit("namespacesLoaded", "landing"); });
    expect(renders).toBe(before + 1);
    cleanup();
  });
});

describe("perf8, tout appel de traduction vise un espace écrit dans son fichier", () => {
  // Une clé construite sans aucun préfixe écrit (venue d'un autre fichier, du
  // serveur) ne serait chargée que par le filet : chaque exception est listée ici.
  const ALLOWED = new Set(["src/components/LangUrlSync.tsx", "src/components/favorites/SitCard.tsx", "src/i18n/react.tsx", "src/i18n/index.ts"]);
  const files: string[] = [];
  const scan = (d: string) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) { if (!["__tests__", "locales", "test"].includes(f)) scan(p); }
      else if (/\.tsx?$/.test(f) && !/\.(test|spec)\.tsx?$/.test(f)) files.push(p);
    }
  };
  scan("src");

  it("aucun fichier qui traduit sans citer d'espace, hors exceptions connues", () => {
    const nsRe = new RegExp(`["'\`](${[...NS, "arrival"].join("|")})\\.[A-Za-z0-9_$]`);
    const offenders = files.filter((f) => {
      const s = readFileSync(f, "utf8");
      return /useTranslation\(|<Trans\b|i18n\.t\(/.test(s) && !nsRe.test(s) && !ALLOWED.has(f.split("\\").join("/"));
    });
    expect(offenders).toEqual([]);
  });

  it("plus aucune page n'attend le dictionnaire complet dans le build", () => {
    const src = readFileSync("src/i18n/index.ts", "utf8");
    expect(src).toMatch(/if \(lazyNamespaces\) \{[\s\S]*onMissingNamespace[\s\S]*\} else \{[\s\S]*setDictionaryGate\(loadFullDictionary\)/);
    const preload = readFileSync("scripts/vite-plugin-route-preload.mjs", "utf8");
    expect(preload).not.toMatch(/common\.json/);
    const cfg = readFileSync("vite.config.ts", "utf8");
    expect(cfg).toMatch(/plugins: \[\s*\/\/[^\n]*\n\s*i18nNamespacesPlugin\(\),/);
  });
});
