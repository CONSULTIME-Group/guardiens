// Logique pure de la campagne saisonniere : croisement avec la cohorte figee
// et decoupage en lots. Extrait ici pour etre testable sans reseau.

export interface CohortRow {
  user_id: string
  groupe: string | null
}

/** Sous-ensemble du plan portant l'identifiant, seul champ utile au croisement. */
export interface PlanLike {
  user_id: string
}

export interface CohortFilterResult<T extends PlanLike> {
  rows: T[]
  /** Taille du plan avant croisement. */
  planBrut: number
  /** Taille apres croisement avec le groupe cible. */
  cibleRetenue: number
  /** Ecart, soit tout ce qui n'appartient pas au groupe cible. */
  ecartesHorsCible: number
  /** Vrai quand une cohorte figee existe pour la periode. */
  cohortPresent: boolean
}

/**
 * Restreint le plan aux seuls membres du groupe 'cible' quand une cohorte
 * figee existe. Sans cohorte, le plan passe tel quel.
 */
export function filterToFrozenCohort<T extends PlanLike>(
  planRows: T[],
  cohortRows: CohortRow[],
): CohortFilterResult<T> {
  const planBrut = planRows.length
  if (cohortRows.length === 0) {
    return {
      rows: planRows,
      planBrut,
      cibleRetenue: planBrut,
      ecartesHorsCible: 0,
      cohortPresent: false,
    }
  }
  const cible = new Set(
    cohortRows.filter((c) => c.groupe === 'cible').map((c) => c.user_id),
  )
  const rows = planRows.filter((r) => cible.has(r.user_id))
  return {
    rows,
    planBrut,
    cibleRetenue: rows.length,
    ecartesHorsCible: planBrut - rows.length,
    cohortPresent: true,
  }
}

/** Entier borne, avec repli quand la valeur fournie n'est pas exploitable. */
export function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  const n = Math.trunc(value)
  if (n < min) return min
  if (n > max) return max
  return n
}

/** Decoupage en lots de taille fixe, le dernier lot pouvant etre plus court. */
export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

export interface RunInBatchesOptions<T, R> {
  batchSize: number
  delayMs: number
  handler: (item: T) => Promise<R>
  sleep: (ms: number) => Promise<void>
  /** Vrai quand il faut arreter proprement avant d'attaquer un nouveau lot. */
  shouldStop?: () => boolean
}

export interface RunInBatchesResult<T, R> {
  results: R[]
  processed: number
  /** Destinataires non traites quand la garde de temps a coupe la boucle. */
  remaining: T[]
  stopped: boolean
}

/**
 * Traite les elements par lots, avec une pause entre deux lots consecutifs et
 * jamais apres le dernier. La garde de temps est consultee avant chaque lot.
 */
export async function runInBatches<T, R>(
  items: T[],
  opts: RunInBatchesOptions<T, R>,
): Promise<RunInBatchesResult<T, R>> {
  const batches = chunk(items, opts.batchSize)
  const results: R[] = []
  let processed = 0

  for (let b = 0; b < batches.length; b++) {
    if (opts.shouldStop?.()) {
      return { results, processed, remaining: items.slice(processed), stopped: true }
    }
    const batch = batches[b]
    const out = await Promise.all(batch.map((item) => opts.handler(item)))
    results.push(...out)
    processed += batch.length
    const isLast = b === batches.length - 1
    if (!isLast && opts.delayMs > 0) await opts.sleep(opts.delayMs)
  }

  return { results, processed, remaining: [], stopped: false }
}

/** Un echec de debit Resend, seul cas rejoue une fois. */
export function isRateLimitFailure(reason: string): boolean {
  return /ratelimit/i.test(reason) || /\b429\b/.test(reason)
}
