import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGS, loadLanguage } from "@/i18n";
import { getStoredLang, isSupportedLang, setStoredLang } from "@/lib/lang";

/**
 * Recale la langue à chaque navigation, sans jamais réécrire l'URL.
 *
 * Guardiens est monolingue français depuis le 17/08/2026. A chaque
 * changement de route :
 *   - `?lang=fr` explicite : on recale i18next dessus et on mémorise ;
 *   - `?lang=xx` non supporté (anciennes variantes en, de, it, es encore
 *     connues de Google) : repli français immédiat ;
 *   - pas de paramètre : la langue mémorisée est conservée, la navigation du
 *     routeur ne repasse jamais sur une autre langue.
 *
 * Aucune décoration d'URL : ajouter `?lang` sur les liens internes créerait
 * une seconde URL crawlable pour chaque page (articles, guides, villes), donc
 * de la duplication à grande échelle.
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
      // Paramètre explicite mais langue retirée du produit (de, it, es, en
      // le 17/08/2026) : repli francophone immédiat, jamais le choix mémorisé.
      // Une ancienne URL `?lang=en` crawlée par Google doit rendre la page
      // française indexable avec sa canonique auto-référente, pas une
      // variante noindex. Comme tout choix explicite, le repli est mémorisé
      // par le détecteur i18next (caches: localStorage).
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
