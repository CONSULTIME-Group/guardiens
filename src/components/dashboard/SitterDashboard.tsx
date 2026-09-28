/**
 * Tableau de bord gardien (lot D2, maquette validée), même méthode que le
 * lot D1 côté propriétaire : accueil visible tout de suite, une seule
 * vedette, peu de blocs, colonne de droite courte, chiffres exacts.
 */
import { useAlmaCulturalFact } from "@/hooks/useAlmaCulturalFact";
import { useAlmaUsageNudge } from "@/hooks/useAlmaUsageNudge";
import { useAlmaFirstMeeting } from "@/hooks/useAlmaFirstMeeting";
import { AlmaFirstMeeting } from "@/components/ai/alma/AlmaFirstMeeting";
import { useAuth } from "@/contexts/AuthContext";
import { useSearchParams } from "react-router-dom";
import { useAccessLevel, MIN_COMPLETION_TO_APPLY } from "@/hooks/useAccessLevel";
import { useSitterDashboardData } from "@/hooks/useSitterDashboardData";
import { useNearbyHelpers } from "@/hooks/useNearbyHelpers";
import { useHelpersProximityCount } from "@/hooks/useHelpersProximityCount";
import { useHelpsWithMissing } from "./HelpsWithReminder";
import { useSitterDigestLine } from "@/hooks/useOwnerDigestLine";
import { formatDateRangeFr } from "@/lib/formatDateRangeFr";
import { formatCityLabel } from "@/lib/cityLabel";
import DashboardLoadError from "./DashboardLoadError";

import RoleActivationBanner from "./RoleActivationBanner";
import AccessGateBanner from "@/components/access/AccessGateBanner";

import SitterCockpit, { type SitterCockpitLine } from "./sitter/SitterCockpit";
import type { CockpitTodo } from "./owner/OwnerCockpit";
import DashboardSectionState from "./sitter/DashboardSectionState";
import SitterMobileStickyCTA from "./sitter/SitterMobileStickyCTA";
import SitterDashboardSkeleton from "./sitter/SitterDashboardSkeleton";
import SitterMatchSection from "./sitter/SitterMatchSection";
import SitterMissingOpportunities from "./sitter/SitterMissingOpportunities";
import AlmaRailWhisper from "./sitter/AlmaRailWhisper";
import SitterOpeningCard from "./sitter/SitterOpeningCard";
import OwnerEntraideBand from "./owner/OwnerEntraideBand";
import CommunityPulseLine from "./shared/CommunityPulseLine";
import { useSitterPriorityAction } from "@/hooks/useSitterPriorityAction";
import NextStepRailCard from "./shared/NextStepRailCard";
import RailReadingsCard from "./shared/RailReadingsCard";
import DashboardRail from "./shared/DashboardRail";
import { useRailReadings } from "@/hooks/useRailReadings";
import { useProfileCompletionMissing } from "@/hooks/useProfileCompletionMissing";
import { sitterNextStep } from "@/lib/dashboardNextStep";

import { useIsNewSitter } from "@/hooks/useIsNewUser";
import { useSitterTopAffinitySits } from "@/hooks/useSitterTopAffinitySits";

export const SITTER_ENTRAIDE_HEADLINE = "Entre deux gardes, un coup de main près de chez vous.";

const SitterDashboard = () => {
  const { user } = useAuth();
  const { level, profileCompletion: accessProfileCompletion } = useAccessLevel();
  const [searchParams, setSearchParams] = useSearchParams();
  const { shouldShow: showAlmaFirstMeeting, markSeen: markAlmaFirstMeetingSeen } = useAlmaFirstMeeting();
  // Une seule voix Alma par écran, portée par AlmaRailWhisper dans le rail.
  useAlmaCulturalFact({ surface: "dashboard", context: { role: "sitter" }, enabled: false });

  const {
    loading, error, profileCompletion, identityVerified, identityStatus,
    completedSits, totalApps,
    pendingAppsCount, unreadCount, isAvailable, competencesCount, interestsCount,
    postalCode, avatarUrl, bio, hasAnimalExperience,
    nextGuard, nextGuardError,
    nearbyListings, nearbyError, nearbyMissions,
    myMissions, reload,
  } = useSitterDashboardData(user?.id);

  const rawIsNewSitter = useIsNewSitter({ totalApps: totalApps ?? 0, completedSits: completedSits ?? 0 });
  // Aperçu design : ?sitterView=confirmed ou ?sitterView=new force la branche.
  const sitterViewParam = searchParams.get("sitterView");
  const isNewSitter = sitterViewParam === "new" ? true : sitterViewParam === "confirmed" ? false : rawIsNewSitter;
  useAlmaUsageNudge({
    surface: "sitter_dashboard",
    role: "sitter",
    state: isNewSitter
      ? "new_sitter"
      : (profileCompletion ?? 100) < MIN_COMPLETION_TO_APPLY
        ? "profile_incomplete"
        : "any",
    enabled: false,
  });
  const { topSits, fallbackSits, rankingSource, totalPublished, isLoading: nbaLoading } = useSitterTopAffinitySits();

  // Compteur unique réconcilié (même source que le pouls), jamais la taille d'une liste plafonnée.
  const { data: nearbyHelpersData } = useNearbyHelpers(user?.id);
  const { data: helpersProximity } = useHelpersProximityCount(user?.id);
  const nearbyHelpersCount = helpersProximity?.localCount ?? nearbyHelpersData?.helpers?.length ?? 0;

  // Lot D2 : accueil.
  const helpsWithMissing = useHelpsWithMissing();
  const digestLine = useSitterDigestLine(!!user?.id);

  const sitterPriorityAction = useSitterPriorityAction({
    nextGuard,
    profileCompletion: profileCompletion ?? 0,
    postalCode: postalCode ?? null,
    nearbyListings: nearbyListings ?? [],
    isAvailable: !!isAvailable,
    competencesCount: competencesCount ?? 0,
    interestsCount: interestsCount ?? 0,
    identityDone: identityStatus === "verified" || identityStatus === "pending" || !!identityVerified,
    completedSitsCount: completedSits ?? 0,
  });
  const identityRailAction = sitterPriorityAction.variant === "identity" ? sitterPriorityAction : null;

  const railReadings = useRailReadings({ role: "sitter", userId: user?.id, upcomingGuard: nextGuard });
  const completionMissing = useProfileCompletionMissing("sitter", user?.id);

  const nextStepRail = sitterNextStep({
    nextGuard: (nextGuard as any) ?? null,
    postalCode: postalCode ?? null,
    hasAvatar: !!avatarUrl,
    hasBio: !!(bio && bio.length >= 50),
    identityAction: identityRailAction
      ? { title: identityRailAction.title, cta: identityRailAction.ctaLabel, href: identityRailAction.ctaTo }
      : null,
    profileCompletion: completionMissing.score ?? profileCompletion ?? 0,
    missing: completionMissing.missing,
  });

  if (loading) return <SitterDashboardSkeleton />;
  if (error) return <DashboardLoadError onRetry={reload} detail={error} />;

  // Liste d'ouverture (nouveau gardien) : mêmes étapes que l'ancienne checklist.
  const allChecklistDone =
    !!avatarUrl &&
    !!(bio && bio.length >= 50) &&
    !!postalCode &&
    !!hasAnimalExperience &&
    (identityStatus === "verified" || !!identityVerified);
  const openingVisible = isNewSitter && !allChecklistDone;

  // Ligne sous le titre : prochaine garde, sinon digest réel, sinon rien.
  const guardRange = nextGuard ? formatDateRangeFr(nextGuard.start_date, nextGuard.end_date) : null;
  const cockpitLine: SitterCockpitLine | null = nextGuard && guardRange
    ? {
        text: `Votre prochaine garde : ${guardRange}${nextGuard.city ? `, à ${formatCityLabel(nextGuard.city)}` : ""}.`,
        link: { label: "Préparer", to: `/sits/${nextGuard.id}` },
      }
    : digestLine
      ? { text: digestLine }
      : null;

  // Rangée « À faire » : actions réelles en attente, 3 au plus, dans cet ordre.
  const todos: CockpitTodo[] = [];
  if ((pendingAppsCount ?? 0) > 0) todos.push({ key: "apps", label: "Candidatures en attente de réponse", to: "/sits", count: pendingAppsCount });
  if ((unreadCount ?? 0) > 0) todos.push({ key: "messages", label: "Messages à lire", to: "/messages", count: unreadCount });
  if (!postalCode) todos.push({ key: "postal", label: "Votre code postal", to: "/profile?focus=postal_code" });
  if (helpsWithMissing) todos.push({ key: "helps", label: "Votre phrase d'entraide", to: "/ma-ligne" });

  const myActiveMission = myMissions.find((m: any) => m.status !== "completed" && m.status !== "cancelled") ?? null;
  const firstNearbyMission = nearbyMissions[0] ?? null;
  const showAccessGate = !(level === 4 || level === "3B");

  const railContent = (
    <>
      {nextStepRail && <NextStepRailCard step={nextStepRail} />}
      <AlmaRailWhisper
        profileCompletion={profileCompletion ?? 0}
        isAvailable={!!isAvailable}
        {...(isNewSitter
          ? { variant: "newSitter" as const, openingCardVisible: openingVisible }
          : { checklistVisible: false })}
      />
      {railReadings.length > 0 && <RailReadingsCard items={railReadings} />}
      {showAccessGate && (
        <AccessGateBanner level={level} profileCompletion={accessProfileCompletion} context="guard" />
      )}
    </>
  );

  return (
    <div className="overflow-hidden lg:overflow-visible pb-24 md:pb-8">
      {showAlmaFirstMeeting && (
        <div className="px-4 sm:px-5 md:px-8 pt-2">
          <AlmaFirstMeeting role="sitter" onDone={markAlmaFirstMeetingSeen} />
        </div>
      )}
      <div className="px-4 sm:px-5 md:px-8">
        <RoleActivationBanner userRole={user?.role || "sitter"} />
      </div>

      {/* Grille lots D1 et D2 : colonne principale 720 px, colonne de droite 328 px, écart 48 px */}
      <div className="min-w-0">
        <div className="mx-auto w-full max-w-[720px] lg:max-w-[1160px] px-4 sm:px-5 lg:px-8 lg:grid lg:grid-cols-[minmax(0,720px)_328px] lg:gap-[48px] lg:justify-center lg:items-start">
          <div className="min-w-0 space-y-[34px] md:space-y-[52px]">
            {/* 1. Accueil */}
            <SitterCockpit
              firstName={user?.firstName}
              isAvailable={!!isAvailable}
              greeting={openingVisible ? "Bienvenue" : undefined}
              line={cockpitLine}
              todos={todos}
            />

            {(nextGuardError || nearbyError) && (
              <div className="space-y-2">
                {nextGuardError && (
                  <DashboardSectionState variant="error" eyebrow="Prochaine garde" description={nextGuardError} onRetry={() => window.location.reload()} />
                )}
                {nearbyError && (
                  <DashboardSectionState variant="error" eyebrow="Annonces à proximité" description={nearbyError} onRetry={() => window.location.reload()} />
                )}
              </div>
            )}

            {/* 2. Nouveau gardien : la liste d'ouverture est la vedette tant qu'elle n'est pas terminée */}
            {openingVisible && (
              <SitterOpeningCard
                hasAvatar={!!avatarUrl}
                hasBioMin={!!(bio && bio.length >= 50)}
                hasPostalCode={!!postalCode}
              />
            )}

            {/* 3. Vedette unique et « Aussi pour vous », puis l'encart unique */}
            <div className="min-w-0 space-y-[22px]">
              <SitterMatchSection
                topSits={topSits}
                fallbackSits={fallbackSits}
                rankingSource={rankingSource}
                isLoading={nbaLoading}
                totalPublished={totalPublished}
                layout={openingVisible ? "rows" : "star"}
              />
              <SitterMissingOpportunities fallbackTotalPublished={totalPublished} />
            </div>

            {/* 4. Bandeau entraide */}
            <OwnerEntraideBand
              helpersCount={nearbyHelpersCount}
              helpersRadiusKm={helpersProximity?.radiusKm ?? 30}
              mission={firstNearbyMission}
              activeMission={myActiveMission}
              headline={SITTER_ENTRAIDE_HEADLINE}
            />

            {/* 5. Colonne de droite en mobile : après l'entraide */}
            <div className="lg:hidden space-y-[22px]">{railContent}</div>

            {/* 6. Pouls */}
            <CommunityPulseLine testId="sitter-pulse-line" />
          </div>

          {/* Colonne de droite, desktop */}
          <div className="hidden lg:block">
            <DashboardRail layout="compact">{railContent}</DashboardRail>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-5 md:px-8 mt-[22px] mb-4 text-center">
        <button onClick={() => setSearchParams({ tour: "true" })} className="text-xs text-muted-foreground underline-offset-4 hover:underline">
          Revoir la présentation
        </button>
      </div>

      {/* CTA collant mobile : seulement s'il y a des candidatures en attente ou des messages non lus */}
      <SitterMobileStickyCTA pendingAppsCount={pendingAppsCount} unreadCount={unreadCount} />
    </div>
  );
};

export default SitterDashboard;
