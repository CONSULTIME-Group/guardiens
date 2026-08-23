/**
 * Registre des surfaces affichant un pourcentage d'affinité côté PROPRIÉTAIRE.
 *
 * Source unique de la décision du 23/08/2026, "le chiffre affiché est le
 * chiffre de tri" :
 *  - CLASSEMENT (recherche gardiens, Top 3) : trier et afficher `sortScore`
 *    (score x confiance) ;
 *  - CANDIDATURES (ApplicationsList, OwnerStarSection) : trier et afficher
 *    le `score` BRUT. 53 candidatures au total, 2,5 par annonce : le chiffre
 *    ne sert pas à trier, il sert à oser dire oui ;
 *  - PROFIL PUBLIC / PROXIMITÉ / FAVORIS : hors invariant "ordre = chiffre"
 *    (couple unique ou tri primaire visible autre), la clé déclarée est
 *    `sortScore` pour rester cohérente avec la recherche.
 *  - Côté GARDIEN : le brut, partout, hors de ce registre (règle 11).
 *
 * Toute nouvelle surface affichant un pourcentage d'affinité DOIT être
 * déclarée ici : le test `affinity-displayed-order.test.ts` pilote ce
 * registre et casse si le code ne respecte pas la déclaration.
 */

export type AffinityDisplayKey = "score" | "sortScore";

export type AffinitySurfaceCategory =
  | "classement"
  | "candidatures"
  | "profil_public"
  | "proximite"
  | "favoris";

export interface AffinitySurfaceDeclaration {
  /** Nom lisible de la surface (utilisé dans les messages de test). */
  surface: string;
  /** Fichier porteur du chiffre affiché. */
  file: string;
  category: AffinitySurfaceCategory;
  /** Clé du chiffre que la surface DOIT afficher. */
  displayKey: AffinityDisplayKey;
  /** Fragment de code prouvant que la surface affiche la clé déclarée. */
  proof: string;
  /** Fragment interdit dans ce fichier (en général l'autre clé). */
  forbidden?: string;
}

export const AFFINITY_DISPLAY_REGISTRY: AffinitySurfaceDeclaration[] = [
  {
    surface: "Meilleur candidat du tableau de bord (OwnerStarSection)",
    file: "src/components/dashboard/owner/OwnerStarSection.tsx",
    category: "candidatures",
    displayKey: "score",
    proof: "affinity!.score",
    forbidden: "sortScore",
  },
  {
    surface: "Page candidatures reçues (ApplicationsList)",
    file: "src/components/sits/ApplicationsList.tsx",
    category: "candidatures",
    displayKey: "score",
    proof: 'displayKey="score"',
    forbidden: "sortScore",
  },
  {
    surface: "Recherche gardiens (SitterResultCard)",
    file: "src/components/search/SitterResultCard.tsx",
    category: "classement",
    displayKey: "sortScore",
    proof: "affinity!.sortScore",
  },
  {
    // Badge partagé : recherche (classement), fiche publique (profil_public)
    // et gardiens à proximité (proximite). Le défaut est sortScore, seules
    // les surfaces CANDIDATURES passent displayKey="score" explicitement.
    surface: "Badge affinité partagé (OwnerToSitterAffinity)",
    file: "src/components/matching/OwnerToSitterAffinity.tsx",
    category: "classement",
    displayKey: "sortScore",
    proof: "full.sortScore",
  },
  {
    surface: "Fiche publique gardien (AlmaFitGardien)",
    file: "src/components/ai/alma/AlmaFitGardien.tsx",
    category: "profil_public",
    displayKey: "sortScore",
    proof: "affinity.sortScore",
  },
  {
    surface: "Favoris gardiens (SitterCard)",
    file: "src/components/favorites/SitterCard.tsx",
    category: "favoris",
    displayKey: "sortScore",
    proof: "displayScore={affinity.sortScore}",
  },
];
