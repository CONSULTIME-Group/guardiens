import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { trackEvent } from "@/lib/analytics";

/**
 * Track une vue de page à chaque changement de route.
 * Doit être monté à l'intérieur de <BrowserRouter>.
 *
 * Dédup stricte :
 * - on n'émet pas deux page_view consécutifs pour le même pathname
 * - on n'émet pas deux page_view pour le même pathname à moins de 1500 ms d'intervalle
 *   (évite les double-fires StrictMode + remounts + changements de querystring purement UI)
 */
const PageViewTracker = () => {
  const location = useLocation();
  const lastPath = useRef<string | null>(null);
  const lastEmitAt = useRef<number>(0);

  useEffect(() => {
    const now = Date.now();
    if (lastPath.current === location.pathname && now - lastEmitAt.current < 1500) return;

    lastPath.current = location.pathname;
    lastEmitAt.current = now;

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
