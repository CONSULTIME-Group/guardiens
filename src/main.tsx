import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import reportWebVitals from "./lib/webVitals";
import { installGlobalErrorHandlers } from "./lib/logger";
import { installGlobalErrorLogger } from "./lib/errorLogger";
import { initConsent } from "./lib/cookieConsent";
import { installStorageFallback } from "./lib/storageFallback";
import { installOAuthDebugHelper } from "./lib/oauthLogger";
import { installDomTranslationGuard } from "./lib/domTranslationGuard";

installDomTranslationGuard();
installStorageFallback();
installOAuthDebugHelper();

// RGPD : en production, forcer un loglevel restrictif pour éviter que des
// données personnelles ne fuient dans la console navigateur via des libs
// tierces qui lisent `localStorage['loglevel']` (loglevel, debug, etc.).
// Ne touche pas aux environnements dev / preview.
if (import.meta.env.PROD && typeof window !== "undefined") {
  try {
    const current = window.localStorage.getItem("loglevel");
    if (!current || !/^(ERROR|WARN|SILENT)$/i.test(current)) {
      window.localStorage.setItem("loglevel", "ERROR");
    }
    // Neutralise également le canal `debug` (npm `debug`) qui log en clair.
    if (window.localStorage.getItem("debug")) {
      window.localStorage.removeItem("debug");
    }
  } catch {
    // storage indisponible (mode privé, iframe cross-origin), aucune action
  }
}

const container = document.getElementById("root");
if (!container) {
  throw new Error("Élément #root introuvable dans le DOM");
}

// Guardiens est monolingue français : le seul dictionnaire (fr) est importé
// statiquement par i18next à l'init, il n'y a plus rien à précharger avant le
// premier rendu. Le repli des anciennes URL `?lang=xx` est géré par
// LangUrlSync et `src/lib/lang.ts`.
createRoot(container).render(
  <App />
);

// Fallback prerenderReady : PageMeta est la source de vérité et lève le drapeau
// à la fin de son useEffect, après écriture du canonical. Ce fallback couvre
// uniquement les routes sans PageMeta. Une page qui prépare ses métadonnées
// garde explicitement le verrou, même si son chargement dépasse le délai.
const markPrerenderReady = () => {
  if (window.location.pathname.startsWith("/annonces/")) return;
  if (window.prerenderMetaPending) return;
  window.prerenderReady = true;
};

if (typeof window !== "undefined") {
  window.setTimeout(markPrerenderReady, 10000);
}

reportWebVitals();
installGlobalErrorHandlers();
installGlobalErrorLogger();
initConsent();
