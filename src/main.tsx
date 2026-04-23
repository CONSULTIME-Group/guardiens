import { installFatalErrorOverlay, showFatalError } from "./lib/fatalErrorOverlay";
import "./index.css";
import reportWebVitals from "./lib/webVitals";
import { installGlobalErrorHandlers } from "./lib/logger";
import { installGlobalErrorLogger } from "./lib/errorLogger";
import { initConsent } from "./lib/cookieConsent";
import { installStorageFallback } from "./lib/storageFallback";

installFatalErrorOverlay();
installStorageFallback();

async function bootstrap() {
  try {
    const container = document.getElementById("root");
    if (!container) {
      throw new Error("Élément #root introuvable dans le DOM");
    }

    const [{ createRoot }, { HelmetProvider }, { default: App }] = await Promise.all([
      import("react-dom/client"),
      import("react-helmet-async"),
      import("./App.tsx"),
    ]);

    const root = createRoot(container);
    root.render(
      <HelmetProvider>
        <App />
      </HelmetProvider>
    );
  } catch (err) {
    showFatalError(err, "main.tsx:bootstrap");
    return;
  }

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
}

void bootstrap();

