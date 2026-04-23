import { installFatalErrorOverlay, showFatalError } from "./lib/fatalErrorOverlay";

// Install FIRST so we capture any error during the rest of the bootstrap.
installFatalErrorOverlay();

import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import reportWebVitals from "./lib/webVitals";
import { installGlobalErrorHandlers } from "./lib/logger";
import { installGlobalErrorLogger } from "./lib/errorLogger";
import { initConsent } from "./lib/cookieConsent";
import { installStorageFallback } from "./lib/storageFallback";

installStorageFallback();

try {
  const container = document.getElementById("root");
  if (!container) {
    throw new Error("Élément #root introuvable dans le DOM");
  }
  const root = createRoot(container);
  root.render(
    <HelmetProvider>
      <App />
    </HelmetProvider>
  );
} catch (err) {
  showFatalError(err, "main.tsx:bootstrap");
}

// Fallback: mark prerender ready after initial render for static pages.
// Pages with async data set prerenderReady = true themselves after fetch.
const markPrerenderReady = () => {
  window.prerenderReady = true;
};

if (typeof window !== "undefined" && typeof window.requestIdleCallback === "function") {
  window.requestIdleCallback(markPrerenderReady);
} else {
  window.setTimeout(markPrerenderReady, 500);
}

// Collect Core Web Vitals (CLS, INP, FCP, LCP, TTFB)
reportWebVitals();

// Catch unhandled errors globally
installGlobalErrorHandlers();
// Persist errors to DB for admin dashboard
installGlobalErrorLogger();
// Initialise GA si l'utilisateur a déjà consenti (RGPD)
initConsent();
