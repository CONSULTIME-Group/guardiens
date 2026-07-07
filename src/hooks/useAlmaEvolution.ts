/**
 * useAlmaEvolution — calcule le stade d'évolution de l'utilisateur courant
 * à partir de signaux RÉELS uniquement (jamais monétaire, jamais inventé).
 *
 * Stades :
 *  - "nouvelle" : profil < 60%
 *  - "eveillee" : profil >= 60% ET identité vérifiée
 *  - "complice" : au moins un acte d'engagement (annonce publiée, candidature,
 *                 petite mission publiée, garde réalisée, écusson reçu)
 *  - "fidele"   : engagement soutenu (>= 3 gardes réalisées OU >= 3 écussons
 *                 OU statut gardien d'urgence)
 *
 * Aucun stade dépendant d'un paiement ou d'un abonnement.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AlmaStage = "nouvelle" | "eveillee" | "complice" | "fidele";

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
    applicationsCount: number;
    missionsCount: number;
    completedSitsCount: number;
    badgesCount: number;
    isEmergencySitter: boolean;
    hasDraftSit: boolean;
  };
}

const STAGE_LABEL: Record<AlmaStage, string> = {
  nouvelle: "Nouvelle rencontre",
  eveillee: "Éveillée",
  complice: "Complice",
  fidele: "Fidèle",
};

const STAGE_DESCRIPTION: Record<AlmaStage, string> = {
  nouvelle:
    "Alma vient de faire votre connaissance. Racontez-lui qui vous êtes pour qu'elle vous accompagne au mieux.",
  eveillee:
    "Alma vous reconnaît. Votre profil est prêt et votre identité vérifiée, tout est en place pour passer à l'action.",
  complice:
    "Alma vous a vu passer à l'action. Chaque nouveau geste renforce votre lien avec la communauté.",
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

      const [sitsRes, appsRes, missionsRes, badgesRes, emergencyRes, draftRes] =
        await Promise.all([
          supabase
            .from("sits")
            .select("id, status")
            .eq("owner_id", uid),
          supabase
            .from("applications")
            .select("id")
            .eq("sitter_id", uid)
            .limit(1),
          supabase
            .from("small_missions")
            .select("id")
            .eq("owner_id", uid)
            .in("status", ["published", "in_progress", "completed"])
            .limit(1),
          supabase
            .from("badge_attributions")
            .select("id", { count: "exact", head: true })
            .eq("user_id", uid),
          supabase
            .from("emergency_sitter_profiles")
            .select("id")
            .eq("user_id", uid)
            .maybeSingle(),
          supabase
            .from("sits")
            .select("id")
            .eq("owner_id", uid)
            .eq("status", "draft")
            .limit(1),
        ]);

      const sits = sitsRes.data || [];
      const publishedSitsCount = sits.filter((s) =>
        ["published", "confirmed", "completed"].includes(s.status),
      ).length;
      const completedSitsCount = sits.filter((s) => s.status === "completed").length;
      const applicationsCount = appsRes.data?.length || 0;
      const missionsCount = missionsRes.data?.length || 0;
      const badgesCount = badgesRes.count || 0;
      const isEmergencySitter = !!emergencyRes.data;
      const hasDraftSit = (draftRes.data?.length || 0) > 0;

      const profileCompletion = user!.profileCompletion || 0;
      const identityVerified = user!.identityVerified;

      const hasEngagement =
        publishedSitsCount > 0 ||
        applicationsCount > 0 ||
        missionsCount > 0 ||
        completedSitsCount > 0 ||
        badgesCount > 0;

      const isFidele =
        completedSitsCount >= 3 || badgesCount >= 3 || isEmergencySitter;

      let stage: AlmaStage;
      if (profileCompletion < 60) stage = "nouvelle";
      else if (!identityVerified) stage = "eveillee"; // profil ok mais identité pas encore
      else if (isFidele) stage = "fidele";
      else if (hasEngagement) stage = "complice";
      else stage = "eveillee";

      let nextMilestone: string | null = null;
      let nextActionHref: string | null = null;
      let nextActionLabel: string | null = null;

      if (stage === "nouvelle") {
        nextMilestone = "Compléter votre profil à 60 % pour ouvrir l'étape suivante.";
        nextActionHref = activeRole === "sitter" ? "/sitter-profile" : "/owner-profile";
        nextActionLabel = "Compléter mon profil";
      } else if (stage === "eveillee") {
        if (!identityVerified) {
          nextMilestone = "Vérifier votre identité pour rassurer la communauté.";
          nextActionHref = "/settings#verification";
          nextActionLabel = "Vérifier mon identité";
        } else if (activeRole === "owner") {
          nextMilestone = "Publier votre première annonce ou une petite mission.";
          nextActionHref = "/sits/create";
          nextActionLabel = "Publier une annonce";
        } else {
          nextMilestone = "Postuler à votre première garde.";
          nextActionHref = "/annonces";
          nextActionLabel = "Trouver une garde";
        }
      } else if (stage === "complice") {
        if (activeRole === "sitter") {
          const remaining = Math.max(0, 3 - completedSitsCount);
          nextMilestone =
            remaining > 0
              ? `Réaliser ${remaining} garde${remaining > 1 ? "s" : ""} de plus pour devenir Fidèle.`
              : "Continuer à recevoir des écussons pour devenir Fidèle.";
          nextActionHref = "/annonces";
          nextActionLabel = "Trouver une garde";
        } else {
          nextMilestone = "Publier une nouvelle annonce pour rester actif.";
          nextActionHref = "/sits/create";
          nextActionLabel = "Créer une annonce";
        }
      } else {
        nextMilestone =
          "Vous incarnez l'esprit Guardiens. Continuez à faire vivre le coin.";
        nextActionHref = "/conseils";
        nextActionLabel = "Explorer les conseils";
      }

      return {
        stage,
        stageLabel: STAGE_LABEL[stage],
        stageDescription: STAGE_DESCRIPTION[stage],
        nextMilestone,
        nextActionHref,
        nextActionLabel,
        signals: {
          profileCompletion,
          identityVerified,
          publishedSitsCount,
          applicationsCount,
          missionsCount,
          completedSitsCount,
          badgesCount,
          isEmergencySitter,
          hasDraftSit,
        },
      };
    },
  });
}

export const ALMA_STAGES: AlmaStage[] = ["nouvelle", "eveillee", "complice", "fidele"];
export const ALMA_STAGE_LABEL = STAGE_LABEL;
export const ALMA_STAGE_DESCRIPTION = STAGE_DESCRIPTION;
