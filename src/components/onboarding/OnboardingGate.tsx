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
import { useFeatureFlag, getFlag } from "@/hooks/useFeatureFlag";
import { useAffinityOnboardingStatus } from "@/hooks/useAffinityOnboardingStatus";
import { isPublishPath, rememberPublishIntent } from "@/lib/postOnboardingIntent";

/** Lot 1 : compte arrivée v2 (copie locale de src/lib/arrivalFlag.ts, évite un module de plus dans la coquille). */
const isArrivalV2Account = (f: { enabled: boolean; appliesSince: string | null }, created: string | null | undefined) =>
  !!(f.enabled && f.appliesSince && created) && new Date(created!).getTime() >= new Date(f.appliesSince!).getTime();

const OnboardingGate = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { enabled, appliesSince, loading: flagLoading } = useFeatureFlag("mandatory_affinity_onboarding");
  const status = useAffinityOnboardingStatus();

  // Lot 2 : première ouverture de l'application installée, N1 reprend à l'étape 2.
  useEffect(() => {
    if (!user || location.pathname.startsWith("/arrivee/")) return;
    try {
      const pending = localStorage.getItem("guardiens_arrival_n1_pending");
      if (pending && matchMedia("(display-mode: standalone)").matches) navigate(pending, { replace: true });
    } catch { /* rien */ }
  }, [user, location.pathname, navigate]);

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
    // Lu seulement au moment de rediriger : aucune lecture de plus sur /dashboard.
    const fallback = `/onboarding/affinity?redirect=${encodeURIComponent(redirect)}`;
    let cancelled = false;
    void getFlag("arrival_v2").then((arrival) => {
      if (cancelled) return;
      if (!isArrivalV2Account(arrival, status.profileCreatedAt)) { navigate(fallback, { replace: true }); return; }
      const r = encodeURIComponent(redirect);
      if (user.role === "owner") {
        navigate(status.needsPostal ? `/arrivee/vous?next=${r}` : `/arrivee/affinites?redirect=${r}`, { replace: true });
        return;
      }
      // Lot 2 : gardien (et entraide, seul le code postal manque) reprend G1 ou G2.
      const flow = status.needsSitter || status.needsOwner ? "sitter" : "entraide";
      navigate(status.needsPostal ? `/arrivee/vous?flow=${flow}&next=${r}` : `/arrivee/garder?flow=sitter&next=${r}`, { replace: true });
    });
    return () => { cancelled = true; };
  }, [loading, flagLoading, status.loading, status.needsOnboarding, status.needsPostal, status.needsSitter, status.needsOwner, status.profileCreatedAt, user, enabled, appliesSince, location, navigate]);

  return null;
};

export default OnboardingGate;
