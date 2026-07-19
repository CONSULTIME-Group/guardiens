import { useAlmaCulturalFact } from "@/hooks/useAlmaCulturalFact";
import { useAlmaUsageNudge } from "@/hooks/useAlmaUsageNudge";
import { useAlmaFirstMeeting } from "@/hooks/useAlmaFirstMeeting";
import { AlmaFirstMeeting } from "@/components/ai/alma/AlmaFirstMeeting";
import { useAuth } from "@/contexts/AuthContext";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { useAccessLevel } from "@/hooks/useAccessLevel";
import { useSitterDashboardData } from "@/hooks/useSitterDashboardData";
import DashboardLoadError from "./DashboardLoadError";

import { getOptimizedImageUrl } from "@/lib/imageOptim";

import RoleActivationBanner from "./RoleActivationBanner";
import AccessGateBanner from "@/components/access/AccessGateBanner";
import { FreePeriodBanner } from "@/components/marketing/FreePeriodBanner";

import SitterCockpit from "./sitter/SitterCockpit";
import DashboardSectionState from "./sitter/DashboardSectionState";
import SitterMobileStickyCTA from "./sitter/SitterMobileStickyCTA";
import SitterStatusBar from "./sitter/SitterStatusBar";
import SitterBadgesSection from "./sitter/SitterBadgesSection";
import NearbyHelpersCarousel from "./shared/NearbyHelpersCarousel";
import CommunityPulseBanner from "./shared/CommunityPulseBanner";
import SitterEmergencyCardCompact from "./sitter/SitterEmergencyCardCompact";
import SitterMissionsSection from "./sitter/SitterMissionsSection";
import CommunityQuestionsSection from "./CommunityQuestionsSection";
// NearbyAnnoncesCard retiré ici (vague 2) : la carte rencontre le remplace.
import DashSection from "./owner/DashSection";
import SitterDashboardSkeleton from "./sitter/SitterDashboardSkeleton";
import SitterActivityPanel from "./sitter/SitterActivityPanel";
import SitterFirstNBA from "./SitterFirstNBA";
import SitterFirstNBASkeleton from "./SitterFirstNBASkeleton";
import SitterMatchSection, { SectionHeader } from "./sitter/SitterMatchSection";
import SitterStoryTiles from "./sitter/SitterStoryTiles";
import NoNearbySitsEmptyState from "./NoNearbySitsEmptyState";
import EmailDigestCard from "./sitter/EmailDigestCard";
import { useIsNewSitter } from "@/hooks/useIsNewUser";
import { useSitterTopAffinitySits } from "@/hooks/useSitterTopAffinitySits";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CheckCircle, Circle, ChevronRight, Newspaper, AlertCircle } from "lucide-react";
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
  const isNewSitter = useIsNewSitter({ totalApps: totalApps ?? 0, completedSits: completedSits ?? 0 });
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
    <section aria-labelledby="onboarding-checklist-heading" className="px-4 sm:px-5 md:px-8 mb-6 md:mb-8">
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


  // ── Accordéon unique : Conseils + Réputation + Badges ──
  // 3 strates secondaires regroupées dans UN seul Accordion pour densifier
  // le bas de dashboard et clarifier la hiérarchie (1 zone "à explorer"
  // au lieu de 3 cartes empilées). Toutes fermées par défaut.
  // Zone « À découvrir » visible (pas repliée) : conseils choisis, en cartes.
  const ConseilsDiscoveryCard = (
    <section aria-labelledby="discovery-conseils-heading" className="min-w-0">
      <div className="flex items-center gap-2 mb-2">
        <span className="inline-flex items-center rounded-full bg-info/10 text-info text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5">
          À découvrir
        </span>
      </div>
      <h2
        id="discovery-conseils-heading"
        className="font-heading text-lg sm:text-xl font-bold text-foreground leading-tight mb-3"
      >
        {articles.length > 0
          ? "Lectures choisies pour vos premières gardes"
          : "Explorez les ressources de la communauté"}
      </h2>
      {articles.length > 0 ? (
        <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          {articles.map((a: any) => (
            <Link
              key={a.id}
              to={`/actualites/${a.slug}`}
              className="group/card flex-shrink-0 w-[70vw] sm:w-64 rounded-xl border border-border bg-card overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ease-out cursor-pointer"
            >
              {a.cover_image_url ? (
                <div className="w-full h-28 overflow-hidden">
                  <img
                    src={getOptimizedImageUrl(a.cover_image_url, 300, 75)}
                    alt={a.title || "Article"}
                    className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover/card:scale-105"
                    width={300}
                    height={112}
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className="w-full h-28 bg-accent flex items-center justify-center">
                  <Newspaper className="h-8 w-8 text-muted-foreground/40" aria-hidden="true" />
                </div>
              )}
              <div className="p-3">
                <h3 className="text-sm font-semibold line-clamp-2 transition-colors group-hover/card:text-primary">
                  {a.title}
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{a.excerpt}</p>
              </div>
            </Link>
          ))}
        </div>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          to="/races"
          className="inline-flex items-center rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:border-primary hover:text-primary transition-colors"
        >
          Fiches races
        </Link>
        <Link
          to="/guides"
          className="inline-flex items-center rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:border-primary hover:text-primary transition-colors"
        >
          Guides pratiques
        </Link>
        <Link
          to="/actualites"
          className="inline-flex items-center rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:border-primary hover:text-primary transition-colors"
        >
          Tous les conseils
        </Link>
      </div>
    </section>
  );

  const isBeginnerSitter = completedSits === 0 && reviewsCount === 0 && badgeCount === 0;

  const buildSecondaryAccordion = () => (
    <section aria-label="Mon espace gardien, détails" className="rounded-2xl border border-border bg-card overflow-hidden">
      <Accordion type="single" collapsible defaultValue={completedSits > 0 ? "reputation" : undefined}>


        <AccordionItem value="reputation" className="border-b border-border last:border-0">
          <AccordionTrigger className="px-4 py-2.5 hover:no-underline hover:bg-muted/30 [&[data-state=open]>svg]:rotate-180">
            <div className="flex flex-col items-start text-left">
              <p className="text-[10px] uppercase tracking-[2px] text-muted-foreground font-sans font-semibold">
                Ma réputation
              </p>
              <p className="text-sm font-medium text-foreground">
                {isBeginnerSitter
                  ? "Votre réputation se construira dès votre première garde."
                  : <>
                      {completedSits} garde{completedSits > 1 ? "s" : ""}
                      {" · "}
                      {completedSits > 0 && reviewsCount > 0
                        ? `note ${avgRating.toFixed(1).replace(".", ",")}/5`
                        : "pas encore noté"}
                      {" · "}
                      {badgeCount} badge{badgeCount > 1 ? "s" : ""}
                    </>}
              </p>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 pt-1">
            <SitterStatusBar
              profileCompletion={profileCompletion}
              completedSits={completedSits}
              avgRating={avgRating}
              reviewsCount={reviewsCount}
              badgeCount={badgeCount}
              totalApps={totalApps}
              reputation={reputation}
              compact={false}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="badges" className="border-b border-border last:border-0">
          <AccordionTrigger className="px-4 py-2.5 hover:no-underline hover:bg-muted/30 [&[data-state=open]>svg]:rotate-180">
            <div className="flex flex-col items-start text-left">
              <p className="text-[10px] uppercase tracking-[2px] text-muted-foreground font-sans font-semibold">
                Badges
              </p>
              <p className="text-sm font-medium text-foreground">
                {isBeginnerSitter
                  ? "Vos premiers écussons vous attendent, ils se débloquent avec votre activité."
                  : `${badgeCount} badge${badgeCount > 1 ? "s" : ""} obtenu${badgeCount > 1 ? "s" : ""}`}
              </p>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 pt-1">
            <SitterBadgesSection groupedBadges={groupedBadges} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="emergency" className="border-b border-border last:border-0">
          <AccordionTrigger className="px-4 py-2.5 hover:no-underline hover:bg-muted/30 [&[data-state=open]>svg]:rotate-180">
            <div className="flex flex-col items-start text-left">
              <p className="text-[10px] uppercase tracking-[2px] text-muted-foreground font-sans font-semibold">
                Gardien d'urgence
              </p>
              <p className="text-sm font-medium text-foreground">
                {hasEmergencyProfile
                  ? "Profil actif"
                  : isBeginnerSitter
                    ? "Activez le mode gardien d'urgence pour recevoir les demandes de dernière minute"
                    : "Non configuré"}
              </p>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 pt-1">
            <SitterEmergencyCardCompact
              hasEmergencyProfile={hasEmergencyProfile}
              completedSits={completedSits ?? 0}
              avgRating={avgRating ?? 0}
              reviewsCount={reviewsCount ?? 0}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
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
  const missionDateFmt = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
  });
  const formatMissionDate = (d: string | null | undefined): string | null => {
    if (!d) return null;
    try { return missionDateFmt.format(new Date(d)); } catch { return null; }
  };

  const EntraideSection = (
    <section aria-label="L'entraide, tout près">
      <SectionHeader
        eyebrow="L'entraide, tout près"
        title="Un coup de main à donner."
      />
      {firstNearbyMission ? (
        <>
          <article
            className="bg-card border border-border flex items-center flex-wrap"
            style={{
              borderRadius: "16px",
              padding: "22px",
              gap: "14px",
              boxShadow: "0 1px 2px rgba(29,27,22,0.04), 0 8px 24px rgba(29,27,22,0.05)",
            }}
          >
            <div className="min-w-0 flex-1">
              <h3
                className="font-heading text-foreground"
                style={{ fontSize: "16px", fontWeight: 600, lineHeight: 1.3 }}
              >
                {firstNearbyMission.title ?? "Une aide à proposer"}
              </h3>
              {(() => {
                const meta = [
                  firstNearbyMission.city,
                  formatMissionDate(firstNearbyMission.date_needed),
                ].filter(Boolean).join(" · ");
                return meta ? (
                  <p className="text-muted-foreground mt-[8px]" style={{ fontSize: "13px", lineHeight: 1.4 }}>
                    {meta}
                  </p>
                ) : null;
              })()}
            </div>
            <Link
              to={`/petites-missions/${firstNearbyMission.id}`}
              className="inline-flex items-center justify-center rounded-full border border-border bg-card text-foreground hover:bg-muted/40 transition-colors"
              style={{
                minHeight: "44px",
                padding: "10px 18px",
                fontSize: "14px",
                fontWeight: 700,
              }}
            >
              Proposer mon aide
            </Link>
          </article>
          <div className="mt-[14px]">
            <Link
              to="/petites-missions"
              className="text-primary hover:underline underline-offset-4"
              style={{ fontSize: "13px", fontWeight: 700 }}
            >
              Toutes les missions d'entraide
            </Link>
          </div>
        </>
      ) : (
        <div
          className="text-center bg-card"
          style={{
            border: "1px dashed hsl(var(--border))",
            borderRadius: "16px",
            padding: "34px 22px",
          }}
        >
          <h3
            className="font-heading text-foreground"
            style={{ fontSize: "20px", fontWeight: 600 }}
          >
            Personne n'a besoin d'aide pour l'instant, tout va bien.
          </h3>
          <p
            className="font-sans text-muted-foreground mx-auto mt-[14px]"
            style={{ fontSize: "13px", maxWidth: "42ch", lineHeight: 1.5 }}
          >
            Revenez plus tard, ou proposez vous-même un coup de main autour de vous.
          </p>
          <div className="mt-[22px]">
            <Link
              to="/petites-missions"
              className="text-primary hover:underline underline-offset-4"
              style={{ fontSize: "13px", fontWeight: 700 }}
            >
              Voir toutes les missions
            </Link>
          </div>
        </div>
      )}
    </section>
  );

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
          <div className="mx-auto w-full max-w-4xl lg:max-w-6xl lg:grid lg:grid-cols-12 lg:gap-6 lg:items-start">
            {/* ═══ FLUX principal (gauche) ═══ */}
            <div className="min-w-0 space-y-8 lg:col-span-8">
              {/* completion-first quand le profil est incomplet */}
              {!allChecklistDone && ChecklistBlock}

              {/* NBA affinité dominante */}
              <div className="min-w-0">
                {nbaLoading ? (
                  <SitterFirstNBASkeleton />
                ) : hasMinimumPool && hasPostalCode ? (
                  <SitterFirstNBA sits={topSits} />
                ) : fallbackSits.length > 0 && hasPostalCode && !profileIncomplete ? (
                  <SitterFirstNBA
                    sits={fallbackSits}
                    mode="fallback"
                    scopeLabel={
                      scopeUsed === "dept"
                        ? "dans votre département"
                        : scopeUsed === "region"
                          ? "dans votre région"
                          : "sur Guardiens"
                    }
                  />
                ) : (
                  <NoNearbySitsEmptyState
                    totalPublishedSits={totalPublished}
                    postalCode={postalCode}
                    variant={profileIncomplete ? "profile_incomplete" : "no_nearby"}
                  />
                )}
              </div>

              <div className="px-4 sm:px-5 md:px-8 lg:px-0">
                <NearbyHelpersCarousel hideHeader />
              </div>
              <div className="px-4 sm:px-5 md:px-8 lg:px-0">
                {ConseilsDiscoveryCard}
              </div>
            </div>

            {/* ═══ RAIL collant (droite) ═══ */}
            <aside className="mt-8 lg:mt-0 space-y-8 lg:col-span-4 lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
              <div className="px-4 sm:px-5 md:px-8 lg:px-0">
                <CommunityPulseBanner userId={user?.id} />
              </div>
              <div className="px-4 sm:px-5 md:px-8 lg:px-0">
                {!(level === 4 || level === "3B")
                  ? <AccessGateBanner level={level} profileCompletion={accessProfileCompletion} context="guard" />
                  : <FreePeriodBanner />}
              </div>
              <div className="px-4 sm:px-5 md:px-8 lg:px-0">
                <EmailDigestCard />
              </div>
              <div className="px-4 sm:px-5 md:px-8 lg:px-0 mb-6">
                {buildSecondaryAccordion()}
              </div>
            </aside>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-4xl lg:max-w-6xl lg:grid lg:grid-cols-12 lg:gap-6 lg:items-start">
            {/* ═══ FLUX principal (gauche) ═══ */}
            <div className="min-w-0 space-y-8 lg:col-span-8">
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
                <div className="px-4 sm:px-5 md:px-8 lg:px-0 space-y-2">
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
              <div className="px-4 sm:px-5 md:px-8 lg:px-0">
                <SitterMatchSection
                  topSits={topSits}
                  fallbackSits={fallbackSits}
                  scopeUsed={scopeUsed}
                  isLoading={nbaLoading}
                />
              </div>

              <div className="px-4 sm:px-5 md:px-8 lg:px-0">
                <SitterActivityPanel
                  isAvailable={isAvailable}
                  profileCompletion={profileCompletion}
                  nextGuard={nextGuard}
                  unreadCount={unreadCount}
                  pendingAppsCount={pendingAppsCount}
                  nearbyListings={nearbyListings}
                  completedSits={completedSits ?? 0}
                />
              </div>


              {ChecklistBlock}

              <div className="px-4 sm:px-5 md:px-8 lg:px-0">
                {DiscoverySections}
              </div>
              <div className="px-4 sm:px-5 md:px-8 lg:px-0">
                {ConseilsDiscoveryCard}
              </div>
            </div>

            {/* ═══ RAIL collant (droite) ═══ */}
            <aside className="mt-8 lg:mt-0 space-y-8 lg:col-span-4 lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
              <div className="px-4 sm:px-5 md:px-8 lg:px-0">
                <CommunityPulseBanner userId={user?.id} />
              </div>
              {!nextGuard && (
                <div className="px-4 sm:px-5 md:px-8 lg:px-0">
                  {!(level === 4 || level === "3B")
                    ? <AccessGateBanner level={level} profileCompletion={accessProfileCompletion} context="guard" />
                    : <FreePeriodBanner />}
                </div>
              )}
              <div className="px-4 sm:px-5 md:px-8 lg:px-0">
                <EmailDigestCard />
              </div>
              <div className="px-4 sm:px-5 md:px-8 lg:px-0 mb-6">
                {buildSecondaryAccordion()}
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
