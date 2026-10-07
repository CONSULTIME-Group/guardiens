/**
 * Garde-fou global : redirige l'utilisateur connecté vers /onboarding/affinity
 * tant que le flag `mandatory_affinity_onboarding` est ON et qu'il lui manque
 * un des champs requis.
 *
 * Monté à l'intérieur d'AppLayout : ne touche pas les pages publiques
 * (Landing, /gardiens/:id, /annonces/:id, /login, /inscription…)
 * qui utilisent d'autres layouts. Pas de boucle : ignore la route
 * /onboarding/affinity elle-même.
 */
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { useAffinityOnboardingStatus } from "@/hooks/useAffinityOnboardingStatus";
import { isPublishPath, rememberPublishIntent } from "@/lib/postOnboardingIntent";
import { isArrivalV2Account } from "@/lib/arrival";

const OnboardingGate = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { enabled, appliesSince, loading: flagLoading } = useFeatureFlag("mandatory_affinity_onboarding");
  const status = useAffinityOnboardingStatus();
  const arrival = useFeatureFlag("arrival_v2");

  useEffect(() => {
    if (loading || flagLoading || status.loading || arrival.loading) return;
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
      path.startsWith("/logout") ||
      path.startsWith("/reset-password") ||
      // Lot 1 : écrans du parcours d'arrivée v2.
      path.startsWith("/bienvenue") ||
      path.startsWith("/arrivee/") ||
      // Lot J1 : publier une première demande passe avant l'onboarding
      // affinité ; il est proposé après la publication (page suivante).
      isPublishPath(path)
    ) return;
    const redirect = `${location.pathname}${location.search}${location.hash}`;
    rememberPublishIntent(redirect);
    // Lot 1 : un propriétaire v2 incomplet reprend le parcours d'arrivée.
    if (user.role === "owner" && !arrival.loading && isArrivalV2Account(arrival, status.profileCreatedAt)) {
      const step = status.needsPostal ? "/arrivee/vous" : "/arrivee/affinites";
      const key = step === "/arrivee/vous" ? "next" : "redirect";
      navigate(`${step}?${key}=${encodeURIComponent(redirect)}`, { replace: true });
      return;
    }
    navigate(`/onboarding/affinity?redirect=${encodeURIComponent(redirect)}`, { replace: true });
  }, [loading, flagLoading, status.loading, status.needsOnboarding, status.needsPostal, status.profileCreatedAt, user, enabled, appliesSince, location, navigate, arrival]);

  return null;
};

export default OnboardingGate;
