import { useTranslation } from "react-i18next";

/**
 * Match démo statique pour AffinityScoreShowcase.
 *
 * Les libellés, poids et notes reflètent EXACTEMENT le moteur réel
 * `computeAffinityResultFull` (src/lib/affinityScore.ts) :
 * pondération 2/2/2/1/1/1/1/1/1/1 sur un dénominateur dynamique de 13,
 * soit 15 % pour chaque critère à poids 2 et 8 % pour chaque critère à
 * poids 1 (arrondis pour affichage, somme = 100 %).
 *
 * Rappel doctrine : le dénominateur n'est JAMAIS un nombre fixe en
 * production. Chaque critère peut sortir du calcul selon le couple. Ce
 * tableau est un exemple illustratif où les 10 critères sont évaluables.
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
  // Pondération réelle : 2/2/2/1/1/1/1/1/1/1 sur 13.
  // Affiché arrondi : 15 % × 3 et 8 % × 6 + 7 % (somme = 100).
  const breakdown: AffinityBreakdownItem[] = [
    { criterion: t("landing.affinity.demo.c_animals"), matched: true, weight: 15, note: t("landing.affinity.demo.n_animals") },
    { criterion: t("landing.affinity.demo.c_presence"), matched: true, weight: 15, note: t("landing.affinity.demo.n_presence") },
    { criterion: t("landing.affinity.demo.c_vehicle"), matched: true, weight: 15, note: t("landing.affinity.demo.n_vehicle") },
    { criterion: t("landing.affinity.demo.c_ideal"), matched: true, weight: 8, note: t("landing.affinity.demo.n_ideal") },
    { criterion: t("landing.affinity.demo.c_pace"), matched: true, weight: 8, note: t("landing.affinity.demo.n_pace") },
    { criterion: t("landing.affinity.demo.c_languages"), matched: true, weight: 8, note: t("landing.affinity.demo.n_languages") },
    { criterion: t("landing.affinity.demo.c_interests"), matched: true, weight: 8, note: t("landing.affinity.demo.n_interests") },
    { criterion: t("landing.affinity.demo.c_mood"), matched: false, weight: 8, note: t("landing.affinity.demo.n_mood") },
    { criterion: t("landing.affinity.demo.c_needs"), matched: true, weight: 8, note: t("landing.affinity.demo.n_needs") },
    { criterion: t("landing.affinity.demo.c_distance"), matched: false, weight: 7, note: t("landing.affinity.demo.n_distance") },
  ];
  const matchedCount = breakdown.filter((b) => b.matched).length;
  const totalCount = breakdown.length;
  // 8/10 critères matchés, ambiance (8 %) et distance (7 %) en frein :
  // 11/13 de poids matché, soit 84,6 %, affiché 85 % (le moteur réel
  // intègre aussi les sensibilités et l'intersection espèces).
  const score = 85;

  return {
    ownerName: "Camille",
    sitterName: "Théo",
    score,
    matchedCount,
    totalCount,
    breakdown,
  };
}
