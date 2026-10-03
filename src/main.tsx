import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installGlobalErrorHandlers } from "./lib/logger";
import { installGlobalErrorLogger } from "./lib/errorLogger";
import { initConsent } from "./lib/cookieConsent";
import { installStorageFallback } from "./lib/storageFallback";
import { installDomTranslationGuard } from "./lib/domTranslationGuard";
import { initPwaInstall } from "./lib/pwa-install";
import "./i18n";
import { runAfterFirstPaint, prefetchRouteChunk } from "./lib/bootSchedule";

// Lot P2, travaux gardés avant le rendu (justesse) :
// - installDomTranslationGuard : protège le DOM contre la traduction du
//   navigateur, doit précéder la première écriture de React ;
// - installStorageFallback : l'authentification lit le stockage au démarrage ;
// - initPwaInstall : l'événement d'installation peut arriver très tôt et
//   n'est émis qu'une fois ;
// - gestionnaires d'erreurs et consentement (plus bas) : légers, et doivent
//   couvrir le démarrage lui-même.
installDomTranslationGuard();
installStorageFallback();
initPwaInstall();
// Outil de débogage OAuth : jamais dans le parcours de production.
if (import.meta.env.DEV) {
  void import("./lib/oauthLogger").then((m) => m.installOAuthDebugHelper());
}
// Tableau de bord : son fichier est demandé dès le démarrage, en parallèle
// de la vérification de session, quand un jeton est présent.
prefetchRouteChunk(window.location.pathname);

// RGPD : en production, forcer un loglevel restrictif pour éviter que des
// données personnelles ne fuient dans la console navigateur via des libs
// tierces qui lisent `localStorage['loglevel']` (loglevel, debug, etc.).
// Ne touche pas aux environnements dev / preview.
if (import.meta.env.PROD) {
  try {
    const ls = localStorage;
    if (!/^(ERROR|WARN|SILENT)$/i.test(ls.getItem("loglevel") || "")) ls.setItem("loglevel", "ERROR");
    // Neutralise également le canal `debug` (npm `debug`) qui log en clair.
    ls.removeItem("debug");
  } catch {
    // storage indisponible (mode privé, iframe cross-origin), aucune action
  }
}

// #root absent : createRoot lève lui-même une erreur (plafond de taille).
const container = document.getElementById("root")!;

// Routes lazy qui écrivent leurs métadonnées tardivement (après un chargement
// de données). Le verrou est posé ici, avant le rendu, car le chunk de la
// route peut arriver après le délai du repli global sur réseau dégradé.
// Liste volontairement courte et explicite, à compléter route par route :
// fiche gardien publique (/gardiens/), fiche projet (/projets/, lot SEO-2),
// liste des actualités (/actualites et /actualites/page/N, lot SEO-4 : prête
// seulement une fois la liste affichée par News.tsx). Les articles
// /actualites/:slug ne sont pas concernés.
// Expression unique (plafond de taille du démarrage).
const LATE_META_PATH = /^\/(gardiens\/|projets\/|actualites(\/page\/|\/?$))/;

// Ce module ne s'exécute que dans le navigateur (document lu plus haut).
if (LATE_META_PATH.test(location.pathname)) {
  window.prerenderMetaPending = true;
  window.prerenderReady = false;
}

// Guardiens est monolingue français : le seul dictionnaire (fr) est importé
// statiquement par i18next à l'init, il n'y a plus rien à précharger avant le
// premier rendu. Le repli des anciennes URL `?lang=xx` est géré par
// LangUrlSync et `src/lib/lang.ts`.
// Lot P2b : rendu immédiat, jamais suspendu à un chargement réseau.
createRoot(container).render(<App />);

// Fallback prerenderReady : PageMeta est la source de vérité et lève le drapeau
// à la fin de son useEffect, après écriture du canonical. Ce fallback couvre
// uniquement les routes sans PageMeta. Une page qui prépare ses métadonnées
// garde explicitement le verrou, même si son chargement dépasse le délai.
const markPrerenderReady = () => {
  if (window.location.pathname.startsWith("/annonces/")) return;
  if (window.prerenderMetaPending) return;
  window.prerenderReady = true;
};

window.setTimeout(markPrerenderReady, 10000);

// Lot P2b : la mesure réelle (webVitals) démarre avec AfterPaintExtras, après le premier affichage.
installGlobalErrorHandlers();
installGlobalErrorLogger();
initConsent();
