import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
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
// Les anciennes variantes `?lang=de|it|es|en` connues de Google retombent sur
// un rendu français indexable (voir LangUrlSync et resolveInitialLang).
// Lot P2b : le dictionnaire est de nouveau importé statiquement. Le premier
// rendu n'attend aucun chargement réseau (P2 le suspendait à un aller-retour).

export const SUPPORTED_LANGS = ["fr"] as const;
export type SupportedLang = (typeof SUPPORTED_LANGS)[number];

// Une seule mémoire de langue : les clés héritées d'anciennes versions du
// détecteur sont reprises puis effacées avant toute détection.
migrateLegacyLangStorage(SUPPORTED_LANGS as readonly string[]);

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "fr",
    supportedLngs: SUPPORTED_LANGS as unknown as string[],
    defaultNS: "common",
    ns: ["common"],
    resources: { fr: { common: (globalThis as any).__I18N_FULL__ ?? { a11y, article, footer, nav } } },
    // Conservée pour le jour où un dictionnaire arriverait après l'init :
    // sans cette option, i18next considérerait une langue absente des
    // resources comme non chargée et n'irait jamais la relire.
    partialBundledLanguages: true,
    load: "languageOnly",
    detection: {
      // Un lien explicite (`?lang=fr`) gagne toujours. Sans paramètre, le
      // choix mémorisé prend le relais, puis la langue du navigateur. Avec
      // un seul dictionnaire, tout cela converge vers le français.
      // Une seule clé de stockage, définie dans src/lib/langStorageKey.ts.
      order: ["querystring", "localStorage", "navigator"],
      caches: ["localStorage"],
      lookupQuerystring: "lang",
      lookupLocalStorage: LANG_STORAGE_KEY,
    },
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });

let full: Promise<void> | null = null;
/** Dictionnaire complet, chargé une fois (nouvelle tentative après un échec). */
export function loadFullDictionary(): Promise<void> {
  return (full ??= import("./locales/fr/common.json?raw")
    .then((m) => { i18n.addResourceBundle("fr", "common", JSON.parse(m.default), true, true); })
    .catch((e) => { full = null; throw e; }));
}
setDictionaryGate(loadFullDictionary);
void loadFullDictionary().catch(() => {});

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
