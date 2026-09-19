// Corrélation cron, Edge, cron_run_log.
//
// La commande pg_cron tire un identifiant unique par invocation naturelle et
// le transmet à la fois en en-tête `x-guardiens-trace-id` et dans le corps
// JSON (`trace_id`). L'Edge le relit ici, le renvoie dans sa réponse HTTP et
// le range dans `cron_run_log.metrics`. Les trois couches se relient alors
// formellement, sans dépendre de l'horaire.
//
// Aucune donnée personnelle n'est acceptée : la valeur est bornée à un jeton
// court, alphanumérique, tirets et soulignés admis.

export const CRON_TRACE_HEADER = "x-guardiens-trace-id";

const TRACE_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

function sanitize(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  return TRACE_PATTERN.test(v) ? v : null;
}

/**
 * Lit l'identifiant de corrélation, en-tête prioritaire puis corps JSON.
 * Renvoie null si absent ou non conforme, ce qui ne bloque jamais le passage.
 */
export function readCronTraceId(headers: Headers, body: unknown): string | null {
  const fromHeader = sanitize(headers?.get?.(CRON_TRACE_HEADER));
  if (fromHeader) return fromHeader;
  if (body && typeof body === "object") {
    return sanitize((body as Record<string, unknown>).trace_id);
  }
  return null;
}

/**
 * Statut de passage : partiel dès qu'un destinataire a échoué, succès sinon.
 */
export function digestRunStatus(errorCount: number): "success" | "partial" {
  return errorCount > 0 ? "partial" : "success";
}

// Identifiant technique du job pg_cron appelant.
//
// Chaque commande transmet son jobid réel (12, 13, 14 pour send-alert-digest,
// 109 pour send-nearby-daily-digest) en en-tête et dans le corps JSON. C'est
// un entier de planification, jamais un identifiant de membre. L'Edge ne fait
// confiance à aucune valeur arbitraire : elle n'est retenue que si elle
// figure dans la liste autorisée de la fonction appelée, sinon elle vaut null
// et le digest se poursuit normalement.

export const CRON_JOB_ID_HEADER = "x-guardiens-cron-job-id";

export const ALERT_DIGEST_CRON_JOB_IDS = [12, 13, 14] as const;
export const NEARBY_DAILY_DIGEST_CRON_JOB_IDS = [109] as const;

function toJobId(value: unknown): number | null {
  if (typeof value === "number") return Number.isInteger(value) ? value : null;
  if (typeof value === "string" && /^[0-9]{1,9}$/.test(value.trim())) {
    return Number.parseInt(value.trim(), 10);
  }
  return null;
}

/**
 * Lit le jobid pg_cron, en-tête prioritaire puis corps JSON, et le valide
 * contre la liste autorisée de la fonction. Toute valeur absente, non
 * entière ou hors liste devient null sans jamais bloquer le passage.
 */
export function readCronJobId(
  headers: Headers,
  body: unknown,
  allowed: readonly number[],
): number | null {
  const candidates: unknown[] = [headers?.get?.(CRON_JOB_ID_HEADER)];
  if (body && typeof body === "object") {
    const b = body as Record<string, unknown>;
    candidates.push(b.cron_job_id, b.job_id);
  }
  for (const candidate of candidates) {
    const parsed = toJobId(candidate);
    if (parsed !== null && allowed.includes(parsed)) return parsed;
  }
  return null;
}
