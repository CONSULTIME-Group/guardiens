/**
 * Chips discriminantes entre les candidats d'un même trio (25/08/2026).
 *
 * Constat prod : les 3 cartes du Top 3 affichaient les deux mêmes phrases
 * (Animaux + Présence), critères de poids maximal matchés à l'identique par
 * les trois. Aucune différenciation visible alors que les candidats se
 * distinguent sur d'autres critères.
 *
 * Doctrine : un critère matché par tous les candidats à l'identique (mêmes
 * points) ne départage rien, il recule derrière tout critère qui distingue
 * réellement le trio. À défaut de critère discriminant, l'ordre par poids
 * puis points reste le comportement de repli, inchangé.
 *
 * Garde-fous hérités, toujours valides :
 * - jamais de chip pour un critère non matché par le candidat concerné,
 * - un critère produit au maximum une chip,
 * - tri stable : à discriminance, poids et points égaux, l'ordre canonique
 *   des critères est conservé.
 */

export interface ChipCriterion {
  key: string;
  weight: number;
  points: number;
  phrase: string;
}

export interface ChipCandidate {
  id: string;
  affinity: { matchedDetailed: ChipCriterion[] };
}

/**
 * Choisit les `take` chips de chaque candidat en priorisant les critères qui
 * distinguent le trio. Retourne une Map id candidat, phrases ordonnées.
 */
export const pickDiscriminatingChips = <T extends ChipCandidate>(
  candidates: T[],
  take = 2,
): Map<string, string[]> => {
  // Signature d'un critère sur le trio : "hit:points" s'il est matché par le
  // candidat, "none" sinon. Un critère est discriminant si ses signatures
  // ne sont pas toutes identiques sur le trio.
  const keys = new Set<string>();
  for (const c of candidates) {
    for (const m of c.affinity.matchedDetailed) keys.add(m.key);
  }

  const discriminative = new Map<string, boolean>();
  for (const key of keys) {
    const signatures = candidates.map((c) => {
      const hit = c.affinity.matchedDetailed.find((m) => m.key === key);
      return hit ? `hit:${hit.points}` : "none";
    });
    discriminative.set(key, new Set(signatures).size > 1);
  }

  const result = new Map<string, string[]>();
  for (const c of candidates) {
    const chips = [...c.affinity.matchedDetailed]
      .sort(
        (a, b) =>
          Number(discriminative.get(b.key) ?? false) -
            Number(discriminative.get(a.key) ?? false) ||
          b.weight - a.weight ||
          b.points - a.points,
      )
      .slice(0, take)
      .map((m) => m.phrase);
    result.set(c.id, chips);
  }
  return result;
};
