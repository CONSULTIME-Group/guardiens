import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { trackEvent } from "@/lib/analytics";

/**
 * Track une vue de page à chaque changement de route.
 * Doit être monté à l'intérieur de <BrowserRouter>.
 */
const PageViewTracker = () => {
  const location = useLocation();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    // Évite double-fire (StrictMode + initial render)
    if (lastPath.current === location.pathname) return;
    lastPath.current = location.pathname;

    trackEvent("page_view", {
      source: location.pathname,
      metadata: {
        path: location.pathname,
        search: location.search || undefined,
        referrer: typeof document !== "undefined" ? document.referrer || undefined : undefined,
      },
    });
  }, [location.pathname, location.search]);

  return null;
};

export default PageViewTracker;
