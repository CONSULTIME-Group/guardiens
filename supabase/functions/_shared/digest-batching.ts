// Envoi par lots bornés, partagé par les résumés (lot A15).
// Au plus `batchSize` appels ouverts à la fois, pause fixe entre deux lots.
// Module pur : aucune dépendance Deno, testé côté Vitest.

export const DIGEST_BATCH_SIZE = 5
export const DIGEST_BATCH_PAUSE_MS = 700

export type DigestOutcome = 'sent' | 'skipped' | 'failed'

export interface DigestError {
  user_id: string
  status: string
  message: string
}

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi

/** Message court, sans adresse email. */
export function shortErrorMessage(raw: unknown, max = 160): string {
  const s = String(raw ?? '').replace(EMAIL_RE, '[adresse]').replace(/\s+/g, ' ').trim()
  return s.length > max ? `${s.slice(0, max)}…` : s
}

/** Clé de décompte : code HTTP, sinon nom de l'erreur réseau. */
export function errorStatusKey(e: unknown): string {
  if (e && typeof e === 'object' && 'name' in e && typeof (e as { name: unknown }).name === 'string') {
    return (e as { name: string }).name || 'Error'
  }
  return 'Error'
}

export class DigestErrorCollector {
  readonly errors: DigestError[] = []
  readonly byStatus: Record<string, number> = {}
  add(user_id: string, status: string | number, message: unknown) {
    const key = String(status)
    this.byStatus[key] = (this.byStatus[key] ?? 0) + 1
    if (this.errors.length < 20) this.errors.push({ user_id, status: key, message: shortErrorMessage(message) })
  }
}

export async function runInBatches<T>(
  items: T[],
  worker: (item: T) => Promise<DigestOutcome>,
  opts: {
    batchSize?: number
    pauseMs?: number
    sleep?: (ms: number) => Promise<void>
    onThrow?: (item: T, e: unknown) => void
  } = {},
): Promise<{ sent: number; skipped: number; failed: number }> {
  const size = opts.batchSize ?? DIGEST_BATCH_SIZE
  const pause = opts.pauseMs ?? DIGEST_BATCH_PAUSE_MS
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)))
  const tally = { sent: 0, skipped: 0, failed: 0 }
  for (let i = 0; i < items.length; i += size) {
    if (i > 0 && pause > 0) await sleep(pause)
    const batch = items.slice(i, i + size)
    const outcomes = await Promise.all(batch.map(async (item) => {
      try {
        return await worker(item)
      } catch (e) {
        opts.onThrow?.(item, e)
        return 'failed' as const
      }
    }))
    for (const o of outcomes) tally[o]++
  }
  return tally
}

/** Statut du résumé quotidien gardiens (lot A15). */
export const SITTER_DIGEST_LAST_PASS_UTC_HOUR = 8

export function sitterDigestRunStatus(input: {
  errorsCount: number
  budgetReached: boolean
  queueRemaining: number
  utcHour: number
}): 'success' | 'partial' {
  if (input.errorsCount > 0) return 'partial'
  const isLastPass = input.utcHour >= SITTER_DIGEST_LAST_PASS_UTC_HOUR
  if (input.queueRemaining > 0 && isLastPass) return 'partial'
  return 'success'
}
