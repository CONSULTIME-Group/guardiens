import { useAlmaCulturalFact } from "@/hooks/useAlmaCulturalFact";

import { useAlmaUsageNudge } from "@/hooks/useAlmaUsageNudge";
import { useAlmaFirstMeeting } from "@/hooks/useAlmaFirstMeeting";
import { AlmaFirstMeeting } from "@/components/ai/alma/AlmaFirstMeeting";
import { useAuth } from "@/contexts/AuthContext";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { useAccessLevel } from "@/hooks/useAccessLevel";
import { useSitterDashboardData } from "@/hooks/useSitterDashboardData";
import { useNearbyHelpers } from "@/hooks/useNearbyHelpers";
import DashboardLoadError from "./DashboardLoadError";

import RoleActivationBanner from "./RoleActivationBanner";
import AccessGateBanner from "@/components/access/AccessGateBanner";
import { FreePeriodBanner } from "@/components/marketing/FreePeriodBanner";

import SitterCockpit from "./sitter/SitterCockpit";
import DashboardSectionState from "./sitter/DashboardSectionState";
import SitterMobileStickyCTA from "./sitter/SitterMobileStickyCTA";
import CommunityPulseBanner from "./shared/CommunityPulseBanner";
// NearbyAnnoncesCard retiré ici (vague 2) : la carte rencontre le remplace.
import DashSection from "./owner/DashSection";
import SitterDashboardSkeleton from "./sitter/SitterDashboardSkeleton";
import SitterFirstNBA from "./SitterFirstNBA";
import SitterFirstNBASkeleton from "./SitterFirstNBASkeleton";
import SitterMatchSection from "./sitter/SitterMatchSection";
import SitterStoryTiles from "./sitter/SitterStoryTiles";
import NoNearbySitsEmptyState from "./NoNearbySitsEmptyState";
import NextGuardRailCard from "./sitter/NextGuardRailCard";
import ReputationRailCard from "./sitter/ReputationRailCard";
import AlmaRailWhisper from "./sitter/AlmaRailWhisper";
import SitterOpeningCard from "./sitter/SitterOpeningCard";
import SitterTeaserCard from "./sitter/SitterTeaserCard";
import SitterNextStepRailCard from "./sitter/SitterNextStepRailCard";
import SitterEntraideSection from "./sitter/SitterEntraideSection";
import ReadingsSection from "./shared/ReadingsSection";

import { useIsNewSitter } from "@/hooks/useIsNewUser";
import { useSitterTopAffinitySits } from "@/hooks/useSitterTopAffinitySits";

import { CheckCircle, Circle, ChevronRight, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";





const SitterDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { level, profileCompletion: accessProfileCompletion } = useAccessLevel();
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasAccess: hasSubscription } = useSubscriptionAccess();
  // Premier contact Alma : bloque les whispers proactifs tant qu'il n'est pas vu.
  const { shouldShow: showAlmaFirstMeeting, markSeen: markAlmaFirstMeetingSeen } = useAlmaFirstMeeting();
  // Pass 5 — compagnon culturel : fait d'ambiance selon rôle et ville.
  useAlmaCulturalFact({ surface: "dashboard", context: { role: "sitter" }, enabled: !showAlmaFirstMeeting });





  const {
    loading, error, profileCompletion, identityVerified, identityStatus,
    completedSits, avgRating, reviewsCount, badgeCount, totalApps,
    pendingAppsCount, unreadCount, isAvailable, competencesCount, interestsCount,
    postalCode, avatarUrl, bio, hasAnimalExperience,
    hasEmergencyProfile, hasAcceptedRecent, nextGuard, nextGuardError,
    nearbyListings, nearbyListingsRadius, nearbyError, articles, nearbyMissions, nearbyMissionsError,
    myMissions, myMissionsError,
    toggleAvailability,
    reputation, groupedBadges, reload,
  } = useSitterDashboardData(user?.id);


  // NBA nouveau gardien : score d'affinité + fallback empty state.
  // Le hook est appelé inconditionnellement (règle des hooks). Il ne fetche
  // que si userId présent (cf. `enabled` du useQuery).
  const rawIsNewSitter = useIsNewSitter({ totalApps: totalApps ?? 0, completedSits: completedSits ?? 0 });
  // Override pour preview design : ?sitterView=confirmed force la branche confirmée,
  // ?sitterView=new force la branche nouveau gardien. Sinon comportement normal.
  const sitterViewParam = searchParams.get("sitterView");
  const isNewSitter = sitterViewParam === "new" ? true : sitterViewParam === "confirmed" ? false : rawIsNewSitter;
  // Alma étape 1 — usage_nudge P2, ciblé sur l'état du gardien.
  useAlmaUsageNudge({
    surface: "sitter_dashboard",
    role: "sitter",
    state: isNewSitter
      ? "new_sitter"
      : (profileCompletion ?? 100) < 60
        ? "profile_incomplete"
        : "any",
    enabled: !showAlmaFirstMeeting,
  });
  const {
    topSits,
    fallbackSits,
    discoverySit,
    hasMinimumPool,
    hasPostalCode,
    profileIncomplete,
    scopeUsed,
    totalPublished,
    isLoading: nbaLoading,
  } = useSitterTopAffinitySits();

  if (loading) return <SitterDashboardSkeleton />;
  if (error) return <DashboardLoadError onRetry={reload} detail={error} />;


  // (Sous-titre dynamique supprimé : redondant avec le titre de la
  // PriorityActionCard du cockpit. Cf. audit dashboard 2026.)

  // ── Checklist NEW-SITTER : 3 items décisifs + 2 items secondaires ──
  // Précepte 2026 : 2-4 étapes visibles max, le reste dans un fold-out.
  // Les 3 items primaires débloquent "je peux postuler et être choisi" :
  // photo (rassure), bio ≥ 50 (motivation), code postal (annonces locales).
  const primaryItems = [
    { key: "avatar", done: !!avatarUrl, label: "Ajouter une photo de profil", hint: "Rassure les propriétaires en 1 coup d'œil", to: "/profile?section=identite" },
    { key: "bio", done: !!(bio && bio.length >= 50), label: "Écrire votre bio (50 caractères min)", hint: "Motivation, expérience, ce qui vous rend fiable", to: "/profile?section=profil" },
    { key: "postal", done: !!postalCode, label: "Renseigner votre code postal", hint: "Pour voir les annonces près de chez vous", to: "/profile?focus=postal_code" },
  ];
  const secondaryItems = [
    { key: "experience", done: hasAnimalExperience, label: "Ajouter une expérience animale", to: "/profile?section=experience" },
    { key: "identity", done: identityStatus === "verified" || identityVerified, label: "Vérifier votre identité (recommandé)", to: "/settings#verification" },
  ];
  const allItems = [...primaryItems, ...secondaryItems];
  const completedItems = allItems.filter(c => c.done);
  const allChecklistDone = completedItems.length === allItems.length;
  const primaryDone = primaryItems.filter(c => c.done).length;
  const progressPct = Math.round((completedItems.length / allItems.length) * 100);

  // ── Bloc activation unifié ──
  const ChecklistBlock = (
    <section aria-labelledby="onboarding-checklist-heading" className="mb-6 md:mb-8">
      {!postalCode && (
        <div className="mb-3 flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3" role="alert">
          <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1 text-sm">
            <strong className="text-foreground">Code postal manquant.</strong>{" "}
            <span className="text-foreground/80">Sans lui, aucune annonce ne s'affiche autour de vous.</span>
          </div>
          <Button size="sm" variant="outline" onClick={() => navigate("/profile?focus=postal_code")}>
            Ajouter
          </Button>
        </div>
      )}

      {allChecklistDone ? null : (
        <DashSection
          eyebrow="Activation"
          title="3 étapes pour débloquer les annonces"
          description={`${primaryDone}/${primaryItems.length} étapes essentielles, ${progressPct}% du profil`}
        >
          <Progress value={progressPct} className="mb-3" />

          <div role="list" className="bg-card border border-border rounded-2xl overflow-hidden">
            {primaryItems.map((item, i) => (
              <Link
                key={item.key}
                to={item.to}
                role="listitem"
                aria-disabled={item.done}
                className={`group flex items-center justify-between py-3 px-4 border-b border-border last:border-0 transition-all duration-200 ease-out ${
                  item.done ? "pointer-events-none" : "cursor-pointer hover:bg-muted/40 hover:translate-x-0.5"
                }`}
              >
                <div className="flex items-center min-w-0">
                  {item.done ? (
                    <CheckCircle className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground shrink-0 transition-colors group-hover:text-primary" aria-hidden="true" />
                  )}
                  <div className="ml-3 min-w-0">
                    <span className={`text-sm block ${item.done ? "line-through text-foreground/50" : "text-foreground"}`}>
                      {item.label}
                    </span>
                    {!item.done && item.hint && (
                      <span className="text-xs text-muted-foreground block mt-0.5">{item.hint}</span>
                    )}
                  </div>
                </div>
                {!item.done && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" />
                )}
              </Link>
            ))}
          </div>

          {/* 2 items secondaires masqués par défaut : « aller plus loin » */}
          {secondaryItems.some(i => !i.done) && (
            <details className="mt-3 rounded-2xl bg-card border border-border overflow-hidden">
              <summary className="cursor-pointer list-none px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted/30 flex items-center justify-between">
                <span>Aller plus loin, débloquer plus d'annonces</span>
                <span className="text-xs text-muted-foreground" aria-hidden="true">▾</span>
              </summary>
              <div role="list">
                {secondaryItems.map((item) => (
                  <Link
                    key={item.key}
                    to={item.to}
                    role="listitem"
                    aria-disabled={item.done}
                    className={`group flex items-center justify-between py-3 px-4 border-t border-border transition-all duration-200 ease-out ${
                      item.done ? "pointer-events-none" : "cursor-pointer hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-center">
                      {item.done ? (
                        <CheckCircle className="h-4 w-4 text-primary" aria-hidden="true" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      )}
                      <span className={`text-sm ml-3 ${item.done ? "line-through text-foreground/50" : "text-foreground"}`}>
                        {item.label}
                      </span>
                    </div>
                    {!item.done && <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
                  </Link>
                ))}
              </div>
            </details>
          )}
        </DashSection>
      )}

    </section>
  );






  // ── Zone Découverte, sections indépendantes (plus d'onglets).
  // Ordre validé : Annonces → Coup de main → Conseils (replié).
  // Logique d'emptiness : on évite d'afficher 2 cartes vides côte à côte.
  // - Annonces : si rien dans 100 km, on remplace la carte par 1 message clair.
  // - Coup de main : si pas de missions (mienne ni du coin), on masque
  //   SitterMissionsSection, la carte helpers (qui a son propre empty-state
  //   premium avec CTA parrainage) reste seule visible et porte le message.
  const missionsEmpty =
    !myMissionsError && !nearbyMissionsError &&
    myMissions.length === 0 && nearbyMissions.length === 0;


  // VAGUE 3 — L'entraide, invitation calme, une seule mission mise en avant.
  const firstNearbyMission = nearbyMissions[0];
  const myActiveMission = myMissions.find((m: any) => m.status !== "completed" && m.status !== "cancelled") ?? null;

  // Signal helpers proches, partagé entre les deux dashboards.
  const { data: nearbyHelpersData } = useNearbyHelpers(user?.id);
  const nearbyHelpersCount = nearbyHelpersData?.helpers?.length ?? 0;



  // Ancienne DiscoverySections retirée du flux confirmé (vague 3).
  // NearbyHelpersCarousel, SitterMissionsSection, CommunityQuestionsSection
  // et ConseilsDiscoveryCard ne sont plus montés côté confirmé, mais restent
  // disponibles ailleurs (branche isNewSitter, autres écrans).




  return (
    <div className="space-y-0 overflow-hidden lg:overflow-visible pb-24 md:pb-8">
{/* pb-24 mobile = BottomNav (h-16) + sticky CTA (~32px). h-20 spacer supprimé (doublon). */}
      {showAlmaFirstMeeting && (
        <div className="px-4 sm:px-5 md:px-8 pt-2">
          <AlmaFirstMeeting role="sitter" onDone={markAlmaFirstMeetingSeen} />
        </div>
      )}
      {/* Role activation */}
      <div className="px-4 sm:px-5 md:px-8 mb-4">
        <RoleActivationBanner userRole={user?.role || "sitter"} />
      </div>

      {/* ═══ FLUX VERTICAL UNIQUE — plus de colonne aside isolée ═══
          Ordre cockpit : Header + Action prioritaire → KPI strip Mon activité
          → Activation → Opportunités → Profil (accordéon). */}
      <div className="min-w-0">
        {isNewSitter ? (
          <div className="mx-auto w-full max-w-4xl lg:max-w-6xl px-4 sm:px-5 lg:px-8 lg:grid lg:grid-cols-12 lg:gap-6 lg:items-start">
            {/* ═══ FLUX principal (gauche) — rythme vertical 52px ═══ */}
            <div className="min-w-0 space-y-[52px] lg:col-span-8">
              {/* 1. ACCUEIL, salutation Bienvenue */}
              <div className="min-w-0">
                <SitterCockpit
                  userId={user?.id}
                  firstName={user?.firstName}
                  avatarUrl={avatarUrl}
                  isFounder={user?.isFounder}
                  isAvailable={isAvailable}
                  onToggleAvailability={toggleAvailability}
                  greeting="Bienvenue"
                />
              </div>

              {/* 2. LA STAR, complétion : SitterOpeningCard (remplace ChecklistBlock
                  et le bandeau code postal manquant dans cette branche uniquement). */}
              {!allChecklistDone && (
                <div className="">
                  <SitterOpeningCard
                    hasAvatar={!!avatarUrl}
                    hasBioMin={!!(bio && bio.length >= 50)}
                    hasPostalCode={!!postalCode}
                  />
                </div>
              )}

              {/* 3. ÉMOTION EN APERÇU : SitterTeaserCard (jamais de ring ici) */}
              <SitterTeaserCard
                topSits={topSits}
                fallbackSits={fallbackSits}
                scopeUsed={scopeUsed}
                isLoading={nbaLoading}
              />

              {/* 4. ENTRAIDE, invitation adaptée au premier pas */}
              <div className="">
                <SitterEntraideSection
                  firstNearbyMission={firstNearbyMission}
                  eyebrow="Un premier pas dans la communauté"
                  title="Commencez par un coup de main."
                  subtitle="La façon la plus simple de rencontrer les gens du coin."
                />
              </div>

              {/* 5. LECTURES ET GUIDES (vague 16) */}
              <div>
                <ReadingsSection role="sitter" />
              </div>
            </div>


            {/* ═══ RAIL collant (droite) — espacement 34px, mt-[52px] mobile ═══ */}
            <aside className="mt-[52px] lg:mt-0 space-y-[34px] lg:col-span-4 lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
              <div className="">
                <CommunityPulseBanner userId={user?.id} />
              </div>
              <div className="">
                {!(level === 4 || level === "3B")
                  ? <AccessGateBanner level={level} profileCompletion={accessProfileCompletion} context="guard" />
                  : <FreePeriodBanner />}
              </div>
              {!allChecklistDone && (
                <div className="">
                  <SitterNextStepRailCard
                    hasAvatar={!!avatarUrl}
                    hasBioMin={!!(bio && bio.length >= 50)}
                    hasPostalCode={!!postalCode}
                  />
                </div>
              )}
              <div className="mb-6">
                <AlmaRailWhisper
                  profileCompletion={profileCompletion ?? 0}
                  isAvailable={!!isAvailable}
                  variant="newSitter"
                  openingCardVisible={!allChecklistDone}
                />
              </div>
            </aside>
          </div>

        ) : (
          <div className="mx-auto w-full max-w-4xl lg:max-w-6xl px-4 sm:px-5 lg:px-8 lg:grid lg:grid-cols-12 lg:gap-6 lg:items-start">
            {/* ═══ FLUX principal (gauche) ═══ rythme vertical 52px (vague 3) */}
            <div className="min-w-0 space-y-[52px] lg:col-span-8">
              {/* COCKPIT */}
              <div className="min-w-0">
                <SitterCockpit
                  userId={user?.id}
                  firstName={user?.firstName}
                  avatarUrl={avatarUrl}
                  isFounder={user?.isFounder}
                  isAvailable={isAvailable}
                  onToggleAvailability={toggleAvailability}
                  nextGuard={nextGuard}
                  profileCompletion={profileCompletion}
                  postalCode={postalCode}
                  nearbyListings={nearbyListings}
                  competencesCount={competencesCount}
                  interestsCount={interestsCount}
                />
              </div>

              {(nextGuardError || nearbyError) && (
                <div className="space-y-2">
                  {nextGuardError && (
                    <DashboardSectionState
                      variant="error"
                      eyebrow="Prochaine garde"
                      description={nextGuardError}
                      onRetry={() => window.location.reload()}
                    />
                  )}
                  {nearbyError && (
                    <DashboardSectionState
                      variant="error"
                      eyebrow="Annonces à proximité"
                      description={nearbyError}
                      onRetry={() => window.location.reload()}
                    />
                  )}
                </div>
              )}

              {/* VAGUE 2 — carte rencontre, star unique de l'écran */}
              <div className="">
                <SitterMatchSection
                  topSits={topSits}
                  fallbackSits={fallbackSits}
                  discoverySit={discoverySit}
                  scopeUsed={scopeUsed}
                  isLoading={nbaLoading}
                />
              </div>

              {/* VAGUE 3 — tuiles histoire (remplace SitterActivityPanel côté confirmé) */}
              <div className="">
                <SitterStoryTiles
                  pendingAppsCount={pendingAppsCount ?? 0}
                  unreadCount={unreadCount ?? 0}
                  badgeCount={badgeCount ?? 0}
                />
              </div>

              {ChecklistBlock}

              {/* VAGUE 3 — invitation entraide calme */}
              <div className="">
                <SitterEntraideSection
                  firstNearbyMission={firstNearbyMission}
                  eyebrow="L'entraide, tout près"
                  title="Un coup de main à donner."
                />

              </div>

              {/* VAGUE 16 — lectures et guides */}
              <div>
                <ReadingsSection role="sitter" />
              </div>
            </div>



            {/* ═══ RAIL collant (droite) — vague 4 ═══
                Ordre narratif : pouls → prochaine garde (ou access/free) →
                réputation → Alma en murmure. Espacement 34px. */}
            <aside className="mt-[52px] lg:mt-0 space-y-[34px] lg:col-span-4 lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
              <div className="">
                <CommunityPulseBanner userId={user?.id} />
              </div>
              <div className="">
                {nextGuard ? (
                  <NextGuardRailCard nextGuard={nextGuard} />
                ) : !(level === 4 || level === "3B") ? (
                  <AccessGateBanner level={level} profileCompletion={accessProfileCompletion} context="guard" />
                ) : (
                  <FreePeriodBanner />
                )}
              </div>
              <div className="">
                <ReputationRailCard
                  userId={user?.id}
                  completedSits={completedSits ?? 0}
                  avgRating={avgRating ?? 0}
                  reviewsCount={reviewsCount ?? 0}
                  badgeCount={badgeCount ?? 0}
                />
              </div>
              <div className="mb-6">
                <AlmaRailWhisper
                  profileCompletion={profileCompletion ?? 0}
                  isAvailable={!!isAvailable}
                  checklistVisible={!allChecklistDone}
                />
              </div>
            </aside>
          </div>
        )}
      </div>



      {/* Lien discret "Revoir la présentation" */}
      <div className="px-4 sm:px-5 md:px-8 mt-2 mb-4 text-center">
        <button onClick={() => setSearchParams({ tour: "true" })} className="text-xs text-muted-foreground underline-offset-4 hover:underline">
          Revoir la présentation
        </button>
      </div>


      {/* CTA sticky mobile */}

      <SitterMobileStickyCTA pendingAppsCount={pendingAppsCount} unreadCount={unreadCount} />
    </div>
  );
};

export default SitterDashboard;
