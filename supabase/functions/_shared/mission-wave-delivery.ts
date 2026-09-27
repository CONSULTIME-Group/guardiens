/**
 * Fiabilité des envois du moteur de vagues : espacement, limite de débit,
 * rattrapage des personnes restées en file, statut du passage.
 * Logique pure, testée côté Vitest.
 */

/** Pause entre deux envois, sous la limite de débit de Resend. */
export const WAVE_SEND_SPACING_MS = 600;
/** Une ligne en file depuis plus de dix minutes sans envoi est reprise. */
export const WAVE_CATCHUP_AFTER_MINUTES = 10;
/** Attente par défaut quand la limite de débit ne donne aucun délai. */
export const WAVE_RATE_LIMIT_DEFAULT_WAIT_MS = 2000;
/** Attente maximale acceptée avant la nouvelle tentative. */
export const WAVE_RATE_LIMIT_MAX_WAIT_MS = 20000;

export interface SendOutcome {
  ok: boolean;
  rateLimited: boolean;
  retryAfterMs: number | null;
}

/** Lit un délai dans « Retry after 16404ms » ou un en-tête Retry-After (secondes). */
export function parseRetryAfterMs(text: string | null | undefined, header?: string | null): number | null {
  if (header) {
    const s = Number(header);
    if (Number.isFinite(s) && s >= 0) return Math.round(s * 1000);
  }
  const m = /retry after\s+(\d+)\s*ms/i.exec(text ?? "");
  if (m) return Number(m[1]);
  return null;
}

export function isRateLimitText(text: string | null | undefined): boolean {
  return /rate limit/i.test(text ?? "");
}

/**
 * Un envoi, puis une seule nouvelle tentative si la limite de débit est
 * atteinte, après le délai annoncé. Retourne "sent", "failed" ou "deferred"
 * (limite de débit persistante, la ligne reste en file pour le rattrapage).
 */
export async function sendWithRateLimitRetry(
  send: () => Promise<SendOutcome>,
  sleep: (ms: number) => Promise<void>,
): Promise<"sent" | "failed" | "deferred"> {
  const first = await send();
  if (first.ok) return "sent";
  if (!first.rateLimited) return "failed";
  const wait = Math.min(first.retryAfterMs ?? WAVE_RATE_LIMIT_DEFAULT_WAIT_MS, WAVE_RATE_LIMIT_MAX_WAIT_MS);
  await sleep(wait);
  const second = await send();
  if (second.ok) return "sent";
  return second.rateLimited ? "deferred" : "failed";
}

export interface QueuedRow {
  helper_id: string;
  status: string;
  sent_at: string | null;
  queued_at: string | null;
}

/** Lignes à reprendre : queued, sans sent_at, en file depuis plus de dix minutes. */
export function selectStaleQueued<T extends QueuedRow>(rows: T[], now: Date): T[] {
  const limit = now.getTime() - WAVE_CATCHUP_AFTER_MINUTES * 60_000;
  return rows.filter(
    (r) => r.status === "queued" && !r.sent_at && r.queued_at != null && new Date(r.queued_at).getTime() < limit,
  );
}

/** Mise à jour de la file après une tentative. null : la ligne reste en file. */
export function queueUpdateFor(
  result: "sent" | "failed" | "deferred",
  nowIso: string,
): { status: string; sent_at: string; skip_reason: string | null } | null {
  if (result === "deferred") return null;
  return result === "sent"
    ? { status: "sent", sent_at: nowIso, skip_reason: null }
    : { status: "skipped", sent_at: nowIso, skip_reason: "send_failed" };
}

/** Statut du passage : success, partial (une partie est partie) ou failed (rien n'est parti). */
export function waveRunStatus(sent: number, deferred: number, errors: number): "success" | "partial" | "failed" {
  if (deferred === 0 && errors === 0) return "success";
  return sent > 0 ? "partial" : "failed";
}
