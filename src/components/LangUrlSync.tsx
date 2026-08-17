import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGS, loadLanguage } from "@/i18n";
import { getStoredLang, isSupportedLang, setStoredLang } from "@/lib/lang";

/**
 * Recale la langue à chaque navigation, sans jamais réécrire l'URL.
 *
 * A chaque changement de route :
 *   - `?lang=xx` supporté : on bascule i18next dessus et on mémorise le choix
 *     immédiatement, car une personne arrivée par un lien externe ne verra
 *     jamais le sélecteur ;
 *   - pas de paramètre : la langue mémorisée est conservée, la navigation du
 *     routeur ne repasse plus en français.
 *
 * Aucune décoration d'URL : ajouter `?lang` sur les liens internes créerait
 * une seconde URL crawlable pour chaque page (articles, guides, villes), donc
 * de la duplication à grande échelle. Le paramètre reste réservé aux liens qui
 * sortent du contexte JavaScript.
 */
export const readLangFromSearch = (search: string): string => {
  const raw = new URLSearchParams(search).get("lang");
  if (!raw) return "fr";
  const code = raw.toLowerCase();
  return (SUPPORTED_LANGS as readonly string[]).includes(code) ? code : "fr";
};

const LangUrlSync = () => {
  const { pathname, search, hash } = useLocation();
  const { i18n } = useTranslation();

  useEffect(() => {
    let cancelled = false;
    const raw = new URLSearchParams(search).get("lang")?.toLowerCase();

    // Le dictionnaire est chargé avant la bascule : sans cela, i18next
    // basculerait sur une langue dont les clés ne sont pas encore là.
    const apply = async (target: string) => {
      await loadLanguage(target);
      if (cancelled) return;
      if (i18n.language !== target) await i18n.changeLanguage(target);
    };

    if (isSupportedLang(raw)) {
      // Un lien explicite gagne toujours sur le choix mémorisé, et devient le
      // nouveau choix mémorisé.
      setStoredLang(raw);
      void apply(raw);
    } else if (raw) {
      // Paramètre explicite mais langue retirée du produit (de, it le
      // 17/08/2026) : repli francophone immédiat, jamais le choix mémorisé.
      // Une ancienne URL `?lang=de` crawlée par Google doit rendre la page
      // française indexable avec sa canonique auto-référente, pas une
      // variante noindex. Le choix mémorisé n'est pas effacé : il reprendra
      // à la prochaine navigation sans paramètre.
      void apply("fr");
    } else {
      const stored = getStoredLang();
      if (stored) void apply(stored);
    }

    // L'attribut de langue du document est recalé à chaque route, pas
    // seulement au montage initial.
    if (typeof document !== "undefined") {
      const code = isSupportedLang(i18n.language) ? i18n.language : "fr";
      if (document.documentElement.getAttribute("lang") !== code) {
        document.documentElement.setAttribute("lang", code);
      }
    }

    return () => {
      cancelled = true;
    };
  }, [pathname, search, hash, i18n, i18n.language]);

  return null;
};

export default LangUrlSync;
