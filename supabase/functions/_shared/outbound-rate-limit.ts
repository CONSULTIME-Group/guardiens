// Lot CRON1 (16/10/2026) : limite de débit des appels entre fonctions.
// Une fonction qui appelle send-transactional-email plus d'une trentaine de
// fois par minute reçoit « RateLimitError: Rate limit exceeded for trace …
// Retry after 43174ms. », levée par fetch avant toute réponse HTTP, ou une
// réponse 429. Mesure du 16/10/2026 (cron_run_log) : chaque passage s'arrêtait
// à 30 envois, le reste partait en échec et une partie n'était jamais rejouée.
// Module pur, sans dépendance Deno, testé côté Vitest.

/** Attente par défaut quand le délai n'est pas annoncé (fenêtre d'une minute). */
export const OUTBOUND_DEFAULT_RETRY_MS = 45_000
/** Attente maximale acceptée dans un passage. */
export const OUTBOUND_MAX_RETRY_MS = 60_000
/** Budget d'un passage, sous la limite de durée d'une fonction. */
export const OUTBOUND_RUN_BUDGET_MS = 110_000
/** Écart entre deux envois d'un même passage. */
export const OUTBOUND_SEND_SPACING_MS = 600

export function describeThrown(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`
  return String(error ?? '')
}

/** Vrai pour une limite de débit, qu'elle vienne d'une exception ou d'un corps de réponse. */
export function isOutboundRateLimit(errorOrText: unknown): boolean {
  const text = typeof errorOrText === 'string' ? errorOrText : describeThrown(errorOrText)
  return /RateLimitError|rate limit exceeded|too many requests/i.test(text)
}

/** Délai annoncé (« Retry after 43174ms »), borné ; défaut d'une minute sinon. */
export function retryAfterMsFrom(errorOrText: unknown): number {
  const text = typeof errorOrText === 'string' ? errorOrText : describeThrown(errorOrText)
  const m = /retry after\s+(\d+)\s*ms/i.exec(text)
  const ms = m ? Number(m[1]) : OUTBOUND_DEFAULT_RETRY_MS
  return Math.min(Math.max(ms, 1_000), OUTBOUND_MAX_RETRY_MS)
}

/** Peut-on encore attendre `waitMs` puis envoyer, sans dépasser le budget du passage ? */
export function canWaitWithinBudget(startedAtMs: number, nowMs: number, waitMs: number, budgetMs = OUTBOUND_RUN_BUDGET_MS): boolean {
  return nowMs - startedAtMs + waitMs + 5_000 < budgetMs
}

export type OutboundResult =
  | { kind: 'sent' }
  | { kind: 'failed'; detail: string }
  | { kind: 'rate_limited'; detail: string }

/**
 * Un envoi, avec au plus une attente du délai annoncé si la limite de débit
 * est atteinte et que le budget le permet. « rate_limited » : l'appelant
 * arrête le passage et laisse le reste au passage suivant, sans compter
 * d'échec. « failed » : vrai échec (adresse refusée, erreur serveur).
 */
export async function sendWithinRateLimit(
  attempt: () => Promise<{ ok: boolean; status: number; body: string }>,
  opts: { startedAtMs: number; now?: () => number; sleep?: (ms: number) => Promise<void>; budgetMs?: number },
): Promise<OutboundResult> {
  const now = opts.now ?? (() => Date.now())
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)))
  for (let round = 0; round < 2; round++) {
    let detail = ''
    try {
      const res = await attempt()
      if (res.ok) return { kind: 'sent' }
      detail = `${res.status} ${res.body}`.slice(0, 300)
      if (res.status !== 429 && !isOutboundRateLimit(res.body)) return { kind: 'failed', detail }
    } catch (e) {
      detail = describeThrown(e).slice(0, 300)
      if (!isOutboundRateLimit(e)) return { kind: 'failed', detail }
    }
    const waitMs = retryAfterMsFrom(detail)
    if (round === 1 || !canWaitWithinBudget(opts.startedAtMs, now(), waitMs, opts.budgetMs)) {
      return { kind: 'rate_limited', detail }
    }
    await sleep(waitMs)
  }
  return { kind: 'rate_limited', detail: 'retry exhausted' }
}
