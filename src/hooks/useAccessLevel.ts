import { useAuth } from "@/contexts/AuthContext";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";

/**
 * Access levels:
 * 0 — Not logged in
 * 1 — Logged in, profile < 60%
 * 2 — Profile ≥ 60%, ID not verified (NON-BLOQUANT — recommandation seulement)
 * 3A — Sitter, profile ≥ 60%, ID verified, no subscription
 * 3B — Owner, profile ≥ 60%, ID verified (free forever)
 * 4 — Sitter subscribed + profile ≥ 60% + ID verified
 *
 * Politique : la vérification d'identité est FORTEMENT RECOMMANDÉE
 * mais n'est plus bloquante pour postuler ou publier. Elle reste
 * mise en avant via `identityRecommended` et des bandeaux d'incitation.
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

  if (completion < 60) {
    return {
      level: 1,
      profileCompletion: completion,
      identityVerified,
      identityRecommended,
      canApplyMissions: false,
      canApplyGuards: false,
      canPublish: false,
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

  // Profile ≥ 60% + ID verified
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
