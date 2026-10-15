import { LiteI18n } from "./lite";
// Lot P5 : seuls les textes du premier écran (en-tête, pied de page,
// accessibilité) restent dans l'entrée ; le dictionnaire complet arrive en
// parallèle et chaque page paresseuse l'attend (src/lib/dictionaryGate.ts).
import { a11y, article, footer, nav } from "./locales/fr/common.json";
import { setDictionaryGate } from "@/lib/dictionaryGate";
import { LANG_STORAGE_KEY, migrateLegacyLangStorage } from "@/lib/langStorageKey";

// Guardiens est monolingue français depuis le 17/08/2026 : allemand, italien,
// espagnol puis anglais ont été retirés, chacun mesuré sans audience dans
// Search Console. i18next reste en place avec le seul dictionnaire français :
// tous les appels t() fonctionnent à l'identique. Ce retrait concerne une
// langue, pas l'internationalisation elle-même.
//
// Lot perf 7 (15/10/2026) : i18next, react-i18next et leur détecteur de
// langue sont remplacés par un moteur léger (./lite.ts, ./react.tsx) qui
// reprend exactement les usages du site, parité vérifiée contre i18next
// clé par clé (src/__tests__/perf7/). 19 Ko compressés de moins sur
// chaque page.
//
// Les anciennes variantes `?lang=de|it|es|en` connues de Google retombent sur
// un rendu français indexable (voir LangUrlSync et resolveInitialLang).
// Lot P2b : le dictionnaire est de nouveau importé statiquement. Le premier
// rendu n'attend aucun chargement réseau (P2 le suspendait à un aller-retour).

export const SUPPORTED_LANGS = ["fr"] as const;
export type SupportedLang = (typeof SUPPORTED_LANGS)[number];

// Une seule mémoire de langue : les clés héritées d'anciennes versions du
// détecteur sont reprises puis effacées avant toute détection.
migrateLegacyLangStorage(SUPPORTED_LANGS as readonly string[]);

const i18n = new LiteI18n({
  lng: "fr",
  supportedLngs: SUPPORTED_LANGS as unknown as string[],
  ns: "common",
  resources: { fr: { common: (globalThis as any).__I18N_FULL__ ?? { a11y, article, footer, nav } } },
});

// Mémoire de langue, comme le détecteur d'i18next (caches: localStorage) :
// la langue retenue est écrite au démarrage puis à chaque changement. Un
// lien explicite (`?lang=fr`), le choix mémorisé ou la langue du navigateur
// convergent tous vers le français, seule langue proposée.
const cacheLanguage = (lng: string) => {
  try { if (typeof window !== "undefined") window.localStorage.setItem(LANG_STORAGE_KEY, lng); } catch { /* stockage indisponible */ }
};
i18n.on("cacheLanguage", cacheLanguage);
cacheLanguage(i18n.language);

let full: Promise<void> | null = null;
/** Dictionnaire complet, chargé une fois (nouvelle tentative après un échec). */
export function loadFullDictionary(): Promise<void> {
  return (full ??= import("./locales/fr/common.json?raw")
    .then((m) => { i18n.addResourceBundle("fr", "common", JSON.parse(m.default), true, true); })
    .catch((e) => { full = null; throw e; }));
}

// Lot perf 8 : chaque fichier qui cite une clé apporte son espace du
// dictionnaire (scripts/vite-plugin-i18n-namespaces.mjs). Plus aucune page
// n'attend le dictionnaire complet (dictionaryGate n'est plus armé). Filet :
// une clé dont l'espace manque charge le dictionnaire complet, redessine les
// textes (événement namespacesLoaded) et laisse une trace dans le journal.
declare const __I18N_LAZY_NAMESPACES__: string[] | undefined;
const lazyNamespaces: readonly string[] | null =
  typeof __I18N_LAZY_NAMESPACES__ !== "undefined" ? __I18N_LAZY_NAMESPACES__ : null;
if (lazyNamespaces) {
  const reported = new Set<string>();
  i18n.onMissingNamespace = (ns, key) => {
    if (!lazyNamespaces.includes(ns) || reported.has(ns)) return;
    reported.add(ns);
    void loadFullDictionary()
      .then(() => i18n.emit("namespacesLoaded", ns))
      .catch(() => { reported.delete(ns); });
    void import("@/lib/errorLogger")
      .then((m) => m.reportError(new Error(`i18n_namespace_fallback:${ns}`), { key, source: "i18n" }))
      .catch(() => {});
  };
} else {
  // Hors build (tests) : ancien comportement, le dictionnaire complet est attendu.
  setDictionaryGate(loadFullDictionary);
  void loadFullDictionary().catch(() => {});
}

/**
 * Monolingue français : il n'existe plus aucun dictionnaire à charger à la
 * demande. Conservée pour son unique appelant (LangUrlSync), la fonction est
 * volontairement sans effet.
 */
export async function loadLanguage(_lng: string): Promise<void> {
  return;
}

// Sync <html lang> on every language change.
if (typeof document !== "undefined") {
  const apply = (lng: string) => {
    const code = (SUPPORTED_LANGS as readonly string[]).includes(lng) ? lng : "fr";
    document.documentElement.setAttribute("lang", code);
  };
  apply(i18n.language || "fr");
  i18n.on("languageChanged", apply);
}

/** Conservée pour compatibilité : le dictionnaire est présent dès l'init. */
export const i18nReady: Promise<void> = Promise.resolve();

export default i18n;
