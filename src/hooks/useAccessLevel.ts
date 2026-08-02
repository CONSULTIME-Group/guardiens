import { useAuth } from "@/contexts/AuthContext";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";

/**
 * Access levels:
 * 0 — Not logged in
 * 1 — Réservé, plus jamais renvoyé : le seuil de complétion de profil a été supprimé.
 * 2 — Connecté, identité non vérifiée (NON-BLOQUANT, recommandation seulement)
 * 3A — Gardien, identité vérifiée, sans abonnement
 * 3B — Propriétaire, identité vérifiée (gratuit)
 * 4 — Gardien abonné + identité vérifiée
 *
 * Politique : ni la vérification d'identité ni un pourcentage de complétion de
 * profil ne bloquent la publication. Les prérequis concrets d'une annonce sont
 * portés par la source unique `src/lib/sitPublishRules.ts`, jamais ici.
 */
export type AccessLevel = 0 | 1 | 2 | "3A" | "3B" | 4;

export interface AccessInfo {
  level: AccessLevel;
  profileCompletion: number;
  identityVerified: boolean;
  identityRecommended: boolean; // true si on doit afficher un encart "vérifiez votre identité"
  canApplyMissions: boolean;   // petites missions
  canApplyGuards: boolean;     // gardes
  canPublish: boolean;         // publish sits/missions
  loading: boolean;
}

export const useAccessLevel = (): AccessInfo => {
  const { user, isAuthenticated, loading: authLoading, activeRole } = useAuth();
  const { hasAccess, loading: subLoading } = useSubscriptionAccess();

  const loading = authLoading || subLoading;

  if (!isAuthenticated || !user) {
    return {
      level: 0,
      profileCompletion: 0,
      identityVerified: false,
      identityRecommended: false,
      canApplyMissions: false,
      canApplyGuards: false,
      canPublish: false,
      loading,
    };
  }

  const completion = user.profileCompletion || 0;
  const identityVerified = user.identityVerified ?? false;
  const effectiveRole = user.role === "both" ? activeRole : user.role;
  const identityRecommended = !identityVerified;

  // Palier 1 : profil trop incomplet pour postuler. Garde-fou côté gardien
  // uniquement, sans rapport avec les prérequis de publication d'un propriétaire.
  if (completion < 60) {
    return {
      level: 1,
      profileCompletion: completion,
      identityVerified,
      identityRecommended,
      canApplyMissions: false,
      canApplyGuards: false,
      canPublish: effectiveRole === "owner",
      loading,
    };
  }



  // ID non vérifié — NON-BLOQUANT : on autorise les candidatures et la publication.
  // Côté sitter, on traite comme 3A (peut postuler aux missions, garde nécessite abonnement).
  // Côté owner, on traite comme 3B (peut publier librement).
  if (!identityVerified) {
    if (effectiveRole === "owner") {
      return {
        level: 2,
        profileCompletion: completion,
        identityVerified: false,
        identityRecommended: true,
        canApplyMissions: true,
        canApplyGuards: true,
        canPublish: true,
        loading,
      };
    }
    // Sitter sans ID : peut postuler aux petites missions, gardes selon abonnement
    return {
      level: 2,
      profileCompletion: completion,
      identityVerified: false,
      identityRecommended: true,
      canApplyMissions: true,
      canApplyGuards: hasAccess,
      canPublish: false,
      loading,
    };
  }

  // Identité vérifiée
  if (effectiveRole === "owner") {
    return {
      level: "3B",
      profileCompletion: completion,
      identityVerified: true,
      identityRecommended: false,
      canApplyMissions: true,
      canApplyGuards: true,
      canPublish: true,
      loading,
    };
  }

  // Sitter
  if (hasAccess) {
    return {
      level: 4,
      profileCompletion: completion,
      identityVerified: true,
      identityRecommended: false,
      canApplyMissions: true,
      canApplyGuards: true,
      canPublish: true,
      loading,
    };
  }

  // Sitter without subscription
  return {
    level: "3A",
    profileCompletion: completion,
    identityVerified: true,
    identityRecommended: false,
    canApplyMissions: true,
    canApplyGuards: false,
    canPublish: false,
    loading,
  };
};
