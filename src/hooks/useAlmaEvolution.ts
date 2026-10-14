/**
 * useAlmaEvolution, calcule le stade d'évolution de l'utilisateur courant
 * à partir de signaux RÉELS uniquement (jamais monétaire, jamais inventé).
 *
 * Lot A7 (14/10/2026) : le calcul vit dans le module partagé
 * supabase/functions/_shared/alma-bond.ts (même règle pour le site et pour
 * alma-chat) ; ce hook ne lit que les lectures partagées du tableau de bord
 * (aucune lecture de plus) et garde ses exports. Le lien complet, avec les
 * moments datés, se lit par useAlmaBond.
 *
 * Stades :
 *  - "nouvelle" : profil sous le seuil (40 %, doctrine Y3).
 *  - "eveillee" : profil au-dessus du seuil, aucun geste encore.
 *  - "complice" : profil prêt ET au moins un geste réel (annonce publiée,
 *                 candidature, coup de main, garde confirmée).
 *  - "fidele"   : garde réalisée OU 3 coups de main OU 1 écusson OU gardien d'urgence.
 */
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import {
  BOND_STAGE_LABEL,
  BOND_STAGES,
  BOND_THRESHOLDS,
  computeAlmaBond,
  loadCachedBondSignals,
  type BondStage,
} from "@/lib/alma/bond";

export type AlmaStage = BondStage;

/** Seuils centralisés, ajustables par produit sans toucher la logique. */
export const ALMA_THRESHOLDS = {
  // Lot A7 : aligné sur la doctrine Y3 (MIN_COMPLETION_TO_APPLY, 40 %).
  profileCompletionMin: BOND_THRESHOLDS.profileCompletionMin,
  missionsForFidele: BOND_THRESHOLDS.helpForFidele,
  badgesForFidele: BOND_THRESHOLDS.badgesForFidele,
  completedSitsForFidele: BOND_THRESHOLDS.completedSitsForFidele,
} as const;

export interface AlmaEvolution {
  stage: AlmaStage;
  stageLabel: string;
  stageDescription: string;
  nextMilestone: string | null;
  nextActionHref: string | null;
  nextActionLabel: string | null;
  signals: {
    profileCompletion: number;
    identityVerified: boolean;
    publishedSitsCount: number;
    allSitsCount: number;
    applicationsCount: number;
    missionsCount: number;
    completedSitsCount: number;
    badgesCount: number;
    isEmergencySitter: boolean;
    hasDraftSit: boolean;
  };
}

const STAGE_LABEL: Record<AlmaStage, string> = BOND_STAGE_LABEL;

const STAGE_DESCRIPTION: Record<AlmaStage, string> = {
  nouvelle:
    "Alma vient de faire votre connaissance. Racontez-lui qui vous êtes pour qu'elle vous accompagne au mieux.",
  eveillee:
    "Alma vous reconnaît. Votre profil est prêt, il ne manque plus qu'un premier geste vers la communauté.",
  complice:
    "Alma vous a vu passer à l'action. Chaque nouveau geste renforce votre lien avec les gens du coin.",
  fidele:
    "Alma vous connaît bien. Vous incarnez l'esprit Guardiens et inspirez les autres membres du coin.",
};


export function useAlmaEvolution() {
  const { user, activeRole } = useAuth();

  return useQuery({
    queryKey: ["alma_evolution", user?.id, activeRole],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<AlmaEvolution> => {
      const uid = user!.id;
      const role = activeRole === "owner" ? "owner" : "sitter";
      const profileCompletion = user!.profileCompletion || 0;
      const identityVerified = user!.identityVerified;

      // Lot P1b : lectures partagées avec les autres blocs du tableau de bord.
      const signals = await loadCachedBondSignals(uid, role, profileCompletion);
      const bond = computeAlmaBond(signals);

      return {
        stage: bond.stage,
        stageLabel: STAGE_LABEL[bond.stage],
        stageDescription: STAGE_DESCRIPTION[bond.stage],
        nextMilestone: bond.next?.milestone ?? null,
        nextActionHref: bond.next?.href ?? null,
        nextActionLabel: bond.next?.label ?? null,
        signals: {
          profileCompletion,
          identityVerified,
          publishedSitsCount: bond.counts.publishedSits,
          allSitsCount: signals.ownSits.length,
          applicationsCount: bond.counts.applications,
          missionsCount: bond.counts.missionsPublished + bond.counts.helpGiven,
          completedSitsCount: bond.counts.completedSits,
          badgesCount: bond.counts.badges,
          isEmergencySitter: Boolean(signals.isEmergencySitter),
          hasDraftSit: signals.ownSits.some((s) => s.status === "draft"),
        },
      };
    },
  });
}

export const ALMA_STAGES: AlmaStage[] = BOND_STAGES;
export const ALMA_STAGE_LABEL = STAGE_LABEL;
export const ALMA_STAGE_DESCRIPTION = STAGE_DESCRIPTION;
