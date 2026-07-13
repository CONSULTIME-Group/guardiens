/**
 * useAlmaEvolution — calcule le stade d'évolution de l'utilisateur courant
 * à partir de signaux RÉELS uniquement (jamais monétaire, jamais inventé).
 *
 * Les seuils sont centralisés dans ALMA_THRESHOLDS pour être ajustés facilement.
 * La vérification d'identité est un signal valorisé mais N'EST PLUS un plafond dur.
 *
 * Stades :
 *  - "nouvelle" : par défaut, juste inscrit (profil sous le seuil).
 *  - "eveillee" : profil complété au-dessus du seuil (par défaut 60 %).
 *  - "complice" : profil complété ET au moins une action réelle
 *                 (annonce publiée, candidature, mission d'entraide).
 *  - "fidele"   : historique tangible, garde réalisée OU >= 3 missions d'entraide
 *                 OU >= 1 écusson OU statut gardien d'urgence.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AlmaStage = "nouvelle" | "eveillee" | "complice" | "fidele";

/** Seuils centralisés, ajustables par produit sans toucher la logique. */
export const ALMA_THRESHOLDS = {
  profileCompletionMin: 60,
  missionsForFidele: 3,
  badgesForFidele: 1,
  completedSitsForFidele: 1,
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

const STAGE_LABEL: Record<AlmaStage, string> = {
  nouvelle: "Nouvelle rencontre",
  eveillee: "Éveillée",
  complice: "Proche",
  fidele: "Fidèle",
};

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

      const [sitsRes, appsRes, missionsRes, badgesRes, emergencyRes, draftRes] =
        await Promise.all([
          supabase
            .from("sits")
            .select("id, status")
            .eq("user_id", uid),
          supabase
            .from("applications")
            .select("id")
            .eq("sitter_id", uid)
            .limit(1),
          supabase
            .from("small_missions")
            .select("id")
            .eq("user_id", uid)
            .in("status", ["open", "in_progress", "completed"])
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
            .eq("user_id", uid)
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

      const T = ALMA_THRESHOLDS;
      const profileOk = profileCompletion >= T.profileCompletionMin;

      const hasEngagement =
        publishedSitsCount > 0 ||
        applicationsCount > 0 ||
        missionsCount > 0 ||
        completedSitsCount > 0 ||
        badgesCount > 0;

      const isFidele =
        completedSitsCount >= T.completedSitsForFidele ||
        missionsCount >= T.missionsForFidele ||
        badgesCount >= T.badgesForFidele ||
        isEmergencySitter;

      // Identité valorisée mais NON bloquante : elle ne plafonne plus la progression.
      let stage: AlmaStage;
      if (!profileOk) stage = "nouvelle";
      else if (isFidele) stage = "fidele";
      else if (hasEngagement) stage = "complice";
      else stage = "eveillee";

      let nextMilestone: string | null = null;
      let nextActionHref: string | null = null;
      let nextActionLabel: string | null = null;

      if (stage === "nouvelle") {
        nextMilestone = `Compléter votre profil à ${T.profileCompletionMin} % pour ouvrir l'étape suivante.`;
        nextActionHref = activeRole === "owner" ? "/owner-profile" : "/profile";
        nextActionLabel = "Compléter mon profil";
      } else if (stage === "eveillee") {
        if (activeRole === "owner") {
          nextMilestone = "Publier votre première annonce ou une petite mission pour devenir Proche.";
          nextActionHref = "/sits/create";
          nextActionLabel = "Publier une annonce";
        } else {
          nextMilestone = "Postuler à votre première garde pour devenir Proche.";

          nextActionHref = "/annonces";
          nextActionLabel = "Trouver une garde";
        }
      } else if (stage === "complice") {
        if (activeRole === "sitter") {
          nextMilestone =
            "Réaliser une garde, cumuler 3 missions d'entraide ou recevoir un écusson pour devenir Fidèle.";
          nextActionHref = "/annonces";
          nextActionLabel = "Trouver une garde";
        } else {
          nextMilestone =
            "Réaliser une garde avec un gardien ou publier une nouvelle annonce pour devenir Fidèle.";
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
          allSitsCount: sits.length,
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
