/**
 * Lot A4 (audit Alma en arène du 14/10/2026) : intégrité des entrées
 * d'alma-chat et appel au modèle borné.
 *
 *  - Les tours « assistant » envoyés par le navigateur ne font plus foi : un
 *    tour n'est gardé que s'il correspond à une réponse d'Alma relue côté
 *    serveur dans alma_conversations. Un faux tour ne nourrit donc ni le
 *    modèle ni les contrôles du filet de sortie.
 *  - Le formulaire « Écrire à Jérémie et Elisa » prend l'email du compte
 *    (auth), jamais celui saisi, et une transcription relue en base.
 *  - L'appel au modèle d'Alma est borné (15 s, max_tokens) ; un délai dépassé
 *    rend une réponse de repli journalisée (refusal_reason model_timeout).
 *
 * Module pur, sans dépendance Deno : testé par vitest (src/__tests__/a4/).
 */
// Formes de ai-gateway.ts recopiées ici : ce module reste lisible par vitest
// et par le compilateur du site, sans la dépendance à Deno du gateway.
type GatewayCallOptions = {
  model?: string;
  messages: Array<{ role: "system" | "user" | "assistant"; content: unknown }>;
  temperature?: number;
  max_tokens?: number;
  signal?: AbortSignal;
};
type GatewayResult =
  | { ok: true; data: any }
  | { ok: false; status: number; error: string; code?: string };

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

/** Texte comparable : espaces repliés, 2 000 caractères (borne du client). */
export function comparableAnswer(s: string): string {
  return (s || "").replace(/\s+/g, " ").trim().slice(0, 2000);
}

/**
 * Historique de confiance : les tours du membre restent (ce sont ses mots),
 * un tour « assistant » n'est gardé que s'il figure parmi les réponses
 * d'Alma relues en base pour ce membre.
 */
export function trustedHistory(clientHistory: ChatTurn[], serverAnswers: string[]): { history: ChatTurn[]; dropped: number } {
  const known = new Set(serverAnswers.filter((a) => typeof a === "string" && a).map(comparableAnswer));
  const history: ChatTurn[] = [];
  let dropped = 0;
  for (const m of clientHistory) {
    if (m.role === "assistant" && !known.has(comparableAnswer(m.content))) {
      dropped += 1;
      continue;
    }
    history.push(m);
  }
  return { history, dropped };
}

// ---------------------------------------------------------------------------
// Appel au modèle borné, pour Alma seule
// ---------------------------------------------------------------------------

export const ALMA_MODEL_TIMEOUT_MS = 15_000;
/** Réponse, ligne BROUILLON et ligne CLASSEMENT tiennent largement sous ce plafond. */
export const ALMA_MAX_TOKENS = 1500;

/** Options du gateway pour Alma : délai de 15 s et plafond de jetons. */
export function almaModelOptions<T extends GatewayCallOptions>(base: T, timeoutMs = ALMA_MODEL_TIMEOUT_MS): T & { max_tokens: number; signal: AbortSignal } {
  return { ...base, max_tokens: ALMA_MAX_TOKENS, signal: timeoutSignal(timeoutMs) };
}

/** AbortSignal.timeout (Deno), avec un équivalent quand l'environnement ne l'a pas. */
function timeoutSignal(ms: number): AbortSignal {
  const native = (AbortSignal as unknown as { timeout?: (ms: number) => AbortSignal }).timeout;
  if (typeof native === "function") return native.call(AbortSignal, ms);
  const c = new AbortController();
  setTimeout(() => c.abort(Object.assign(new Error("timeout"), { name: "TimeoutError" })), ms);
  return c.signal;
}

export const ALMA_TIMEOUT_ANSWER =
  "Votre question me demande plus de temps que prévu. Reposez-la dans un instant, je vous réponds, ou écrivez à Jérémie et Elisa par le lien juste en dessous.";

/**
 * Repli quand le modèle échoue : gabarit verrouillé, réponse fixe de
 * frustration ou de départ, puis réponse de délai dépassé. null = erreur.
 */
export function modelFailureReply(
  r: Extract<GatewayResult, { ok: false }>,
  opts: { lockedTemplate?: string | null; directAnswer?: string | null },
): { answer: string; refusalReason: string } | null {
  if (opts.lockedTemplate) return { answer: opts.lockedTemplate, refusalReason: r.code === "AI_TIMEOUT" ? "model_timeout" : "model_fallback" };
  if (opts.directAnswer) return { answer: opts.directAnswer, refusalReason: r.code === "AI_TIMEOUT" ? "model_timeout" : "model_fallback" };
  if (r.code === "AI_TIMEOUT") return { answer: ALMA_TIMEOUT_ANSWER, refusalReason: "model_timeout" };
  return null;
}

// ---------------------------------------------------------------------------
// « Écrire à Jérémie et Elisa »
// ---------------------------------------------------------------------------

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Email du compte (auth) seul ; prénom du profil, puis nom saisi. */
export function contactIdentity(
  authEmail: string | null | undefined,
  profileFirstName: string | null | undefined,
  typedName: string | null | undefined,
): { email: string; name: string } | null {
  const email = String(authEmail ?? "").trim().slice(0, 200);
  if (!EMAIL_RE.test(email)) return null;
  const name = String(profileFirstName ?? "").trim() || String(typedName ?? "").trim() || "Membre";
  return { email, name: name.slice(0, 120) };
}

/** Transcription relue en base : derniers échanges du membre, du plus ancien au plus récent. */
export function serverTranscript(
  rows: Array<{ question?: string | null; answer?: string | null }>,
  clean: (s: string) => string = (s) => s,
  max = 3,
): string[] {
  const lines: string[] = [];
  for (const r of rows.slice(0, max).reverse()) {
    if (r.question) lines.push(`Membre : ${clean(String(r.question)).slice(0, 600)}`);
    if (r.answer) lines.push(`Alma : ${clean(String(r.answer)).slice(0, 600)}`);
  }
  return lines;
}
