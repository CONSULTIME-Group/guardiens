import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import reportWebVitals from "./lib/webVitals";
import { installGlobalErrorHandlers } from "./lib/logger";
import { installGlobalErrorLogger } from "./lib/errorLogger";
import { initConsent } from "./lib/cookieConsent";
import { installStorageFallback } from "./lib/storageFallback";
import { installOAuthDebugHelper } from "./lib/oauthLogger";

installStorageFallback();
installOAuthDebugHelper();

const container = document.getElementById("root");
if (!container) {
  throw new Error("Élément #root introuvable dans le DOM");
}

createRoot(container).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);

const markPrerenderReady = () => {
  window.prerenderReady = true;
};

if (typeof window !== "undefined" && typeof window.requestIdleCallback === "function") {
  window.requestIdleCallback(markPrerenderReady);
} else {
  window.setTimeout(markPrerenderReady, 500);
}

reportWebVitals();
installGlobalErrorHandlers();
installGlobalErrorLogger();
initConsent();
