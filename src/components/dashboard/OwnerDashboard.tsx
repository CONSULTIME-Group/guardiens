import { useState, useEffect, useRef } from "react";
import TwoColumnLayout from "@/components/layout/TwoColumnLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import OnboardingWelcome from "./OnboardingWelcome";
import NearbyEmergencySitters from "./NearbyEmergencySitters";
import MissionsNearbySection from "./MissionsNearbySection";
import ResourceSection from "@/components/shared/ResourceSection";
import type { ResourceItem } from "@/components/shared/ResourceCard";
import {
  Calendar, Star, Megaphone, Heart, ChevronRight, Plus, PawPrint,
  Users, Handshake, Newspaper, Home, CheckCircle2, RotateCcw,
} from "lucide-react";
import { capitalizeName } from "@/lib/capitalize";
import { Button } from "@/components/ui/button";
import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import BadgeShield from "@/components/badges/BadgeShield";
import { TooltipProvider } from "@/components/ui/tooltip";

const speciesLabel: Record<string, string> = {
  dog: "Chien", cat: "Chat", horse: "Cheval", bird: "Oiseau",
  rodent: "Rongeur", fish: "Poisson", reptile: "Reptile",
  farm_animal: "Animal de ferme", nac: "NAC",
};

/* ── Count-up hook ── */
const useCountUp = (target: number, duration = 600) => {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    const start = performance.now();
    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      setValue(Math.round(progress * target));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [target, duration]);
  return value;
};

const OwnerDashboard = () => {
  const { user } = useAuth();
  const [sits, setSits] = useState<any[]>([]);
  const [pets, setPets] = useState<any[]>([]);
  const [recentApps, setRecentApps] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [highlights, setHighlights] = useState<any[]>([]);
  const [smallMissions, setSmallMissions] = useState<any[]>([]);
  const [myMissions, setMyMissions] = useState<any[]>([]);
  const [verificationStatus, setVerificationStatus] = useState("not_submitted");
  const [missionMetrics, setMissionMetrics] = useState({ total: 0, completed: 0 });
  const [sitterBadges, setSitterBadges] = useState<Record<string, { badge_key: string; count: number }[]>>({});
  const [trustedSitterCount, setTrustedSitterCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingChecks, setOnboardingChecks] = useState({ hasName: false, hasAvatar: false, hasBio: false, hasIdentity: false, hasProperty: false, hasPets: false, hasSit: false });
  const [nearbyEmergencyCount, setNearbyEmergencyCount] = useState(0);

  useEffect(() => {
    supabase.from("emergency_sitter_profiles").select("user_id", { count: "exact", head: true }).eq("is_active", true).then(({ count }) => {
      setNearbyEmergencyCount(count || 0);
    });
  }, []);

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

      // Onboarding checks
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

      // Pets
      const propIds = (propsRes.data || []).map((p: any) => p.id);
      if (propIds.length > 0) {
        const { data } = await supabase.from("pets").select("*").in("property_id", propIds);
        setPets(data || []);
        setOnboardingChecks(prev => ({ ...prev, hasPets: (data || []).length > 0 }));
      }

      // Recent applications
      const sitIds = sitsData.map((s: any) => s.id);
      if (sitIds.length > 0) {
        const { data: apps } = await supabase
          .from("applications")
          .select("*, sitter:profiles!applications_sitter_id_fkey(id, first_name, avatar_url), sit:sits(title, start_date, end_date)")
          .in("sit_id", sitIds)
          .order("created_at", { ascending: false })
          .limit(3);
        setRecentApps(apps || []);

        // Load badges for sitters in applications
        const sitterIds = [...new Set((apps || []).map((a: any) => a.sitter?.id).filter(Boolean))];
        if (sitterIds.length > 0) {
          const { data: badgeData } = await supabase
            .from("badge_attributions")
            .select("receiver_id, badge_key")
            .in("receiver_id", sitterIds);
          const grouped: Record<string, Record<string, number>> = {};
          (badgeData || []).forEach((b: any) => {
            if (!grouped[b.receiver_id]) grouped[b.receiver_id] = {};
            grouped[b.receiver_id][b.badge_key] = (grouped[b.receiver_id][b.badge_key] || 0) + 1;
          });
          const result: Record<string, { badge_key: string; count: number }[]> = {};
          Object.entries(grouped).forEach(([uid, badges]) => {
            result[uid] = Object.entries(badges).map(([k, c]) => ({ badge_key: k, count: c }));
          });
          setSitterBadges(result);
        }
      }

      // Trusted sitters (2+ completed sits with same sitter)
      const completedSitsData = sitsData.filter((s: any) => s.status === "completed");
      const sitterSitCounts: Record<string, number> = {};
      completedSitsData.forEach((s: any) => {
        (s.applications || [])
          .filter((a: any) => a.status === "accepted")
          .forEach((a: any) => { sitterSitCounts[a.sitter_id] = (sitterSitCounts[a.sitter_id] || 0) + 1; });
      });
      const trustedCount = Object.values(sitterSitCounts).filter(c => c >= 2).length;
      setTrustedSitterCount(trustedCount);

      // My own missions + count all
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

  /* ── Ongoing sit ── */
  const now = new Date();
  const ongoingSit = sits.find(s => s.status === "confirmed" && s.start_date && new Date(s.start_date) <= now && s.end_date && new Date(s.end_date) >= now);

  /* ── Subtitle ── */
  const getSubtitle = () => {
    if (user && user.profileCompletion < 100) return { text: `Profil complété à ${user.profileCompletion}% — Complétez votre profil →`, to: "/owner-profile" };
    if (verificationStatus !== "verified" && verificationStatus !== "pending") return { text: "Vérifiez votre identité — ça rassure les gardiens →", to: "/settings#verification" };
    if (activeSits.length === 0) return { text: "Publiez votre première annonce pour trouver un gardien →", to: "/sits/create" };
    return { text: "Vos animaux sont entre bonnes mains.", to: "" };
  };
  const subtitle = getSubtitle();

  /* ── Banner ── */
  const getBanner = () => {
    if (verificationStatus !== "verified" && verificationStatus !== "pending")
      return { bg: "bg-[#FEF3C7] border-amber-200", text: "text-amber-800", label: "Vérifier mon identité", to: "/settings#verification" };
    if (ongoingSit) {
      const petNames = pets.map(p => p.name).filter(Boolean).join(", ");
      return { bg: "bg-[#D8F3DC] border-green-200", text: "text-green-800", label: `Garde en cours — un gardien veille sur ${petNames || "vos animaux"}`, to: `/sits/${ongoingSit.id}` };
    }
    if (pendingAppCount > 0)
      return { bg: "bg-[#DBEAFE] border-blue-200", text: "text-blue-800", label: `Vous avez ${pendingAppCount} nouvelle${pendingAppCount > 1 ? "s" : ""} candidature${pendingAppCount > 1 ? "s" : ""}`, to: "/sits" };
    return null;
  };
  const banner = getBanner();

  /* ── Next sit per pet ── */
  const getNextSitForPet = (pet: any) => {
    return sits
      .filter(s => s.property_id === pet.property_id && ["published", "confirmed"].includes(s.status) && s.start_date && new Date(s.start_date) >= now)
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())[0];
  };

  /* ── CTA logic ── */
  const getCTA = () => {
    if (activeSits.length === 0)
      return { text: "Publiez votre première annonce — c'est gratuit et ça prend 5 minutes", cta: "Publier une annonce", to: "/sits/create" };
    const noAppSit = activeSits.find(s => s.status === "published" && (!s.applications || s.applications.length === 0) && differenceInDays(now, new Date(s.created_at)) >= 7);
    if (noAppSit)
      return { text: "Votre annonce n'a pas encore de candidature. Enrichissez votre profil pour attirer les gardiens →", cta: "Voir mon profil", to: "/owner-profile" };
    return null;
  };
  const cta = getCTA();

  const totalReceivedApps = sits.reduce((sum: number, s: any) => sum + (s.applications?.filter((a: any) => a.status === "pending").length || 0), 0);

  const leftContent = (
    <div className="space-y-5">
      {/* BLOC 1 — Statut profil */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-3">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.firstName} className="w-16 h-16 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center font-heading text-xl font-bold shrink-0">
              {user?.firstName?.charAt(0) || "?"}
            </div>
          )}
          <div className="min-w-0">
            <p className="font-heading font-semibold text-sm">{capitalizeName(user?.firstName) || "Propriétaire"}</p>
            {user && (
              <p className="text-xs text-muted-foreground">{(user as any).city || ""}</p>
            )}
          </div>
        </div>
        {user && user.profileCompletion < 100 ? (
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Profil</span>
              <span className="font-medium">{user.profileCompletion}% complété</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${user.profileCompletion}%` }} />
            </div>
          </div>
        ) : (
          <p className="text-xs text-primary font-medium">✓ Profil complet</p>
        )}
        {user && user.profileCompletion < 60 && (
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
            <p className="text-xs text-amber-800 dark:text-amber-200">Complétez votre profil pour attirer les gardiens</p>
            <Link to="/owner-profile" className="text-xs font-medium text-primary hover:underline mt-1 inline-block">Compléter →</Link>
          </div>
        )}
      </div>

      {/* BLOC 2 — 4 métriques */}
      <div className="grid grid-cols-2 gap-3">
        <MiniMetric label="Gardes réalisées" value={completedSits.length} />
        <MiniMetric label="Annonces actives" value={activeSits.length} />
        <MiniMetric label="Candidatures reçues" value={totalReceivedApps} />
        <MiniMetric label="Gardiens de confiance" value={trustedSitterCount} />
      </div>

      {/* BLOC 3 — Action rapide */}
      {activeSits.length === 0 ? (
        <Link to="/sits/create">
          <Button className="w-full rounded-xl py-3 gap-2">
            <Plus className="h-4 w-4" /> Publier une annonce →
          </Button>
        </Link>
      ) : (
        <Link to="/sits/create">
          <Button variant="outline" className="w-full rounded-xl py-3 gap-2">
            <Plus className="h-4 w-4" /> Nouvelle annonce →
          </Button>
        </Link>
      )}

      {/* BLOC 4 — Gardiens d'urgence proches */}
      <div className="rounded-xl border border-border bg-card p-3 space-y-1">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{nearbyEmergencyCount}</span> gardien{nearbyEmergencyCount > 1 ? "s" : ""} d'urgence disponible{nearbyEmergencyCount > 1 ? "s" : ""}
        </p>
        <Link to="/recherche-gardiens" className="text-xs text-primary hover:underline font-medium">Voir →</Link>
      </div>
    </div>
  );

  const rightContent = (
    <div className="space-y-8">
      {/* Mes animaux */}
      <DashSection title="Mes animaux" action={
        <Link to="/owner-profile" className="text-xs text-primary hover:underline font-medium">Gérer →</Link>
      }>
        {pets.length === 0 ? (
          <EmptyCard icon={PawPrint} text="Aucun animal enregistré" hint="Ajoutez vos compagnons pour attirer les bons gardiens" cta="Ajouter un animal" to="/owner-profile" />
        ) : (
          <div className="space-y-2">
            {pets.map(pet => {
              const nextSit = getNextSitForPet(pet);
              const daysUntil = nextSit?.start_date ? differenceInDays(new Date(nextSit.start_date), now) : null;
              return (
                <div key={pet.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
                  {pet.photo_url ? (
                    <img src={pet.photo_url} alt={pet.name} className="w-[50px] h-[50px] rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-[50px] h-[50px] rounded-full bg-accent flex items-center justify-center shrink-0">
                      <PawPrint className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{pet.name || "Sans nom"}
                      <span className="text-xs text-muted-foreground ml-2">
                        {speciesLabel[pet.species] || pet.species}{pet.breed ? ` · ${pet.breed}` : ""}{pet.age ? ` · ${pet.age} an${pet.age > 1 ? "s" : ""}` : ""}
                      </span>
                    </p>
                    {nextSit ? (
                      <Link to={`/sits/${nextSit.id}`} className="text-xs text-primary hover:underline flex items-center gap-1 mt-0.5">
                        <Calendar className="h-3 w-3" />
                        Prochaine garde {daysUntil !== null && daysUntil >= 0
                          ? daysUntil === 0 ? "aujourd'hui" : `dans ${daysUntil} jour${daysUntil > 1 ? "s" : ""}`
                          : ""}
                      </Link>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-0.5">Aucune garde prévue</p>
                    )}
                  </div>
                </div>
              );
            })}
            <Link to="/owner-profile" className="flex items-center gap-2 px-3 py-2 text-xs text-primary hover:underline">
              <Plus className="h-3.5 w-3.5" /> Ajouter un animal
            </Link>
          </div>
        )}
      </DashSection>

      {/* Candidatures récentes */}
      <DashSection title="Candidatures récentes" action={
        recentApps.length > 0 ? <Link to="/sits" className="text-xs text-primary hover:underline font-medium">Voir toutes mes annonces →</Link> : undefined
      }>
        {recentApps.length === 0 ? (
          <EmptyCard icon={Users} text="Pas encore de candidature reçue" hint="Publiez une annonce et les gardiens viendront à vous" cta="Publier une annonce" to="/sits/create" />
        ) : (
          <div className="space-y-2">
            {recentApps.map(app => (
              <Link key={app.id} to={`/sits/${app.sit_id}`} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:bg-accent/50 transition-colors">
                {app.sitter?.avatar_url ? (
                  <img src={app.sitter.avatar_url} alt="" className="w-[50px] h-[50px] rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-[50px] h-[50px] rounded-full bg-muted flex items-center justify-center text-sm font-bold shrink-0">
                    {app.sitter?.first_name?.charAt(0) || "?"}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{app.sitter?.first_name || "Gardien"}</p>
                  </div>
                  {app.sitter?.id && sitterBadges[app.sitter.id] && <TooltipProvider><div className="flex gap-1">{sitterBadges[app.sitter.id].slice(0, 2).map((b: any) => <BadgeShield key={b.badge_key} badgeKey={b.badge_key} count={b.count} size="sm" showLabel={false} />)}</div></TooltipProvider>}
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{app.sit?.title} · {app.sit?.start_date ? format(new Date(app.sit.start_date), "d MMM", { locale: fr }) : ""}</p>
                </div>
                <Button size="sm" variant="outline" className="shrink-0 text-xs">Voir</Button>
              </Link>
            ))}
          </div>
        )}
      </DashSection>

      {/* Contextual resources */}
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

      {/* Échanges autour de toi */}
      <MissionsNearbySection />

      {/* 6. Nearby emergency sitters */}
      <NearbyEmergencySitters />

      {/* 7. CTA */}
      {cta && (
        <div className="p-6 rounded-xl bg-primary/5 border-2 border-dashed border-primary/30 text-center">
          <p className="text-sm text-muted-foreground mb-3">{cta.text}</p>
          <Link to={cta.to}><Button>{cta.cta}</Button></Link>
        </div>
      )}

      {/* 7. Coups de cœur */}
      {highlights.length > 0 && (
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
                  <p className="text-xs font-medium">{h.sitter?.first_name}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{h.text}</p>
                </div>
                {h.photo_url && <img src={h.photo_url} alt="" className="w-16 h-12 rounded-lg object-cover shrink-0" />}
              </div>
            ))}
          </div>
        </DashSection>
      )}

      {/* 8. Mes petites missions */}
      {myMissions.length > 0 && (
        <DashSection title="Mes petites missions" action={
          <Link to="/petites-missions" className="text-xs text-primary hover:underline font-medium">Voir tout →</Link>
        }>
          <div className="space-y-2">
            {myMissions.map((m: any) => {
              const responseCount = m.small_mission_responses?.length || 0;
              const pendingCount = m.small_mission_responses?.filter((r: any) => r.status === "pending").length || 0;
              return (
                <Link key={m.id} to={`/petites-missions/${m.id}`} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:bg-accent/50 transition-colors">
                  <Handshake className="h-5 w-5 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{m.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.status === "completed" ? "✅ Terminée" : m.status === "in_progress" ? "🔄 En cours" : `${responseCount} réponse${responseCount > 1 ? "s" : ""}`}
                      {pendingCount > 0 && <span className="ml-1 text-primary font-medium">· {pendingCount} en attente</span>}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </Link>
              );
            })}
          </div>
        </DashSection>
      )}

    </div>
  );

  return (
    <TwoColumnLayout
      leftWidth={260}
      leftContent={leftContent}
      rightContent={rightContent}
    />
  );
};

const MiniMetric = ({ label, value }: { label: string; value: number | string }) => (
  <div className="bg-muted/50 rounded-xl p-3">
    <p className="text-2xl font-semibold">{typeof value === "number" && value === 0 ? "—" : value}</p>
    <p className="text-xs text-muted-foreground">{label}</p>
  </div>
);

/* ── Shared ── */

const StatCard = ({ icon: Icon, iconColor, label, value, delay, isDecimal, emptyMsg }: {
  icon: React.ElementType; iconColor: string; label: string; value: number; delay: number; isDecimal?: boolean; emptyMsg?: string;
}) => {
  const displayed = useCountUp(isDecimal ? Math.round(value * 10) : value);
  const formatted = isDecimal ? (displayed / 10).toFixed(1) : String(displayed);

  return (
    <div
      className="p-4 rounded-xl border border-border bg-card hover:shadow-md transition-shadow animate-fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <Icon className={`h-4 w-4 ${iconColor} mb-2`} strokeWidth={1.8} />
      <p className="font-heading text-[28px] font-bold leading-tight">
        {value === 0 && emptyMsg ? "—" : formatted}
      </p>
      <p className="text-xs text-muted-foreground mt-1">{emptyMsg || label}</p>
    </div>
  );
};

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
