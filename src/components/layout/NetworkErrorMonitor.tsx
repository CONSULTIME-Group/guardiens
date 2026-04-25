import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { reportError } from "@/lib/errorLogger";

/**
 * Routes critiques où une réponse réseau non-2xx doit déclencher
 * une alerte visible utilisateur + un log admin.
 *
 * Les autres routes laissent les composants gérer leurs erreurs localement.
 */
const CRITICAL_ROUTE_PATTERNS: RegExp[] = [
  /^\/dashboard/,
  /^\/profile/,
  /^\/owner-profile/,
  /^\/sits(\/|$)/,
  /^\/messages/,
  /^\/search/,
  /^\/recherche/,
  /^\/mon-abonnement/,
  /^\/petites-missions(\/|$)/,
  /^\/notifications/,
  /^\/admin(\/|$)/,
];

/**
 * Domaines / chemins à ignorer (analytics, third-party, endpoints qui
 * peuvent légitimement renvoyer 4xx — ex: vérification d'unicité).
 */
const IGNORED_URL_PATTERNS: RegExp[] = [
  /google-analytics\.com/,
  /googletagmanager\.com/,
  /sentry\.io/,
  /\/auth\/v1\/token/,           // login attempts → 400 attendus
  /\/auth\/v1\/recover/,
  /\/auth\/v1\/otp/,
  /\/auth\/v1\/user/,            // peut renvoyer 401 normalement
  /\/rest\/v1\/.*\?.*head=true/, // HEAD checks
  /\/storage\/v1\/object\/sign/, // signed-url retries
  // Edge functions optionnelles dont l'échec est géré gracieusement
  // (fallback UI, valeur null acceptée). Inutile d'alerter l'utilisateur
  // ni de polluer l'admin avec des 5xx transitoires (Nominatim, etc.).
  /\/functions\/v1\/geocode(\?|$|\/)/,
  /\/functions\/v1\/geocode-guide-places(\?|$|\/)/,
  /\/functions\/v1\/og-/,           // OG image previews
  /\/functions\/v1\/fetch-seo-data/, // SEO scraping best-effort
];

/**
 * Statuts ignorés (gérés explicitement par le code applicatif).
 *  - 401/403 : auth flows (login, refresh)
 *  - 404 : ressource introuvable (souvent géré par UI)
 *  - 406 : PostgREST `.single()`/`.maybeSingle()` quand 0 ligne (comportement normal)
 *  - 409 : conflits métier (ex: doublons)
 *  - 416 : range non satisfaisable (pagination)
 *  - 422 : validation côté serveur
 */
const IGNORED_STATUSES = new Set([401, 403, 404, 406, 409, 416, 422]);

/**
 * Extensions d'assets statiques. Les échecs sur ces ressources n'ont pas
 * besoin d'alerter l'utilisateur (fallbacks UI, lazyWithRetry, polices système…).
 */
const ASSET_EXTENSION_RE =
  /\.(png|jpe?g|gif|webp|avif|svg|ico|bmp|tiff?|js|mjs|css|map|woff2?|ttf|otf|eot|mp3|mp4|webm|ogg|wav|m4a|pdf|zip|wasm)(\?.*)?(#.*)?$/i;

/**
 * Destinations Request indiquant un asset (Fetch spec `request.destination`).
 */
const ASSET_DESTINATIONS = new Set([
  "image", "script", "style", "font", "audio", "video", "track",
  "object", "embed", "manifest", "worker", "sharedworker", "serviceworker",
]);

const isAssetRequest = (url: string, input: RequestInfo | URL): boolean => {
  if (input instanceof Request && input.destination && ASSET_DESTINATIONS.has(input.destination)) {
    return true;
  }
  try {
    const u = new URL(url, typeof window !== "undefined" ? window.location.href : "http://x");
    if (ASSET_EXTENSION_RE.test(u.pathname)) return true;
  } catch {
    if (ASSET_EXTENSION_RE.test(url)) return true;
  }
  return false;
};

const isCriticalRoute = (pathname: string) =>
  CRITICAL_ROUTE_PATTERNS.some((re) => re.test(pathname));

const shouldIgnoreUrl = (url: string) =>
  IGNORED_URL_PATTERNS.some((re) => re.test(url));

const NetworkErrorMonitor = () => {
  const location = useLocation();
  const pathnameRef = useRef(location.pathname);
  const lastAlertRef = useRef<{ key: string; ts: number } | null>(null);

  useEffect(() => {
    pathnameRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.fetch) return;
    // Évite double-patch en HMR
    if ((window as any).__networkMonitorInstalled) return;
    (window as any).__networkMonitorInstalled = true;

    const originalFetch = window.fetch.bind(window);

    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const [input, init] = args;
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
          ? input.toString()
          : input.url;
      const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();

      let response: Response;
      try {
        response = await originalFetch(...args);
      } catch (err) {
        // Erreur réseau pure (offline, DNS…) — déjà gérée par OfflineBanner
        throw err;
      }

      try {
        const path = pathnameRef.current;
        const status = response.status;

        if (
          isCriticalRoute(path) &&
          !shouldIgnoreUrl(url) &&
          !isAssetRequest(url, input) &&
          !IGNORED_STATUSES.has(status) &&
          (status >= 400 || status === 0) &&
          status < 600
        ) {
          // Dédoublonnage : même endpoint+statut dans les 5s = silence
          const dedupeKey = `${method}:${url}:${status}`;
          const now = Date.now();
          const last = lastAlertRef.current;
          if (!last || last.key !== dedupeKey || now - last.ts > 5000) {
            lastAlertRef.current = { key: dedupeKey, ts: now };

            // Action "Réessayer" :
            //  - GET idempotent → on rejoue silencieusement la même requête.
            //    Si elle réussit (2xx/3xx), on confirme. Sinon, on recharge.
            //  - Autres méthodes (POST/PUT/PATCH/DELETE) → reload page direct
            //    pour éviter tout double-effet (paiement, message, etc.).
            const handleRetry = async () => {
              if (method === "GET") {
                try {
                  const retryRes = await originalFetch(...args);
                  if (retryRes.ok) {
                    toast.success("Connexion rétablie", { duration: 3000 });
                    return;
                  }
                } catch {
                  // ignore — fallback reload
                }
              }
              window.location.reload();
            };

            toast.error("Problème de connexion au service", {
              description: `Une requête a échoué (statut ${status}). Veuillez réessayer.`,
              duration: 8000,
              action: {
                label: "Réessayer",
                onClick: () => { void handleRetry(); },
              },
            });

            reportError(
              new Error(`Network non-2xx: ${status} ${method} ${url}`),
              {
                source: "NetworkErrorMonitor",
                route: path,
                method,
                url,
                status,
              }
            );
          }
        }
      } catch {
        // Le monitoring ne doit jamais casser la requête réelle
      }

      return response;
    };

    return () => {
      window.fetch = originalFetch;
      (window as any).__networkMonitorInstalled = false;
    };
  }, []);

  return null;
};

export default NetworkErrorMonitor;
