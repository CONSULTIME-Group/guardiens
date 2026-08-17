import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { LANG_STORAGE_KEY, migrateLegacyLangStorage } from "@/lib/langStorageKey";

// Guardiens est monolingue français depuis le 17/08/2026 : allemand, italien,
// espagnol puis anglais ont été retirés, chacun mesuré sans audience dans
// Search Console. i18next reste en place avec le seul dictionnaire français :
// tous les appels t() fonctionnent à l'identique. Ce retrait concerne une
// langue, pas l'internationalisation elle-même.
//
// Les anciennes variantes `?lang=de|it|es|en` connues de Google retombent sur
// un rendu français indexable (voir LangUrlSync et resolveInitialLang).
import frCommon from "./locales/fr/common.json";

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
    resources: {
      fr: { common: frCommon },
    },
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

export default i18n;
