import { useState, useEffect } from "react";
import { getOptimizedImageUrl } from "@/lib/imageOptim";
import { useAuth } from "@/contexts/AuthContext";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { useAccessLevel } from "@/hooks/useAccessLevel";
import { useSitterDashboardData } from "@/hooks/useSitterDashboardData";



import RoleActivationBanner from "./RoleActivationBanner";
import AccessGateBanner from "@/components/access/AccessGateBanner";
import EmergencyDashSection from "./EmergencyDashSection";
import EmergencyEligibility from "./EmergencyEligibility";

import SitterHero from "./sitter/SitterHero";
import SitterNextGuard from "./sitter/SitterNextGuard";
import SitterStatusBar from "./sitter/SitterStatusBar";
import SitterBadgesSection from "./sitter/SitterBadgesSection";
import SitterBottomColumns from "./sitter/SitterBottomColumns";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CheckCircle, Circle, ChevronRight, Newspaper, AlertCircle, MessageSquare, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

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

  const {
    loading, profileCompletion, identityVerified, identityStatus,
    completedSits, avgRating, badgeCount, totalApps, cancellations,
    pendingAppsCount, unreadCount, isAvailable, isFounder,
    postalCode, avatarUrl, bio, hasAnimalExperience,
    hasEmergencyProfile, hasAcceptedRecent, nextGuard,
    nearbyListings, articles, nearbyMissions,
    onboardingCompleted, onboardingDismissed, minimalCompleted,
    setPartial, toggleAvailability,
    reputation, groupedBadges,
  } = useSitterDashboardData(user?.id);

  const [cpBannerDismissed, setCpBannerDismissed] = useState(
    () => localStorage.getItem("cp_banner_dismissed") === "1"
  );

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

  // ── Unified checklist ──
  const onboardingChecks = {
    profileComplete: profileCompletion >= 100,
    identityVerified: identityStatus === "verified" || identityVerified,
    availableMode: isAvailable,
  };
  const allItems = [
    { done: onboardingChecks.profileComplete, label: `Compléter mon profil (${profileCompletion}%)`, to: "/profile" },
    { done: onboardingChecks.identityVerified, label: "Vérifier mon identité (recommandé)", to: "/settings#verification" },
    { done: totalApps > 0, label: "Postuler à une première garde", to: "/search" },
    { done: onboardingChecks.availableMode, label: "Activer le mode disponible", to: "", isToggle: true },
  ];
  const completedItems = allItems.filter(c => c.done);
  const incompleteItems = allItems.filter(c => !c.done);
  const allChecklistDone = completedItems.length === allItems.length;

  return (
    <div className="space-y-0 overflow-hidden">

      {/* Postal code missing banner */}
      {!postalCode && !cpBannerDismissed && (
        <div className="bg-destructive/10 border-b border-destructive/30 px-4 py-3">
          <div className="container mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5 sm:mt-0" />
              <p className="text-sm text-foreground">
                <strong>Votre code postal est manquant.</strong> Sans lui, vous ne voyez pas les annonces près de chez vous.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <Button variant="default" size="sm" onClick={() => navigate("/profile?focus=postal_code")}>Ajouter mon CP</Button>
              <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => { setCpBannerDismissed(true); localStorage.setItem("cp_banner_dismissed", "1"); }}>✕</Button>
            </div>
          </div>
        </div>
      )}

      {/* Role activation */}
      <div className="px-4 sm:px-5 md:px-8 mb-4">
        <RoleActivationBanner userRole={user?.role || "sitter"} />
      </div>

      {/* ═══ 1. HERO ═══ */}
      <SitterHero
        userId={user?.id}
        firstName={user?.firstName}
        isFounder={user?.isFounder}
        subtitle={subtitle}
        isAvailable={isAvailable}
        onToggleAvailability={toggleAvailability}
      />

      {/* Next guard card */}
      {nextGuard && <SitterNextGuard nextGuard={nextGuard} />}

      {/* Quick action badges for pending apps / unread messages */}
      {(pendingAppsCount > 0 || unreadCount > 0) && (
        <div className="flex gap-3 px-4 sm:px-5 md:px-8 mb-4">
          {pendingAppsCount > 0 && (
            <Link to="/sits" className="flex items-center gap-2 bg-accent/50 border border-border rounded-xl px-3 py-2 text-xs font-medium text-foreground hover:bg-accent transition-colors">
              <FileText className="h-4 w-4 text-primary" />
              {pendingAppsCount} candidature{pendingAppsCount > 1 ? "s" : ""} en attente
            </Link>
          )}
          {unreadCount > 0 && (
            <Link to="/messages" className="flex items-center gap-2 bg-accent/50 border border-border rounded-xl px-3 py-2 text-xs font-medium text-foreground hover:bg-accent transition-colors">
              <MessageSquare className="h-4 w-4 text-primary" />
              {unreadCount} message{unreadCount > 1 ? "s" : ""} non lu{unreadCount > 1 ? "s" : ""}
            </Link>
          )}
        </div>
      )}

      <div className="px-4 sm:px-5 md:px-8 mt-4">
        <AccessGateBanner level={level} profileCompletion={accessProfileCompletion} context="guard" />
      </div>

      {/* Profile completion card */}
      {postalCode && profileCompletion < 60 && (
        <div className="px-4 sm:px-5 md:px-8 mt-4">
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg">Complétez votre profil pour devenir visible</CardTitle>
              <CardDescription>Profil à {profileCompletion}%. Les propriétaires consultent uniquement les profils complets.</CardDescription>
              <Progress value={profileCompletion} className="mt-3" />
            </CardHeader>
            <CardContent className="space-y-3">
              {!avatarUrl && <ChecklistItem label="Ajouter une photo de profil" ctaLabel="Ajouter" onClick={() => navigate("/profile?section=identite")} />}
              {(!bio || bio.length < 50) && <ChecklistItem label="Écrire votre bio (motivation, expérience)" ctaLabel="Rédiger" onClick={() => navigate("/profile?section=profil")} />}
              {!hasAnimalExperience && <ChecklistItem label="Indiquer au moins une expérience avec un animal" ctaLabel="Ajouter" onClick={() => navigate("/profile?section=experience")} />}
            </CardContent>
          </Card>
        </div>
      )}

      <div className="px-4 sm:px-5 md:px-8 -mt-4 mb-2">
        <button onClick={() => setSearchParams({ tour: "true" })} className="text-xs text-muted-foreground underline-offset-4 hover:underline">
          Revoir la présentation
        </button>
      </div>

      {/* ═══ 2. STATUS BAR ═══ */}
      <SitterStatusBar
        profileCompletion={profileCompletion}
        completedSits={completedSits}
        avgRating={avgRating}
        badgeCount={badgeCount}
        totalApps={totalApps}
        reputation={reputation}
      />

      {/* Emergency section */}
      {hasEmergencyProfile && <div className="px-4 sm:px-5 md:px-8"><EmergencyDashSection /></div>}

      {/* ═══ 3. CTA + BADGES ═══ */}
      <div className="px-4 sm:px-5 md:px-8 mb-6 md:mb-8">
        <button
          onClick={() => navigate("/search")}
          className="w-full bg-primary text-primary-foreground rounded-2xl py-3 sm:py-4 text-sm sm:text-base font-sans font-semibold mb-6 hover:bg-primary/90 transition-colors"
        >
          Découvrez les gardes disponibles →
        </button>
        <SitterBadgesSection groupedBadges={groupedBadges} />
      </div>

      {/* ═══ 4. CHECKLIST ═══ */}
      <div className="px-4 sm:px-5 md:px-8 mb-6 md:mb-8">
        {incompleteItems.length > 0 && (
          <div className="mb-4">
            <p className="text-sm font-medium text-foreground mb-3">
              À compléter ({incompleteItems.length} restante{incompleteItems.length > 1 ? "s" : ""})
            </p>
            <div>
              {incompleteItems.map((item: any, i: number) =>
                item.isToggle ? (
                  <div key="toggle" className="flex items-center justify-between py-3 border-b border-border last:border-0 px-2">
                    <div className="flex items-center">
                      <Circle className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-foreground ml-3">Activer le mode disponible</span>
                    </div>
                    <button
                      role="switch"
                      aria-checked={isAvailable}
                      aria-label="Basculer la disponibilité"
                      onClick={toggleAvailability}
                      className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${isAvailable ? "bg-toggle-active" : "bg-muted"}`}
                    >
                      <span className={`absolute top-0.5 w-5 h-5 bg-background rounded-full shadow transition-all duration-200 ${isAvailable ? "left-5" : "left-0.5"}`} />
                    </button>
                  </div>
                ) : (
                  <Link key={i} to={item.to} className="flex items-center justify-between py-3 border-b border-border last:border-0 cursor-pointer hover:bg-muted/30 rounded-lg px-2 transition-colors">
                    <div className="flex items-center">
                      <Circle className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-foreground ml-3">{item.label}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                )
              )}
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
                    {allChecklistDone ? "4/4 étapes complétées" : `${completedItems.length} étape${completedItems.length > 1 ? "s" : ""} déjà complétée${completedItems.length > 1 ? "s" : ""}`}
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

      {/* ═══ 5. BOTTOM COLUMNS ═══ */}
      <SitterBottomColumns nearbyListings={nearbyListings} nearbyMissions={nearbyMissions} postalCode={postalCode} />

      {/* Emergency eligibility */}
      <div className="px-4 sm:px-5 md:px-8 mb-6 md:mb-8">
        <EmergencyEligibility />
      </div>

      {/* Articles */}
      {articles.length > 0 && (
        <div className="px-4 sm:px-5 md:px-8 mb-6 md:mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg font-semibold">Conseils pour vous</h2>
            <Link to="/actualites" className="text-xs text-primary hover:underline font-medium">Voir tout →</Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
            {articles.map((a: any) => (
              <Link key={a.id} to={`/actualites/${a.slug}`} className="flex-shrink-0 w-[70vw] sm:w-64 rounded-xl border border-border bg-card overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
                {a.cover_image_url ? (
                  <img src={getOptimizedImageUrl(a.cover_image_url, 300, 75)} alt={a.title || "Article"} className="w-full h-28 object-cover" width={300} height={112} loading="lazy" />
                ) : (
                  <div className="w-full h-28 bg-accent flex items-center justify-center">
                    <Newspaper className="h-8 w-8 text-muted-foreground/40" />
                  </div>
                )}
                <div className="p-3">
                  <p className="text-sm font-semibold line-clamp-2">{a.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{a.excerpt}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SitterDashboard;
