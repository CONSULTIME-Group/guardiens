import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { trackEvent } from "@/lib/analytics";
import { captureUtmFromUrl } from "@/lib/campaignAttribution";
import { trackGoogleAnalyticsPageView } from "@/lib/cookieConsent";

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
    const path = location.pathname;

    // Ignore les chemins parasites :
    // - /assets/* : bundles JS/CSS, sourcemaps (.js.map), tombent dans le SPA fallback
    //   et seraient comptés comme page_view alors que ce sont des requêtes de crawlers
    //   ou de bots qui scannent les sourcemaps. On y trouve aussi des littéraux de
    //   template non interpolés (ex: /assets/${e}, /assets/'+e+') extraits du code
    //   minifié, du bruit pur.
    // - extensions de fichiers statiques requêtés en direct.
    const isAssetNoise =
      path.startsWith("/assets/") ||
      /\.(js|css|map|png|jpg|jpeg|gif|svg|webp|avif|ico|woff2?|ttf|eot|json|xml|txt)$/i.test(path);
    if (isAssetNoise) return;

    const now = Date.now();
    if (lastPath.current === path && now - lastEmitAt.current < 1500) return;

    lastPath.current = path;
    lastEmitAt.current = now;

    trackEvent("page_view", {
      source: location.pathname,
      metadata: {
        path: location.pathname,
        search: location.search || undefined,
        referrer: typeof document !== "undefined" ? document.referrer || undefined : undefined,
      },
    });

    trackGoogleAnalyticsPageView(`${location.pathname}${location.search}`);

    // Attribution mail : capture les UTM si présents (best-effort, jamais bloquant).
    void captureUtmFromUrl(location.search, location.pathname);
  }, [location.pathname, location.search]);

  return null;
};

export default PageViewTracker;
