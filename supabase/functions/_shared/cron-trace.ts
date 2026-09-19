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
