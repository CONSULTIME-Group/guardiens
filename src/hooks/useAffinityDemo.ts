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
  const { t } = useTranslation();
  // Pondération réelle : 2/2/1/1/1/1/1 sur 9. Affiché arrondi (22/22/11×5).
  const breakdown: AffinityBreakdownItem[] = [
    { criterion: t("landing.affinity.demo.c_animals"), matched: true, weight: 22, note: t("landing.affinity.demo.n_animals") },
    { criterion: t("landing.affinity.demo.c_presence"), matched: true, weight: 22, note: t("landing.affinity.demo.n_presence") },
    { criterion: t("landing.affinity.demo.c_pace"), matched: true, weight: 11, note: t("landing.affinity.demo.n_pace") },
    { criterion: t("landing.affinity.demo.c_languages"), matched: true, weight: 11, note: t("landing.affinity.demo.n_languages") },
    { criterion: t("landing.affinity.demo.c_interests"), matched: true, weight: 11, note: t("landing.affinity.demo.n_interests") },
    { criterion: t("landing.affinity.demo.c_ideal"), matched: true, weight: 11, note: t("landing.affinity.demo.n_ideal") },
    { criterion: t("landing.affinity.demo.c_mood"), matched: false, weight: 11, note: t("landing.affinity.demo.n_mood") },
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
