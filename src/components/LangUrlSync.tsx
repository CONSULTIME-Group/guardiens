import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGS } from "@/i18n";
import { getStoredLang } from "@/lib/lang";

/**
 * L'URL reste l'unique source de vérité pour la langue au rendu.
 *
 * A chaque navigation :
 *   - `?lang=xx` supporté : on bascule i18next sur cette langue ;
 *   - pas de paramètre, mais un choix explicite mémorisé : on réécrit l'URL
 *     avec ce paramètre (remplacement d'historique), pour que le choix
 *     survive aux liens internes qui ne le portent pas ;
 *   - pas de paramètre et aucun choix mémorisé : français.
 *
 * Conséquence voulue : une URL canonique partagée sans paramètre sert du
 * français au crawl, alors qu'un visiteur ayant choisi une langue la garde
 * de page en page.
 */
export const readLangFromSearch = (search: string): string => {
  const raw = new URLSearchParams(search).get("lang");
  if (!raw) return "fr";
  const code = raw.toLowerCase();
  return (SUPPORTED_LANGS as readonly string[]).includes(code) ? code : "fr";
};

const LangUrlSync = () => {
  const { pathname, search, hash } = useLocation();
  const navigate = useNavigate();
  const { i18n } = useTranslation();

  useEffect(() => {
    const params = new URLSearchParams(search);
    const raw = params.get("lang");
    const stored = getStoredLang();

    // Aucun paramètre de langue mais un choix mémorisé : on recolle le
    // paramètre sur l'URL courante plutôt que de retomber en français.
    if (!raw && stored && stored !== "fr") {
      params.set("lang", stored);
      navigate(`${pathname}?${params.toString()}${hash}`, { replace: true });
      return;
    }

    const target = readLangFromSearch(search);
    if (i18n.language !== target) {
      void i18n.changeLanguage(target);
    }
  }, [pathname, search, hash, navigate, i18n]);

  return null;
};

export default LangUrlSync;

