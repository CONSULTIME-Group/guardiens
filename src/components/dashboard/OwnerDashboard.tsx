import { useState, useEffect, useMemo, useCallback } from "react";

import { nearbyWaitingSentence } from "@/lib/nearbySittersSentence";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import OwnerNearbySitters from "./owner/OwnerNearbySitters";
import OwnerEntraideBand from "./owner/OwnerEntraideBand";
import type { CockpitTodo } from "./owner/OwnerCockpit";
import { useHelpsWithMissing } from "./HelpsWithReminder";
import { useCommunityPulse } from "@/hooks/useCommunityPulse";
import { useNavBadgeCounts } from "@/hooks/useNavBadgeCounts";
import { useOwnerDigestLine } from "@/hooks/useOwnerDigestLine";
import { useOwnerProfile } from "@/hooks/useOwnerProfile";
import { formatCityLabel } from "@/lib/cityLabel";

import OnboardingWelcome from "./OnboardingWelcome";
import NearbyEmergencySitters from "./NearbyEmergencySitters";
import DashboardSkeleton from "@/components/skeletons/DashboardSkeleton";
import { differenceInDays } from "date-fns";

import RoleActivationBanner from "./RoleActivationBanner";
import AccessGateBanner from "@/components/access/AccessGateBanner";
import { useAccessLevel } from "@/hooks/useAccessLevel";

/* ── Vague 11 : composants du flux principal ── */
import ApplicationsSection from "./owner/ApplicationsSection";
import OwnerCockpit from "./owner/OwnerCockpit";
import OwnerStarSection from "./owner/OwnerStarSection";
import OwnerAnnonceSection from "./owner/OwnerAnnonceSection";
import ApplicationCapSection from "./owner/ApplicationCapSection";
import OwnerFamilySection from "./owner/OwnerFamilySection";
import { useFirstNearbyMission } from "@/hooks/useFirstNearbyMission";
import NextStepRailCard from "./shared/NextStepRailCard";
import RailReadingsCard from "./shared/RailReadingsCard";
import DashboardRail from "./shared/DashboardRail";
import { useRailReadings } from "@/hooks/useRailReadings";
import { useProfileCompletionMissing } from "@/hooks/useProfileCompletionMissing";
import { ownerNextStep } from "@/lib/dashboardNextStep";

import MobileStickyCTA from "./owner/MobileStickyCTA";
import { useInView } from "@/hooks/useInView";

/* ── Vague 12 : rail ── */
import AlmaRailWhisper from "./sitter/AlmaRailWhisper";

import { useOwnerPriorityAction } from "@/hooks/useOwnerPriorityAction";
import PriorityActionCard from "./shared/PriorityActionCard";
import { useOwnerPrimaryAction } from "@/hooks/useOwnerPrimaryAction";

import type { Pet } from "./owner/types";
import { useOwnerDashboardData } from "@/hooks/useOwnerDashboardData";
import DashboardLoadError from "./DashboardLoadError";

import { useNearbyOwnerSitters } from "@/hooks/useNearbyOwnerSitters";
import { useNearbyHelpers } from "@/hooks/useNearbyHelpers";
import { useHelpersProximityCount } from "@/hooks/useHelpersProximityCount";
import { useIsNewOwner, isEarlyOwner, hasNoActiveSit } from "@/hooks/useIsNewUser";
import { useAlmaUsageNudge } from "@/hooks/useAlmaUsageNudge";
import { useAlmaFirstMeeting } from "@/hooks/useAlmaFirstMeeting";
import { AlmaFirstMeeting } from "@/components/ai/alma/AlmaFirstMeeting";
import { trackEvent } from "@/lib/analytics";

const OwnerDashboard = () => {
  const { user } = useAuth();
  const { shouldShow: showAlmaFirstMeeting, markSeen: markAlmaFirstMeetingSeen } = useAlmaFirstMeeting();

  /* ── Data fetching ── */
  const { data, loading, error, reload } = useOwnerDashboardData(user?.id);
  const {
    sits, pets, recentApps, reviews, myMissions,
    verificationStatus, sitterProfiles, sitterAffinityProfiles, trustedSitterCount,
    propertyCoverPhoto, onboardingChecks,
    pendingReviews, highlights,
  } = data;
  const { level, profileCompletion: accessProfileCompletion } = useAccessLevel();

  /* ── Signaux locaux : gardiens et « helpers » proches ── */
  const { data: nearbyOwnerSittersData } = useNearbyOwnerSitters(user?.id);
  const { data: nearbyHelpersData } = useNearbyHelpers(user?.id);
  // Compteur unique réconcilié : même source que le bandeau « pouls de la
  // communauté » (rayon 30 km), jamais la taille d'une liste plafonnée.
  const { data: helpersProximity } = useHelpersProximityCount(user?.id);
  const nearbyHelpersCount = helpersProximity?.localCount ?? nearbyHelpersData?.helpers?.length ?? 0;
  const { mission: firstNearbyMission } = useFirstNearbyMission(user?.id);
  const myActiveMission = useMemo(
    () => myMissions.find((m: any) => m.status !== "completed" && m.status !== "cancelled") ?? null,
    [myMissions],
  );

  /* ── Lot D1 : accueil ── */
  const helpsWithMissing = useHelpsWithMissing();
  const { unreadCount } = useNavBadgeCounts(user?.id);
  const digestLine = useOwnerDigestLine(!!user?.id);
  const { data: pulse } = useCommunityPulse();
  const { data: ownerProfile } = useOwnerProfile();
  const ownerCity = ownerProfile?.city ? formatCityLabel(ownerProfile.city) : "";

  /* ── UI state ── */
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Montage différé de la section « Les gardiens » (sous la ligne de
  // flottaison) : ses hooks ne partent qu'à 400 px du viewport, le contenu
  // est prêt avant d'être atteint et aucun décalage visible ne se produit.
  const { ref: spotlightRef, inView: spotlightInView } = useInView<HTMLDivElement>({
    rootMargin: "400px 0px",
    threshold: 0,
  });

  /* ── Derived values ── */
  const now = new Date();
  const activeSits = useMemo(() => sits.filter(s => ["published", "confirmed"].includes(s.status)), [sits]);
  const pendingAppCount = useMemo(() => recentApps.filter(a => a.status === "pending").length, [recentApps]);

  const latestDraft = useMemo(() => {
    const todayIso = new Date().toISOString().slice(0, 10);
    return sits
      .filter((s: any) => {
        if (s.status !== "draft") return false;
        if (s.cancellation_reason === "archived") return false;
        if (s.end_date && s.end_date < todayIso) return false;
        return true;
      })
      .sort((a, b) => {
        const da = new Date((a as any).updated_at || a.created_at || 0).getTime();
        const db = new Date((b as any).updated_at || b.created_at || 0).getTime();
        return db - da;
      })[0] ?? null;
  }, [sits]);

  const isNewOwner = useIsNewOwner({ sitsCount: sits.length, petsCount: pets.length });
  const earlyOwner = useMemo(
    () => isEarlyOwner({ sits: sits as any, pets: pets as any }),
    [sits, pets],
  );
  const noActiveSit = useMemo(() => hasNoActiveSit(sits as any), [sits]);
  const { data: primaryActionData } = useOwnerPrimaryAction(user?.id);
  const primaryAction = primaryActionData ?? null;
  const hasPrimaryAction = !!primaryAction?.action;

  // Une seule voix Alma par écran, portée par AlmaRailWhisper dans le rail.
  // Le nudge proactif reste désactivé ici (correctif « double voix », 16/08/2026).
  useAlmaUsageNudge({
    surface: "owner_dashboard",
    role: "owner",
    state: isNewOwner ? "new_owner" : noActiveSit ? "no_active_sit" : "any",
    enabled: false,
  });

  const isOwnerRole = user?.role === "owner" || user?.role === "both";
  const showAlmaProactive = earlyOwner || (noActiveSit && isOwnerRole);
  const nearbyCount = nearbyOwnerSittersData?.totalCount ?? 0;
  const nearbyRadius = nearbyOwnerSittersData?.radiusUsed ?? null;

  const ongoingSit = useMemo(() =>
    sits.find(s => s.status === "confirmed" && s.start_date && new Date(s.start_date) <= now && s.end_date && new Date(s.end_date) >= now),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sits]
  );

  const showEmergencyHelp = useMemo(() => {
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const imminent = sits.some(s =>
      s.status === "confirmed" &&
      s.start_date &&
      new Date(s.start_date).getTime() - now.getTime() < sevenDaysMs &&
      new Date(s.start_date).getTime() > now.getTime()
    );
    const orphanPublished = sits.some(s =>
      s.status === "published" &&
      (s.applications || []).length === 0
    );
    return imminent || orphanPublished;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sits]);

  /* ── Onboarding ── */
  useEffect(() => {
    if (loading || !user || !data.profile) return;
    const dismissed = localStorage.getItem("onboarding_owner_dismissed");
    // Seuil du parcours d'onboarding propriétaire, sans rapport avec le seuil de candidature des gardiens.
    if (!dismissed && user.profileCompletion < 60 && data.profile.onboarding_minimal_completed) {
      setShowOnboarding(true);
    } else {
      setShowOnboarding(false);
    }
  }, [loading, user, data.profile]);

  /* ── Sous-titre contextuel pour le cockpit ── */
  const subtitle = useMemo(() => {
    if (ongoingSit) {
      const daysLeft = ongoingSit.end_date ? differenceInDays(new Date(ongoingSit.end_date), now) : null;
      return `Votre garde est en cours${daysLeft !== null ? `, fin dans ${daysLeft} jour${daysLeft > 1 ? "s" : ""}` : ""}.`;
    }
    const nextConfirmed = sits.find(s => s.status === "confirmed" && s.start_date && new Date(s.start_date) > now);
    if (nextConfirmed) {
      const daysUntil = differenceInDays(new Date(nextConfirmed.start_date!), now);
      return `Votre prochaine garde commence dans ${daysUntil} jour${daysUntil > 1 ? "s" : ""}.`;
    }
    if (pendingAppCount > 0) {
      return `${pendingAppCount} candidature${pendingAppCount > 1 ? "s" : ""} à examiner.`;
    }
    if (sits.some(s => s.status === "published")) {
      return "Votre annonce est en ligne, les candidatures arrivent.";
    }
    if (latestDraft) {
      return "Vous avez commencé une annonce. Reprenez où vous en étiez.";
    }
    if (noActiveSit && sits.length > 0 && !earlyOwner) {
      const hello = "Ravi de vous revoir.";
      if (nearbyCount > 0 && nearbyRadius) {
        return `${hello} ${nearbyWaitingSentence(nearbyCount, nearbyRadius)}`;
      }
      return `${hello} Republiez une annonce quand vous êtes prêt.`;
    }
    if (earlyOwner) {
      const hello = "Bienvenue chez Guardiens.";
      if (nearbyCount > 0 && nearbyRadius) {
        return `${hello} ${nearbyWaitingSentence(nearbyCount, nearbyRadius)}`;
      }
      return `${hello} Publiez votre première annonce, on vous accompagne.`;
    }
    return "Publiez votre première annonce pour trouver un gardien.";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ongoingSit, sits, pendingAppCount, latestDraft, noActiveSit, earlyOwner, nearbyCount, nearbyRadius]);

  const getNextSitForPet = useCallback((pet: Pet) => {
    const currentDate = new Date();
    return sits
      .filter(s => s.property_id === pet.property_id && ["published", "confirmed"].includes(s.status) && s.start_date && new Date(s.start_date) >= currentDate)
      .sort((a, b) => new Date(a.start_date!).getTime() - new Date(b.start_date!).getTime())[0];
  }, [sits]);

  const priorityAction = useOwnerPriorityAction({
    sits,
    pendingAppCount,
    pendingReviews: pendingReviews.map((r: any) => ({
      sitId: r.sitId,
      sitterId: r.sitterId,
      sitterName: r.sitterName,
    })),
    verificationStatus,
    nearbySittersCount: nearbyOwnerSittersData?.totalCount,
    nearbySittersRadius: nearbyOwnerSittersData?.radiusUsed,
    petsCount: pets.length,
  });

  // Bloc « À lire » du rail : fiche race (animaux de la maison), saison,
  // article d'étape. Appelé inconditionnellement (règle des hooks).
  const ownerReadings = useRailReadings({
    role: "owner",
    userId: user?.id,
    pets: pets as any,
    stageVariant: priorityAction.variant,
  });

  // Touches manquantes du barème : au-dessus de 90 %, le rail nomme
  // précisément ce qui reste à faire (correctif phrase 97 %, août 2026).
  const completionMissing = useProfileCompletionMissing("owner", user?.id);

  /* ── Analytics une fois par session ── */
  useEffect(() => {
    if (loading || !user?.id || !isNewOwner) return;
    const key = `dash_first_view_owner_${user.id}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
      trackEvent("dashboard_first_time_view", {
        source: "/dashboard",
        metadata: {
          user_role: "owner",
          view_variant: "new_owner_nba",
          nearby_count: nearbyCount,
          nearby_radius: nearbyRadius,
        },
      });
    } catch {}
  }, [loading, user?.id, isNewOwner, nearbyCount, nearbyRadius]);

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardLoadError onRetry={reload} detail={error} />;

  if (showOnboarding && user?.onboardingMinimalCompleted) {
    return (
      <OnboardingWelcome
        role="owner"
        checks={onboardingChecks}
        onDismiss={() => {
          localStorage.setItem("onboarding_owner_dismissed", "1");
          setShowOnboarding(false);
        }}
      />
    );
  }

  const hasReadApps = recentApps.some(a => a.status !== "pending");

  // Bloc (b) du rail : compléter son profil, tant qu'il reste du chemin.
  const ownerNextStepRail = ownerNextStep({
    // Le pourcentage et les items viennent du MEME calcul (barème propriétaire),
    // jamais de profiles.profile_completion qui stocke le max des deux espaces.
    profileCompletion: completionMissing.score ?? accessProfileCompletion ?? 0,
    missing: completionMissing.missing,
  });

  // Lot D1 : rangée « À faire » de l'accueil, actions réelles en attente, 3 au plus.
  const todos: CockpitTodo[] = [];
  if (pendingAppCount > 0) todos.push({ key: "apps", label: "Candidatures à traiter", to: "/sits", count: pendingAppCount });
  if (unreadCount > 0) todos.push({ key: "messages", label: "Messages non lus", to: "/messages", count: unreadCount });
  if (helpsWithMissing) todos.push({ key: "helps", label: "Votre phrase d'entraide", to: "/ma-ligne" });
  // Ancien bloc 2bis : son action passe dans « À faire » si elle est
  // actionnable et distincte de la vedette, sinon dans la colonne de droite.
  const priorityToTodo = ["next-sit", "review", "stalled"].includes(priorityAction.variant);
  const priorityToRail = ["verify", "pets"].includes(priorityAction.variant);
  if (priorityToTodo) todos.push({ key: "priority", label: priorityAction.ctaLabel, to: priorityAction.ctaTo });

  const priorityToRailCard = priorityToRail ? (
    <PriorityActionCard
      eyebrow={priorityAction.eyebrow}
      title={priorityAction.title}
      description={priorityAction.description}
      ctaLabel={priorityAction.ctaLabel}
      ctaTo={priorityAction.ctaTo}
      urgency={priorityAction.urgency}
    />
  ) : null;
  const railContent = (
    <>
      {ownerNextStepRail && <NextStepRailCard step={ownerNextStepRail} variant="owner" />}
      <AlmaRailWhisper
        variant="owner"
        ownerState={{
          ongoingSit: !!ongoingSit,
          ongoingSitterFirstName: ongoingSit
            ? (() => {
                const accepted = (ongoingSit.applications || []).find((a: any) => a.status === "accepted");
                return accepted ? (sitterProfiles[accepted.sitter_id]?.first_name ?? null) : null;
              })()
            : null,
          pendingApps: pendingAppCount > 0,
          noActiveSit,
        }}
      />
      {ownerReadings.length > 0 && <RailReadingsCard items={ownerReadings} />}
      {priorityToRailCard}
      {!(level === 4 || level === "3B") && (
        <AccessGateBanner level={level} profileCompletion={accessProfileCompletion} context="guard" />
      )}
      {showEmergencyHelp && <NearbyEmergencySitters />}
    </>
  );

  const cockpitLine =
    digestLine ??
    (nearbyCount > 0 && nearbyRadius
      ? `${nearbyCount} gardien${nearbyCount > 1 ? "s sont inscrits" : " est inscrit"} à moins de ${nearbyRadius} km${ownerCity ? ` de ${ownerCity}` : ""}.`
      : subtitle);

  const hasActiveAnnonce = activeSits.length > 0;
  const starIsPublishForm = !ongoingSit && pendingAppCount === 0 && !latestDraft && !hasActiveAnnonce;

  return (
    <div className="overflow-hidden lg:overflow-visible pb-[calc(10rem+env(safe-area-inset-bottom))] md:pb-32">
      {showAlmaFirstMeeting && (
        <div className="px-4 sm:px-5 md:px-8 pt-2">
          <AlmaFirstMeeting role="owner" onDone={markAlmaFirstMeetingSeen} />
        </div>
      )}

      <div className="px-4 sm:px-5 md:px-8">
        <RoleActivationBanner userRole={user?.role || "owner"} />
      </div>

      {/* Grille lot D1 : colonne principale 720 px, colonne de droite 328 px, écart 48 px */}
      <div className="min-w-0">
        <div className="mx-auto w-full max-w-[720px] lg:max-w-[1160px] px-4 sm:px-5 lg:px-8 lg:grid lg:grid-cols-[minmax(0,720px)_328px] lg:gap-[48px] lg:justify-center lg:items-start">
          <div className="min-w-0 space-y-[34px] md:space-y-[52px]">
            {/* 1. Accueil */}
            <OwnerCockpit
              userId={user?.id}
              firstName={user?.firstName}
              line={cockpitLine}
              todos={todos}
            />

            {/* 2. Vedette unique */}
            <OwnerStarSection
              ongoingSit={ongoingSit ?? null}
              pendingApps={recentApps.filter(a => a.status === "pending")}
              sitterProfiles={sitterProfiles}
              sitterAffinityProfiles={sitterAffinityProfiles}
              latestDraft={latestDraft as any}
              propertyCoverPhoto={propertyCoverPhoto}
              primaryAction={primaryAction}
              activeAnnonce={hasActiveAnnonce ? (
                <OwnerAnnonceSection sits={sits} coverPhoto={propertyCoverPhoto} pendingAppCount={pendingAppCount} />
              ) : undefined}
            />

            {/* Plafond de candidatures, seulement quand il s'applique */}
            <ApplicationCapSection sits={sits} onUpdated={reload} />

            {/* 3. Près de chez vous (montage différé sous la ligne de flottaison) */}
            <div ref={spotlightRef} className="min-w-0">
              {spotlightInView ? <OwnerNearbySitters /> : <div aria-hidden="true" className="min-h-[320px]" />}
            </div>

            {/* 4. Votre famille */}
            <OwnerFamilySection
              pets={pets}
              propertyIds={data.propertyIds}
              onPetsChanged={reload}
              getNextSitForPet={getNextSitForPet}
            />

            {/* 5. Bandeau entraide */}
            <OwnerEntraideBand
              helpersCount={nearbyHelpersCount}
              helpersRadiusKm={helpersProximity?.radiusKm ?? 30}
              mission={firstNearbyMission}
            />

            {/* 6. Colonne de droite en mobile : après l'entraide */}
            <div className="lg:hidden space-y-[22px]">{railContent}</div>

            {/* 7. Pouls */}
            {pulse && pulse.maisonsGardees > 0 && (
              <p className="font-heading italic text-foreground/85 text-[17px] md:text-[19px] leading-relaxed" data-testid="owner-pulse-line">
                Guardiens, c'est déjà {pulse.maisonsGardees.toLocaleString("fr-FR")} maisons gardées et {pulse.animauxAccompagnes.toLocaleString("fr-FR")} animaux accompagnés.{" "}
                <Link to="/actualites/inventaire-guardiens-france" className="not-italic font-sans text-[13px] font-semibold text-primary hover:underline underline-offset-4">
                  Voir l'inventaire
                </Link>
              </p>
            )}

            {/* 8. Historique des candidatures, accordéon discret */}
            {hasReadApps && (
              <details className="rounded-2xl bg-card border border-border overflow-hidden">
                <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
                  <p className="text-sm font-semibold text-foreground">Historique des candidatures</p>
                  <span className="text-xs text-muted-foreground" aria-hidden="true">▾</span>
                </summary>
                <div className="px-4 pb-4 pt-2">
                  <ApplicationsSection
                    recentApps={recentApps}
                    sitterProfiles={sitterProfiles}
                    sitterBadges={{}}
                    sitterAffinityProfiles={sitterAffinityProfiles}
                    loading={loading}
                  />
                </div>
              </details>
            )}
          </div>

          {/* Colonne de droite, desktop */}
          <div className="hidden lg:block">
            <DashboardRail layout="compact">{railContent}</DashboardRail>
          </div>
        </div>
      </div>

      {/* CTA collant mobile : seulement pour les candidatures à traiter */}
      {pendingAppCount > 0 && !starIsPublishForm && (
        <MobileStickyCTA label="Voir les candidatures" to="/sits" badge={pendingAppCount} />
      )}
    </div>
  );
};

export default OwnerDashboard;
