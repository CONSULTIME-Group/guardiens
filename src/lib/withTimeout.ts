/**
 * Course entre une promesse et un délai maximal.
 *
 * Sert aux appels longs (génération IA côté edge function) dont la
 * promesse peut ne JAMAIS se résoudre si la connexion se fige : sans
 * garde, l'état « en cours » de l'UI ne retomberait jamais et l'écran
 * serait bloqué jusqu'au rechargement. Avec cette garde, l'état retombe
 * toujours, que l'appel réussisse, échoue ou se perde.
 *
 * Testé dans src/__tests__/with-timeout.test.ts.
 */

export class TimeoutError extends Error {
  constructor(label: string, ms: number) {
    super(`${label} : délai dépassé (${Math.round(ms / 1000)} s)`);
    this.name = "TimeoutError";
  }
}

/**
 * Résout avec la valeur de `promise` si elle tient dans `ms`, rejette
 * avec TimeoutError sinon. Une erreur de la promesse est propagée
 * immédiatement, sans attendre le délai.
 */
export const withTimeout = <T>(
  promise: Promise<T>,
  ms: number,
  label = "opération",
): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError(label, ms)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
