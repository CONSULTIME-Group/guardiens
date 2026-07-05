/**
 * Logger d'erreurs front — capture window.error + unhandledrejection.
 * Envoie via RPC log_client_error qui groupe par fingerprint.
 * Fire-and-forget, throttle local pour éviter les boucles.
 */
import { supabase } from "@/integrations/supabase/client";
import { isInAppBrowser } from "@/lib/inAppBrowser";

const SENT_FINGERPRINTS = new Map<string, number>();
const THROTTLE_MS = 30_000; // n'envoie pas le même fp plus d'1x toutes les 30s
const MAX_PER_SESSION = 50;
let sessionCount = 0;

/**
 * Patterns d'erreurs non actionnables — ignorés silencieusement.
 * - "Script error." : cross-origin sans stack (pixel FB, GA…)
 * - chunks périmés : déjà gérés par lazyWithRetry
 * - ResizeObserver : warning bénin
 * - réseau utilisateur / navigation annulée : non actionnable
 */
const IGNORED_PATTERNS: RegExp[] = [
  /^Script error\.?$/i,
  /Failed to fetch dynamically imported module/i,
  /ChunkLoadError/i,
  /Loading chunk \d+ failed/i,
  /ResizeObserver loop/i,
  /Non-Error promise rejection captured/i,
  /NetworkError when attempting to fetch resource/i,
  /The (user|operation) (aborted|was aborted)/i,
  /AbortError/i,
  /Load failed/i,
  // Supabase Auth navigator.locks : verrou volé par un autre onglet — bénin, géré en interne par le SDK
  /Lock ".*" was (released|not granted) because/i,
  /lock:sb-.*-auth-token/i,
  // Navigateurs trop anciens (Chrome <92, Safari <15) : APIs ES2022 manquantes
  // (.at(), .findLast(), Object.hasOwn…) utilisées par web-vitals ou polyfills.
  // Non actionnable côté code — on ne supporte pas ces versions.
  /\.at is not a function/i,
  /'at' is not a function/i,
  /\.findLast(Index)? is not a function/i,
  /Object\.hasOwn is not a function/i,
  // Outlook Safe Links / bots de scan email : "Object Not Found Matching Id:X, MethodName:update, ParamCount:4"
  // Erreur générée par le scanner Microsoft lors du prefetch des liens (ex: /unsubscribe). Non actionnable.
  /Object Not Found Matching Id:\d+, MethodName:/i,
];

function shouldIgnore(message: string): boolean {
  if (!message) return true;
  // Trim pour éviter de laisser passer des variantes avec espaces de bord
  // (vu en prod sur WebViews Facebook in-app : "Script error. " avec espace final)
  const normalized = message.trim();
  if (!normalized) return true;
  return IGNORED_PATTERNS.some((re) => re.test(normalized));
}

/**
 * Sources tierces non actionnables — JS injecté par WebViews, extensions,
 * pixels marketing, scripts cross-origin… Une erreur dont la source provient
 * de l'un de ces patterns n'est pas issue de notre bundle Vite et ne doit
 * pas être loggée.
 *
 * Détection :
 * - source "<anonymous>" / "" / inline : typique des WebViews FB/IG/TikTok
 *   qui injectent du JS sans URL réelle (autofill, tracking, bridge natif)
 * - extensions navigateur (chrome-extension://, moz-extension://, safari-…)
 * - scripts tiers connus (gtag, fbevents, hotjar, intercom, snap pixel…)
 * - WebViews in-app via signatures dans le stack (FB_IAB, fbAutofill, etc.)
 */
const THIRD_PARTY_SOURCE_PATTERNS: RegExp[] = [
  /^<anonymous>/i,
  /^anonymous$/i,
  /^about:blank/i,
  /^chrome-extension:\/\//i,
  /^moz-extension:\/\//i,
  /^safari-(web-)?extension:\/\//i,
  /^extension:\/\//i,
  /\/(gtag|gtm|fbevents|fbq|hotjar|intercom|snap_pixel|pixel|tiktok|clarity|hs-scripts)/i,
  /googletagmanager\.com/i,
  /google-analytics\.com/i,
  /connect\.facebook\.net/i,
  /static\.hotjar\.com/i,
  /widget\.intercom\.io/i,
];

/**
 * Signatures dans la stack trace qui révèlent du JS injecté par un WebView
 * in-app, même si "source" est vide ou semble valide.
 */
const THIRD_PARTY_STACK_PATTERNS: RegExp[] = [
  /setContactAutofillValuesFromBridge/i,
  /fbAutofill/i,
  /FB_IAB/i,
  /InstagramBridge/i,
  /__fbAppBridge/i,
  /TikTokBridge/i,
  /WebViewJavascriptBridge/i,
  /universal_link/i,
];

/**
 * Type de filtrage appliqué à une erreur "tierce".
 * Permet d'expliquer dans l'admin pourquoi elle est marquée comme ignorée.
 */
export type ThirdPartyReason =
  | "in_app_webview"        // Session entière dans un WebView tiers (FB_IAB/FBAV, Instagram, TikTok…)
  | "webview_bridge"        // Stack contient une signature de bridge WebView (FB, IG, TikTok…)
  | "extension"             // Source = chrome-extension:// / moz-extension:// …
  | "tracking_pixel"        // Source = gtag, fbevents, hotjar, intercom…
  | "cross_origin_script"   // Source = autre origine que la nôtre
  | "anonymous_inline"      // Source vide, stack majoritairement anonyme (injection inline)
  | "empty_source";         // Source vide/blanche

/**
 * Détecte si une erreur provient de JS hors de notre bundle Vite.
 * Retourne le motif (pour traçabilité dans l'admin) ou null si l'erreur
 * vient bien de notre code.
 */
export function detectThirdPartySource(
  source?: string | null,
  stack?: string | null,
): ThirdPartyReason | null {
  // 1. Stack signatures fortes (WebView bridges) — verdict immédiat
  if (stack && THIRD_PARTY_STACK_PATTERNS.some((re) => re.test(stack))) {
    return "webview_bridge";
  }

  // 2. Source explicitement tierce
  if (source) {
    const trimmed = source.trim();
    if (!trimmed) return "empty_source";

    if (/^(chrome|moz|safari(-web)?|web)?-?extension:\/\//i.test(trimmed)) {
      return "extension";
    }
    if (
      /\/(gtag|gtm|fbevents|fbq|hotjar|intercom|snap_pixel|pixel|tiktok|clarity|hs-scripts)/i.test(trimmed) ||
      /googletagmanager\.com|google-analytics\.com|connect\.facebook\.net|static\.hotjar\.com|widget\.intercom\.io/i.test(trimmed)
    ) {
      return "tracking_pixel";
    }
    if (/^<anonymous>|^anonymous$|^about:blank/i.test(trimmed)) {
      return "anonymous_inline";
    }

    // 3. Source d'une autre origine que la nôtre
    if (typeof window !== "undefined" && /^https?:\/\//i.test(trimmed)) {
      try {
        const srcOrigin = new URL(trimmed).origin;
        if (srcOrigin !== window.location.origin) return "cross_origin_script";
      } catch {
        return "cross_origin_script";
      }
    }
  }

  // 4. Pas de source ET stack composé majoritairement de frames anonymes
  //    → typiquement du JS injecté inline par un WebView
  if (!source && stack) {
    const lines = stack.split("\n").filter((l) => l.trim());
    if (lines.length > 0) {
      const anonymousFrames = lines.filter((l) =>
        /<anonymous>|\sat\s.*:\d+:\d+\)?$/i.test(l) && !/\/assets\/|\.tsx?:|\.jsx?:/i.test(l)
      ).length;
      if (anonymousFrames / lines.length > 0.7) return "anonymous_inline";
    }
  }

  return null;
}

/**
 * @deprecated Conservé pour compat — utiliser detectThirdPartySource qui renvoie le motif.
 */
function isThirdPartySource(source?: string | null, stack?: string | null): boolean {
  return detectThirdPartySource(source, stack) !== null;
}



function fingerprint(message: string, source?: string, line?: number): string {
  const base = `${message}|${source ?? ""}|${line ?? ""}`.slice(0, 500);
  let hash = 0;
  for (let i = 0; i < base.length; i++) {
    hash = ((hash << 5) - hash + base.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Collecte un instantané de contexte enrichi pour aider à reproduire l'erreur :
 * route React (pathname + search + hash), state du history, referrer, viewport,
 * langue, fuseau horaire, état réseau/visibilité, plateforme, etc.
 *
 * Tout est best-effort : chaque champ est protégé par try/catch pour ne JAMAIS
 * faire planter le logger lui-même.
 */
function collectRuntimeContext(): Record<string, unknown> {
  const ctx: Record<string, unknown> = {};
  if (typeof window === "undefined") return ctx;

  try {
    ctx.pathname = window.location.pathname;
    ctx.search = window.location.search || null;
    ctx.hash = window.location.hash || null;
    ctx.referrer = document.referrer || null;
  } catch { /* noop */ }

  try {
    // history.state contient souvent le state passé par react-router (location.state)
    const hs = window.history?.state;
    if (hs && typeof hs === "object") {
      // On ne sérialise que les clés sûres pour éviter les payloads énormes
      const safe: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(hs as Record<string, unknown>)) {
        if (typeof v === "string" || typeof v === "number" || typeof v === "boolean" || v === null) {
          safe[k] = v;
        } else if (v && typeof v === "object") {
          safe[k] = "[object]";
        }
      }
      ctx.history_state = safe;
    }
  } catch { /* noop */ }

  try {
    ctx.viewport = `${window.innerWidth}x${window.innerHeight}`;
    ctx.dpr = window.devicePixelRatio ?? 1;
  } catch { /* noop */ }

  try {
    if (typeof screen !== "undefined") ctx.screen = `${screen.width}x${screen.height}`;
  } catch { /* noop */ }

  try {
    if (typeof navigator !== "undefined") {
      ctx.language = navigator.language ?? null;
      ctx.online = navigator.onLine;
      // @ts-expect-error - non standard mais largement supporté
      const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (conn?.effectiveType) ctx.network = conn.effectiveType;
      // @ts-expect-error - non standard
      if (typeof navigator.deviceMemory === "number") ctx.device_memory = navigator.deviceMemory;
      ctx.platform = navigator.platform ?? null;
    }
  } catch { /* noop */ }

  try {
    ctx.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
  } catch { /* noop */ }

  try {
    if (typeof document !== "undefined") {
      ctx.visibility = document.visibilityState;
      // Nom de la page tel qu'affiché (utile pour identifier le contexte)
      if (document.title) ctx.page_title = document.title.slice(0, 200);
    }
  } catch { /* noop */ }

  try {
    // Composant logique courant éventuellement défini par une ErrorBoundary
    // ou par du code applicatif via setCurrentComponent().
    if (CURRENT_COMPONENT) ctx.component = CURRENT_COMPONENT;
  } catch { /* noop */ }

  return ctx;
}

/**
 * Nom du composant logique courant (renseigné par les ErrorBoundary ou
 * manuellement via setCurrentComponent). Permet de savoir d'où vient l'erreur
 * sans dépendre uniquement du stack minifié.
 */
let CURRENT_COMPONENT: string | null = null;
export function setCurrentComponent(name: string | null) {
  CURRENT_COMPONENT = name;
}

async function send(payload: {
  fingerprint: string;
  message: string;
  stack?: string | null;
  source?: string | null;
  line_no?: number | null;
  col_no?: number | null;
  severity?: string;
  context?: Record<string, any>;
}) {
  if (sessionCount >= MAX_PER_SESSION) return;
  if (shouldIgnore(payload.message)) return;

  // Détection JS tiers (WebViews FB/IG, extensions, pixels…) : on n'abandonne
  // pas silencieusement — on enregistre avec une sévérité dédiée et un motif,
  // pour que l'admin sache pourquoi cette erreur n'a pas été retenue comme bug.
  // Priorité au filtre par User-Agent : si la session entière tourne dans un
  // WebView in-app (Facebook FB_IAB/FBAV, Instagram, TikTok…), TOUTES les
  // erreurs sont marquées comme tierces, qu'elles aient ou non une signature
  // de bridge dans le stack. Évite la pollution de /admin/errors par ces
  // navigateurs notoirement instables (autofill, bridges natifs, JS injecté).
  const inApp = isInAppBrowser();
  const sourceReason = detectThirdPartySource(payload.source, payload.stack);
  const thirdPartyReason: ThirdPartyReason | null = inApp
    ? "in_app_webview"
    : sourceReason;

  let severity = payload.severity ?? "error";
  let context: Record<string, unknown> | null = payload.context ?? null;
  if (thirdPartyReason) {
    severity = "ignored_third_party";
    context = {
      ...(context ?? {}),
      filtered: true,
      filter_reason: thirdPartyReason,
      // Contexte additionnel utile dans l'admin
      ...(inApp && typeof navigator !== "undefined"
        ? { detected_user_agent: navigator.userAgent.slice(0, 200) }
        : {}),
    };
  } else {
    // Vraie erreur (pas filtrée comme tierce) → on enrichit avec le contexte
    // runtime complet pour faciliter la reproduction.
    context = {
      ...collectRuntimeContext(),
      ...(context ?? {}), // le contexte explicite passé par l'appelant gagne
    };
  }

  const now = Date.now();
  const last = SENT_FINGERPRINTS.get(payload.fingerprint);
  // Throttle agressif (1h) pour les erreurs tierces — non actionnables, on
  // veut juste pouvoir les inspecter dans l'admin sans saturer la table.
  const throttle = thirdPartyReason ? 60 * 60 * 1000 : THROTTLE_MS;
  if (last && now - last < throttle) return;
  SENT_FINGERPRINTS.set(payload.fingerprint, now);
  sessionCount++;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.rpc("log_client_error", {
      _fingerprint: payload.fingerprint,
      _message: payload.message.slice(0, 2000),
      _stack: payload.stack?.slice(0, 5000) ?? null,
      _source: payload.source ?? null,
      _line_no: payload.line_no ?? null,
      _col_no: payload.col_no ?? null,
      _url: typeof window !== "undefined" ? window.location.href.slice(0, 500) : null,
      _user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 300) : null,
      _severity: severity,
      _context: context as any,
      _user_email: user?.email ?? null,
    });
  } catch {
    // silencieux
  }
}

export function reportError(error: unknown, context?: Record<string, any>) {
  const err = error instanceof Error ? error : new Error(String(error));
  const fp = fingerprint(err.message, err.stack?.split("\n")[1]);
  void send({
    fingerprint: fp,
    message: err.message,
    stack: err.stack ?? null,
    severity: "error",
    context,
  });
}

let installed = false;
export function installGlobalErrorLogger() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  window.addEventListener("error", (event) => {
    const message = event.message || "Unknown error";
    const source = event.filename || null;
    void send({
      fingerprint: fingerprint(message, source ?? undefined, event.lineno),
      message,
      stack: event.error?.stack ?? null,
      source,
      line_no: event.lineno ?? null,
      col_no: event.colno ?? null,
      severity: "error",
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;

    // Construire un message le plus parlant possible
    let message: string;
    let stack: string | null = null;

    if (reason instanceof Error) {
      message = reason.message || reason.name || "Error";
      stack = reason.stack ?? null;
    } else if (typeof reason === "string") {
      message = reason;
    } else if (reason && typeof reason === "object") {
      // Tenter d'extraire des champs courants (Supabase, fetch, DOMException…)
      const r = reason as Record<string, unknown>;
      const candidate =
        (r.message as string) ||
        (r.error_description as string) ||
        (r.error as string) ||
        (r.statusText as string) ||
        (r.name as string) ||
        "";
      const keys = Object.keys(r).slice(0, 10).join(",");
      const serialized = (() => {
        try {
          return JSON.stringify(r)?.slice(0, 300);
        } catch {
          return "";
        }
      })();
      message =
        candidate ||
        serialized ||
        (keys ? `Empty rejection (keys: ${keys})` : "Empty rejection ({})");
    } else {
      message = String(reason ?? "Unhandled rejection (no reason)");
    }

    // Filtrer le bruit Safari iOS / aborts de navigation :
    // - DOMException AbortError (fetch annulé, navigation, onglet en background)
    // - rejections totalement vides sans stack (typiquement Safari qui abort)
    const isAbort =
      (reason instanceof DOMException && reason.name === "AbortError") ||
      /aborted|abort/i.test(message);
    const isEmptyNoise =
      !stack &&
      reason &&
      typeof reason === "object" &&
      Object.keys(reason as object).length === 0;

    if (isAbort || isEmptyNoise) {
      // On n'envoie pas — ce n'est pas actionnable.
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.debug("[errorLogger] ignored rejection:", reason);
      }
      return;
    }

    void send({
      fingerprint: fingerprint(message),
      message: message.slice(0, 500),
      stack,
      severity: "unhandled_rejection",
    });
  });
}
