/**
 * Journal client structuré pour le flux OAuth (Google).
 *
 * Objectifs :
 *  - Tracer chaque étape du flux avec un timestamp absolu (ISO) et un delta
 *    relatif au début du flux (ms) pour repérer où se passe la latence.
 *  - Conserver un trace_id stable côté client (sessionStorage) qui survit à
 *    la redirection vers Google et au retour sur l'origin → on peut relier
 *    "click" → "redirect" → "callback" → "/token" → "/user" → "session_set".
 *  - Garder les N derniers événements dans un buffer en mémoire +
 *    sessionStorage pour qu'un utilisateur puisse les copier facilement
 *    (console : `window.__oauthLog()`).
 *  - Émettre vers `console.info` avec un préfixe distinctif `[oauth]` afin
 *    que le filtre console soit trivial.
 *
 * Note : aucun PII (email, token) n'est loggé. Seuls les codes d'étape,
 * statuts et messages d'erreur normalisés sortent.
 */

type Stage =
  | "init" // bouton cliqué, avant tout appel SDK
  | "sdk_called" // lovable.auth.signInWithOAuth a été appelé
  | "redirecting" // SDK confirme la redirection vers Google
  | "tokens_received" // SDK renvoie tokens directement (rare : popup mode)
  | "callback_returned" // l'app reboot après redirect, on détecte le retour
  | "token_endpoint_ok" // /auth/v1/token a répondu 200 (vu via auth state change)
  | "session_set" // onAuthStateChange a posé la session
  | "user_endpoint_ok" // GET /auth/v1/user a répondu 200
  | "navigated" // navigation vers /dashboard effectuée
  | "blocked_terms" // l'utilisateur a cliqué sans cocher les CGU (Register)
  | "error"; // toute branche d'erreur

interface OAuthLogEntry {
  ts: string; // ISO timestamp absolu
  delta_ms: number; // ms depuis le début du flux courant
  trace_id: string; // identifiant stable cross-redirect
  stage: Stage;
  source: "/login" | "/inscription" | "auth-context" | string;
  data?: Record<string, unknown>; // métadonnées non-sensibles
}

const STORAGE_KEY = "guardiens.oauth.log";
const TRACE_KEY = "guardiens.oauth.trace";
const START_KEY = "guardiens.oauth.start";
const MAX_ENTRIES = 50;

function safeSession(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

function readBuffer(): OAuthLogEntry[] {
  const s = safeSession();
  if (!s) return [];
  try {
    const raw = s.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as OAuthLogEntry[]) : [];
  } catch {
    return [];
  }
}

function writeBuffer(entries: OAuthLogEntry[]): void {
  const s = safeSession();
  if (!s) return;
  try {
    s.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
  } catch {}
}

function genTraceId(): string {
  // Court, lisible, suffisant pour corréler client + edge logs.
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 8);
  return `oa_${t}_${r}`;
}

/**
 * Démarre (ou redémarre) un flux OAuth : génère un trace_id et fixe t0.
 * À appeler au tout début du handler de clic sur le bouton Google.
 */
export function startOAuthFlow(source: string): string {
  const s = safeSession();
  const traceId = genTraceId();
  const start = Date.now();
  if (s) {
    try {
      s.setItem(TRACE_KEY, traceId);
      s.setItem(START_KEY, String(start));
    } catch {}
  }
  logOAuthStage("init", source);
  return traceId;
}

/**
 * Récupère le trace_id en cours (après redirect Google → retour sur l'origin).
 * Renvoie `null` si aucun flux n'est actif (l'utilisateur n'a pas cliqué Google).
 */
export function getOAuthTraceId(): string | null {
  const s = safeSession();
  if (!s) return null;
  try {
    return s.getItem(TRACE_KEY);
  } catch {
    return null;
  }
}

function getStartTs(): number {
  const s = safeSession();
  if (!s) return Date.now();
  try {
    const raw = s.getItem(START_KEY);
    return raw ? Number(raw) : Date.now();
  } catch {
    return Date.now();
  }
}

/**
 * Logge une étape du flux OAuth. No-op si aucun flux n'a été démarré
 * (sauf pour `init` qui démarre lui-même le flux via `startOAuthFlow`).
 *
 * @param stage  Étape normalisée du flux.
 * @param source Page/contexte d'émission ("/login", "/inscription", "auth-context").
 * @param data   Métadonnées non-sensibles (jamais d'email, jamais de token).
 */
export function logOAuthStage(
  stage: Stage,
  source: string,
  data?: Record<string, unknown>
): void {
  const traceId = getOAuthTraceId() ?? "no-trace";
  const now = Date.now();
  const entry: OAuthLogEntry = {
    ts: new Date(now).toISOString(),
    delta_ms: now - getStartTs(),
    trace_id: traceId,
    stage,
    source,
    data,
  };

  // Buffer persistant (cross-redirect)
  const buf = readBuffer();
  buf.push(entry);
  writeBuffer(buf);

  // Console : préfixe filtrable + format compact
  try {
    const tag = stage === "error" ? "console.warn" : "console.info";
    const fn = (console as any)[tag === "console.warn" ? "warn" : "info"];
    fn?.(
      `[oauth] ${stage.padEnd(20)} +${String(entry.delta_ms).padStart(5)}ms ` +
        `trace=${traceId} src=${source}`,
      data ?? ""
    );
  } catch {}
}

/**
 * Termine proprement un flux OAuth (succès ou abandon volontaire).
 * Conserve le buffer pour debug, mais libère le trace_id pour qu'un
 * prochain clic démarre un nouveau flux propre.
 */
export function endOAuthFlow(reason: "success" | "abort" | "error" = "success"): void {
  logOAuthStage(
    reason === "error" ? "error" : "navigated",
    "auth-context",
    { end_reason: reason }
  );
  const s = safeSession();
  if (!s) return;
  try {
    s.removeItem(TRACE_KEY);
    s.removeItem(START_KEY);
  } catch {}
}

/**
 * Renvoie le journal complet (utile pour support/debug).
 * Exposé sur `window.__oauthLog()` pour copier-coller depuis la console.
 */
export function dumpOAuthLog(): OAuthLogEntry[] {
  return readBuffer();
}

/**
 * Branche un helper global `window.__oauthLog()` pour le support utilisateur.
 * À appeler une seule fois au démarrage de l'app.
 */
export function installOAuthDebugHelper(): void {
  if (typeof window === "undefined") return;
  try {
    (window as any).__oauthLog = dumpOAuthLog;
  } catch {}
}
