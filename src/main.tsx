import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";

const root = createRoot(document.getElementById("root")!);
root.render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);

// Fallback: mark prerender ready after initial render for static pages.
// Pages with async data set prerenderReady = true themselves after fetch.
requestIdleCallback?.(() => { window.prerenderReady = true; }) ??
  setTimeout(() => { window.prerenderReady = true; }, 500);
