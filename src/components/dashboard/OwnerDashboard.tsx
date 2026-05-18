import { useState, useEffect, useMemo, useCallback } from "react";
import FounderBadge from "@/components/badges/FounderBadge";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { useAuth } from "@/contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";


import OnboardingWelcome from "./OnboardingWelcome";
import NearbyOwnerSittersCard from "./owner/NearbyOwnerSittersCard";
import NearbyEmergencySitters from "./NearbyEmergencySitters";
import DashboardSkeleton from "@/components/skeletons/DashboardSkeleton";
import { Plus, Eye } from "lucide-react";
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
import TodoCard, { type TodoItem } from "./owner/TodoCard";

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
            <p className="text-xs text-primary/80 font-sans mt-1">
              Votre espace propriétaire reste gratuit.
            </p>
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
          {/* Desktop : CTA inline dans le hero. Mobile : porté par MobileStickyCTA. */}
          <Button
            size="lg"
            onClick={() => navigate("/sits/create")}
            className="hidden md:inline-flex shrink-0 rounded-xl"
          >
            <Plus className="h-4 w-4 mr-1.5" /> Publier une annonce
          </Button>
        </div>
      </header>

      <div className="px-5 md:px-8 space-y-3">
        <AccessGateBanner level={level} profileCompletion={accessProfileCompletion} context="guard" />
        <LiveSignalStrip secondarySignal={localSignal} />
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
          {/* Zone PRIMARY — Gardiens disponibles près de chez vous */}
          {showEmergencyHelp && <NearbyEmergencySitters />}
          <NearbyOwnerSittersCard />

          {/* Zone WARNING — Petites missions (entraide) */}
          <MissionsTabsCard myMissions={myMissions} nearbyMissions={smallMissions} />

          {/* Parrainage — levier d'acquisition gratuit, rendu visible
              directement depuis le dashboard (au lieu d'être enterré dans
              /mon-abonnement). Tonalité informative, pas commerciale. */}
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

      {/* ═══ Preuve sociale — Highlights remontés et déployés par défaut ═══ */}
      {highlights.length > 0 && (
        <section
          className="px-5 md:px-8 pt-2 border-t border-border/40"
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

      {/* ═══ Footer dashboard — accès secondaires compacts ═══ */}
      <div className="px-5 md:px-8 pt-2 border-t border-border/40">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {user?.id && (
            <Link
              to={`/gardiens/${user.id}?tab=proprio#badges`}
              className="flex items-center justify-between gap-3 rounded-2xl bg-card border border-border px-4 py-3 hover:bg-muted/30 transition-colors group"
            >
              <div>
                <p className="text-[10px] uppercase tracking-[2px] text-muted-foreground font-sans font-semibold">
                  Reconnaissance
                </p>
                <p className="text-sm font-semibold text-foreground">
                  {userBadges?.length ?? 0} badge{(userBadges?.length ?? 0) > 1 ? "s" : ""} débloqué{(userBadges?.length ?? 0) > 1 ? "s" : ""}
                </p>
              </div>
              <span className="text-xs text-primary font-semibold group-hover:translate-x-0.5 transition-transform" aria-hidden="true">
                Voir →
              </span>
            </Link>
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
            <div className="px-4 pb-4">
              <ContextualResources annoncesCount={sits.length} gardesCount={completedSits.length} loading={loading} />
            </div>
          </details>
        </div>
      </div>

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

