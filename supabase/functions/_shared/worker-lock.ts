// Verrou de bail partagé entre invocations d'un worker email.
//
// Le lissage Resend doit être global au compte, pas local à une invocation :
// quatre workers simultanés cadencés à 600 ms chacun produisent ~6,7 envois/s,
// très au-dessus de la limite du compte. Un seul worker draine à la fois, les
// autres sortent immédiatement.
//
// Note d'implémentation : `pg_try_advisory_lock` est lié à la session Postgres.
// Via PostgREST, chaque appel RPC peut tomber sur une session différente du
// pool, donc un verrou pris dans un appel ne serait pas relâchable dans un
// autre, et serait relâché tout seul au retour de la connexion au pool. On
// utilise donc un bail en table, claimé atomiquement (l'unicité de la clé et
// un verrou consultatif de transaction sérialisent la prise), avec expiration
// automatique si un worker meurt en cours de route.

export const MASS_EMAIL_QUEUE_LOCK = "process-mass-email-queue";
export const LOCK_TTL_SECONDS = 120;

export interface LockClientLike {
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
}

/**
 * Décision pure : un bail est disponible si personne ne le tient, ou si le bail
 * en cours est expiré.
 */
export function isLockAvailable(nowMs: number, lockedUntilIso: string | null | undefined): boolean {
  if (!lockedUntilIso) return true;
  const until = new Date(lockedUntilIso).getTime();
  if (!Number.isFinite(until)) return true;
  return until <= nowMs;
}

export async function acquireWorkerLock(
  client: LockClientLike,
  lockKey: string = MASS_EMAIL_QUEUE_LOCK,
  ttlSeconds: number = LOCK_TTL_SECONDS,
): Promise<boolean> {
  const { data, error } = await client.rpc("try_acquire_worker_lock", {
    p_lock_key: lockKey,
    p_ttl_seconds: ttlSeconds,
  });
  if (error) {
    // En cas d'indisponibilité du verrou, on ne bloque pas la production :
    // un worker unique par minute reste la situation nominale du cron.
    console.error("try_acquire_worker_lock failed", error);
    return true;
  }
  return data === true;
}

export async function releaseWorkerLock(
  client: LockClientLike,
  lockKey: string = MASS_EMAIL_QUEUE_LOCK,
): Promise<void> {
  const { error } = await client.rpc("release_worker_lock", { p_lock_key: lockKey });
  if (error) console.error("release_worker_lock failed", error);
}
