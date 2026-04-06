import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import OnboardingWelcome from "./OnboardingWelcome";
import NearbyEmergencySitters from "./NearbyEmergencySitters";
import ResourceSection from "@/components/shared/ResourceSection";
import type { ResourceItem } from "@/components/shared/ResourceCard";
import {
  ChevronRight, Plus, PawPrint, Users, Handshake, ChevronDown,
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { format, differenceInDays, differenceInMonths } from "date-fns";
import { fr } from "date-fns/locale";

import { TooltipProvider } from "@/components/ui/tooltip";
import RoleActivationBanner from "./RoleActivationBanner";
import { BadgeSceau } from '@/components/badges/BadgeSceau';
import { useUserBadges } from '@/hooks/useProfileReputation';
import { PROPRIO_BADGE_IDS } from '@/components/badges/badge-definitions';

const speciesLabel: Record<string, string> = {
  dog: "Chien", cat: "Chat", horse: "Cheval", bird: "Oiseau",
  rodent: "Rongeur", fish: "Poisson", reptile: "Reptile",
  farm_animal: "Animal de ferme", nac: "NAC",
};

const capitalize = (s: string | null | undefined) => {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
};

const capitalizeWords = (s: string | null | undefined) => {
  if (!s) return "";
  return s.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
};

const OwnerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sits, setSits] = useState<any[]>([]);
  const { data: userBadges } = useUserBadges(user?.id);

  const PROPRIO_SPECIAL_IDS = ['fondateur', 'id_verifiee', 'courant_passe'];

  const activeBadgeCount = (userBadges ?? []).filter(b =>
    PROPRIO_BADGE_IDS.includes(b.badge_id) &&
    differenceInMonths(new Date(), new Date(b.created_at)) < 12
  ).length;

  const specialBadges = (userBadges ?? []).filter(b =>
    PROPRIO_SPECIAL_IDS.includes(b.badge_id)
  );
  const [pets, setPets] = useState<any[]>([]);
  const [recentApps, setRecentApps] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [highlights, setHighlights] = useState<any[]>([]);
  const [smallMissions, setSmallMissions] = useState<any[]>([]);
  const [myMissions, setMyMissions] = useState<any[]>([]);
  const [verificationStatus, setVerificationStatus] = useState("not_submitted");
  const [missionMetrics, setMissionMetrics] = useState({ total: 0, completed: 0 });
  const [sitterBadges, setSitterBadges] = useState<Record<string, { badge_key: string; count: number }[]>>({});
  const [sitterProfiles, setSitterProfiles] = useState<Record<string, any>>({});
  const [trustedSitterCount, setTrustedSitterCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingChecks, setOnboardingChecks] = useState({ hasName: false, hasAvatar: false, hasBio: false, hasIdentity: false, hasProperty: false, hasPets: false, hasSit: false });

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [sitsRes, propsRes, reviewsRes, profileRes, highlightsRes, missionsRes] = await Promise.all([
        supabase.from("sits").select("*, applications(id, status, sitter_id)").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("properties").select("id").eq("user_id", user.id),
        supabase.from("reviews").select("overall_rating").eq("reviewee_id", user.id).eq("published", true),
        supabase.from("profiles").select("identity_verification_status").eq("id", user.id).single(),
        supabase.from("owner_highlights").select("*, sitter:profiles!owner_highlights_sitter_id_fkey(first_name, avatar_url)").eq("owner_id", user.id).eq("hidden", false).order("created_at", { ascending: false }).limit(5),
        supabase.from("small_missions").select("id, title, category, exchange, city, created_at").eq("status", "open").order("created_at", { ascending: false }).limit(2),
      ]);

      const sitsData = sitsRes.data || [];
      setSits(sitsData);
      setReviews(reviewsRes.data || []);
      setHighlights(highlightsRes.data || []);
      setSmallMissions(missionsRes.data || []);
      setVerificationStatus((profileRes.data as any)?.identity_verification_status || "not_submitted");

      const fullProfileRes = await supabase.from("profiles").select("first_name, avatar_url, bio, identity_verification_status").eq("id", user.id).single();
      const p = fullProfileRes.data;
      const hasName = !!(p?.first_name);
      const hasAvatar = !!(p?.avatar_url);
      const hasBio = !!(p?.bio && p.bio.length > 10);
      const hasIdentity = p?.identity_verification_status === "verified" || p?.identity_verification_status === "pending";
      const hasProperty = (propsRes.data || []).length > 0;
      const hasSit = sitsData.length > 0;
      setOnboardingChecks({ hasName, hasAvatar, hasBio, hasIdentity, hasProperty, hasPets: false, hasSit });

      const dismissed = localStorage.getItem("onboarding_owner_dismissed");
      if (!dismissed && user.profileCompletion < 50) {
        setShowOnboarding(true);
      }

      const propIds = (propsRes.data || []).map((p: any) => p.id);
      if (propIds.length > 0) {
        const { data } = await supabase.from("pets").select("*").in("property_id", propIds);
        setPets(data || []);
        setOnboardingChecks(prev => ({ ...prev, hasPets: (data || []).length > 0 }));
      }

      const sitIds = sitsData.map((s: any) => s.id);
      if (sitIds.length > 0) {
        const { data: apps } = await supabase
          .from("applications")
          .select("*, sitter:profiles!applications_sitter_id_fkey(id, first_name, avatar_url, identity_verified, completed_sits_count), sit:sits(title, start_date, end_date)")
          .in("sit_id", sitIds)
          .order("created_at", { ascending: false })
          .limit(20);
        setRecentApps(apps || []);

        // Build sitter profiles lookup
        const profiles: Record<string, any> = {};
        (apps || []).forEach((a: any) => {
          if (a.sitter?.id) profiles[a.sitter.id] = a.sitter;
        });
        setSitterProfiles(profiles);

        // Load sitter reviews for avg rating
        const sitterIds = [...new Set((apps || []).map((a: any) => a.sitter?.id).filter(Boolean))];
        if (sitterIds.length > 0) {
          const [{ data: badgeData }, { data: sitterReviews }] = await Promise.all([
            supabase.from("badge_attributions").select("user_id, badge_id").in("user_id", sitterIds),
            supabase.from("reviews").select("reviewee_id, overall_rating").in("reviewee_id", sitterIds).eq("published", true),
          ]);
          const grouped: Record<string, Record<string, number>> = {};
          (badgeData || []).forEach((b: any) => {
            if (!grouped[b.user_id]) grouped[b.user_id] = {};
            grouped[b.user_id][b.badge_id] = (grouped[b.user_id][b.badge_id] || 0) + 1;
          });
          const result: Record<string, { badge_key: string; count: number }[]> = {};
          Object.entries(grouped).forEach(([uid, badges]) => {
            result[uid] = Object.entries(badges).map(([k, c]) => ({ badge_key: k, count: c }));
          });
          setSitterBadges(result);

          // Compute avg rating per sitter
          const ratingMap: Record<string, number[]> = {};
          (sitterReviews || []).forEach((r: any) => {
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

      const completedSitsData = sitsData.filter((s: any) => s.status === "completed");
      const sitterSitCounts: Record<string, number> = {};
      completedSitsData.forEach((s: any) => {
        (s.applications || [])
          .filter((a: any) => a.status === "accepted")
          .forEach((a: any) => { sitterSitCounts[a.sitter_id] = (sitterSitCounts[a.sitter_id] || 0) + 1; });
      });
      setTrustedSitterCount(Object.values(sitterSitCounts).filter(c => c >= 2).length);

      const [myMissionsDataRes, allMyMissionsCountRes] = await Promise.all([
        supabase.from("small_missions").select("id, title, category, status, created_at, small_mission_responses(id, status)").eq("user_id", user.id).order("created_at", { ascending: false }).limit(3),
        supabase.from("small_missions").select("id, status").eq("user_id", user.id),
      ]);
      setMyMissions(myMissionsDataRes.data || []);
      const allMyMissions = allMyMissionsCountRes.data || [];
      setMissionMetrics({ total: allMyMissions.length, completed: allMyMissions.filter((m: any) => m.status === "completed").length });

      setLoading(false);
    };
    load();
  }, [user]);

  if (loading) return <div className="p-6 text-muted-foreground">Chargement...</div>;

  if (showOnboarding) {
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

  const activeSits = sits.filter(s => ["published", "confirmed"].includes(s.status));
  const completedSits = sits.filter(s => s.status === "completed");
  const avgRating = reviews.length > 0 ? Math.round((reviews.reduce((s, r) => s + r.overall_rating, 0) / reviews.length) * 10) / 10 : 0;
  const pendingAppCount = recentApps.filter(a => a.status === "pending").length;

  const now = new Date();
  const ongoingSit = sits.find(s => s.status === "confirmed" && s.start_date && new Date(s.start_date) <= now && s.end_date && new Date(s.end_date) >= now);

  const getSubtitle = () => {
    if (ongoingSit) {
      const daysLeft = ongoingSit.end_date ? differenceInDays(new Date(ongoingSit.end_date), now) : null;
      return `Votre garde est en cours${daysLeft !== null ? ` — fin dans ${daysLeft} jour${daysLeft > 1 ? "s" : ""}` : ""}.`;
    }
    const nextConfirmed = sits.find(s => s.status === "confirmed" && s.start_date && new Date(s.start_date) > now);
    if (nextConfirmed) {
      const daysUntil = differenceInDays(new Date(nextConfirmed.start_date), now);
      return `Votre prochaine garde commence dans ${daysUntil} jour${daysUntil > 1 ? "s" : ""}.`;
    }
    if (pendingAppCount > 0) return "Vous avez une nouvelle candidature à examiner.";
    return "Trouvez le gardien idéal pour vos animaux.";
  };

  const getBanner = (): { bg: string; text: string; label: string; to?: string; ctaLabel?: string } | null => {
    // Priorité 1 — ID non vérifiée
    if (verificationStatus !== "verified" && verificationStatus !== "pending")
      return { bg: "bg-amber-50 border-amber-200", text: "text-amber-800", label: "Vérifiez votre identité pour publier une annonce et recevoir des candidatures.", to: "/settings#verification", ctaLabel: "Vérifier mon identité →" };
    // Priorité 2 — Garde en cours
    if (ongoingSit) {
      const acceptedApp = (ongoingSit.applications || []).find((a: any) => a.status === "accepted");
      const sitterName = acceptedApp?.sitter_id && sitterProfiles[acceptedApp.sitter_id]?.first_name;
      const endLabel = ongoingSit.end_date ? format(new Date(ongoingSit.end_date), "d MMMM", { locale: fr }) : "";
      const nameStr = sitterName ? capitalize(sitterName) : "votre gardien";
      return { bg: "bg-green-50 border-green-200", text: "text-green-800", label: `Garde en cours — ${nameStr} s'occupe de vos animaux${endLabel ? ` jusqu'au ${endLabel}` : ""}.` };
    }
    // Priorité 3 — Candidatures non lues
    if (pendingAppCount > 0)
      return { bg: "bg-blue-50 border-blue-200", text: "text-blue-800", label: `Vous avez ${pendingAppCount} candidature${pendingAppCount > 1 ? "s" : ""} non lue${pendingAppCount > 1 ? "s" : ""}.`, to: "/sits", ctaLabel: "Voir les candidatures →" };
    return null;
  };
  const banner = getBanner();

  const getNextSitForPet = (pet: any) => {
    return sits
      .filter(s => s.property_id === pet.property_id && ["published", "confirmed"].includes(s.status) && s.start_date && new Date(s.start_date) >= now)
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())[0];
  };

  const getCTA = () => {
    if (activeSits.length === 0)
      return { text: "Publiez votre première annonce — c'est gratuit et ça prend 5 minutes", cta: "Publier une annonce", to: "/sits/create" };
    const noAppSit = activeSits.find(s => s.status === "published" && (!s.applications || s.applications.length === 0) && differenceInDays(now, new Date(s.created_at)) >= 7);
    if (noAppSit)
      return { text: "Votre annonce n'a pas encore de candidature. Enrichissez votre profil pour attirer les gardiens.", cta: "Voir mon profil", to: "/owner-profile" };
    return null;
  };
  const cta = getCTA();

  return (
    <div className="space-y-8">
      {/* Role activation banner */}
      <div className="px-5 md:px-8">
        <RoleActivationBanner userRole={user?.role || "owner"} />
      </div>
      <div className="relative overflow-hidden bg-primary rounded-b-3xl px-5 md:px-10 pt-6 md:pt-8 pb-5 md:pb-6 mb-6 md:mb-8">
        <div className="absolute right-0 top-0 opacity-[0.06] pointer-events-none">
          <svg width="280" height="200" viewBox="0 0 280 200">
            <ellipse cx="200" cy="100" rx="160" ry="100" fill="white"/>
            <rect x="80" y="50" width="100" height="90" fill="white" rx="6"/>
            <polygon points="80,50 130,15 180,50" fill="white"/>
          </svg>
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[3px] text-white/60 font-sans mb-1">
              Espace propriétaire
            </p>
            <h1 className="text-2xl md:text-4xl font-heading font-bold text-white leading-tight mb-1">
              Bonjour{user?.firstName ? `, ${capitalize(user.firstName)}` : ""} !
            </h1>
            <p className="text-sm text-white/75 font-sans">
              {getSubtitle()}
            </p>
          </div>
          <button
            onClick={() => navigate("/sits/create")}
            className="shrink-0 bg-white text-primary rounded-xl px-5 py-2.5 text-sm font-medium font-sans hover:bg-white/90 transition-colors w-full md:w-auto text-center"
          >
            + Publier une annonce
          </button>
        </div>
      </div>

      {/* ═══ Banner ═══ */}
      {banner && (
        <div className="px-5 md:px-8 -mt-4 mb-4">
          <div className={`p-4 rounded-xl border ${banner.bg} flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2`}>
            <p className={`text-sm font-medium ${banner.text}`}>{banner.label}</p>
            {banner.ctaLabel && banner.to && (
              <Link to={banner.to} className={`text-sm font-semibold ${banner.text} hover:underline shrink-0`}>
                {banner.ctaLabel}
              </Link>
            )}
          </div>
        </div>
      )}

      {/* ═══ 2. CANDIDATURES NON LUES ═══ */}
      <div className="px-5 md:px-8">
        {(() => {
          const unread = recentApps.filter(a => a.status === "pending" || a.status === "discussing");
          const read = recentApps.filter(a => a.status !== "pending" && a.status !== "discussing");

          const renderAppCard = (app: any) => {
            const sitter = sitterProfiles[app.sitter?.id] || app.sitter || {};
            const sitTitle = app.sit?.title || "";
            const dateRange = [
              app.sit?.start_date ? format(new Date(app.sit.start_date), "d MMM", { locale: fr }) : "",
              app.sit?.end_date ? format(new Date(app.sit.end_date), "d MMM", { locale: fr }) : "",
            ].filter(Boolean).join(" → ");
            const badges = sitter.id && sitterBadges[sitter.id] ? sitterBadges[sitter.id].sort((a: any, b: any) => b.count - a.count).slice(0, 2) : [];

            return (
              <div key={app.id} className="bg-card border border-border rounded-2xl p-4 flex gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/15 text-primary font-bold flex items-center justify-center text-lg font-sans shrink-0 overflow-hidden">
                  {sitter.avatar_url ? (
                    <img src={sitter.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    sitter.first_name?.charAt(0)?.toUpperCase() || "?"
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {capitalize(sitter.first_name)}
                  </p>
                  <p className="text-xs text-muted-foreground font-sans mt-0.5 truncate">
                    {sitTitle}{dateRange ? ` · ${dateRange}` : ""}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {sitter.avgNote ? (
                      <span className="text-xs font-sans text-amber-600 font-medium">
                        &#9733; {sitter.avgNote}
                      </span>
                    ) : (
                      <span className="text-xs font-sans text-muted-foreground italic">Nouveau</span>
                    )}
                    {/* Badges — migration en cours */}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => navigate(`/gardiens/${sitter.id}`)}
                      className="border border-border text-muted-foreground rounded-xl px-3 py-1.5 text-xs font-sans hover:bg-accent transition-colors"
                    >
                      Voir le profil
                    </button>
                    <button
                      onClick={() => navigate("/messages")}
                      className="bg-primary text-primary-foreground rounded-xl px-4 py-1.5 text-xs font-sans font-medium hover:bg-primary/90 transition-colors"
                    >
                      Répondre
                    </button>
                  </div>
                </div>
              </div>
            );
          };

          return (
            <DashSection title="Candidatures non lues" action={
              recentApps.length > 0 ? <Link to="/sits" className="text-xs text-primary hover:underline font-medium">Voir toutes</Link> : undefined
            }>
              {unread.length === 0 ? (
                <p className="text-sm text-muted-foreground font-sans italic py-4 text-center">Aucune candidature en attente</p>
              ) : (
                <div className="space-y-3">
                  {unread.map(renderAppCard)}
                </div>
              )}
              {read.length > 0 && (
                <Accordion type="single" collapsible className="mt-4">
                  <AccordionItem value="read" className="border rounded-xl">
                    <AccordionTrigger className="px-4 py-3 text-sm text-muted-foreground hover:no-underline">
                      Candidatures déjà consultées ({read.length})
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <div className="space-y-3">
                        {read.map(renderAppCard)}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}
            </DashSection>
          );
        })()}
      </div>

      {/* ═══ 3. STATS 4 COLONNES ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-5 md:px-8">
        <div className="bg-card border border-border rounded-2xl p-4 text-center">
          <p className="text-3xl font-heading font-bold text-foreground mb-1">{completedSits.length}</p>
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-sans">Gardes réalisées</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 text-center">
          {avgRating > 0 ? (
            <p className="text-3xl font-heading font-bold text-foreground mb-1">{avgRating} <span className="text-amber-500">&#9733;</span></p>
          ) : (
            <p className="text-sm text-muted-foreground mb-1 mt-2">Pas encore</p>
          )}
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-sans">Note moyenne</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 text-center">
          <p className="text-3xl font-heading font-bold text-foreground mb-1">{activeSits.length}</p>
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-sans">Annonces actives</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 text-center">
          <p className="text-3xl font-heading font-bold text-foreground mb-1">{trustedSitterCount}</p>
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-sans">Gardiens de confiance</p>
        </div>
      </div>

      {/* ═══ VOS BADGES ═══ */}
      <div className="px-5 md:px-8 mb-6 md:mb-8">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">Vos Badges</h2>
          <span className="text-xs text-muted-foreground">
            {activeBadgeCount} actif{activeBadgeCount > 1 ? 's' : ''} sur 12
          </span>
        </div>

        <div className="grid grid-cols-6 gap-2 mb-4">
          {PROPRIO_BADGE_IDS.map(id => {
            const userBadge = userBadges?.find(b => b.badge_id === id);
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
                        <p className="text-sm font-semibold text-foreground">
                          {capitalize(pet.name)}
                        </p>
                        <p className="text-xs text-muted-foreground font-sans">
                          {speciesLabel[pet.species] || capitalize(pet.species)}
                          {pet.breed ? ` · ${capitalizeWords(pet.breed)}` : ""}
                          {pet.age ? ` · ${pet.age} an${pet.age > 1 ? "s" : ""}` : ""}
                        </p>
                        {nextSit ? (
                          nextSit.status === "confirmed" ? (
                            <span className="text-xs font-sans bg-primary/10 text-primary rounded-md px-2 py-0.5 mt-1 inline-block">
                              Garde confirmée
                            </span>
                          ) : (
                            <span className="text-xs font-sans bg-amber-50 text-amber-700 rounded-md px-2 py-0.5 mt-1 inline-block">
                              Annonce en cours
                            </span>
                          )
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
        {(() => {
          const annoncesCount = sits.length;
          const gardesCount = completedSits.length;
          let resTitle = "";
          let resItems: ResourceItem[] = [];

          if (annoncesCount === 0) {
            resTitle = "Avant de publier votre première annonce";
            resItems = [
              { title: "Rédiger une bonne annonce", description: "Ce qui attire les bons gardiens en 48h.", href: "/actualites/rediger-bonne-annonce-house-sitting", icon: "maison" },
              { title: "Choisir son gardien : les bons critères", description: "Ce qui compte, ce qui ne sert à rien.", href: "/actualites/choisir-gardien-bons-criteres", icon: "proprio" },
              { title: "Préparer sa maison avant une garde", description: "Guide de la maison, sécurité, animaux.", href: "/actualites/preparer-maison-avant-garde", icon: "maison" },
            ];
          } else if (annoncesCount >= 1 && gardesCount === 0) {
            resTitle = "Préparer votre première garde";
            resItems = [
              { title: "Accueillir son gardien", description: "Remise des clés, visite, jour du départ.", href: "/actualites/accueillir-gardien-bonnes-pratiques", icon: "proprio" },
              { title: "Préparer sa maison avant une garde", description: "Ce qu'on oublie dans le guide de la maison.", href: "/actualites/preparer-maison-avant-garde", icon: "maison" },
              { title: "Que faire si quelque chose se passe mal", description: "Animal malade, panne, gardien défaillant.", href: "/actualites/que-faire-probleme-pendant-garde", icon: "proprio" },
            ];
          } else if (gardesCount >= 1) {
            resTitle = "Optimiser vos prochaines gardes";
            resItems = [
              { title: "Choisir son gardien : les bons critères", description: "Affinez votre sélection à chaque garde.", href: "/actualites/choisir-gardien-bons-criteres", icon: "proprio" },
              { title: "Que faire si quelque chose se passe mal", description: "Animal malade, panne, gardien défaillant.", href: "/actualites/que-faire-probleme-pendant-garde", icon: "proprio" },
              { title: "Accueillir son gardien", description: "Ce qui fait qu'un gardien prend soin de tout.", href: "/actualites/accueillir-gardien-bonnes-pratiques", icon: "proprio" },
            ];
          }

          return resItems.length > 0 ? <ResourceSection title={resTitle} resources={resItems} /> : null;
        })()}
      </div>

      {/* ═══ 6. BAS DE PAGE — 2 COLONNES ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-5 md:px-8">
        {/* Colonne gauche — Mes petites missions */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm font-semibold text-foreground">Mes petites missions</p>
            <Link to="/petites-missions" className="text-xs text-primary font-sans hover:underline">Voir tout</Link>
          </div>
          {myMissions.length === 0 ? (
            <p className="text-xs text-muted-foreground font-sans italic text-center py-4">
              Aucune mission pour le moment.
            </p>
          ) : (
            myMissions.map((m: any) => {
              const responseCount = m.small_mission_responses?.length || 0;
              const isCompleted = m.status === "completed";
              return (
                <Link key={m.id} to={`/petites-missions/${m.id}`} className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${isCompleted ? "bg-muted-foreground/30" : "bg-primary"}`} />
                  <p className={`text-xs font-sans flex-1 ${isCompleted ? "text-muted-foreground line-through" : "text-foreground"}`}>
                    {m.title}
                  </p>
                  <p className="text-xs text-muted-foreground font-sans shrink-0">
                    {isCompleted ? "Terminée" : `${responseCount} réponse${responseCount > 1 ? "s" : ""}`}
                  </p>
                </Link>
              );
            })
          )}
        </div>

        {/* Colonne droite — Échanges */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm font-semibold text-foreground">Échanges autour de vous</p>
            <Link to="/petites-missions" className="text-xs text-primary font-sans hover:underline">Voir tout</Link>
          </div>
          <p className="text-xs text-muted-foreground font-sans mb-3">
            Les échanges près de chez vous — en priorité ceux qui correspondent à vos compétences.
          </p>
          <div className="flex flex-col gap-2 mb-3">
            <button
              onClick={() => navigate("/petites-missions/creer")}
              className="w-full bg-primary text-white rounded-xl py-2.5 text-xs font-sans font-medium"
            >
              Publier un besoin
            </button>
            <button
              onClick={() => navigate("/petites-missions")}
              className="w-full border border-primary text-primary rounded-xl py-2.5 text-xs font-sans font-medium"
            >
              Proposer mon aide
            </button>
          </div>
          {smallMissions.length === 0 ? (
            <p className="text-xs text-muted-foreground font-sans italic text-center">
              Pas encore d'échange dans votre zone.
            </p>
          ) : (
            smallMissions.map((m: any) => (
              <Link key={m.id} to={`/petites-missions/${m.id}`} className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
                <div className="w-2 h-2 rounded-full shrink-0 bg-primary" />
                <p className="text-xs font-sans flex-1 text-foreground">{m.title}</p>
                <p className="text-xs text-muted-foreground font-sans shrink-0">{m.city || ""}</p>
              </Link>
            ))
          )}
        </div>
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
              {highlights.slice(0, 3).map((h: any) => (
                <div key={h.id} className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border">
                  {h.sitter?.avatar_url ? (
                    <img src={h.sitter.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold shrink-0">
                      {h.sitter?.first_name?.charAt(0) || "?"}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium">{capitalize(h.sitter?.first_name)}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{h.text}</p>
                  </div>
                  {h.photo_url && <img src={h.photo_url} alt="" className="w-16 h-12 rounded-lg object-cover shrink-0" />}
                </div>
              ))}
            </div>
          </DashSection>
        </div>
      )}
    </div>
  );
};

/* ── Shared ── */

const DashSection = ({ title, action, children }: {
  title: string; action?: React.ReactNode; children: React.ReactNode;
}) => (
  <div className="animate-fade-in">
    <div className="flex items-center justify-between mb-3">
      <h2 className="font-body text-base font-semibold">{title}</h2>
      {action}
    </div>
    {children}
  </div>
);

const EmptyCard = ({ icon: Icon, text, cta, to, hint }: { icon?: React.ElementType; text: string; cta?: string; to?: string; hint?: string }) => (
  <div className="p-8 rounded-xl border border-dashed border-border bg-accent/30 text-center space-y-3">
    {Icon && (
      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
        <Icon className="h-6 w-6 text-primary/60" />
      </div>
    )}
    <div>
      <p className="text-sm font-medium text-foreground/80">{text}</p>
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
    {cta && to && <Link to={to}><Button size="sm" className="mt-1">{cta}</Button></Link>}
  </div>
);

export default OwnerDashboard;
