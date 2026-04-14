import { useState, useEffect } from "react";
import FounderBadge from "@/components/badges/FounderBadge";
import { useAuth } from "@/contexts/AuthContext";
import { useSearchParams } from "react-router-dom";
import OnboardingModal from "@/components/onboarding/OnboardingModal";
import MinimalOnboardingDialog from "@/components/onboarding/MinimalOnboardingDialog";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { Link, useNavigate } from "react-router-dom";
import EmergencyDashSection from "./EmergencyDashSection";
import { differenceInMonths } from "date-fns";
import { BadgeSceau } from "@/components/badges/BadgeSceau";
import { StatutGardienBadge } from "@/components/profile/StatutGardienBadge";
import { GARDIEN_BADGE_IDS, SPECIAL_BADGE_IDS } from "@/components/badges/badge-definitions";
import { Separator } from "@/components/ui/separator";
import { useSitterDashboardData } from "@/hooks/useSitterDashboardData";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Home, Search, CheckCircle, Circle, ChevronRight,
  Newspaper, Info, AlertCircle,
} from "lucide-react";
import { format, differenceInHours } from "date-fns";
import { fr } from "date-fns/locale";
import RoleActivationBanner from "./RoleActivationBanner";
import AccessGateBanner from "@/components/access/AccessGateBanner";
import { useAccessLevel } from "@/hooks/useAccessLevel";
import EmergencyEligibility from "./EmergencyEligibility";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const capitalize = (name: string) =>
  name ? name.charAt(0).toUpperCase() + name.slice(1).toLowerCase() : "";

const ChecklistItem = ({ label, ctaLabel, onClick }: { label: string; ctaLabel: string; onClick: () => void }) => (
  <div className="flex items-center gap-3">
    <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
    <p className="text-sm text-foreground flex-1">{label}</p>
    <Button variant="outline" size="sm" onClick={onClick}>{ctaLabel}</Button>
  </div>
);

const SitterDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { level, profileCompletion: accessProfileCompletion } = useAccessLevel();
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasAccess: hasSubscription } = useSubscriptionAccess();

  // ── Single data hook replaces 22 useState ──
  const {
    loading, profileCompletion, identityVerified, identityStatus,
    completedSits, avgRating, badgeCount, totalApps, cancellations,
    pendingAppsCount, unreadCount, isAvailable, isFounder,
    postalCode, avatarUrl, bio, hasAnimalExperience,
    hasEmergencyProfile, hasAcceptedRecent, nextGuard,
    nearbyListings, articles, badges,
    onboardingCompleted, onboardingDismissed, minimalCompleted,
    setPartial, toggleAvailability,
    reputation, groupedBadges,
  } = useSitterDashboardData(user?.id);

  const activeBadgeCount = groupedBadges.filter(b =>
    GARDIEN_BADGE_IDS.includes(b.badge_id) &&
    differenceInMonths(new Date(), new Date(b.created_at)) < 12
  ).length;

  const specialBadges = groupedBadges.filter(b =>
    SPECIAL_BADGE_IDS.includes(b.badge_id)
  );

  // ── Onboarding modals ──
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [showMinimal, setShowMinimal] = useState(false);
  const [cpBannerDismissed, setCpBannerDismissed] = useState(
    () => sessionStorage.getItem("cp_banner_dismissed") === "1"
  );

  useEffect(() => {
    if (loading || !user) return;
    if (searchParams.get("tour") === "true") {
      setShowOnboardingModal(true);
      return;
    }
    if (!onboardingCompleted && !onboardingDismissed) {
      setShowOnboardingModal(true);
    } else if (!minimalCompleted) {
      setShowMinimal(true);
    }
  }, [loading, user, searchParams, onboardingCompleted, onboardingDismissed, minimalCompleted]);

  if (loading) return (
    <div className="p-8 flex items-center justify-center">
      <div className="animate-pulse space-y-4 w-full max-w-lg">
        <div className="h-8 bg-muted rounded-lg w-2/3" />
        <div className="grid grid-cols-3 gap-3">
          <div className="h-24 bg-muted rounded-xl" />
          <div className="h-24 bg-muted rounded-xl" />
          <div className="h-24 bg-muted rounded-xl" />
        </div>
        <div className="h-32 bg-muted rounded-xl" />
      </div>
    </div>
  );

  // Dynamic subtitle
  const subtitle = nextGuard
    ? `Votre prochaine garde est dans ${nextGuard.daysUntil} jour${nextGuard.daysUntil > 1 ? "s" : ""}.`
    : hasAcceptedRecent
    ? "Félicitations — votre candidature a été acceptée."
    : "Explorez les annonces près de chez vous.";

  // Emergency conditions
  const emergencyConditions = [
    { label: `5 gardes réalisées (${completedSits}/5)`, ok: completedSits >= 5 },
    { label: "Note ≥ 4.7", ok: avgRating >= 4.7 },
    { label: "Aucune annulation", ok: cancellations === 0 },
    { label: "Identité vérifiée", ok: identityVerified },
    { label: "Abonnement actif", ok: !!hasSubscription },
  ];

  // ── Unified checklist (single source of truth) ──
  const onboardingChecks = {
    profileComplete: profileCompletion >= 100,
    identityVerified: identityStatus === "verified" || identityVerified,
    availableMode: isAvailable,
  };

  const checklistItems = [
    { done: onboardingChecks.profileComplete, label: `Compléter mon profil (${profileCompletion}%)`, to: "/profile" },
    { done: onboardingChecks.identityVerified, label: "Vérifier mon identité", to: "/profile#identite" },
    { done: false, label: "Découvrez les gardes disponibles", to: "/search" },
  ];
  const allItems = [
    ...checklistItems,
    { done: onboardingChecks.availableMode, label: "Activer le mode disponible", to: "", isToggle: true },
  ];
  const completedItems = allItems.filter(c => c.done);
  const incompleteItems = allItems.filter(c => !c.done);
  const allChecklistDone = completedItems.length === 4;

  return (
    <div className="space-y-0 overflow-hidden">
      <OnboardingModal
        open={showOnboardingModal}
        onClose={() => {
          setShowOnboardingModal(false);
          setSearchParams({});
          if (!minimalCompleted) {
            setShowMinimal(true);
          }
        }}
      />
      <MinimalOnboardingDialog
        open={showMinimal}
        onComplete={() => {
          setShowMinimal(false);
          setPartial({ minimalCompleted: true });
        }}
      />

      {/* Postal code missing banner — highest priority */}
      {!postalCode && !cpBannerDismissed && (
        <div className="sticky top-0 z-40 bg-destructive/10 border-b border-destructive/30 px-4 py-3">
          <div className="container mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
              <p className="text-sm text-foreground">
                <strong>Votre code postal est manquant.</strong> Sans lui, vous ne voyez pas les annonces près de chez vous et n'apparaissez pas dans les recherches des propriétaires.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="default"
                size="sm"
                onClick={() => navigate("/profile?focus=postal_code")}
              >
                Ajouter mon CP
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => { setCpBannerDismissed(true); sessionStorage.setItem("cp_banner_dismissed", "1"); }}
              >
                ✕
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Role activation banner */}
      <div className="px-4 sm:px-5 md:px-8 mb-4">
        <RoleActivationBanner userRole={user?.role || "sitter"} />
      </div>

      {/* ═══ HERO HEADER ═══ */}
      <div className="relative overflow-hidden bg-sitter-hero rounded-b-3xl px-4 sm:px-5 md:px-10 pt-5 sm:pt-6 md:pt-8 pb-4 sm:pb-5 md:pb-6 mb-6 md:mb-8">
        <div className="absolute right-0 top-0 opacity-[0.07] pointer-events-none">
          <svg width="300" height="200" viewBox="0 0 300 200">
            <circle cx="250" cy="50" r="120" fill="white"/>
            <circle cx="200" cy="150" r="80" fill="white"/>
          </svg>
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[3px] text-white/60 font-sans mb-1">
              Espace gardien
            </p>
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl md:text-4xl font-heading font-bold text-white leading-tight mb-1">
                Bonjour{user?.firstName ? `, ${capitalize(user.firstName)}` : ""} !
              </h1>
              {user?.isFounder && <FounderBadge size="sm" />}
            </div>
            <p className="text-sm text-white/75 font-sans">
              {subtitle}
            </p>
          </div>

          <div className="flex flex-col items-start md:items-end gap-3 shrink-0">
            <a
              href={`/gardiens/${user?.id}`}
              className="text-xs text-white/70 font-sans flex items-center gap-1 hover:text-white/90"
            >
              Voir votre profil public ↗
            </a>

            <div className="flex items-center gap-3 bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 w-full md:w-auto">
              <div className="flex-1 md:flex-none">
                <p className="text-sm text-white font-sans font-medium leading-none mb-0.5">
                  Je suis disponible
                </p>
                <p className="text-xs text-white/60 font-sans">
                  {isAvailable ? "Visible dans les résultats" : "Activez pour apparaître"}
                </p>
              </div>
              <button
                onClick={toggleAvailability}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${isAvailable ? "bg-toggle-active" : "bg-white/20"}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200 ${isAvailable ? "left-5" : "left-0.5"}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-5 md:px-8 mt-4">
        <AccessGateBanner level={level} profileCompletion={accessProfileCompletion} context="guard" />
      </div>

      {/* Profile completion checklist — shown when postal code exists but profile < 60% */}
      {postalCode && profileCompletion < 60 && (
        <div className="px-4 sm:px-5 md:px-8 mt-4">
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg">Complétez votre profil pour devenir visible</CardTitle>
              <CardDescription>
                Profil à {profileCompletion}%. Les propriétaires consultent uniquement les profils complets.
              </CardDescription>
              <Progress value={profileCompletion} className="mt-3" />
            </CardHeader>
            <CardContent className="space-y-3">
              {!avatarUrl && (
                <ChecklistItem
                  label="Ajouter une photo de profil"
                  ctaLabel="Ajouter"
                  onClick={() => navigate("/profile?section=identite")}
                />
              )}
              {(!bio || bio.length < 50) && (
                <ChecklistItem
                  label="Écrire votre bio (motivation, expérience)"
                  ctaLabel="Rédiger"
                  onClick={() => navigate("/profile?section=profil")}
                />
              )}
              {!hasAnimalExperience && (
                <ChecklistItem
                  label="Indiquer au moins une expérience avec un animal"
                  ctaLabel="Ajouter"
                  onClick={() => navigate("/profile?section=experience")}
                />
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <div className="px-4 sm:px-5 md:px-8 -mt-4 mb-2">
        <button
          onClick={() => setSearchParams({ tour: "true" })}
          className="text-xs text-muted-foreground underline-offset-4 hover:underline"
        >
          Revoir la présentation
        </button>
      </div>

      {/* ═══ 2. BARRE DE STATUT UNIFIÉE ═══ */}
      <div className="mx-4 sm:mx-5 md:mx-8 mb-6 md:mb-8 bg-card border border-border rounded-2xl overflow-hidden grid grid-cols-1 md:grid-cols-3">
        {/* Zone 1 — MON PROFIL */}
        <div className="p-4 md:p-5 border-b md:border-b-0 md:border-r border-border">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-sans mb-3">
            Mon profil
          </p>
          <div className="h-1.5 bg-muted rounded-full mb-2">
            <div
              className="h-1.5 bg-primary rounded-full transition-all duration-500"
              style={{ width: `${profileCompletion}%` }}
            />
          </div>
          <p className="text-lg font-heading font-bold text-foreground mb-1">
            {profileCompletion}% complété
          </p>
          {profileCompletion >= 60 && (
            <span className="text-xs font-sans bg-primary/10 text-primary rounded-md px-2 py-0.5 inline-block mb-3">
              Visible par les proprios
            </span>
          )}
          {profileCompletion < 100 && (
            <Link to="/profile" className="text-xs text-primary font-sans block">
              Compléter →
            </Link>
          )}
        </div>

        {/* Zone 2 — MES STATS */}
        <div className="p-4 md:p-5 border-b md:border-b-0 md:border-r border-border">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-sans mb-3">
            Mes stats
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center">
              <p className="text-2xl font-heading font-bold text-foreground">{completedSits}</p>
              <p className="text-xs text-muted-foreground font-sans">Gardes</p>
            </div>
            <div className="text-center">
              {avgRating > 0 ? (
                <p className="text-2xl font-heading font-bold text-foreground">{avgRating}</p>
              ) : (
                <p className="text-sm text-muted-foreground font-sans mt-1">–</p>
              )}
              <p className="text-xs text-muted-foreground font-sans">Note</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-heading font-bold text-foreground">{badgeCount}</p>
              <p className="text-xs text-muted-foreground font-sans">Badges</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-heading font-bold text-foreground">{totalApps}</p>
              <p className="text-xs text-muted-foreground font-sans">Candidatures</p>
            </div>
          </div>
          {completedSits === 0 && (
            <p className="text-xs text-muted-foreground font-sans italic mt-3 leading-snug">
              Vos statistiques apparaîtront après votre première garde.
            </p>
          )}
        </div>

        {/* Zone 3 — STATUT D'URGENCE */}
        <div className="p-4 md:p-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-sans mb-3">
            Mon Statut
          </p>

          <div className="mb-4">
            {reputation && reputation.statut_gardien !== "novice" ? (
              <StatutGardienBadge statut={reputation.statut_gardien as "novice" | "confirme" | "super_gardien"} />
            ) : (
              <span className="text-xs text-muted-foreground font-sans">Novice</span>
            )}
          </div>

          <p className="text-xs font-medium text-foreground mb-2">
            Progression Super Gardien
          </p>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full shrink-0 ${(reputation?.completed_sits ?? 0) >= 3 ? "bg-primary" : "bg-muted-foreground/30"}`} />
              <span className={`text-xs font-sans ${(reputation?.completed_sits ?? 0) >= 3 ? "line-through text-muted-foreground" : "text-foreground/70"}`}>
                3 gardes réalisées ({reputation?.completed_sits ?? 0}/3)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full shrink-0 ${(reputation?.active_badges ?? 0) >= 5 ? "bg-primary" : "bg-muted-foreground/30"}`} />
              <span className={`text-xs font-sans ${(reputation?.active_badges ?? 0) >= 5 ? "line-through text-muted-foreground" : "text-foreground/70"}`}>
                5 badges actifs différents ({reputation?.active_badges ?? 0}/5)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full shrink-0 ${(reputation?.note_moyenne ?? 0) >= 4.8 ? "bg-primary" : "bg-muted-foreground/30"}`} />
              <span className={`text-xs font-sans ${(reputation?.note_moyenne ?? 0) >= 4.8 ? "line-through text-muted-foreground" : "text-foreground/70"}`}>
                Note ≥ 4.8 ({reputation?.note_moyenne ? Number(reputation.note_moyenne).toFixed(1) : "—"}/4.8)
              </span>
            </div>
          </div>

          <Separator className="my-3" />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-foreground">Gardien d'Urgence</p>
              <p className="text-xs text-muted-foreground">Statut distinct — 5 conditions</p>
            </div>
            <Link to="/gardien-urgence" className="text-xs text-primary font-sans">
              En savoir plus →
            </Link>
          </div>
        </div>
      </div>

      {/* Emergency active section */}
      {hasEmergencyProfile && <div className="px-4 sm:px-5 md:px-8"><EmergencyDashSection /></div>}

      {/* ═══ 3. CTA + TIMBRES ═══ */}
      <div className="px-4 sm:px-5 md:px-8 mb-6 md:mb-8">
        <button
          onClick={() => navigate("/search")}
          className="w-full bg-primary text-primary-foreground rounded-2xl py-3 sm:py-4 text-sm sm:text-base font-sans font-semibold mb-6 hover:bg-primary/90 transition-colors"
        >
          Découvrez les gardes disponibles →
        </button>

        {/* ═══ MES BADGES ═══ */}
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">Mes Badges</h2>
          <span className="text-xs text-muted-foreground">
            {activeBadgeCount} actif{activeBadgeCount > 1 ? "s" : ""} sur 12
          </span>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-4">
          {GARDIEN_BADGE_IDS.map(id => {
            const userBadge = groupedBadges?.find(b => b.badge_id === id);
            const count = userBadge?.count ?? 0;
            const isActive = count > 0 && userBadge
              ? differenceInMonths(new Date(), new Date(userBadge.created_at)) < 12
              : false;
            return (
              <BadgeSceau
                key={id}
                id={id}
                count={count}
                active={isActive}
                size="compact"
                showCount={false}
                obtainedAt={userBadge?.created_at}
              />
            );
          })}
        </div>

        {specialBadges.length > 0 && (
          <div className="mt-3">
            <p className="text-xs text-muted-foreground font-sans mb-2">
              Badges spéciaux
            </p>
            <div className="flex flex-wrap gap-2">
              {specialBadges.map(b => (
                <BadgeSceau
                  key={b.badge_id}
                  id={b.badge_id}
                  count={b.count}
                  active
                  size="compact"
                  obtainedAt={b.created_at}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ═══ 4. CHECKLIST (unique, unified) ═══ */}
      <div className="px-4 sm:px-5 md:px-8 mb-6 md:mb-8">
        {incompleteItems.length > 0 && (
          <div className="mb-4">
            <p className="text-sm font-medium text-foreground mb-3">
              À compléter ({incompleteItems.length} restante{incompleteItems.length > 1 ? "s" : ""})
            </p>
            <div>
              {incompleteItems.map((item: any, i: number) => (
                item.isToggle ? (
                  <div key="toggle" className="flex items-center justify-between py-3 border-b border-border last:border-0 px-2">
                    <div className="flex items-center">
                      <Circle className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-foreground ml-3">Activer le mode disponible</span>
                    </div>
                    <button
                      onClick={toggleAvailability}
                      className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${isAvailable ? "bg-toggle-active" : "bg-muted"}`}
                    >
                      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200 ${isAvailable ? "left-5" : "left-0.5"}`} />
                    </button>
                  </div>
                ) : (
                  <Link
                    key={i}
                    to={item.to}
                    className="flex items-center justify-between py-3 border-b border-border last:border-0 cursor-pointer hover:bg-muted/30 rounded-lg px-2 transition-colors"
                  >
                    <div className="flex items-center">
                      <Circle className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-foreground ml-3">{item.label}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                )
              ))}
            </div>
          </div>
        )}

        {completedItems.length > 0 && (
          <Accordion type="single" collapsible>
            <AccordionItem value="done" className="border-none">
              <AccordionTrigger className="flex items-center justify-between bg-muted/30 rounded-xl px-4 py-3 cursor-pointer hover:no-underline [&[data-state=open]>svg]:rotate-180">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-primary">
                    {allChecklistDone
                      ? "4/4 étapes complétées"
                      : `${completedItems.length} étape${completedItems.length > 1 ? "s" : ""} déjà complétée${completedItems.length > 1 ? "s" : ""}`
                    }
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-0">
                {completedItems.map((item: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    <span className="text-sm line-through text-muted-foreground">{item.label}</span>
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
      </div>

      {/* ═══ 5. BAS DE PAGE — DEUX COLONNES ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-4 sm:px-5 md:px-8 mb-6 md:mb-8">
        {/* Colonne gauche — Annonces */}
        <div className="bg-card border border-border rounded-2xl p-4 sm:p-5">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm font-semibold text-foreground">
              Annonces près de chez vous
            </p>
            <Link to="/search" className="text-xs text-primary font-sans">
              Voir tout →
            </Link>
          </div>
          {nearbyListings.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground font-sans italic mb-3">
                Pas encore d'annonce dans votre zone.
              </p>
              <p className="text-xs text-muted-foreground font-sans">
                Activez le mode disponible pour être contacté directement par les propriétaires.
              </p>
            </div>
          ) : (
            nearbyListings.slice(0, 3).map((sit: any) => {
              const isNew = differenceInHours(new Date(), new Date(sit.created_at)) < 48;
              return (
                <Link
                  key={sit.id}
                  to={`/sits/${sit.id}`}
                  className="flex items-start gap-3 py-2.5 border-b border-border last:border-0"
                >
                  <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                  <div className="flex-1">
                    <p className="text-xs text-foreground/80 font-sans leading-snug">
                      {sit.title}
                      {isNew && (
                        <span className="ml-2 text-xs bg-primary text-primary-foreground rounded px-1.5 py-0.5">
                          Nouveau
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground font-sans mt-0.5">
                      {sit.start_date && sit.end_date
                        ? `${format(new Date(sit.start_date), "d MMM", { locale: fr })} → ${format(new Date(sit.end_date), "d MMM", { locale: fr })}`
                        : "Dates flexibles"}
                    </p>
                  </div>
                </Link>
              );
            })
          )}
        </div>

        {/* Colonne droite — Échanges */}
        <div className="bg-card border border-border rounded-2xl p-4 sm:p-5">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm font-semibold text-foreground">
              Échanges autour de vous
            </p>
            <Link to="/petites-missions" className="text-xs text-primary font-sans">
              Voir tout →
            </Link>
          </div>
          <p className="text-xs text-muted-foreground font-sans mb-3">
            En priorité : les échanges qui correspondent à vos compétences.
          </p>
          <div className="flex flex-col gap-2 mb-4">
            <button
              onClick={() => navigate("/petites-missions")}
              className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-xs font-sans font-medium"
            >
              Publier un besoin →
            </button>
            <button
              onClick={() => navigate("/petites-missions")}
              className="w-full border border-primary text-primary rounded-xl py-2.5 text-xs font-sans font-medium"
            >
              Proposer mon aide →
            </button>
          </div>
          <p className="text-xs text-muted-foreground font-sans italic text-center">
            Pas encore d'échange dans votre zone.
          </p>
        </div>
      </div>

      {/* Éligibilité gardien d'urgence */}
      <div className="px-4 sm:px-5 md:px-8 mb-6 md:mb-8">
        <EmergencyEligibility />
      </div>

      {/* Conseils */}
      {articles.length > 0 && (
        <div className="px-4 sm:px-5 md:px-8 mb-6 md:mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg font-semibold">Conseils pour vous</h2>
            <Link to="/actualites" className="text-xs text-primary hover:underline font-medium">Voir tout →</Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
            {articles.map((a: any) => (
              <a key={a.id} href={`/actualites/${a.slug}`} className="flex-shrink-0 w-[70vw] sm:w-64 rounded-xl border border-border bg-card overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
                {a.cover_image_url ? (
                  <img src={a.cover_image_url} alt="" className="w-full h-28 object-cover" />
                ) : (
                  <div className="w-full h-28 bg-accent flex items-center justify-center">
                    <Newspaper className="h-8 w-8 text-muted-foreground/40" />
                  </div>
                )}
                <div className="p-3">
                  <p className="text-sm font-semibold line-clamp-2">{a.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{a.excerpt}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SitterDashboard;
