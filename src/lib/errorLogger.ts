/**
 * Logger d'erreurs front — capture window.error + unhandledrejection.
 * Envoie via RPC log_client_error qui groupe par fingerprint.
 * Fire-and-forget, throttle local pour éviter les boucles.
 */
import { supabase } from "@/integrations/supabase/client";

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
];

function shouldIgnore(message: string): boolean {
  if (!message) return true;
  // Trim pour éviter de laisser passer des variantes avec espaces de bord
  // (vu en prod sur WebViews Facebook in-app : "Script error. " avec espace final)
  const normalized = message.trim();
  if (!normalized) return true;
  return IGNORED_PATTERNS.some((re) => re.test(normalized));
}

function fingerprint(message: string, source?: string, line?: number): string {
  const base = `${message}|${source ?? ""}|${line ?? ""}`.slice(0, 500);
  let hash = 0;
  for (let i = 0; i < base.length; i++) {
    hash = ((hash << 5) - hash + base.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
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
  const now = Date.now();
  const last = SENT_FINGERPRINTS.get(payload.fingerprint);
  if (last && now - last < THROTTLE_MS) return;
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
      _severity: payload.severity ?? "error",
      _context: payload.context ?? null,
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
    const message =
      reason instanceof Error
        ? reason.message
        : typeof reason === "string"
        ? reason
        : JSON.stringify(reason)?.slice(0, 500) || "Unhandled rejection";
    void send({
      fingerprint: fingerprint(message),
      message,
      stack: reason instanceof Error ? reason.stack ?? null : null,
      severity: "unhandled_rejection",
    });
  });
}
