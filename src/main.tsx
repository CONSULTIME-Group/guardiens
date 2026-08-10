import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import reportWebVitals from "./lib/webVitals";
import { installGlobalErrorHandlers } from "./lib/logger";
import { installGlobalErrorLogger } from "./lib/errorLogger";
import { initConsent } from "./lib/cookieConsent";
import { installStorageFallback } from "./lib/storageFallback";
import { installOAuthDebugHelper } from "./lib/oauthLogger";
import { loadLanguage, SUPPORTED_LANGS } from "./i18n";
import { getStoredLang } from "@/lib/lang";

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
    // storage indisponible (mode privé, iframe cross-origin) — no-op
  }
}

const container = document.getElementById("root");
if (!container) {
  throw new Error("Élément #root introuvable dans le DOM");
}

/**
 * Langue cible avant le premier rendu : lien explicite, puis choix mémorisé,
 * puis détection navigateur, puis français. La logique de détection d'i18next
 * n'est pas modifiée, on se contente de savoir quel dictionnaire précharger.
 */
const resolveInitialLang = (): string => {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get("lang")?.toLowerCase();
    if (fromUrl && (SUPPORTED_LANGS as readonly string[]).includes(fromUrl)) return fromUrl;
  } catch {
    // URL illisible : on continue sur le choix mémorisé.
  }

  const stored = getStoredLang();
  if (stored) return stored;

  try {
    if (typeof navigator !== "undefined") {
      const candidate = navigator.language || (navigator.languages && navigator.languages[0]);
      if (candidate) {
        const code = candidate.split("-")[0].toLowerCase().slice(0, 2);
        if ((SUPPORTED_LANGS as readonly string[]).includes(code)) return code;
      }
    }
  } catch {
    // Détection navigateur indisponible : repli sur le français.
  }

  return "fr";
};

const renderApp = () => {
  createRoot(container).render(
    <App />
  );
};

const bootstrap = async () => {
  const target = resolveInitialLang();
  if (target !== "fr") {
    try {
      // Le rendu n'attend jamais plus de 1,5 s : un CDN lent dégrade en
      // français plutôt que de retarder l'affichage.
      await Promise.race([
        loadLanguage(target),
        new Promise((resolve) => window.setTimeout(resolve, 1500)),
      ]);
    } catch {
      // Repli silencieux : le rendu a lieu quoi qu'il arrive.
    }
  }
  renderApp();
};

void bootstrap();

// Fallback prerenderReady : PageMeta est la source de vérité et flippe le flag
// à la fin de son useEffect (après upsert du canonical par langue). Ce fallback
// couvre uniquement les routes sans PageMeta (ex : /annonces/* qui a son propre
// chemin OG server-side). Délai généreux pour laisser React + fetch + PageMeta
// s'exécuter avant que Prerender ne capture.
const markPrerenderReady = () => {
  if (window.location.pathname.startsWith("/annonces/")) {
    return;
  }
  window.prerenderReady = true;
};

if (typeof window !== "undefined") {
  window.setTimeout(markPrerenderReady, 3000);
}

reportWebVitals();
installGlobalErrorHandlers();
installGlobalErrorLogger();
initConsent();
