export interface FamilyRefreshState {
  last_hash: string | null;
  last_global_hash: string | null;
  last_marked_at: string | null;
}

/** Les empreintes représentent la dernière vague acceptée, pas le dernier déploiement vu. */
export function nextFamilyRefreshState(
  previous: FamilyRefreshState | undefined,
  hashes: { family: string | null; global: string | null },
  marked: boolean,
  now: string,
): FamilyRefreshState {
  if (previous && !marked) return { ...previous };
  return {
    last_hash: hashes.family ?? previous?.last_hash ?? null,
    last_global_hash: hashes.global ?? previous?.last_global_hash ?? null,
    // Une famille nouvelle démarre son filet temporel sans lancer de vague.
    last_marked_at: now,
  };
}
