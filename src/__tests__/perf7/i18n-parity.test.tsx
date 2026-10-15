/**
 * Lot perf 7 : le moteur léger (src/i18n/lite.ts, src/i18n/react.tsx) rend
 * exactement ce que rendait i18next et react-i18next, pour chaque clé du
 * dictionnaire et chaque <Trans> du site. i18next et react-i18next restent
 * en devDependencies pour ce seul contrôle : ils ne partent plus au site.
 */
import { describe, it, expect } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { MemoryRouter, Link } from "react-router-dom";
import { createInstance } from "i18next";
import { I18nextProvider, Trans as RealTrans } from "react-i18next";
import common from "@/i18n/locales/fr/common.json";
import arrival from "@/i18n/locales/fr/arrival.json";
import { LiteI18n } from "@/i18n/lite";
import i18nApp from "@/i18n";
import { Trans as LiteTrans } from "@/i18n/react";

const dict = { ...(common as Record<string, unknown>), arrival };

const real = createInstance();
await real.init({
  lng: "fr",
  fallbackLng: "fr",
  supportedLngs: ["fr"],
  defaultNS: "common",
  ns: ["common"],
  resources: { fr: { common: dict } },
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});
const lite = new LiteI18n({ lng: "fr", supportedLngs: ["fr"], ns: "common", resources: { fr: { common: dict } } });

const leaves: [string, unknown][] = [];
const walk = (o: Record<string, unknown>, p: string) => {
  for (const [k, v] of Object.entries(o)) {
    const key = p ? `${p}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) walk(v as Record<string, unknown>, key);
    else leaves.push([key, v]);
  }
};
walk(dict, "");

const baseKeys = [...new Set(leaves.map(([k]) => k.replace(/_(zero|one|two|few|many|other)$/, "")))];
const varsOf = (s: unknown) => (typeof s === "string" ? [...s.matchAll(/\{\{(.+?)\}\}/g)].map((m) => m[1].trim()) : []);

describe("perf7, parité du moteur léger avec i18next", () => {
  it("dictionnaire complet : chaque clé, sans options, avec chaque nombre et chaque forme de variable", () => {
    expect(leaves.length).toBeGreaterThan(1500);
    let compared = 0;
    for (const key of [...baseKeys, ...leaves.map(([k]) => k), "pricing.owner_card.features", "landing", "cle.absente", "nav.absente"]) {
      const vars = [...new Set([...varsOf(lite.t(key)), ...varsOf(lite.t(key, { count: 2 })), ...varsOf(lite.t(key, { count: 1 }))])];
      const filled = Object.fromEntries(vars.map((v, i) => [v, `V${i}<b>`]));
      const optionSets: Record<string, unknown>[] = [
        {},
        { count: 0 }, { count: 1 }, { count: 2 }, { count: 1_000_000 }, { count: 1.5 },
        filled,
        { ...filled, count: 0 }, { ...filled, count: 1 }, { ...filled, count: 7 },
        Object.fromEntries(vars.map((v) => [v, null])),
        Object.fromEntries(vars.map((v) => [v, undefined])),
        Object.fromEntries(vars.map((v) => [v, 0])),
        { replace: filled },
        { defaultValue: "Par défaut {{x}}", x: "X" },
      ];
      for (const o of optionSets) {
        expect(lite.t(key, o as never), `${key} ${JSON.stringify(o)}`).toBe(real.t(key, o as never));
        compared++;
      }
    }
    expect(compared).toBeGreaterThan(20_000);
  });

  it("valeur par défaut en texte, liste de clés, clé absente", () => {
    for (const args of [
      ["article.home", "Accueil"], ["article.absente", "Accueil"], ["news.all", "Tous"],
      [["cle.absente", "nav.login"]], [["cle.absente", "autre.absente"]],
      ["breeds_listing.species.inconnue", { defaultValue: "inconnue" }],
      ["landing.testimonials.items.absent", { defaultValue: "Texte {{a}}", a: 1 }],
    ] as unknown[][]) {
      expect(lite.t(...(args as [never, never])), JSON.stringify(args)).toBe(real.t(...(args as [never, never])));
    }
    expect(lite.exists("arrival.c1.title")).toBe(real.exists("arrival.c1.title"));
    expect(lite.exists("arrival.absente")).toBe(real.exists("arrival.absente"));
  });

  it("chaque <Trans> du site rend le même HTML", () => {
    const strong = <strong />;
    const cases: [string, Record<string, unknown> | undefined, unknown][] = [
      ["arrival.c3.text", { email: "a@b.fr" }, undefined],
      ["forgot_password.sent_body", { email: "a@b.fr" }, [strong]],
      ["arrival.e1.nearby", { count: 12, radius: 30, city: "Lyon" }, { 1: <strong /> }],
      ["arrival.p2.nearby", { count: 1, radius: 20, city: "Saint-Étienne" }, { 1: <strong /> }],
      ["register_page.confirmation.body", { email: "a&b@exemple.fr" }, { 1: <span className="font-medium" />, 2: <strong className="x" />, 3: <strong className="x" /> }],
      ["register_page.confirmation.spam_check", undefined, { 1: <strong />, 2: <strong /> }],
      ["register_page.confirmation.spam_hotmail", undefined, { 1: <strong /> }],
      ["register_page.confirmation.spam_sender", undefined, { 1: <span className="font-mono" /> }],
      ["register_page.confirmation.mobile_tip", undefined, { 1: <strong /> }],
      ["register_page.accept_label", undefined, { 1: <Link to="/cgu" className="a" />, 2: <Link to="/cgs" />, 3: <Link to="/confidentialite" /> }],
      ["cle.absente", undefined, undefined],
    ];
    for (const [key, values, components] of cases) {
      const a = render(<MemoryRouter><I18nextProvider i18n={real}><RealTrans i18nKey={key} values={values} components={components as never} /></I18nextProvider></MemoryRouter>);
      const expected = a.container.innerHTML;
      cleanup();
      const b = render(<MemoryRouter><LiteTrans i18nKey={key} values={values} components={components as never} t={lite.t} /></MemoryRouter>);
      expect(b.container.innerHTML, key).toBe(expected);
      cleanup();
    }
  });

  it("instance du site : langue, changement de langue, mémoire et dictionnaire", async () => {
    expect(i18nApp.language).toBe("fr");
    await i18nApp.changeLanguage("en");
    expect(i18nApp.language).toBe("fr");
    expect(window.localStorage.getItem("guardiens.lang")).toBe("fr");
    expect(i18nApp.hasResourceBundle("fr", "common")).toBe(true);
    expect(i18nApp.t("nav.login")).toBe(real.t("nav.login"));
  });
});

describe("perf7, i18next ne part plus au site", () => {
  const files: string[] = [];
  const scan = (d: string) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) { if (f !== "__tests__") scan(p); }
      else if (/\.(tsx?|mjs|js)$/.test(f)) files.push(p);
    }
  };
  scan("src");

  it("aucun import d'i18next ni de react-i18next hors des tests", () => {
    const offenders = files.filter((f) => /from ["'](i18next|react-i18next|i18next-browser-languagedetector)["']/.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });

  it("i18next et react-i18next en devDependencies seulement, détecteur retiré", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8"));
    for (const name of ["i18next", "react-i18next", "i18next-browser-languagedetector"]) expect(pkg.dependencies?.[name], name).toBeUndefined();
    expect(pkg.devDependencies?.["i18next-browser-languagedetector"]).toBeUndefined();
  });
});
