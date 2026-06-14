import { useState, useEffect, useMemo, useCallback } from "react";
import FounderBadge from "@/components/badges/FounderBadge";
import { BadgeRow } from "@/components/badges/BadgeRow";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { useAuth } from "@/contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";


import OnboardingWelcome from "./OnboardingWelcome";
import NearbyOwnerSittersCard from "./owner/NearbyOwnerSittersCard";
import NearbyEmergencySitters from "./NearbyEmergencySitters";
import NearbyHelpersCarousel from "./shared/NearbyHelpersCarousel";
import DashboardSkeleton from "@/components/skeletons/DashboardSkeleton";
import { Plus, Eye, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { differenceInDays } from "date-fns";



import RoleActivationBanner from "./RoleActivationBanner";
import AccessGateBanner from "@/components/access/AccessGateBanner";
import { useAccessLevel } from "@/hooks/useAccessLevel";
import { useUserBadges } from "@/hooks/useProfileReputation";

/* ── Extracted sub-components ── */
import MonAnnonceCard from "./owner/MonAnnonceCard";
import OngoingSitHero from "./owner/OngoingSitHero";
import ApplicationsSection from "./owner/ApplicationsSection";
import ContextualResources from "./owner/ContextualResources";
import MissionsTabsCard from "./owner/MissionsTabsCard";
import DashSection from "./owner/DashSection";
import EmptyCard from "./owner/EmptyCard";
import StatsStrip from "./owner/StatsStrip";

import MobileStickyCTA from "./owner/MobileStickyCTA";
import LiveSignalStrip from "./shared/LiveSignalStrip";
import SectionEyebrow from "./shared/SectionEyebrow";
import TodoCard, { type TodoItem } from "./owner/TodoCard";
import PriorityActionCard from "./shared/PriorityActionCard";
import { useOwnerPriorityAction } from "@/hooks/useOwnerPriorityAction";
import ActivationScoreCard from "./owner/ActivationScoreCard";
import NextActionsList from "./owner/NextActionsList";
import {
  computeOwnerNextActions,
  computeOwnerActivationScore,
} from "@/lib/nextActions/owner";

import {
  SPECIES_LABEL,
  capitalize, capitalizeWords,
} from "./owner/helpers";
import type { Pet } from "./owner/types";
import { useOwnerDashboardData } from "@/hooks/useOwnerDashboardData";
import { useNearbyOwnerSitters } from "@/hooks/useNearbyOwnerSitters";
import { SITTER_PRICE_START, REFERRAL_REWARD_LABEL } from "@/lib/pricing";

/* ═══════════════════════════════════════════════════════
   Main component
   ═══════════════════════════════════════════════════════ */

const OwnerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { level, profileCompletion: accessProfileCompletion } = useAccessLevel();
  const [showAllMobile, setShowAllMobile] = useState(false);


  

  /* ── Data fetching (extracted hook) ── */
  const { data, loading } = useOwnerDashboardData(user?.id);
  const {
    sits, pets, recentApps, reviews, highlights, smallMissions, myMissions,
    verificationStatus, sitterBadges, sitterProfiles, trustedSitterCount,
    propertyType, propertyEnvironment, propertyCoverPhoto, onboardingChecks,
    pendingReviews,
  } = data;

  /* ── Signal local : nombre de gardiens proches (utilisé pour enrichir
       LiveSignalStrip avec une preuve sociale ancrée près de chez vous). ── */
  const { data: nearbyOwnerSittersData } = useNearbyOwnerSitters(user?.id);
  const localSignal = useMemo(() => {
    if (!nearbyOwnerSittersData) return null;
    const { sitters, radiusUsed } = nearbyOwnerSittersData;
    if (sitters.length === 0 || !radiusUsed) return null;
    return `${sitters.length} dans un rayon de ${radiusUsed} km`;
  }, [nearbyOwnerSittersData]);

  /* ── UI state ── */
  const [showOnboarding, setShowOnboarding] = useState(false);

  /* ── Badges (react-query) ── */
  const { data: userBadges } = useUserBadges(user?.id);

  /* ── Derived values (stable `now` per render cycle, not stale memo) ── */
  const now = new Date();
  const activeSits = useMemo(() => sits.filter(s => ["published", "confirmed"].includes(s.status)), [sits]);
  const completedSits = useMemo(() => sits.filter(s => s.status === "completed"), [sits]);
  const avgRating = useMemo(() => {
    if (reviews.length === 0) return 0;
    return Math.round((reviews.reduce((s, r) => s + r.overall_rating, 0) / reviews.length) * 10) / 10;
  }, [reviews]);
  const pendingAppCount = useMemo(() => recentApps.filter(a => a.status === "pending").length, [recentApps]);

  const ongoingSit = useMemo(() =>
    sits.find(s => s.status === "confirmed" && s.start_date && new Date(s.start_date) <= now && s.end_date && new Date(s.end_date) >= now),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sits]
  );

  /**
   * Affichage urgence : strictement conditionnel pour éviter de générer
   * de l'anxiété par défaut. On ne montre les gardiens d'urgence QUE si :
   *  - une garde confirmée commence dans moins de 7 jours, OU
   *  - une annonce publiée est ouverte SANS aucune candidature (le proprio
   *    risque de se retrouver sans solution).
   */
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

  /* ── Onboarding visibility (driven by hook data + user state) ── */
  useEffect(() => {
    if (loading || !user || !data.profile) return;
    const dismissed = localStorage.getItem("onboarding_owner_dismissed");
    if (!dismissed && user.profileCompletion < 60 && data.profile.onboarding_minimal_completed) {
      setShowOnboarding(true);
    } else {
      setShowOnboarding(false);
    }
  }, [loading, user, data.profile]);

  /* ── Dynamic text ── */
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
    // Annonce publiée stagnante : on rend le subtitle diagnostic plutôt que générique.
    const stalledPublished = sits.find(s =>
      s.status === "published" &&
      (s.applications || []).length === 0 &&
      s.created_at &&
      differenceInDays(now, new Date(s.created_at)) >= 3
    );
    if (stalledPublished) {
      return "Votre annonce n'a pas encore reçu de candidature, voici 3 leviers pour la relancer.";
    }
    const anyPublished = sits.some(s => s.status === "published");
    if (anyPublished) return "Votre annonce est en ligne, les candidatures arrivent.";
    return "Publiez votre première annonce pour trouver un gardien.";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ongoingSit, sits, pendingAppCount]);

  // Banner contextuel supprimé : verif & candidatures non lues affichées en chips inline dans le hero.

  // CTA bas de page supprimé : redondant avec le hero (action principale toujours
  // visible en haut) et avec MonAnnonceCard (qui guide déjà sur l'action contextuelle).

  const getNextSitForPet = useCallback((pet: Pet) => {
    const currentDate = new Date();
    return sits
      .filter(s => s.property_id === pet.property_id && ["published", "confirmed"].includes(s.status) && s.start_date && new Date(s.start_date) >= currentDate)
      .sort((a, b) => new Date(a.start_date!).getTime() - new Date(b.start_date!).getTime())[0];
  }, [sits]);

  // Action prioritaire unique , miroir SitterCockpit côté propriétaire.
  // Pioche LA chose la plus urgente parmi les données déjà chargées.
  // Doit rester avant tout early return (rules of hooks).
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
  });

  // Liste complète d'actions séquentielles + score d'activation 0/6,
  // calculée à partir des mêmes données déjà chargées (zéro fetch supplémentaire).
  const nextActionsInput = useMemo(
    () => ({
      sits,
      pets,
      pendingAppCount,
      pendingReviews: pendingReviews.map((r: any) => ({
        sitId: r.sitId,
        sitterId: r.sitterId,
        sitterName: r.sitterName,
      })),
      verificationStatus,
      profileCompletion: user?.profileCompletion ?? 0,
      hasPropertyType: !!propertyType,
    }),
    [sits, pets, pendingAppCount, pendingReviews, verificationStatus, user?.profileCompletion, propertyType]
  );
  const nextActions = useMemo(() => computeOwnerNextActions(nextActionsInput), [nextActionsInput]);
  const activationScore = useMemo(() => computeOwnerActivationScore(nextActionsInput), [nextActionsInput]);

  /* ── Render ── */


  if (loading) return <DashboardSkeleton />;

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

  // Si MonAnnonceCard affiche déjà l'encart candidatures, on évite le doublon
  // de la section ApplicationsSection (qui réapparaît dès qu'il y a des candidatures
  // déjà consultées à montrer dans l'accordéon).
  const hasReadApps = recentApps.some(a => a.status !== "pending");
  const showApplicationsSection = loading || hasReadApps;

  // Construit la liste unifiée "À faire" : actions urgentes regroupées en un seul bloc
  // au lieu d'être éparpillées (chips hero + cards séparées).
  const todoItems: TodoItem[] = [];
  if (verificationStatus !== "verified" && verificationStatus !== "pending") {
    todoItems.push({
      key: "identity",
      label: "Vérifier votre identité",
      hint: "Indispensable pour rassurer les gardiens",
      to: "/settings#verification",
      tone: "warning",
    });
  }
  // P2 — Décongestion : les candidatures sont déjà rendues dominantes dans
  // PriorityActionCard ET listées dans MonAnnonceCard, on ne les répète plus
  // ici (le précepte 2026 = 1 NBA card visible, pas 3 surfaces concurrentes).
  // Cf. mem://ux/dashboard-2026-precepts.
  if (pendingReviews.length > 0) {
    todoItems.push({
      key: "reviews",
      label: `${pendingReviews.length} avis à laisser`,
      hint: "Aidez la communauté à choisir en confiance",
      to: pendingReviews[0]
        ? `/review/${pendingReviews[0].sitId}?reviewee=${pendingReviews[0].sitterId}`
        : "/dashboard",
      tone: "info",
    });
  }




  return (
    <div className="space-y-6 md:space-y-8 pb-[calc(10rem+env(safe-area-inset-bottom))] md:pb-8">
{/* pb mobile = BottomNav (h-16=64px) + Sticky CTA (~72px) + safe-area iPhone notch. */}

      {/* ═══ Hero header (compact, eyebrow + titre + sous-titre contextuel) ═══ */}
      <header className="px-5 md:px-8 pt-2 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div className="min-w-0">
            <p className="hidden md:block text-xs uppercase tracking-[2px] text-muted-foreground font-sans mb-1.5">
              Espace propriétaire
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground leading-tight">
                Bonjour{user?.firstName ? `, ${capitalize(user.firstName)}` : ""}{"\u202F"}!
              </h1>
              {user?.isFounder && <FounderBadge size="sm" />}
            </div>
            <p className="text-sm text-muted-foreground font-sans mt-1">{subtitle}</p>
          </div>
          {/* Desktop : CTA inline + bouton profil public visible. Mobile : sticky CTA en bas. */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            {user?.id && (
              <Button
                variant="outline"
                size="lg"
                asChild
                className="rounded-xl"
              >
                <Link
                  to={`/gardiens/${user.id}?tab=proprio`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Voir mon profil public (nouvel onglet)"
                >
                  <Eye className="h-4 w-4 mr-1.5" /> Mon profil public
                </Link>
              </Button>
            )}
            <Button
              size="lg"
              onClick={() => navigate("/sits/create")}
              className="rounded-xl"
            >
              <Plus className="h-4 w-4 mr-1.5" /> Publier une annonce
            </Button>
          </div>
        </div>
      </header>

      {/* ═══ Action prioritaire unique , UN seul CTA dominant ═══
          Synthétise « la seule chose à faire maintenant » avant les listes
          détaillées (TodoCard) qui restent disponibles plus bas. */}
      <div className="px-5 md:px-8">
        <PriorityActionCard
          eyebrow={priorityAction.eyebrow}
          title={priorityAction.title}
          description={priorityAction.description}
          ctaLabel={priorityAction.ctaLabel}
          ctaTo={priorityAction.ctaTo}
          urgency={priorityAction.urgency}
        />
      </div>

      {/* ═══ Et ensuite : 2 actions suivantes + score d'activation ═══
          Évite l'effet « page blanche » : même si PriorityActionCard a sa
          cible, on suggère les prochaines étapes utiles. La carte
          d'activation s'auto-retire quand 6/6 est atteint. */}
      {(nextActions.length > 1 || !activationScore.allDone) && (
        <details className={`px-5 md:px-8 ${!showAllMobile ? "hidden md:block" : ""}`}>
          <summary className="cursor-pointer list-none text-sm text-muted-foreground hover:text-foreground py-1.5 flex items-center gap-1.5 select-none">
            Voir les étapes suivantes <span aria-hidden="true" className="ml-0.5">▾</span>
          </summary>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-3">
            <NextActionsList actions={nextActions} excludeId={priorityAction.variant} />
            <ActivationScoreCard score={activationScore} />
          </div>
        </details>
      )}






      {/* AccessGateBanner seul ici ; RoleActivationBanner + LiveSignalStrip déplacés dans le footer "Ressources". */}
      <div className={`px-5 md:px-8 ${!showAllMobile ? "hidden md:block" : ""}`}>
        <AccessGateBanner level={level} profileCompletion={accessProfileCompletion} context="guard" />
      </div>


      {/* ═══ Bloc unifié "À faire maintenant" ═══ */}
      {todoItems.length > 0 && (
        <div className="px-5 md:px-8">
          <TodoCard items={todoItems} />
        </div>
      )}

      {/* ═══ Garde en cours (prioritaire, contextuel) ═══ */}
      {ongoingSit && (
        <div className="px-5 md:px-8">
          <OngoingSitHero
            sit={ongoingSit}
            sitterProfiles={sitterProfiles}
            coverPhoto={propertyCoverPhoto}
          />
        </div>
      )}

      {/* ═══ Toggle mobile : « Voir mes stats et bonus » ═══
          P1 2026 mobile reveal : on AFFICHE par défaut le cœur opérationnel
          (annonce, animaux, candidatures, coups de main). Le toggle ne masque
          plus QUE l'aside contextuelle (stats, parrainage, gardiens d'urgence)
          + la preuve sociale + badges + ressources. Cf. mem://ux/dashboard-2026-precepts.
          Desktop : non rendu. */}
      {!showAllMobile && (
        <div className="px-5 md:hidden">
          <button
            type="button"
            onClick={() => setShowAllMobile(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-border bg-card text-sm font-semibold text-foreground hover:bg-muted/40 transition-colors"
            aria-expanded={false}
            aria-controls="owner-dash-extra"
          >
            Voir mes stats et bonus
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* ═══ PILOTAGE (gauche) + CONTEXTE (droite) ═══
          Mobile : la grille est TOUJOURS rendue (pilotage visible par défaut).
          L'aside reste masquée derrière le toggle via classe propre. */}
      <div id="owner-dash-extra" className="px-5 md:px-8 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Colonne pilotage : annonce, animaux, avis, candidatures */}
        <div className="lg:col-span-2 space-y-6">
          <MonAnnonceCard
            sits={sits}
            pets={pets}
            propertyType={propertyType}
            propertyEnvironment={propertyEnvironment}
            pendingAppCount={pendingAppCount}
            coverPhoto={propertyCoverPhoto}
          />

          {/* Mes animaux, remonté juste après l'annonce (logique : maison → animaux) */}
          <DashSection
            eyebrow="Famille"
            title="Mes animaux"
            description="Vos compagnons tels qu'ils apparaissent aux gardiens."
            action={
              <Link to="/owner-profile" className="text-xs text-primary hover:underline font-medium">Gérer</Link>
            }
          >
            {pets.length === 0 ? (
              <EmptyCard text="Aucun animal enregistré" hint="Ajoutez vos compagnons pour attirer les bons gardiens" cta="Ajouter un animal" to="/owner-profile" />
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  {pets.map(pet => {
                    const nextSit = getNextSitForPet(pet);
                    return (
                      <div key={pet.id} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shrink-0 overflow-hidden">
                          {pet.photo_url ? (
                            <img src={pet.photo_url} alt={pet.name} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            pet.name ? pet.name[0].toUpperCase() : "?"
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{capitalize(pet.name)}</p>
                          <p className="text-xs text-muted-foreground font-sans">
                            {SPECIES_LABEL[pet.species] || capitalize(pet.species)}
                            {pet.breed ? ` · ${capitalizeWords(pet.breed)}` : ""}
                            {pet.age ? ` · ${pet.age} an${pet.age > 1 ? "s" : ""}` : ""}
                          </p>
                          {nextSit && nextSit.status === "confirmed" ? (
                            <span className="text-xs font-sans bg-primary/10 text-primary rounded-xl px-2 py-0.5 mt-1 inline-block">
                              Garde confirmée
                            </span>
                          ) : nextSit ? (
                            <span className="text-xs font-sans bg-accent text-accent-foreground rounded-xl px-2 py-0.5 mt-1 inline-block">
                              Annonce en cours
                            </span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <Link to="/owner-profile" className="text-sm text-primary font-sans hover:underline">
                  Ajouter un animal
                </Link>
              </>
            )}
          </DashSection>

          {/* Avis en attente : remontés dans TodoCard pour éviter le doublon
              de surface. Un seul point d'entrée « action en attente ». */}

          {showApplicationsSection && (
            <ApplicationsSection
              recentApps={recentApps}
              sitterProfiles={sitterProfiles}
              sitterBadges={sitterBadges}
              loading={loading}
            />
          )}

          {/* ═══ DÉCOUVERTE, Coup de main dans la colonne principale ═══
              Les gardiens « près de chez vous » sont remontés dans l'aside à droite. */}
          <div className="space-y-6 min-w-0">

            {/* 2. Coup de main, ton apaisé : border discrète, plus de teinte de fond agressive */}
            <section
              aria-labelledby="owner-discovery-missions-heading"
              className="relative rounded-2xl border border-border bg-card p-3 sm:p-5 min-w-0 overflow-hidden"
            >
              <span aria-hidden className="absolute left-0 top-4 bottom-4 w-0.5 rounded-r-full bg-warning/60" />
              <div className="pl-2 sm:pl-3 min-w-0">
                <SectionEyebrow
                  eyebrow="Entraide locale"
                  title="Coup de main près de chez vous"
                  accent="warning"
                  id="owner-discovery-missions-heading"
                />
                <div className="space-y-4 min-w-0">
                  <div className="xl:hidden">
                    <NearbyHelpersCarousel hideHeader />
                  </div>
                  <MissionsTabsCard myMissions={myMissions} nearbyMissions={smallMissions} />
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Colonne contexte : stats compactes + parrainage uniquement.
            Mobile : masquée par défaut (hidden) → révélée par le toggle
            « Voir mes stats et bonus » via showAllMobile. Aligne sur précepte
            2026 « aside contextuelle, pas opérationnelle ».
            Desktop : toujours visible en colonne lg:col-span-1. */}
        <aside className={`space-y-6 ${!showAllMobile ? "hidden lg:block" : ""}`}>
          {/* Preuve sociale rapide : stats en haut de colonne pour une lecture immédiate */}
          <StatsStrip
            items={[
              {
                value: completedSits.length,
                label: "Gardes",
              },
              {
                value: avgRating > 0 ? `${avgRating} ★` : null,
                fallback: ",",
                label: "Note",
                highlight: avgRating > 0,
                to: user?.id ? `/gardiens/${user.id}?tab=proprio#avis` : undefined,
              },
              ...(activeSits.length > 0
                ? [{
                    value: activeSits.length,
                    label: "Annonces",
                    to: "/sits",
                  }]
                : []),
              ...(trustedSitterCount > 0
                ? [{
                    value: trustedSitterCount,
                    label: "Récurrents",
                    tooltip: "Nombre de gardiens ayant déjà réalisé au moins 2 gardes chez vous. Ce sont vos contacts privilégiés à recontacter en priorité.",
                  }]
                : []),
            ]}
          />
          {showEmergencyHelp && <NearbyEmergencySitters />}
          <NearbyOwnerSittersCard />

          {/* Parrainage, levier d'acquisition gratuit */}
          <Link
            to="/mon-abonnement#parrainage"
            className="block rounded-2xl border border-border bg-gradient-to-br from-accent/10 to-background p-4 hover:border-primary/40 transition-colors group"
          >
            <p className="text-[10px] uppercase tracking-[2px] text-accent font-sans font-semibold mb-1">
              Parrainage
            </p>
            <p className="text-sm font-heading font-semibold text-foreground leading-snug">
              Invitez un proche
            </p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Son inscription reste gratuite jusqu'au {SITTER_PRICE_START}.
              Vous gagnez {REFERRAL_REWARD_LABEL.toLowerCase()} dès qu'il publie sa première annonce ou candidature.
            </p>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary mt-2 group-hover:translate-x-0.5 transition-transform">
              Partager mon lien →
            </span>
          </Link>
        </aside>
      </div>

      {/* ═══ Preuve sociale, Highlights remontés et déployés par défaut ═══ */}
      {highlights.length > 0 && (
        <section
          className={`px-5 md:px-8 pt-2 border-t border-border/40 ${!showAllMobile ? "hidden md:block" : ""}`}
          aria-label="Ce que les gardiens disent de votre maison"
        >

          <div className="mb-3">
            <p className="text-[10px] uppercase tracking-[2px] text-muted-foreground font-sans font-semibold">
              Preuve sociale
            </p>
            <h2 className="font-heading text-base md:text-lg font-bold text-foreground leading-tight">
              Ce que les gardiens disent de votre maison
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {highlights.slice(0, 3).map(h => (
              <div key={h.id} className="flex items-start gap-3 p-3 rounded-2xl bg-card border border-border">
                {h.sitter?.avatar_url ? (
                  <img src={h.sitter.avatar_url} alt={`Photo de ${h.sitter.first_name || 'gardien'}`} loading="lazy" className="w-10 h-10 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold shrink-0">
                    {h.sitter?.first_name?.charAt(0) || "?"}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium">{capitalize(h.sitter?.first_name)}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{h.text}</p>
                </div>
                {h.photo_url && <img src={h.photo_url} alt="Photo de garde" loading="lazy" className="w-16 h-12 rounded-xl object-cover shrink-0" />}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ═══ Footer dashboard, badges inline + ressources ═══ */}
      <div className={`px-5 md:px-8 pt-2 border-t border-border/40 space-y-3 ${!showAllMobile ? "hidden md:block" : ""}`}>

        {user?.id && userBadges && userBadges.length > 0 && (
          <div className="rounded-2xl bg-card border border-border px-4 py-3">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <p className="text-[10px] uppercase tracking-[2px] text-muted-foreground font-sans font-semibold">
                  Reconnaissance
                </p>
                <p className="text-sm font-semibold text-foreground">
                  {userBadges.length} badge{userBadges.length > 1 ? "s" : ""} débloqué{userBadges.length > 1 ? "s" : ""}
                </p>
              </div>
              <Link
                to={`/gardiens/${user.id}#confiance`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary font-semibold hover:underline shrink-0"
                aria-label="Voir tous les badges sur mon profil public (nouvel onglet)"
              >
                Voir tout →
              </Link>
            </div>
            <BadgeRow badges={userBadges} size="compact" maxVisible={8} />
          </div>
        )}

        <details className="group rounded-2xl bg-card border border-border overflow-hidden">
          <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
            <div>
              <p className="text-[10px] uppercase tracking-[2px] text-muted-foreground font-sans font-semibold">
                Ressources
              </p>
              <p className="text-sm font-semibold text-foreground">
                Conseils & guides pour propriétaires
              </p>
            </div>
            <span className="text-xs text-muted-foreground group-open:rotate-180 transition-transform" aria-hidden="true">▾</span>
          </summary>
          <div className="px-4 pb-4 space-y-3">
            <RoleActivationBanner userRole={user?.role || "owner"} />
            {(level === 4 || level === "3B") && <LiveSignalStrip secondarySignal={localSignal} />}
            <ContextualResources annoncesCount={sits.length} gardesCount={completedSits.length} loading={loading} />
          </div>
        </details>
      </div>

      {/* Toggle « Réduire » mobile : visible uniquement quand l'espace est déployé */}
      {showAllMobile && (
        <div className="px-5 md:hidden">
          <button
            type="button"
            onClick={() => {
              setShowAllMobile(false);
              if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-border bg-card text-sm font-semibold text-muted-foreground hover:bg-muted/40 transition-colors"
            aria-expanded={true}
            aria-controls="owner-dash-extra"
          >
            Réduire l'espace
            <ChevronUp className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* ═══ CTA sticky mobile ═══ */}

      {/* Empty state mobile : le hero CTA est hidden md:inline-flex → on relaie ici. */}
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

