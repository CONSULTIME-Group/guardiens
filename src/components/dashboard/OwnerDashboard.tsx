import { useState, useEffect, useMemo, useCallback } from "react";
import FounderBadge from "@/components/badges/FounderBadge";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { useAuth } from "@/contexts/AuthContext";
import { Link, useNavigate, useSearchParams } from "react-router-dom";


import OnboardingWelcome from "./OnboardingWelcome";
import NearbyEmergencySitters from "./NearbyEmergencySitters";
import DashboardSkeleton from "@/components/skeletons/DashboardSkeleton";
import { PawPrint, Plus, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, differenceInDays, differenceInMonths } from "date-fns";
import { fr } from "date-fns/locale";

import RoleActivationBanner from "./RoleActivationBanner";
import AccessGateBanner from "@/components/access/AccessGateBanner";
import { useAccessLevel } from "@/hooks/useAccessLevel";
import BadgeGridSection from "@/components/badges/BadgeGridSection";
import { useUserBadges } from "@/hooks/useProfileReputation";
import { PROPRIO_BADGE_IDS } from "@/components/badges/badge-definitions";

/* ── Extracted sub-components ── */
import MonAnnonceCard from "./owner/MonAnnonceCard";
import ApplicationsSection from "./owner/ApplicationsSection";
import ContextualResources from "./owner/ContextualResources";
import MyMissionsColumn from "./owner/MyMissionsColumn";
import ExchangesColumn from "./owner/ExchangesColumn";
import DashSection from "./owner/DashSection";
import EmptyCard from "./owner/EmptyCard";
import StatCard from "./owner/StatCard";
import {
  SPECIES_LABEL, PROPRIO_SPECIAL_IDS, BANNER_STYLES,
  capitalize, capitalizeWords,
} from "./owner/helpers";
import type {
  Pet, SitRow, SitterInfo, AppRow, SmallMission,
  HighlightRow, OnboardingChecks,
} from "./owner/types";

/* ═══════════════════════════════════════════════════════
   Main component
   ═══════════════════════════════════════════════════════ */

const OwnerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { level, profileCompletion: accessProfileCompletion } = useAccessLevel();
  const [searchParams, setSearchParams] = useSearchParams();

  /* ── Remote state ── */
  const [sits, setSits] = useState<SitRow[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [recentApps, setRecentApps] = useState<AppRow[]>([]);
  const [reviews, setReviews] = useState<{ overall_rating: number }[]>([]);
  const [highlights, setHighlights] = useState<HighlightRow[]>([]);
  const [smallMissions, setSmallMissions] = useState<SmallMission[]>([]);
  const [myMissions, setMyMissions] = useState<SmallMission[]>([]);
  const [verificationStatus, setVerificationStatus] = useState("not_submitted");
  const [missionMetrics, setMissionMetrics] = useState({ total: 0, completed: 0 });
  const [sitterBadges, setSitterBadges] = useState<Record<string, { badge_key: string; count: number }[]>>({});
  const [sitterProfiles, setSitterProfiles] = useState<Record<string, SitterInfo>>({});
  const [trustedSitterCount, setTrustedSitterCount] = useState(0);
  const [propertyType, setPropertyType] = useState<string | null>(null);
  const [propertyEnvironment, setPropertyEnvironment] = useState<string | null>(null);
  const [propertyCoverPhoto, setPropertyCoverPhoto] = useState<string | null>(null);

  /* ── UI state ── */
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingChecks, setOnboardingChecks] = useState<OnboardingChecks>({
    hasName: false, hasAvatar: false, hasBio: false,
    hasIdentity: false, hasProperty: false, hasPets: false, hasSit: false,
  });

  /* ── Badges (react-query) ── */
  const { data: userBadges } = useUserBadges(user?.id);

  // Badge counts now handled by BadgeGridSection

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

  /* ── Data loading (single effect, single profile fetch) ── */
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    // Reset state immediately to avoid showing previous user's data (anti-flicker)
    setLoading(true);
    setSits([]);
    setPets([]);
    setRecentApps([]);
    setReviews([]);
    setHighlights([]);
    setSmallMissions([]);
    setMyMissions([]);
    setVerificationStatus("not_submitted");
    setMissionMetrics({ total: 0, completed: 0 });
    setSitterBadges({});
    setSitterProfiles({});
    setTrustedSitterCount(0);
    setPropertyType(null);
    setPropertyEnvironment(null);
    setPropertyCoverPhoto(null);

    const load = async () => {
      try {
        const [sitsRes, propsRes, reviewsRes, profileRes, highlightsRes, missionsRes] = await Promise.all([
          supabase.from("sits").select("*, applications(id, status, sitter_id)").eq("user_id", user.id).order("created_at", { ascending: false }),
          supabase.from("properties").select("id, type, environment, photos").eq("user_id", user.id),
          supabase.from("reviews").select("overall_rating").eq("reviewee_id", user.id).eq("published", true),
          supabase.from("profiles").select("first_name, avatar_url, bio, identity_verification_status, onboarding_completed, onboarding_dismissed_at, onboarding_minimal_completed").eq("id", user.id).single(),
          supabase.from("owner_highlights").select("*, sitter:profiles!owner_highlights_sitter_id_fkey(first_name, avatar_url)").eq("owner_id", user.id).eq("hidden", false).order("created_at", { ascending: false }).limit(5),
          supabase.from("small_missions").select("id, title, category, city, created_at").eq("status", "open").order("created_at", { ascending: false }).limit(2),
        ]);

        if (cancelled) return;

        const sitsData = (sitsRes.data || []) as SitRow[];
        setSits(sitsData);
        setReviews(reviewsRes.data || []);
        setHighlights((highlightsRes.data || []) as HighlightRow[]);
        setSmallMissions((missionsRes.data || []) as SmallMission[]);

        const p = profileRes.data;
        const verStatus = p?.identity_verification_status || "not_submitted";
        setVerificationStatus(verStatus);

        // Onboarding is now handled by AppLayout

        const hasName = !!(p?.first_name);
        const hasAvatar = !!(p?.avatar_url);
        const hasBio = !!(p?.bio && p.bio.length > 10);
        const hasIdentity = verStatus === "verified" || verStatus === "pending";
        const propsData = propsRes.data || [];
        const hasProperty = propsData.length > 0;
        if (propsData.length > 0) {
          setPropertyType((propsData[0] as any).type || null);
          setPropertyEnvironment((propsData[0] as any).environment || null);
          const photos = (propsData[0] as any).photos;
          setPropertyCoverPhoto(Array.isArray(photos) && photos.length > 0 ? photos[0] : null);
        }
        const hasSit = sitsData.length > 0;
        setOnboardingChecks({ hasName, hasAvatar, hasBio, hasIdentity, hasProperty, hasPets: false, hasSit });

        const dismissed = localStorage.getItem("onboarding_owner_dismissed");
        const mc = (p as Record<string, unknown>)?.onboarding_minimal_completed as boolean ?? false;
        if (!dismissed && user.profileCompletion < 60 && mc) {
          setShowOnboarding(true);
        }

        // Pets
        const propIds = (propsRes.data || []).map((pr: { id: string }) => pr.id);
        if (propIds.length > 0) {
          const { data } = await supabase.from("pets").select("*").in("property_id", propIds);
          if (!cancelled) {
            setPets((data || []) as Pet[]);
            setOnboardingChecks(prev => ({ ...prev, hasPets: (data || []).length > 0 }));
          }
        }

        // Applications + sitter details
        const sitIds = sitsData.map(s => s.id);
        if (sitIds.length > 0) {
          const { data: apps } = await supabase
            .from("applications")
            .select("*, sitter:profiles!applications_sitter_id_fkey(id, first_name, avatar_url, identity_verified, completed_sits_count), sit:sits(title, start_date, end_date)")
            .in("sit_id", sitIds)
            .order("created_at", { ascending: false })
            .limit(20);

          if (!cancelled) {
            setRecentApps((apps || []) as AppRow[]);

            const profiles: Record<string, SitterInfo> = {};
            (apps || []).forEach((a: AppRow) => {
              if (a.sitter?.id) profiles[a.sitter.id] = a.sitter;
            });
            setSitterProfiles(profiles);

            const sitterIds = [...new Set((apps || []).map((a: AppRow) => a.sitter?.id).filter(Boolean))] as string[];
            if (sitterIds.length > 0) {
              const [{ data: badgeData }, { data: sitterReviews }] = await Promise.all([
                supabase.from("badge_attributions").select("user_id, badge_id").in("user_id", sitterIds),
                supabase.from("reviews").select("reviewee_id, overall_rating").in("reviewee_id", sitterIds).eq("published", true),
              ]);

              if (!cancelled) {
                const grouped: Record<string, Record<string, number>> = {};
                (badgeData || []).forEach((b: { user_id: string; badge_id: string }) => {
                  if (!grouped[b.user_id]) grouped[b.user_id] = {};
                  grouped[b.user_id][b.badge_id] = (grouped[b.user_id][b.badge_id] || 0) + 1;
                });
                const result: Record<string, { badge_key: string; count: number }[]> = {};
                Object.entries(grouped).forEach(([uid, badges]) => {
                  result[uid] = Object.entries(badges).map(([k, c]) => ({ badge_key: k, count: c }));
                });
                setSitterBadges(result);

                const ratingMap: Record<string, number[]> = {};
                (sitterReviews || []).forEach((r: { reviewee_id: string; overall_rating: number }) => {
                  if (!ratingMap[r.reviewee_id]) ratingMap[r.reviewee_id] = [];
                  ratingMap[r.reviewee_id].push(r.overall_rating);
                });
                setSitterProfiles(prev => {
                  const updated = { ...prev };
                  Object.entries(ratingMap).forEach(([id, ratings]) => {
                    if (updated[id]) {
                      updated[id] = { ...updated[id], avgNote: Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 };
                    }
                  });
                  return updated;
                });
              }
            }
          }
        }

        // Trusted sitter count
        const completedSitsData = sitsData.filter(s => s.status === "completed");
        const sitterSitCounts: Record<string, number> = {};
        completedSitsData.forEach(s => {
          (s.applications || [])
            .filter(a => a.status === "accepted")
            .forEach(a => { sitterSitCounts[a.sitter_id] = (sitterSitCounts[a.sitter_id] || 0) + 1; });
        });
        if (!cancelled) setTrustedSitterCount(Object.values(sitterSitCounts).filter(c => c >= 2).length);

        // My missions
        const [myMissionsDataRes, allMyMissionsCountRes] = await Promise.all([
          supabase.from("small_missions").select("id, title, category, status, created_at, small_mission_responses(id, status)").eq("user_id", user.id).order("created_at", { ascending: false }).limit(3),
          supabase.from("small_missions").select("id, status").eq("user_id", user.id),
        ]);

        if (!cancelled) {
          setMyMissions((myMissionsDataRes.data || []) as SmallMission[]);
          const allMyMissions = allMyMissionsCountRes.data || [];
          setMissionMetrics({ total: allMyMissions.length, completed: allMyMissions.filter((m: { status: string }) => m.status === "completed").length });
          setLoading(false);
        }
      } catch (err) {
        logger.error("[OwnerDashboard] load error", { err: String(err) });
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

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

  const banner = useMemo(() => {
    if (verificationStatus !== "verified" && verificationStatus !== "pending")
      return { variant: "info" as const, label: "Recommandé : vérifiez votre identité pour rassurer les gardiens qui consultent votre annonce.", to: "/settings#verification", ctaLabel: "Vérifier mon identité →" };
    if (ongoingSit) {
      const acceptedApp = (ongoingSit.applications || []).find(a => a.status === "accepted");
      const sitterName = acceptedApp?.sitter_id && sitterProfiles[acceptedApp.sitter_id]?.first_name;
      const endLabel = ongoingSit.end_date ? format(new Date(ongoingSit.end_date), "d MMMM", { locale: fr }) : "";
      const nameStr = sitterName ? capitalize(sitterName) : "votre gardien";
      return { variant: "success" as const, label: `Garde en cours — ${nameStr} s'occupe de vos animaux${endLabel ? ` jusqu'au ${endLabel}` : ""}.` };
    }
    if (pendingAppCount > 0)
      return { variant: "info" as const, label: `Vous avez ${pendingAppCount} candidature${pendingAppCount > 1 ? "s" : ""} non lue${pendingAppCount > 1 ? "s" : ""}.`, to: "/sits", ctaLabel: "Voir les candidatures →" };
    return null;
  }, [verificationStatus, ongoingSit, pendingAppCount, sitterProfiles]);

  const cta = useMemo(() => {
    if (activeSits.length === 0)
      return { text: "Publiez votre première annonce — c'est gratuit et ça prend 5 minutes", cta: "Publier une annonce", to: "/sits/create" };
    const noAppSit = activeSits.find(s => s.status === "published" && (!s.applications || s.applications.length === 0) && differenceInDays(now, new Date(s.created_at)) >= 7);
    if (noAppSit)
      return { text: "Votre annonce n'a pas encore de candidature. Enrichissez votre profil pour attirer les gardiens.", cta: "Voir mon profil", to: "/owner-profile" };
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSits]);

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

  return (
    <div className="space-y-8">

      {/* Role activation banner */}
      <div className="px-5 md:px-8">
        <RoleActivationBanner userRole={user?.role || "owner"} />
      </div>

      {/* ═══ Hero header ═══ */}
      <div className="relative overflow-hidden bg-primary rounded-b-3xl px-5 md:px-10 pt-6 md:pt-8 pb-5 md:pb-6 mb-6 md:mb-8">
        <div className="absolute right-0 top-0 opacity-[0.06] pointer-events-none">
          <svg width="280" height="200" viewBox="0 0 280 200" aria-hidden="true">
            <ellipse cx="200" cy="100" rx="160" ry="100" fill="white" />
            <rect x="80" y="50" width="100" height="90" fill="white" rx="6" />
            <polygon points="80,50 130,15 180,50" fill="white" />
          </svg>
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[3px] text-primary-foreground/60 font-sans mb-1">
              Espace propriétaire
            </p>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-4xl font-heading font-bold text-primary-foreground leading-tight mb-1">
                Bonjour{user?.firstName ? `, ${capitalize(user.firstName)}` : ""} !
              </h1>
              {user?.isFounder && <FounderBadge size="sm" />}
            </div>
            <p className="text-sm text-primary-foreground/75 font-sans">{subtitle}</p>
            {user?.id ? (
              <Link
                to={`/gardiens/${user.id}?tab=proprio`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-body text-primary-foreground/70 hover:text-primary-foreground transition-colors mt-2"
              >
                <Eye className="w-3 h-3" /> Voir mon profil public →
              </Link>
            ) : null}
          </div>
          <button
            onClick={() => navigate("/sits/create")}
            className="shrink-0 bg-primary-foreground text-primary rounded-xl px-5 py-2.5 text-sm font-medium font-sans hover:bg-primary-foreground/90 transition-colors w-full md:w-auto text-center"
          >
            + Publier une annonce
          </button>
        </div>
      </div>

      <div className="px-5 md:px-8 mt-4">
        <AccessGateBanner level={level} profileCompletion={accessProfileCompletion} context="guard" />
      </div>

      <div className="px-5 md:px-8 -mt-4 mb-2">
        <button
          onClick={() => setSearchParams({ tour: "true" })}
          className="text-xs text-muted-foreground underline-offset-4 hover:underline"
        >
          Revoir la présentation
        </button>
      </div>

      {/* ═══ Banner ═══ */}
      {banner && (
        <div className="px-5 md:px-8 -mt-4 mb-4">
          <div className={`p-4 rounded-xl border ${BANNER_STYLES[banner.variant]} flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2`}>
            <p className="text-sm font-medium">{banner.label}</p>
            {banner.ctaLabel && banner.to && (
              <Link to={banner.to} className="text-sm font-semibold hover:underline shrink-0">
                {banner.ctaLabel}
              </Link>
            )}
          </div>
        </div>
      )}

      {/* ═══ Mon annonce ═══ */}
      <div className="px-5 md:px-8">
        <MonAnnonceCard
          sits={sits}
          pets={pets}
          propertyType={propertyType}
          propertyEnvironment={propertyEnvironment}
          pendingAppCount={pendingAppCount}
          coverPhoto={propertyCoverPhoto}
        />
      </div>

      {/* ═══ Candidatures ═══ */}
      <div className="px-5 md:px-8">
        <ApplicationsSection
          recentApps={recentApps}
          sitterProfiles={sitterProfiles}
          sitterBadges={sitterBadges}
          loading={loading}
        />
      </div>

      {/* ═══ Stats ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-5 md:px-8">
        <StatCard value={completedSits.length} label="Gardes réalisées" />
        <StatCard value={avgRating > 0 ? `${avgRating} ★` : null} fallback="Pas encore" label="Note moyenne" />
        <StatCard value={activeSits.length} label="Annonces actives" />
        <StatCard value={trustedSitterCount} label="Gardiens de confiance" />
      </div>

      {/* ═══ Badges ═══ */}
      <div className="px-5 md:px-8 mb-6 md:mb-8">
        <BadgeGridSection
          title="Vos Badges"
          badgeIds={PROPRIO_BADGE_IDS}
          userBadges={userBadges}
          specialBadgeIds={PROPRIO_SPECIAL_IDS}
        />
      </div>

      {/* ═══ Mes animaux ═══ */}
      <div className="px-5 md:px-8">
        <DashSection title="Mes animaux" action={
          <Link to="/owner-profile" className="text-xs text-primary hover:underline font-medium">Gérer</Link>
        }>
          {pets.length === 0 ? (
            <EmptyCard icon={PawPrint} text="Aucun animal enregistré" hint="Ajoutez vos compagnons pour attirer les bons gardiens" cta="Ajouter un animal" to="/owner-profile" />
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
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
                      <div>
                        <p className="text-sm font-semibold text-foreground">{capitalize(pet.name)}</p>
                        <p className="text-xs text-muted-foreground font-sans">
                          {SPECIES_LABEL[pet.species] || capitalize(pet.species)}
                          {pet.breed ? ` · ${capitalizeWords(pet.breed)}` : ""}
                          {pet.age ? ` · ${pet.age} an${pet.age > 1 ? "s" : ""}` : ""}
                        </p>
                        {nextSit && nextSit.status === "confirmed" ? (
                          <span className="text-xs font-sans bg-primary/10 text-primary rounded-md px-2 py-0.5 mt-1 inline-block">
                            Garde confirmée
                          </span>
                        ) : nextSit ? (
                          <span className="text-xs font-sans bg-accent text-accent-foreground rounded-md px-2 py-0.5 mt-1 inline-block">
                            Annonce en cours
                          </span>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
              <Link to="/owner-profile" className="text-sm text-primary font-sans flex items-center gap-1 hover:underline">
                <Plus className="h-3.5 w-3.5" /> Ajouter un animal
              </Link>
            </>
          )}
        </DashSection>
      </div>

      {/* ═══ Contextual resources ═══ */}
      <div className="px-5 md:px-8">
        <ContextualResources annoncesCount={sits.length} gardesCount={completedSits.length} />
      </div>

      {/* ═══ Bottom columns ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-5 md:px-8">
        <MyMissionsColumn missions={myMissions} />
        <ExchangesColumn missions={smallMissions} />
      </div>

      {/* ═══ Emergency sitters ═══ */}
      <div className="px-5 md:px-8">
        <NearbyEmergencySitters />
      </div>

      {/* ═══ CTA ═══ */}
      {cta && (
        <div className="px-5 md:px-8">
          <div className="p-6 rounded-xl bg-primary/5 border-2 border-dashed border-primary/30 text-center">
            <p className="text-sm text-muted-foreground mb-3">{cta.text}</p>
            <Link to={cta.to}><Button>{cta.cta}</Button></Link>
          </div>
        </div>
      )}

      {/* ═══ Coups de coeur ═══ */}
      {highlights.length > 0 && (
        <div className="px-5 md:px-8">
          <DashSection title="Ce que les gardiens disent de votre maison">
            <div className="space-y-2">
              {highlights.slice(0, 3).map(h => (
                <div key={h.id} className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border">
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
                  {h.photo_url && <img src={h.photo_url} alt="Photo de garde" loading="lazy" className="w-16 h-12 rounded-lg object-cover shrink-0" />}
                </div>
              ))}
            </div>
          </DashSection>
        </div>
      )}
    </div>
  );
};

export default OwnerDashboard;
