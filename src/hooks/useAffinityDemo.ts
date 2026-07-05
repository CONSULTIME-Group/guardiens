/**
 * Match démo statique pour AffinityScoreShowcase.
 * Aujourd'hui : valeurs figées, alignées sur la pondération réelle du moteur
 * d'affinité 7 critères. Peut être remplacé par un vrai calcul serveur plus tard.
 */
export interface AffinityBreakdownItem {
  criterion: string;
  matched: boolean;
  weight: number;
  note: string;
}

export interface AffinityDemo {
  ownerName: string;
  sitterName: string;
  score: number;
  matchedCount: number;
  totalCount: number;
  breakdown: AffinityBreakdownItem[];
}

export function useAffinityDemo(): AffinityDemo {
  const breakdown: AffinityBreakdownItem[] = [
    { criterion: "Mode de vie", matched: true, weight: 15, note: "Actif + télétravail" },
    { criterion: "Animaux acceptés", matched: true, weight: 20, note: "Chien + chat + NAC" },
    { criterion: "Expérience", matched: true, weight: 15, note: "3 gardes + 2 avis" },
    { criterion: "Disponibilité", matched: true, weight: 15, note: "Semaines + week-ends" },
    { criterion: "Communication", matched: true, weight: 10, note: "Réactif en moins de 4 h" },
    { criterion: "Préférences maison", matched: true, weight: 10, note: "Non-fumeur, respect strict des consignes" },
    { criterion: "Préférences proximité", matched: false, weight: 15, note: "Trajet 12 km" },
  ];
  const matchedCount = breakdown.filter((b) => b.matched).length;
  const totalCount = breakdown.length;
  const score = 87;

  return {
    ownerName: "Camille",
    sitterName: "Théo",
    score,
    matchedCount,
    totalCount,
    breakdown,
  };
}
