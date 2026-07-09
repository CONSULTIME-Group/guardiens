/**
 * Garde-fou global : redirige l'utilisateur connecté vers /onboarding/affinity
 * tant que le flag `mandatory_affinity_onboarding` est ON et qu'il lui manque
 * un des champs requis.
 *
 * Monté à l'intérieur d'AppLayout : ne touche pas les pages publiques
 * (Landing, /gardiens/:id, /annonces/:id, /pros/:slug, /login, /inscription…)
 * qui utilisent d'autres layouts. Pas de boucle : ignore la route
 * /onboarding/affinity elle-même et /pros/inscription (parcours pro dédié).
 */
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { useAffinityOnboardingStatus } from "@/hooks/useAffinityOnboardingStatus";

const OnboardingGate = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { enabled, appliesSince, loading: flagLoading } = useFeatureFlag("mandatory_affinity_onboarding");
  const status = useAffinityOnboardingStatus();

  useEffect(() => {
    if (loading || flagLoading || status.loading) return;
    if (!user || !enabled || !status.needsOnboarding) return;
    // Scoping : ne redirige que les comptes créés après la date de bascule.
    // Les comptes antérieurs gardent le nudge doux (AffinityMissingCTA).
    // Si applies_since est absent en base, on retombe sur un scope permissif
    // (aucune redirection) pour ne jamais bloquer les anciens par défaut.
    if (!appliesSince) return;
    if (!status.profileCreatedAt) return;
    if (new Date(status.profileCreatedAt).getTime() < new Date(appliesSince).getTime()) return;
    const path = location.pathname;
    // Routes à ne jamais interrompre.
    if (
      path.startsWith("/onboarding/affinity") ||
      path.startsWith("/pros/inscription") ||
      path.startsWith("/logout") ||
      path.startsWith("/reset-password")
    ) return;
    const redirect = `${location.pathname}${location.search}${location.hash}`;
    navigate(`/onboarding/affinity?redirect=${encodeURIComponent(redirect)}`, { replace: true });
  }, [loading, flagLoading, status.loading, status.needsOnboarding, status.profileCreatedAt, user, enabled, appliesSince, location, navigate]);

  return null;
};

export default OnboardingGate;
