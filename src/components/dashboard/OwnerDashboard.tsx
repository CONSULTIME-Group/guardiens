import { DeferredMount, StagedMount, useIsDesktopRail } from "@/components/dashboard/shared/DeferredMount";
import { useState, useEffect, useMemo, useCallback } from "react";

import { nearbyWaitingSentence } from "@/lib/nearbySittersSentence";
import { useAuth } from "@/contexts/AuthContext";
import MissingSitCityBanner from "@/components/sits/owner/MissingSitCityBanner";
import { Link } from "react-router-dom";
import OwnerNearbySitters from "./owner/OwnerNearbySitters";
import OwnerEntraideBand from "./owner/OwnerEntraideBand";
import type { CockpitTodo } from "./owner/OwnerCockpit";
import { useHelpsWithMissing } from "./HelpsWithReminder";
import CommunityPulseLine from "./shared/CommunityPulseLine";
import { useNavBadgeCounts } from "@/hooks/useNavBadgeCounts";
import { useDashboardMovement } from "@/hooks/useDashboardMovement";
import { buildMovementBand } from "@/lib/dashboardMovement";
import DashboardBlock from "@/components/dashboard/shared/DashboardBlock";
import MovementBand from "./shared/MovementBand";
import { useOwnerProfile } from "@/hooks/useOwnerProfile";
import { formatCityLabel } from "@/lib/cityLabel";
import { pickOwnerCockpitLine } from "@/lib/ownerCockpitLine";

import OnboardingWelcome from "./OnboardingWelcome";
import { useArrivalV2Account } from "@/hooks/useArrivalV2Account";
import NearbyEmergencySitters from "./NearbyEmergencySitters";
import DashboardSkeleton from "@/components/skeletons/DashboardSkeleton";

import RoleActivationBanner from "./RoleActivationBanner";
import AccessGateBanner from "@/components/access/AccessGateBanner";
import { useAccessLevel } from "@/hooks/useAccessLevel";

/* ── Vague 11 : composants du flux principal ── */
import ApplicationsSection from "./owner/ApplicationsSection";
import OwnerCockpit from "./owner/OwnerCockpit";
import OwnerDepartureAlmaCard from "./owner/OwnerDepartureAlmaCard";
import { useOwnerDeparture } from "@/hooks/useOwnerDeparture";
import OwnerStarSection from "./owner/OwnerStarSection";
import OwnerAnnonceSection from "./owner/OwnerAnnonceSection";
import ApplicationCapSection from "./owner/ApplicationCapSection";
import OwnerFamilySection from "./owner/OwnerFamilySection";
import NextStepRailCard from "./shared/NextStepRailCard";
import { selectOwnerStarVariant } from "@/lib/ownerStarVariant";
import { pickRepublishSource } from "@/lib/ownerRepublish";
import RailReadingsCard from "./shared/RailReadingsCard";
import ReassuranceRailCard from "./shared/ReassuranceRailCard";
import DashboardRail from "./shared/DashboardRail";
import { useRailReadings } from "@/hooks/useRailReadings";
import { useProfileCompletionMissing } from "@/hooks/useProfileCompletionMissing";
import { ownerNextStep, remainingTouchesPhrase } from "@/lib/dashboardNextStep";

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
import { awaitingLink, awaitingSentence, isAwaitingDecision, sitStatusMap, summarizeAwaiting } from "@/lib/applicationsAwaiting";

const CLOSED_FOR_DECISION: readonly string[] = ["expired", "cancelled", "archived", "completed"];
import { pickActiveEntraideMission } from "@/lib/activeEntraideMission";
import { compareCalendarDates, daysFromToday, isOngoingDay } from "@/lib/calendarDate";
/* ── Lot L4 : récit de l'accueil sur téléphone ── */
import { resolveOwnerStory } from "@/lib/dashboardStory";
import { buildOwnerStoryInput } from "@/lib/ownerStoryInput";
import { localTodayIso } from "@/lib/localDate";
import { departureCardVisible } from "./owner/OwnerDepartureAlmaCard";
import StoryHero from "./story/StoryHero";
import RoleSwitch from "./story/RoleSwitch";
import EntraideLine from "./story/EntraideLine";
import EntraideFollowUp from "./story/EntraideFollowUp";
import HomePhotoCard from "./story/HomePhotoCard";
import PublishedNotice from "./story/PublishedNotice";
import { useCompactStory } from "./story/useCompactStory";
import type { DeparturePeriod } from "@/lib/ownerDeparture";

const OwnerDashboard = () => {
  const { user } = useAuth();
  // Lot 1 : propriétaire passé par /bienvenue, jamais OnboardingWelcome.
  const arrivalV2 = useArrivalV2Account(user?.id);
  const { shouldShow: showAlmaFirstMeeting, markSeen: markAlmaFirstMeetingSeen, recordSeen: recordAlmaFirstMeetingSeen } = useAlmaFirstMeeting();

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
  // Lot X3b (C-04) : besoin en cours de l'auteur, transmis au bandeau entraide
  // (calculé sur tout l'index partagé, priorité aux propositions en attente).
  const myActiveMission = useMemo(
    () => data.activeMission ?? pickActiveEntraideMission(myMissions as any[]),
    [data.activeMission, myMissions],
  );

  /* ── Lot D1 : accueil ── */
  const helpsWithMissing = useHelpsWithMissing();
  const { unreadCount } = useNavBadgeCounts(user?.id);
  // Lot L4 : la ligne du cockpit ne s'affiche que sur ordinateur, le récit la remplace sur téléphone.
  const isDesktopRail = useIsDesktopRail();
  // Lot D4 : ce qui a bougé depuis la dernière visite, sur ordinateur seulement
  // (remplace la ligne get_activity_since_last_visit, même nombre de lectures).
  const movement = useDashboardMovement(user?.id, isDesktopRail);
  const { data: ownerProfile, loading: ownerProfileLoading, loadError: ownerProfileLoadError } = useOwnerProfile();
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
  // Lot D6 (état P2) : un propriétaire qui a déjà publié republie sa dernière annonce.
  const republishSource = useMemo(() => pickRepublishSource(sits as any[]), [sits]);
  // Lot X3a (A-03, A-05) : toute candidature qui attend une décision compte
  // (pending, viewed, discussing), sur les annonces encore ouvertes ; la plus
  // ancienne et son ancienneté donnent le repère de l'accueil.
  const sitStatuses = useMemo(() => sitStatusMap(sits), [sits]);
  const awaiting = useMemo(() => summarizeAwaiting(recentApps, sitStatuses), [recentApps, sitStatuses]);
  const awaitingApps = useMemo(
    () => recentApps
      .filter((a) => isAwaitingDecision(a.status) && !CLOSED_FOR_DECISION.includes(sitStatuses[a.sit_id] ?? ""))
      // Les nouvelles d'abord, l'ordre récent du chargement ensuite.
      .sort((a, b) => Number(b.status === "pending") - Number(a.status === "pending")),
    [recentApps, sitStatuses],
  );
  const pendingAppCount = awaiting.count;

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
  const departure = useOwnerDeparture(isOwnerRole ? user?.id : undefined);
  const showAlmaProactive = earlyOwner || (noActiveSit && isOwnerRole);
  const nearbyCount = nearbyOwnerSittersData?.totalCount ?? 0;
  const nearbyRadius = nearbyOwnerSittersData?.radiusUsed ?? null;

  /* ── Lot L4 : récit (aucune lecture de plus) ── */
  const compactStory = useCompactStory();
  const [pickedPeriod, setPickedPeriod] = useState<DeparturePeriod | null>(null);
  const storyPeriod: DeparturePeriod | null = pickedPeriod ?? departure.data?.period ?? null;

  const ongoingSit = useMemo(() =>
    sits.find(s => s.status === "confirmed" && isOngoingDay(s.start_date, s.end_date, now)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sits]
  );

  const showEmergencyHelp = useMemo(() => {
    const imminent = sits.some(s => {
      if (s.status !== "confirmed" || !s.start_date) return false;
      const d = daysFromToday(s.start_date, now);
      return d !== null && d >= 1 && d <= 7;
    });
    const orphanPublished = sits.some(s =>
      s.status === "published" &&
      (s.applications || []).length === 0
    );
    return imminent || orphanPublished;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sits]);

  const storyInput = useMemo(() => buildOwnerStoryInput({
    today: localTodayIso(),
    sits: sits as any[],
    pets: pets as any[],
    awaitingApps: awaitingApps as any[],
    sitterProfiles: sitterProfiles as any,
    pendingReviews: (pendingReviews as any[]).map((r) => ({ sitId: r.sitId, sitterName: r.sitterName })),
    latestDraft: latestDraft as any,
    ongoingSit: (ongoingSit as any) ?? null,
    period: storyPeriod,
    city: ownerCity || null,
    nearbySittersCount: nearbyCount,
  }), [sits, pets, awaitingApps, sitterProfiles, pendingReviews, latestDraft, ongoingSit, storyPeriod, ownerCity, nearbyCount]);
  const story = useMemo(() => resolveOwnerStory(storyInput), [storyInput]);
  // Lot L6 (B-07) : « Théo attend la sienne. » après une réponse.
  const waitingName = storyInput.awaiting?.first?.sitterFirstName ?? null;

  const askPeriod = story.chapter === "first_listing" && departureCardVisible(departure.data);
  const onPickPeriod = useCallback((p: DeparturePeriod) => {
    setPickedPeriod(p);
    void departure.pick(p);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departure.pick]);
  const showPhotoCard = sits.some((s) => s.status === "published") || !!latestDraft;

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
  // Lot D3 : la situation (cinq premiers cas) est séparée du reste, elle passe
  // avant le compte de proximité sur ordinateur (pickOwnerCockpitLine).
  const situationLine = useMemo((): string | null => {
    if (ongoingSit) {
      const daysLeft = ongoingSit.end_date ? daysFromToday(ongoingSit.end_date, now) : null;
      return `Votre garde est en cours${daysLeft !== null ? `, fin dans ${daysLeft} jour${daysLeft > 1 ? "s" : ""}` : ""}.`;
    }
    const nextConfirmed = sits.find(s => s.status === "confirmed" && s.start_date && (daysFromToday(s.start_date, now) ?? -1) > 0);
    if (nextConfirmed) {
      const daysUntil = daysFromToday(nextConfirmed.start_date!, now) ?? 0;
      return `Votre prochaine garde commence dans ${daysUntil} jour${daysUntil > 1 ? "s" : ""}.`;
    }
    if (pendingAppCount > 0) {
      return awaitingSentence(awaiting) ?? `${pendingAppCount} candidature${pendingAppCount > 1 ? "s" : ""} à examiner.`;
    }
    if (sits.some(s => s.status === "published")) {
      return "Votre annonce est en ligne. Une notification vous prévient dès qu'un gardien se propose.";
    }
    if (latestDraft) {
      return "Vous avez commencé une annonce. Reprenez où vous en étiez.";
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ongoingSit, sits, pendingAppCount, awaiting, latestDraft]);

  const subtitle = useMemo(() => {
    if (situationLine) return situationLine;
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
  }, [situationLine, sits, noActiveSit, earlyOwner, nearbyCount, nearbyRadius]);

  const getNextSitForPet = useCallback((pet: Pet) => {
    const currentDate = new Date();
    return sits
      .filter(s => s.property_id === pet.property_id && ["published", "confirmed"].includes(s.status) && s.start_date && (daysFromToday(s.start_date, currentDate) ?? -1) >= 0)
      .sort((a, b) => compareCalendarDates(a.start_date, b.start_date))[0];
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

  // Lots 1 et ONB1 : jamais pour un propriétaire arrivée v2.
  if (showOnboarding && user?.onboardingMinimalCompleted && arrivalV2.ready && !arrivalV2.isV2) {
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
    action: {
      hasActiveSit: activeSits.length > 0,
      nearbySittersCount: nearbyOwnerSittersData?.totalCount ?? 0,
      starVariant: selectOwnerStarVariant({
        ongoingSit: ongoingSit ?? null,
        pendingAppsCount: pendingAppCount,
        latestDraft: latestDraft as any,
      }),
    },
  });

  // Lot D1 : rangée « À faire » de l'accueil, actions réelles en attente, 3 au plus.
  const todos: CockpitTodo[] = [];
  if (pendingAppCount > 0) todos.push({ key: "apps", label: "Candidatures à traiter", to: awaitingLink(awaiting), count: pendingAppCount });
  if (unreadCount > 0) todos.push({ key: "messages", label: "Messages à lire", to: "/messages", count: unreadCount });
  if (helpsWithMissing) todos.push({ key: "helps", label: "Votre phrase d'entraide", to: "/ma-ligne" });
  // Ancien bloc 2bis : son action passe dans « À faire » si elle est
  // actionnable et distincte de la vedette, sinon dans la colonne de droite.
  const priorityToTodo = ["next-sit", "review", "stalled"].includes(priorityAction.variant);
  const priorityToRail = ["verify", "pets"].includes(priorityAction.variant);
  if (priorityToTodo) todos.push({ key: "priority", label: priorityAction.ctaLabel, to: priorityAction.ctaTo });

  // Lot L4 : « À faire » sous le récit, sans les candidatures (le récit y mène).
  const storyTodos = todos.filter((t) => t.key !== "apps" && t.key !== "priority");

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
  // Lot D5 : mesure par bloc, même découpage sur ordinateur et téléphone.
  const blockLayout = isDesktopRail ? "desktop" as const : "phone" as const;

  const railContent = (
    <>
      {ownerNextStepRail && (
        <DashboardBlock block="next_step" space="owner" layout={blockLayout}>
        <NextStepRailCard
          variant="owner"
          step={{
            ...ownerNextStepRail,
            phrase: !ownerNextStepRail.secondaryLink && typeof ownerNextStepRail.progressPct === "number" && completionMissing.missing?.length
              ? remainingTouchesPhrase(completionMissing.missing)
              : ownerNextStepRail.phrase,
          }}
        />
        </DashboardBlock>
      )}
      <DashboardBlock block="alma" space="owner" layout={blockLayout}>
      <AlmaRailWhisper
        variant="owner"
        skillsMissing={!ownerProfileLoading && !ownerProfileLoadError && (ownerProfile?.owner_competences?.length ?? 0) === 0}
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
          // Lot A2 : la carte d'Alma mène à la plus ancienne candidature en attente.
          oldestAwaitingSitId: awaiting.oldest?.sitId ?? null,
        }}
      />
      </DashboardBlock>
      {isDesktopRail && (
        <DashboardBlock block="reassurance" space="owner" layout={blockLayout}>
        <ReassuranceRailCard
          nearby={nearbyCount > 0 && nearbyRadius ? { count: nearbyCount, radiusKm: nearbyRadius, city: ownerCity || null } : null}
          community={movement.data?.community ?? null}
          showReviews
        />
        </DashboardBlock>
      )}
      {ownerReadings.length > 0 && <DashboardBlock block="readings" space="owner" layout={blockLayout}><RailReadingsCard items={ownerReadings} /></DashboardBlock>}
      {priorityToRailCard && <DashboardBlock block="priority" space="owner" layout={blockLayout}>{priorityToRailCard}</DashboardBlock>}
      {!(level === 4 || level === "3B") && (
        <DashboardBlock block="access_gate" space="owner" layout={blockLayout}>
          <AccessGateBanner level={level} profileCompletion={accessProfileCompletion} context="guard" />
        </DashboardBlock>
      )}
      {showEmergencyHelp && <DashboardBlock block="emergency" space="owner" layout={blockLayout}><NearbyEmergencySitters /></DashboardBlock>}
    </>
  );

  const cockpitLine = pickOwnerCockpitLine({
    situation: situationLine,
    nearby: nearbyCount > 0 && nearbyRadius
      ? `${nearbyCount} gardien${nearbyCount > 1 ? "s sont inscrits" : " est inscrit"} à moins de ${nearbyRadius} km${ownerCity ? ` de ${ownerCity}` : ""}.`
      : null,
    digest: null,
    fallback: subtitle,
  });
  const movementBand = buildMovementBand("owner", movement.data, { previousVisit: movement.previousVisit });

  const hasActiveAnnonce = activeSits.length > 0;
  // Lot D3 : ordinateur, propriétaire sans annonce ni brouillon : le récit remplace la vedette « Publier ».
  const desktopFirstListing =
    story.chapter === "first_listing" &&
    selectOwnerStarVariant({
      ongoingSit: ongoingSit ?? null,
      pendingAppsCount: awaitingApps.length,
      hasActiveAnnonce,
      latestDraft: latestDraft as any,
    }) === "publish" &&
    primaryAction?.action !== "publish_draft" &&
    !republishSource;

  return (
    <div className="overflow-hidden lg:overflow-visible pb-[calc(10rem+env(safe-area-inset-bottom))] md:pb-32">
      {isDesktopRail && showAlmaFirstMeeting && (
        <DashboardBlock block="alma_first_meeting" space="owner" layout={blockLayout} className="px-4 sm:px-5 md:px-8 pt-2">
          <AlmaFirstMeeting role="owner" onDone={markAlmaFirstMeetingSeen} onSeen={recordAlmaFirstMeetingSeen} />
        </DashboardBlock>
      )}

      {isDesktopRail && (
        <DashboardBlock block="role_activation" space="owner" layout={blockLayout} className="px-4 sm:px-5 md:px-8">
          <RoleActivationBanner userRole={user?.role || "owner"} />
        </DashboardBlock>
      )}

      {/* Lot L1 : annonce publiée sans commune. */}
      {isDesktopRail && (
        <DashboardBlock block="missing_city" space="owner" layout={blockLayout} className="px-4 sm:px-5 md:px-8">
          <MissingSitCityBanner userId={user?.id} />
        </DashboardBlock>
      )}

      {/* Grille lot D1 : colonne principale 720 px, colonne de droite 328 px, écart 48 px */}
      <div className="min-w-0">
        <div className="mx-auto w-full max-w-[720px] lg:max-w-[1160px] px-4 sm:px-5 lg:px-8 lg:grid lg:grid-cols-[minmax(0,720px)_328px] lg:gap-[48px] lg:justify-center lg:items-start">
          <div className="min-w-0 space-y-[34px] md:space-y-[52px]">
            {isDesktopRail ? (
              <>
                {/* 0. Lot N4 : Alma « Vous partez quand ? », masquée après publication et pour le témoin.
                    Lot D3 : sur la première annonce, la question passe dans le récit (un seul bloc). */}
                {!desktopFirstListing && (
                  <DashboardBlock block="departure" space="owner" layout={blockLayout}>
                    <OwnerDepartureAlmaCard data={departure.data} onPick={departure.pick} busy={departure.busy} />
                  </DashboardBlock>
                )}

                {/* 1. Accueil */}
                <DashboardBlock block="cockpit" space="owner" layout={blockLayout}>
                <OwnerCockpit
                  userId={user?.id}
                  firstName={user?.firstName}
                  line={cockpitLine}
                  todos={todos}
                  movement={movementBand ? <MovementBand band={movementBand} space="owner" /> : null}
                />
                </DashboardBlock>

                {/* 2. Vedette unique. Lot D3 : avant la première annonce, le récit du
                    téléphone en mise en page ordinateur (question de départ comprise). */}
                {desktopFirstListing ? (
                  <DashboardBlock block="story" space="owner" layout={blockLayout}>
                  <StoryHero
                    story={story}
                    layout="desktop"
                    periodPicker={askPeriod ? { value: storyPeriod, onPick: onPickPeriod, busy: departure.busy } : null}
                  />
                  </DashboardBlock>
                ) : (
                <DashboardBlock block="star" space="owner" layout={blockLayout}>
                <OwnerStarSection
                  ongoingSit={ongoingSit ?? null}
                  pendingApps={awaitingApps}
                  oldestWaitingDays={awaiting.oldest?.days ?? 0}
                  republishSource={republishSource}
                  sitterProfiles={sitterProfiles}
                  sitterAffinityProfiles={sitterAffinityProfiles}
                  latestDraft={latestDraft as any}
                  propertyCoverPhoto={propertyCoverPhoto}
                  primaryAction={primaryAction}
                  activeAnnonce={hasActiveAnnonce ? (
                    <OwnerAnnonceSection sits={sits} coverPhoto={propertyCoverPhoto} pendingAppCount={pendingAppCount} city={ownerCity || null} />
                  ) : undefined}
                />
                </DashboardBlock>
                )}
              </>
            ) : (
              /* Lot L4 : accueil téléphone, le récit d'abord (direction B de l'arène v2). */
              <DashboardBlock block="story" space="owner" layout={blockLayout}>
              <div className="space-y-[14px] pt-3" data-testid="owner-story-home">
                {/* Lot L5 : retour calme après une publication rapide. */}
                <PublishedNotice waitingName={waitingName} />
                {/* Texte agrandi : le choix d'espace passe sous le récit, le bouton reste au premier écran. */}
                {!compactStory && <RoleSwitch />}
                <StoryHero
                  story={story}
                  compact={compactStory}
                  periodPicker={askPeriod ? { value: storyPeriod, onPick: onPickPeriod, busy: departure.busy } : null}
                />
                {compactStory && <RoleSwitch />}
                {storyTodos.length > 0 && (
                  <ul className="flex flex-wrap gap-[8px]" data-testid="story-todos" aria-label="À faire">
                    {storyTodos.map((t) => (
                      <li key={t.key}>
                        <Link
                          to={t.to}
                          className="inline-flex min-h-[44px] items-center gap-[8px] rounded-full border border-border bg-card px-[14px] text-[14px] font-semibold text-foreground"
                        >
                          {t.label}
                          {typeof t.count === "number" && t.count > 0 && (
                            <span className="rounded-full bg-primary px-[7px] text-[12px] leading-[20px] text-primary-foreground">{t.count}</span>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                <EntraideLine
                  helpersCount={nearbyHelpersCount}
                  radiusKm={helpersProximity?.radiusKm ?? 30}
                  activeMission={myActiveMission as any}
                  space="owner"
                />
                <MissingSitCityBanner userId={user?.id} />
                {showAlmaFirstMeeting && (
                  <AlmaFirstMeeting role="owner" onDone={markAlmaFirstMeetingSeen} onSeen={recordAlmaFirstMeetingSeen} primaryVariant="outline" />
                )}
                {showPhotoCard && (
                  <DeferredMount minHeight={0}>
                    <HomePhotoCard userId={user?.id} photos={data.propertyPhotos} />
                  </DeferredMount>
                )}
              </div>
              </DashboardBlock>
            )}

            {/* Plafond de candidatures, seulement quand il s'applique */}
            <DashboardBlock block="cap" space="owner" layout={blockLayout}>
              <StagedMount testId="cap">
                <ApplicationCapSection sits={sits} onUpdated={reload} />
              </StagedMount>
            </DashboardBlock>

            {/* 3. Près de chez vous (montage différé sous la ligne de flottaison) */}
            <DashboardBlock block="nearby_sitters" space="owner" layout={blockLayout}>
              <div ref={spotlightRef} className="min-w-0">
                {spotlightInView ? <OwnerNearbySitters /> : <div aria-hidden="true" className="min-h-[320px]" />}
              </div>
            </DashboardBlock>

            {/* Lot L4 : sur téléphone, l'annonce et ses candidatures après les gardiens à proximité. */}
            {!isDesktopRail && hasActiveAnnonce && (
              <DashboardBlock block="annonce" space="owner" layout={blockLayout}>
                <OwnerAnnonceSection sits={sits} coverPhoto={propertyCoverPhoto} pendingAppCount={pendingAppCount} />
              </DashboardBlock>
            )}

            {/* 4. Votre famille (lot P1b : montage différé, sous la ligne de flottaison) */}
            <DashboardBlock block="family" space="owner" layout={blockLayout}>
            <DeferredMount minHeight={240}>
              <OwnerFamilySection
                pets={pets}
                propertyIds={data.propertyIds}
                onPetsChanged={reload}
                getNextSitForPet={getNextSitForPet}
              />
            </DeferredMount>
            </DashboardBlock>

            {/* Lot L4 : activation de l'autre espace, sous le récit sur téléphone. */}
            {!isDesktopRail && (
              <DashboardBlock block="role_activation" space="owner" layout={blockLayout}>
                <DeferredMount minHeight={0}>
                  <RoleActivationBanner userRole={user?.role || "owner"} />
                </DeferredMount>
              </DashboardBlock>
            )}

            {/* 5. Bandeau entraide */}
            {/* Lot L10 : un seul bloc entraide sur téléphone. La ligne sous le récit en est l'entrée ;
                le suivi n'apparaît qu'avec une réponse attendue ou des propositions à suivre. */}
            <DashboardBlock block="entraide" space="owner" layout={blockLayout}>
            {isDesktopRail ? (
              <DeferredMount minHeight={160}>
                <OwnerEntraideBand
                  helpersCount={nearbyHelpersCount}
                  helpersRadiusKm={helpersProximity?.radiusKm ?? 30}
                  activeMission={myActiveMission}
                  ctaTone="outline"
                />
              </DeferredMount>
            ) : (
              <DeferredMount minHeight={0}>
                <EntraideFollowUp />
              </DeferredMount>
            )}
            </DashboardBlock>

            {/* 6. Colonne de droite en mobile : après l'entraide. Lot P1b : une
                seule des deux colonnes est rendue selon la largeur. */}
            {!isDesktopRail && (
              <DeferredMount minHeight={200}>
                <div className="lg:hidden space-y-[22px]">{railContent}</div>
              </DeferredMount>
            )}

            {/* 7. Pouls. Lot D3 : sur ordinateur, les chiffres vivent dans « Guardiens aujourd'hui ». */}
            {!isDesktopRail && (
              <DashboardBlock block="pulse" space="owner" layout={blockLayout}>
                <DeferredMount minHeight={40}>
                  <CommunityPulseLine />
                </DeferredMount>
              </DashboardBlock>
            )}

            {/* 8. Historique des candidatures, accordéon discret */}
            {hasReadApps && (
              <DashboardBlock block="history" space="owner" layout={blockLayout}>
              <StagedMount testId="history" minHeight={48}>
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
              </StagedMount>
              </DashboardBlock>
            )}
          </div>

          {/* Colonne de droite, desktop */}
          {isDesktopRail && (
            <div className="hidden lg:block">
              <StagedMount testId="rail" minHeight={320}>
                <DashboardRail layout="compact">{railContent}</DashboardRail>
              </StagedMount>
            </div>
          )}
        </div>
      </div>

      {/* Lot L4 : plus de bouton collant, le récit porte l'unique bouton plein sur téléphone. */}
    </div>
  );
};

export default OwnerDashboard;
