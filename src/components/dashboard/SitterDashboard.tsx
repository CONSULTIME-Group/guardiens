import { useAuth } from "@/contexts/AuthContext";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { useAccessLevel } from "@/hooks/useAccessLevel";
import { useSitterDashboardData } from "@/hooks/useSitterDashboardData";
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
import SitterEmergencyCardCompact from "./sitter/SitterEmergencyCardCompact";
import SitterMissionsSection from "./sitter/SitterMissionsSection";
import NearbyAnnoncesCard from "./sitter/NearbyAnnoncesCard";
import DashSection from "./owner/DashSection";
import SitterDashboardSkeleton from "./sitter/SitterDashboardSkeleton";
import SitterActivityPanel from "./sitter/SitterActivityPanel";

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





  const {
    loading, profileCompletion, identityVerified, identityStatus,
    completedSits, avgRating, reviewsCount, badgeCount, totalApps,
    pendingAppsCount, unreadCount, isAvailable, competencesCount, interestsCount,
    postalCode, avatarUrl, bio, hasAnimalExperience,
    hasEmergencyProfile, hasAcceptedRecent, nextGuard, nextGuardError,
    nearbyListings, nearbyListingsRadius, nearbyError, articles, nearbyMissions, nearbyMissionsError,
    myMissions, myMissionsError,
    toggleAvailability,
    reputation, groupedBadges,
  } = useSitterDashboardData(user?.id);

  if (loading) return <SitterDashboardSkeleton />;

  // (Sous-titre dynamique supprimé : redondant avec le titre de la
  // PriorityActionCard du cockpit. Cf. audit dashboard 2026.)

  // ── Checklist UNIFIÉE, fusion onboarding + profile completion ──
  // Items atomiques actionnables (pas l'agrégat profile_completion).
  // NB : le toggle "mode disponible" est porté UNIQUEMENT par SitterHero
  // (source de vérité unique). On ne le duplique plus ici.
  const allItems = [
    { done: !!postalCode, label: "Indiquer mon code postal", to: "/profile?focus=postal_code" },
    { done: !!avatarUrl, label: "Ajouter une photo de profil", to: "/profile?section=identite" },
    { done: !!(bio && bio.length >= 50), label: "Écrire ma bio (motivation, expérience)", to: "/profile?section=profil" },
    { done: hasAnimalExperience, label: "Ajouter une expérience animale", to: "/profile?section=experience" },
    { done: identityStatus === "verified" || identityVerified, label: "Vérifier mon identité (recommandé)", to: "/settings#verification" },
  ];
  const completedItems = allItems.filter(c => c.done);
  const incompleteItems = allItems.filter(c => !c.done);
  const allChecklistDone = completedItems.length === allItems.length;
  const progressPct = Math.round((completedItems.length / allItems.length) * 100);

  // ── Bloc activation unifié ──
  const ChecklistBlock = (
    <section aria-labelledby="onboarding-checklist-heading" className="px-4 sm:px-5 md:px-8 mb-6 md:mb-8">
      {/* Toast inline CP manquant, remplace le bandeau destructif full-width */}
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
          title="Finalisez votre profil"
          description={`${completedItems.length}/${allItems.length} étapes, ${progressPct}%`}
        >
          <Progress value={progressPct} className="mb-3" />

          <div role="list" className="bg-card border border-border rounded-2xl overflow-hidden">
            {allItems.map((item: any, i: number) => (
              <Link
                key={i}
                to={item.to}
                role="listitem"
                aria-disabled={item.done}
                className={`group flex items-center justify-between py-3 px-4 border-b border-border last:border-0 transition-all duration-200 ease-out ${
                  item.done ? "pointer-events-none" : "cursor-pointer hover:bg-muted/40 hover:translate-x-0.5"
                }`}
              >
                <div className="flex items-center">
                  {item.done ? (
                    <CheckCircle className="h-4 w-4 text-primary" aria-hidden="true" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" aria-hidden="true" />
                  )}
                  <span className={`text-sm ml-3 ${item.done ? "line-through text-foreground/50" : "text-foreground"}`}>
                    {item.label}
                  </span>
                </div>
                {!item.done && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" />
                )}
              </Link>
            ))}
          </div>
        </DashSection>
      )}

    </section>
  );

  // ── Accordéon unique : Conseils + Réputation + Badges ──
  // 3 strates secondaires regroupées dans UN seul Accordion pour densifier
  // le bas de dashboard et clarifier la hiérarchie (1 zone "à explorer"
  // au lieu de 3 cartes empilées). Toutes fermées par défaut.
  const buildSecondaryAccordion = (opts: { withConseils: boolean }) => (
    <section aria-label="Mon espace gardien, détails" className="rounded-2xl border border-border bg-card overflow-hidden">
      <Accordion type="single" collapsible defaultValue={completedSits > 0 ? "reputation" : undefined}>
        {opts.withConseils && (
        <AccordionItem value="conseils" className="border-b border-border last:border-0">
          <AccordionTrigger className="px-4 py-2.5 hover:no-underline hover:bg-muted/30 [&[data-state=open]>svg]:rotate-180">
            <div className="flex flex-col items-start text-left">
              <p className="text-[10px] uppercase tracking-[2px] text-muted-foreground font-sans font-semibold">
                Conseils
              </p>
              <p className="text-sm font-medium text-foreground">
                {articles.length > 0
                  ? "Lectures choisies pour vos premières gardes"
                  : "Bientôt de nouveaux conseils"}
              </p>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 pt-1">
            {articles.length > 0 ? (
              <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
                {articles.map((a: any) => (
                  <Link key={a.id} to={`/actualites/${a.slug}`} className="group/card flex-shrink-0 w-[70vw] sm:w-64 rounded-xl border border-border bg-card overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ease-out cursor-pointer">
                    {a.cover_image_url ? (
                      <div className="w-full h-28 overflow-hidden">
                        <img src={getOptimizedImageUrl(a.cover_image_url, 300, 75)} alt={a.title || "Article"} className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover/card:scale-105" width={300} height={112} loading="lazy" />
                      </div>
                    ) : (
                      <div className="w-full h-28 bg-accent flex items-center justify-center">
                        <Newspaper className="h-8 w-8 text-muted-foreground/40" aria-hidden="true" />
                      </div>
                    )}
                    <div className="p-3">
                      <h4 className="text-sm font-semibold line-clamp-2 transition-colors group-hover/card:text-primary">{a.title}</h4>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{a.excerpt}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-2">
                <p className="text-sm text-muted-foreground italic">
                  De nouveaux conseils arrivent prochainement.
                </p>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
        )}

        <AccordionItem value="reputation" className="border-b border-border last:border-0">
          <AccordionTrigger className="px-4 py-2.5 hover:no-underline hover:bg-muted/30 [&[data-state=open]>svg]:rotate-180">
            <div className="flex flex-col items-start text-left">
              <p className="text-[10px] uppercase tracking-[2px] text-muted-foreground font-sans font-semibold">
                Ma réputation
              </p>
              <p className="text-sm font-medium text-foreground">
                {completedSits} garde{completedSits > 1 ? "s" : ""}
                {" · "}
                {completedSits > 0 && reviewsCount > 0
                  ? `note ${avgRating.toFixed(1).replace(".", ",")}/5`
                  : "pas encore noté"}
                {" · "}
                {badgeCount} badge{badgeCount > 1 ? "s" : ""}
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
                {badgeCount} badge{badgeCount > 1 ? "s" : ""} obtenu{badgeCount > 1 ? "s" : ""}
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
                {hasEmergencyProfile ? "Profil actif" : "Non configuré"}
              </p>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 pt-1">
            <SitterEmergencyCardCompact hasEmergencyProfile={hasEmergencyProfile} />
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
  const annoncesEmpty = !nearbyError && nearbyListings.length === 0;
  const missionsEmpty =
    !myMissionsError && !nearbyMissionsError &&
    myMissions.length === 0 && nearbyMissions.length === 0;
  const hasBeyondListings = nearbyListings.some((s: any) => s?.is_beyond);
  const annoncesTitle = annoncesEmpty
    ? "Aucune annonce à proximité"
    : hasBeyondListings
      ? "Annonces ailleurs en France"
      : "Près de chez vous";

  const DiscoverySections = (
    <div className="space-y-6 min-w-0">
      {/* 1. Annonces — pas de cadre wrapper (cartes internes en portent déjà) */}
      <section aria-labelledby="discovery-annonces-heading" className="min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center rounded-full bg-primary/10 text-primary text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5">Garde</span>
        </div>
        <h2 id="discovery-annonces-heading" className="font-heading text-lg sm:text-xl font-bold text-foreground leading-tight mb-3">
          {annoncesTitle}
        </h2>
        <NearbyAnnoncesCard
          nearbyListings={nearbyListings}
          nearbyListingsRadius={nearbyListingsRadius}
          nearbyError={nearbyError}
          isAvailable={isAvailable}
          hideHeader
        />
      </section>

      {/* 2. Coup de main — idem, pas de wrapper */}
      <section aria-labelledby="discovery-missions-heading" className="min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center rounded-full bg-warning/10 text-warning text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5">Entraide</span>
        </div>
        <h2 id="discovery-missions-heading" className="font-heading text-lg sm:text-xl font-bold text-foreground leading-tight mb-3">
          Échanges dans votre coin
        </h2>
        <div className="space-y-4 min-w-0">
          <NearbyHelpersCarousel hideHeader />
          {!missionsEmpty && (
            <SitterMissionsSection
              myMissions={myMissions}
              nearbyMissions={nearbyMissions}
              postalCode={postalCode}
              myMissionsError={myMissionsError}
              nearbyMissionsError={nearbyMissionsError}
            />
          )}
        </div>
      </section>
    </div>
  );



  return (
    <div className="space-y-0 overflow-hidden pb-24 md:pb-8">
{/* pb-24 mobile = BottomNav (h-16) + sticky CTA (~32px). h-20 spacer supprimé (doublon). */}
      {/* Role activation */}
      <div className="px-4 sm:px-5 md:px-8 mb-4">
        <RoleActivationBanner userRole={user?.role || "sitter"} />
      </div>

      {/* ═══ FLUX VERTICAL UNIQUE — plus de colonne aside isolée ═══
          Ordre cockpit : Header + Action prioritaire → KPI strip Mon activité
          → Activation → Opportunités → Profil (accordéon). */}
      <div className="min-w-0">
        {/* COCKPIT */}
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
        />

        {/* Erreurs de fetch, affichées discrètement sous le cockpit */}
        {(nextGuardError || nearbyError) && (
          <div className="px-4 sm:px-5 md:px-8 mt-2 space-y-2">
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

        {/* KPI strip Mon activité, pleine largeur, juste sous l'action prioritaire */}
        <div className="px-4 sm:px-5 md:px-8 mt-4">
          <SitterActivityPanel
            isAvailable={isAvailable}
            profileCompletion={profileCompletion}
            nextGuard={nextGuard}
            unreadCount={unreadCount}
            pendingAppsCount={pendingAppsCount}
            nearbyListings={nearbyListings}
          />
        </div>

        {/* Bannière contextuelle, une seule */}
        {!nextGuard && (
          <div className="px-4 sm:px-5 md:px-8 mt-4">
            {!(level === 4 || level === "3B")
              ? <AccessGateBanner level={level} profileCompletion={accessProfileCompletion} context="guard" />
              : <FreePeriodBanner />}
          </div>
        )}

        <div className="mt-6">
          {ChecklistBlock}
        </div>
        <div className="px-4 sm:px-5 md:px-8 mb-6">
          {DiscoverySections}
        </div>
        <div className="px-4 sm:px-5 md:px-8 mb-6">
          {buildSecondaryAccordion({ withConseils: true })}
        </div>
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
