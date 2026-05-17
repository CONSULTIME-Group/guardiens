import { useState, useEffect, useMemo, useCallback } from "react";
import FounderBadge from "@/components/badges/FounderBadge";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { useAuth } from "@/contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";


import OnboardingWelcome from "./OnboardingWelcome";
import NearbyEmergencySitters from "./NearbyEmergencySitters";
import DashboardSkeleton from "@/components/skeletons/DashboardSkeleton";
import { Plus, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { differenceInDays } from "date-fns";

import RoleActivationBanner from "./RoleActivationBanner";
import AccessGateBanner from "@/components/access/AccessGateBanner";
import { useAccessLevel } from "@/hooks/useAccessLevel";
import BadgeGridSection from "@/components/badges/BadgeGridSection";
import { useUserBadges } from "@/hooks/useProfileReputation";
import { PROPRIO_BADGE_IDS } from "@/components/badges/badge-definitions";

/* ── Extracted sub-components ── */
import MonAnnonceCard from "./owner/MonAnnonceCard";
import OngoingSitHero from "./owner/OngoingSitHero";
import ApplicationsSection from "./owner/ApplicationsSection";
import ContextualResources from "./owner/ContextualResources";
import MissionsTabsCard from "./owner/MissionsTabsCard";
import DashSection from "./owner/DashSection";
import EmptyCard from "./owner/EmptyCard";
import StatsStrip from "./owner/StatsStrip";
import PendingReviewsCard from "./owner/PendingReviewsCard";
import MobileStickyCTA from "./owner/MobileStickyCTA";
import TodoCard, { type TodoItem } from "./owner/TodoCard";
import NearbyHelpersCarousel from "./sitter/NearbyHelpersCarousel";
import {
  SPECIES_LABEL, PROPRIO_SPECIAL_IDS,
  capitalize, capitalizeWords,
} from "./owner/helpers";
import type { Pet } from "./owner/types";
import { useOwnerDashboardData } from "@/hooks/useOwnerDashboardData";

/* ═══════════════════════════════════════════════════════
   Main component
   ═══════════════════════════════════════════════════════ */

const OwnerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { level, profileCompletion: accessProfileCompletion } = useAccessLevel();
  

  /* ── Data fetching (extracted hook) ── */
  const { data, loading } = useOwnerDashboardData(user?.id);
  const {
    sits, pets, recentApps, reviews, highlights, smallMissions, myMissions,
    verificationStatus, sitterBadges, sitterProfiles, trustedSitterCount,
    propertyType, propertyEnvironment, propertyCoverPhoto, onboardingChecks,
    pendingReviews,
  } = data;

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
      return `Votre garde est en cours${daysLeft !== null ? ` — fin dans ${daysLeft} jour${daysLeft > 1 ? "s" : ""}` : ""}.`;
    }
    const nextConfirmed = sits.find(s => s.status === "confirmed" && s.start_date && new Date(s.start_date) > now);
    if (nextConfirmed) {
      const daysUntil = differenceInDays(new Date(nextConfirmed.start_date!), now);
      return `Votre prochaine garde commence dans ${daysUntil} jour${daysUntil > 1 ? "s" : ""}.`;
    }
    if (pendingAppCount > 0) return "Vous avez une nouvelle candidature à examiner.";
    return "Trouvez le gardien idéal pour vos animaux.";
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
  if (pendingAppCount > 0) {
    todoItems.push({
      key: "applications",
      label: `${pendingAppCount} candidature${pendingAppCount > 1 ? "s" : ""} à examiner`,
      hint: "Répondez sous 48 h pour garder vos chances",
      to: "/sits",
      tone: "primary",
    });
  }
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
    <div className="space-y-6 md:space-y-8 pb-40 md:pb-8">
{/* pb-40 mobile = BottomNav (h-16=64px) + Sticky CTA (~72px) + marge respiration. */}

      {/* Role activation banner */}
      <div className="px-5 md:px-8 pt-2">
        <RoleActivationBanner userRole={user?.role || "owner"} />
      </div>

      {/* ═══ Hero header (épuré) ═══ */}
      <header className="px-5 md:px-8 pt-2 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[2px] text-muted-foreground font-sans mb-1.5">
              Espace propriétaire
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground leading-tight">
                Bonjour{user?.firstName ? `, ${capitalize(user.firstName)}` : ""}{"\u202F"}!
              </h1>
              {user?.isFounder && <FounderBadge size="sm" />}
            </div>
            <p className="text-sm text-muted-foreground font-sans mt-1">{subtitle}</p>
            {user?.id && (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="mt-3 rounded-xl"
              >
                <Link
                  to={`/gardiens/${user.id}?tab=proprio`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Voir mon profil public (nouvel onglet)"
                >
                  <Eye className="w-4 h-4 mr-1.5" aria-hidden="true" /> Mon profil public
                </Link>
              </Button>
            )}
          </div>
          <Button
            size="lg"
            onClick={() => navigate("/sits/create")}
            className="hidden md:inline-flex shrink-0 rounded-xl"
          >
            <Plus className="h-4 w-4 mr-1.5" /> Publier une annonce
          </Button>
        </div>
      </header>

      <div className="px-5 md:px-8">
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

      {/* ═══ PILOTAGE (gauche) + CONTEXTE (droite) ═══ */}
      <div className="px-5 md:px-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
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

          {/* Mes animaux — remonté juste après l'annonce (logique : maison → animaux) */}
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

          {pendingReviews.length > 0 && (
            <PendingReviewsCard pendingReviews={pendingReviews} />
          )}

          {showApplicationsSection && (
            <ApplicationsSection
              recentApps={recentApps}
              sitterProfiles={sitterProfiles}
              sitterBadges={sitterBadges}
              loading={loading}
            />
          )}
        </div>

        {/* Colonne contexte : stats compactes + urgence + missions */}
        <aside className="space-y-6">
          <StatsStrip
            items={[
              {
                value: completedSits.length,
                label: "Gardes",
              },
              {
                value: avgRating > 0 ? `${avgRating} ★` : null,
                fallback: "—",
                label: "Note",
                highlight: avgRating > 0,
                to: user?.id ? `/gardiens/${user.id}?tab=proprio#avis` : undefined,
              },
              // « Annonces » masqué quand aucune n'est active : afficher « 0 »
              // alors que le hero peut montrer une garde passée crée une
              // contradiction visuelle démotivante (cf. fix Récurrents).
              ...(activeSits.length > 0
                ? [{
                    value: activeSits.length,
                    label: "Annonces",
                    to: "/sits",
                  }]
                : []),
              // « Récurrents » : masqué tant qu'aucun gardien n'a réalisé 2 gardes ou plus.
              ...(trustedSitterCount > 0
                ? [{
                    value: trustedSitterCount,
                    label: "Récurrents",
                    tooltip: "Nombre de gardiens ayant déjà réalisé au moins 2 gardes chez vous. Ce sont vos contacts privilégiés à recontacter en priorité.",
                  }]
                : []),
            ]}
          />
          <NearbyEmergencySitters />
          <NearbyHelpersCarousel />
          <MissionsTabsCard myMissions={myMissions} nearbyMissions={smallMissions} />
        </aside>
      </div>

      {/* ═══ Sections éditoriales (repliées par défaut) ═══ */}
      <div className="px-5 md:px-8 pt-2 space-y-3 border-t border-border/40">
        {highlights.length > 0 && (
          <details className="group rounded-2xl bg-card border border-border overflow-hidden">
            <summary className="cursor-pointer list-none px-4 md:px-5 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
              <div>
                <p className="text-[10px] uppercase tracking-[2px] text-muted-foreground font-sans font-semibold">
                  Social proof
                </p>
                <h2 className="font-heading text-base font-bold text-foreground leading-tight">
                  Ce que les gardiens disent de votre maison
                </h2>
              </div>
              <span className="text-xs text-muted-foreground group-open:rotate-180 transition-transform" aria-hidden="true">▾</span>
            </summary>
            <div className="px-4 md:px-5 pb-4 space-y-2">
              {highlights.slice(0, 3).map(h => (
                <div key={h.id} className="flex items-start gap-3 p-3 rounded-2xl bg-muted/30">
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
          </details>
        )}

        <details className="group rounded-2xl bg-card border border-border overflow-hidden">
          <summary className="cursor-pointer list-none px-4 md:px-5 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
            <div>
              <p className="text-[10px] uppercase tracking-[2px] text-muted-foreground font-sans font-semibold">
                Ressources
              </p>
              <h2 className="font-heading text-base font-bold text-foreground leading-tight">
                Conseils & guides pour propriétaires
              </h2>
            </div>
            <span className="text-xs text-muted-foreground group-open:rotate-180 transition-transform" aria-hidden="true">▾</span>
          </summary>
          <div className="px-4 md:px-5 pb-4">
            <ContextualResources annoncesCount={sits.length} gardesCount={completedSits.length} loading={loading} />
          </div>
        </details>

        <details className="group rounded-2xl bg-card border border-border overflow-hidden">
          <summary className="cursor-pointer list-none px-4 md:px-5 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
            <div>
              <p className="text-[10px] uppercase tracking-[2px] text-muted-foreground font-sans font-semibold">
                Reconnaissance
              </p>
              <h2 className="font-heading text-base font-bold text-foreground leading-tight">
                Vos badges
              </h2>
            </div>
            <span className="text-xs text-muted-foreground group-open:rotate-180 transition-transform" aria-hidden="true">▾</span>
          </summary>
          <div className="px-4 md:px-5 pb-4">
            <BadgeGridSection
              title=""
              badgeIds={PROPRIO_BADGE_IDS}
              userBadges={userBadges}
              specialBadgeIds={PROPRIO_SPECIAL_IDS}
            />
          </div>
        </details>
      </div>

      {/* ═══ CTA sticky mobile ═══ */}
      {/* Masqué sur empty state (0 annonce active) : le Hero porte déjà le CTA "Nouvelle annonce". */}
      {pendingAppCount > 0 ? (
        <MobileStickyCTA
          label="Voir les candidatures"
          to="/sits"
          badge={pendingAppCount}
        />
      ) : activeSits.length > 0 ? (
        <MobileStickyCTA label="Publier une annonce" to="/sits/create" />
      ) : null}
    </div>
  );
};

export default OwnerDashboard;

