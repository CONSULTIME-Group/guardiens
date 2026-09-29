/**
 * Garde de séquence pour les lectures admin.
 *
 * Chaque appel à `next()` renvoie un jeton ; `isCurrent(jeton)` n'est vrai
 * que pour le dernier jeton émis. Une réponse arrivée après une requête plus
 * récente est donc ignorée, la dernière DEMANDÉE gagne, pas la dernière arrivée.
 */
export interface SeqGuard {
  next: () => number;
  isCurrent: (token: number) => boolean;
}

export function createSeqGuard(): SeqGuard {
  let current = 0;
  return {
    next: () => ++current,
    isCurrent: (token: number) => token === current,
  };
}

/** Échappe % et _ pour un motif ilike, puis entoure de jokers. */
export function ilikeContains(term: string): string {
  const escaped = term.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
  return `%${escaped}%`;
}
