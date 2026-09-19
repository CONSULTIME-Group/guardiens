// Classification des reponses du service de push et politique de reprise.
// Helpers purs, testes directement.

export const PUSH_BATCH_LIMIT = 20;
export const PUSH_NETWORK_TIMEOUT_MS = 8000;
export const PUSH_JOB_TTL_MS = 60 * 60 * 1000;
export const PUSH_MAX_ATTEMPTS = 3;

export type PushOutcome = 'accepted' | 'failed' | 'retry' | 'skipped';

export interface PushDecision {
  outcome: PushOutcome;
  // Code generique uniquement : jamais d'endpoint, de cle ni d'identifiant membre.
  errorCode: string | null;
  disableSubscription: boolean;
}

/**
 * Un provider qui accepte la requete garantit une prise en charge, jamais une
 * remise. On ne dit donc jamais 'delivered'.
 */
export function classifyPushResponse(status: number, attempts: number): PushDecision {
  if (status >= 200 && status < 300) {
    return { outcome: 'accepted', errorCode: null, disableSubscription: false };
  }
  if (status === 404 || status === 410) {
    return { outcome: 'failed', errorCode: `http_${status}`, disableSubscription: true };
  }
  if (status === 429 || status >= 500) {
    const canRetry = attempts < PUSH_MAX_ATTEMPTS;
    return {
      outcome: canRetry ? 'retry' : 'failed',
      errorCode: `http_${status}`,
      disableSubscription: false,
    };
  }
  return { outcome: 'failed', errorCode: `http_${status}`, disableSubscription: false };
}

/**
 * Echec reseau : la requete a pu partir sans que la reponse revienne. On ne
 * rejoue jamais une tentative ambigue, sinon le membre recoit un doublon.
 */
export function classifyNetworkFailure(): PushDecision {
  return { outcome: 'failed', errorCode: 'network_ambiguous', disableSubscription: false };
}

/** Un claim expire n'est pas rejoue en aveugle, il repart par la file. */
export function isJobStillFresh(createdAtIso: string, nowMs: number): boolean {
  const created = Date.parse(createdAtIso);
  if (Number.isNaN(created)) return false;
  return nowMs - created < PUSH_JOB_TTL_MS;
}

export function clampBatchSize(requested: unknown): number {
  const n = typeof requested === 'number' && Number.isFinite(requested)
    ? Math.floor(requested)
    : PUSH_BATCH_LIMIT;
  return Math.min(Math.max(n, 1), PUSH_BATCH_LIMIT);
}
