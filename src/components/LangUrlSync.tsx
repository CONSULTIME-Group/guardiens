import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGS } from "@/i18n";

/**
 * L'URL est l'unique source de vérité pour la langue.
 *
 * A chaque navigation :
 *   - `?lang=xx` supporté : on bascule i18next sur cette langue ;
 *   - pas de paramètre (ou valeur inconnue) : on revient au français.
 *
 * Conséquence voulue : une URL canonique (sans paramètre) sert toujours du
 * français, au visiteur comme au crawl, et la langue ne reste plus collée
 * d'une page à l'autre via un cookie ou le localStorage.
 */
export const readLangFromSearch = (search: string): string => {
  const raw = new URLSearchParams(search).get("lang");
  if (!raw) return "fr";
  const code = raw.toLowerCase();
  return (SUPPORTED_LANGS as readonly string[]).includes(code) ? code : "fr";
};

const LangUrlSync = () => {
  const { search } = useLocation();
  const { i18n } = useTranslation();

  useEffect(() => {
    const target = readLangFromSearch(search);
    if (i18n.language !== target) {
      void i18n.changeLanguage(target);
    }
  }, [search, i18n]);

  return null;
};

export default LangUrlSync;
