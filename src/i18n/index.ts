import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { LANG_STORAGE_KEY, migrateLegacyLangStorage } from "@/lib/langStorageKey";

// Seul le français est embarqué dans le bundle d'entrée : c'est la langue de
// repli et la langue de la très grande majorité des visites. Les deux autres
// dictionnaires sont chargés à la demande par loadLanguage(), en chunks
// séparés, pour ne pas faire télécharger et analyser des dictionnaires
// inutiles avant le premier rendu.
//
// Langues retirées le 17/08/2026 : allemand et italien. Leurs variantes
// `?lang=de|it` connues de Google renvoyaient `noindex` + canonique vers le
// français, combinaison déconseillée. Elles retombent désormais sur un
// rendu français indexable (voir LangUrlSync et resolveInitialLang).
import frCommon from "./locales/fr/common.json";

export const SUPPORTED_LANGS = ["fr", "en", "es"] as const;
export type SupportedLang = (typeof SUPPORTED_LANGS)[number];

export const LANG_LABELS: Record<SupportedLang, { native: string; flag: string }> = {
  fr: { native: "Français", flag: "🇫🇷" },
  en: { native: "English", flag: "🇬🇧" },
  es: { native: "Español", flag: "🇪🇸" },
};

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
    // Les dictionnaires arrivent après l'init, via addResourceBundle : sans
    // cette option, i18next considérerait les langues absentes des resources
    // comme non chargées et n'irait jamais les relire.
    partialBundledLanguages: true,
    load: "languageOnly",
    detection: {
      // Un lien explicite (`?lang=xx`) gagne toujours. Sans paramètre, le
      // choix mémorisé prend le relais, puis la langue du navigateur. Sans
      // cette persistance, la première navigation interne sans querystring
      // retombait en français : c'était le mécanisme exact du bug.
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
 * Charge à la demande le dictionnaire d'une langue autre que le français.
 *
 * Le chemin d'import est écrit en dur dans chaque branche : Vite a besoin de
 * littéraux statiques pour produire un chunk par langue. Un échec réseau est
 * absorbé sans bruit, la page reste alors en français plutôt que de casser.
 */
export async function loadLanguage(lng: string): Promise<void> {
  if (lng === "fr") return;
  if (!(SUPPORTED_LANGS as readonly string[]).includes(lng)) return;
  if (i18n.hasResourceBundle(lng, "common")) return;

  try {
    let mod: { default: Record<string, unknown> };
    switch (lng) {
      case "en":
        mod = await import("./locales/en/common.json");
        break;
      case "es":
        mod = await import("./locales/es/common.json");
        break;
      default:
        return;
    }
    i18n.addResourceBundle(lng, "common", mod.default, true, true);
  } catch {
    // Chargement impossible (réseau, CDN) : repli silencieux sur le français.
  }
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
