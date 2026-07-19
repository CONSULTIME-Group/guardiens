import { useState, useEffect, useMemo, useCallback } from "react";

import { useAuth } from "@/contexts/AuthContext";

import OnboardingWelcome from "./OnboardingWelcome";
import NearbyOwnerSittersCard from "./owner/NearbyOwnerSittersCard";
import NearbyEmergencySitters from "./NearbyEmergencySitters";
import DashboardSkeleton from "@/components/skeletons/DashboardSkeleton";
import { Link } from "react-router-dom";
import { differenceInDays } from "date-fns";

import RoleActivationBanner from "./RoleActivationBanner";
import AccessGateBanner from "@/components/access/AccessGateBanner";
import { FreePeriodBanner } from "@/components/marketing/FreePeriodBanner";
import { useAccessLevel } from "@/hooks/useAccessLevel";

/* ── Vague 11 : composants du flux principal ── */
import ApplicationsSection from "./owner/ApplicationsSection";
import OwnerCockpit from "./owner/OwnerCockpit";
import OwnerStarSection from "./owner/OwnerStarSection";
import OwnerAnnonceSection from "./owner/OwnerAnnonceSection";
import OwnerFamilySection from "./owner/OwnerFamilySection";
import OwnerEntraideSection from "./owner/OwnerEntraideSection";
import MobileStickyCTA from "./owner/MobileStickyCTA";
import OwnerFirstNBAGardiens from "./OwnerFirstNBAGardiens";

/* ── Vague 12 : rail ── */
import CommunityPulseBanner from "./shared/CommunityPulseBanner";
import HouseStoryRailCard from "./owner/HouseStoryRailCard";
import AlmaRailWhisper from "./sitter/AlmaRailWhisper";

import { useOwnerPriorityAction } from "@/hooks/useOwnerPriorityAction";
import { useOwnerPrimaryAction } from "@/hooks/useOwnerPrimaryAction";
import AlmaSilentSitBubble from "@/components/ai/alma/AlmaSilentSitBubble";
import { AlmaOwnerTrafficNoActionWhisper } from "@/components/ai/alma/wiring/AlmaOwnerTrafficNoActionWhisper";
import { AlmaOwnerViewTrendWhisper } from "@/components/ai/alma/wiring/AlmaOwnerViewTrendWhisper";

import type { Pet } from "./owner/types";
import { useOwnerDashboardData } from "@/hooks/useOwnerDashboardData";
import DashboardLoadError from "./DashboardLoadError";

import { useNearbyOwnerSitters } from "@/hooks/useNearbyOwnerSitters";
import { useNearbyHelpers } from "@/hooks/useNearbyHelpers";
import { useIsNewOwner, isEarlyOwner, hasNoActiveSit } from "@/hooks/useIsNewUser";
import { useAlmaCulturalFact } from "@/hooks/useAlmaCulturalFact";
import { useAlmaUsageNudge } from "@/hooks/useAlmaUsageNudge";
import { useAlmaFirstMeeting } from "@/hooks/useAlmaFirstMeeting";
import { AlmaFirstMeeting } from "@/components/ai/alma/AlmaFirstMeeting";
import { trackEvent } from "@/lib/analytics";

const OwnerDashboard = () => {
  const { user } = useAuth();
  const { shouldShow: showAlmaFirstMeeting, markSeen: markAlmaFirstMeetingSeen } = useAlmaFirstMeeting();
  useAlmaCulturalFact({ surface: "dashboard", context: { role: "owner" }, enabled: !showAlmaFirstMeeting });

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
  const nearbyHelpersCount = nearbyHelpersData?.helpers?.length ?? 0;

  /* ── UI state ── */
  const [showOnboarding, setShowOnboarding] = useState(false);

  /* ── Derived values ── */
  const now = new Date();
  const activeSits = useMemo(() => sits.filter(s => ["published", "confirmed"].includes(s.status)), [sits]);
  const completedSits = useMemo(() => sits.filter(s => s.status === "completed"), [sits]);
  const avgRating = useMemo(() => {
    if (reviews.length === 0) return 0;
    return Math.round((reviews.reduce((s, r) => s + r.overall_rating, 0) / reviews.length) * 10) / 10;
  }, [reviews]);
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

  useAlmaUsageNudge({
    surface: "owner_dashboard",
    role: "owner",
    state: isNewOwner ? "new_owner" : noActiveSit ? "no_active_sit" : "any",
    enabled: !showAlmaFirstMeeting && !hasPrimaryAction,
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
        return `${hello} ${nearbyCount} gardien${nearbyCount > 1 ? "s" : ""} vérifié${nearbyCount > 1 ? "s" : ""} à ${nearbyRadius} km attendent votre prochaine annonce.`;
      }
      return `${hello} Republiez une annonce quand vous êtes prêt.`;
    }
    if (earlyOwner) {
      const hello = "Bienvenue chez Guardiens.";
      if (nearbyCount > 0 && nearbyRadius) {
        return `${hello} ${nearbyCount} gardien${nearbyCount > 1 ? "s" : ""} vérifié${nearbyCount > 1 ? "s" : ""} dans un rayon de ${nearbyRadius} km attendent une annonce.`;
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

  return (
    <div className="space-y-0 overflow-hidden lg:overflow-visible pb-[calc(10rem+env(safe-area-inset-bottom))] md:pb-32">
      {/* Alma whispers */}
      <AlmaOwnerTrafficNoActionWhisper sits={sits} />
      <AlmaOwnerViewTrendWhisper />

      {showAlmaFirstMeeting && (
        <div className="px-4 sm:px-5 md:px-8 pt-2">
          <AlmaFirstMeeting role="owner" onDone={markAlmaFirstMeetingSeen} />
        </div>
      )}

      {/* Bandeau d'activation de rôle : reste en haut de page */}
      <div className="px-4 sm:px-5 md:px-8 mb-4">
        <RoleActivationBanner userRole={user?.role || "owner"} />
      </div>

      {/* ═══ Grille 12 colonnes : flux (8) + rail (4) ═══ */}
      <div className="min-w-0">
        <div className="mx-auto w-full max-w-4xl lg:max-w-6xl px-4 sm:px-5 lg:px-8 lg:grid lg:grid-cols-12 lg:gap-6 lg:items-start">
          {/* ═══ FLUX principal (gauche), rythme vertical 52px ═══ */}
          <div className="min-w-0 space-y-[52px] lg:col-span-8">
            {/* 1. Accueil */}
            <OwnerCockpit
              userId={user?.id}
              firstName={user?.firstName}
              avatarUrl={user?.avatarUrl ?? null}
              subtitle={subtitle}
            />

            {/* 2. Star contextuelle (une seule vedette à la fois) */}
            <OwnerStarSection
              ongoingSit={ongoingSit ?? null}
              pendingApps={recentApps.filter(a => a.status === "pending")}
              sitterProfiles={sitterProfiles}
              sitterAffinityProfiles={sitterAffinityProfiles}
              latestDraft={latestDraft as any}
              propertyCoverPhoto={propertyCoverPhoto}
              nearbyCount={nearbyCount}
              nearbyRadius={nearbyRadius}
              showConcierge={!ongoingSit && !latestDraft && (showAlmaProactive || hasPrimaryAction)}
              primaryAction={primaryAction}
            />

            {/* Alma bulle silencieuse : conservée dans le flux */}
            <AlmaSilentSitBubble sits={sits as any} />

            {/* NBA gardiens si nouveau proprio sans annonce active */}
            {showAlmaProactive && !latestDraft && !ongoingSit && (
              <OwnerFirstNBAGardiens />
            )}

            {/* 3. VOTRE ANNONCE (n'affiche rien si aucune annonce active) */}
            <OwnerAnnonceSection
              sits={sits}
              coverPhoto={propertyCoverPhoto}
              pendingAppCount={pendingAppCount}
            />

            {/* 4. VOTRE FAMILLE */}
            <OwnerFamilySection pets={pets} getNextSitForPet={getNextSitForPet} />

            {/* 4bis. LES GENS DU COIN (vague 16) */}
            <NearbySittersSection />

            {/* 5. ENTRAIDE */}
            <OwnerEntraideSection
              myMissions={myMissions}
              nearbyHelpersCount={nearbyHelpersCount}
            />

            {/* 6. LECTURES ET GUIDES (vague 16) */}
            <ReadingsSection role="owner" />


            {/* Historique candidatures : accordéon discret tout en bas */}
            {hasReadApps && (
              <details className="rounded-2xl bg-card border border-border overflow-hidden">
                <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
                  <p className="text-sm font-semibold text-foreground">
                    Historique des candidatures
                  </p>
                  <span className="text-xs text-muted-foreground group-open:rotate-180 transition-transform" aria-hidden="true">▾</span>
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

          {/* ═══ RAIL collant (droite) — vague 12 ═══ */}
          <aside className="mt-[52px] lg:mt-0 space-y-[34px] lg:col-span-4 lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
            {/* 1. Pouls — seul bloc sombre */}
            <div className="">
              <CommunityPulseBanner userId={user?.id} />
            </div>

            {/* 2. Votre maison */}
            <div className="">
              <HouseStoryRailCard
                userId={user?.id}
                completedSits={completedSits.length}
                avgRating={avgRating}
                reviewsCount={reviews.length}
                trustedSitterCount={trustedSitterCount}
                highlightsCount={(highlights ?? []).length}
                pendingReviewsCount={pendingReviews.length}
                firstPendingReviewSitId={pendingReviews[0]?.sitId ?? null}
              />
            </div>

            {/* 3. Accès (Gate ou Free) */}
            <div className="">
              {!(level === 4 || level === "3B")
                ? <AccessGateBanner level={level} profileCompletion={accessProfileCompletion} context="guard" />
                : <FreePeriodBanner />}
            </div>

            {/* 4. Gardiens d'urgence — condition existante */}
            {showEmergencyHelp && (
              <div className="">
                <NearbyEmergencySitters />
              </div>
            )}

            {/* 5. Parrainage — gabarit rail aligné */}
            <div className="">
              <article
                className="bg-card border border-border"
                style={{
                  borderRadius: "20px",
                  padding: "22px",
                  boxShadow: "0 1px 2px rgba(29,27,22,0.04), 0 8px 24px rgba(29,27,22,0.05)",
                }}
              >
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="inline-block"
                    style={{ width: "20px", height: "1px", background: "hsl(var(--secondary))" }}
                  />
                  <p
                    style={{
                      color: "hsl(var(--secondary))",
                      fontSize: "11px",
                      fontWeight: 700,
                      letterSpacing: "0.16em",
                      textTransform: "uppercase",
                    }}
                  >
                    Parrainage
                  </p>
                </div>
                <h3
                  className="font-heading text-foreground mt-[8px]"
                  style={{ fontSize: "17px", fontWeight: 600, lineHeight: 1.3 }}
                >
                  Invitez un proche.
                </h3>
                <p
                  className="font-sans text-muted-foreground mt-[8px]"
                  style={{ fontSize: "13.5px", lineHeight: 1.5 }}
                >
                  Son inscription reste sans engagement et vous développez l'entraide autour de chez vous.
                </p>
                <div className="mt-[14px]">
                  <Link
                    to="/mon-abonnement#parrainage"
                    className="text-primary hover:underline underline-offset-4"
                    style={{ fontSize: "13px", fontWeight: 700 }}
                  >
                    Partager votre lien
                  </Link>
                </div>
              </article>
            </div>

            {/* 6. Alma — clôt le rail */}
            <div className="mb-6">
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
            </div>
          </aside>
        </div>
      </div>

      {/* ═══ CTA sticky mobile ═══ */}
      {pendingAppCount > 0 ? (
        <MobileStickyCTA
          label="Voir les candidatures"
          to="/sits"
          badge={pendingAppCount}
        />
      ) : activeSits.length > 0 ? (
        <MobileStickyCTA label="Voir mon annonce" to="/sits" />
      ) : (
        <MobileStickyCTA label="Publier une annonce" to="/sits/create" />
      )}
    </div>
  );
};

export default OwnerDashboard;
