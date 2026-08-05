import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import frCommon from "./locales/fr/common.json";
import enCommon from "./locales/en/common.json";
import esCommon from "./locales/es/common.json";
import itCommon from "./locales/it/common.json";
import deCommon from "./locales/de/common.json";

export const SUPPORTED_LANGS = ["fr", "en", "es", "it", "de"] as const;
export type SupportedLang = (typeof SUPPORTED_LANGS)[number];

export const LANG_LABELS: Record<SupportedLang, { native: string; flag: string }> = {
  fr: { native: "Français", flag: "🇫🇷" },
  en: { native: "English", flag: "🇬🇧" },
  es: { native: "Español", flag: "🇪🇸" },
  it: { native: "Italiano", flag: "🇮🇹" },
  de: { native: "Deutsch", flag: "🇩🇪" },
};

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
      en: { common: enCommon },
      es: { common: esCommon },
      it: { common: itCommon },
      de: { common: deCommon },
    },
    detection: {
      // La langue vit dans l'URL, et seulement dans l'URL (`?lang=xx`).
      // Aucune persistance en cookie ni en localStorage : une URL sans
      // paramètre sert toujours du français, y compris au crawl. Voir
      // src/components/LangUrlSync.tsx qui recale le state sur l'URL à
      // chaque navigation.
      order: ["querystring"],
      caches: [],
      lookupQuerystring: "lang",
    },
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });

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
