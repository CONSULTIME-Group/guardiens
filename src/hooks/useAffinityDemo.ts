/**
 * Match démo statique pour AffinityScoreShowcase.
 *
 * Les libellés, poids et notes reflètent EXACTEMENT le moteur réel
 * `computeAffinityResultFull` (src/lib/affinityScore.ts) :
 * pondération 2/2/1/1/1/1/1 sur MAX_WEIGHT = 9, soit 22 % / 22 % / 11 %
 * (arrondis pour affichage). Total = 100 %.
 *
 * Exemple purement illustratif : les prénoms et les notes sont fictifs
 * et servent uniquement à donner à voir la structure du score.
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
  // Pondération réelle : 2/2/1/1/1/1/1 sur 9. Affiché arrondi (22/22/11×5).
  const breakdown: AffinityBreakdownItem[] = [
    { criterion: "Animaux", matched: true, weight: 22, note: "Chien et chat déclarés, expérience confirmée" },
    { criterion: "Présence pendant la garde", matched: true, weight: 22, note: "Télétravail compatible avec vos attentes" },
    { criterion: "Rythme de vie", matched: true, weight: 11, note: "Rythme actif, cohérent avec le foyer" },
    { criterion: "Langues", matched: true, weight: 11, note: "Français en commun" },
    { criterion: "Intérêts", matched: true, weight: 11, note: "Jardin, lecture, nature" },
    { criterion: "Profil idéal", matched: true, weight: 11, note: "Correspond au type de gardien recherché" },
    { criterion: "Ambiance du foyer", matched: false, weight: 11, note: "Ambiance calme, gardien plus sportif" },
  ];
  const matchedCount = breakdown.filter((b) => b.matched).length;
  const totalCount = breakdown.length;
  // 6/7 critères matchés, un manquant à 11 % → environ 89 % ; on affiche 87 %
  // (le moteur réel intègre aussi les sensibilités et l'intersection espèces).
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
