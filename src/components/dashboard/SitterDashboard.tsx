import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import OnboardingWelcome from "./OnboardingWelcome";
import EmergencyActivation from "./EmergencyActivation";
import EmergencyDashSection from "./EmergencyDashSection";
import EmergencyEligibility from "./EmergencyEligibility";
import {
  Home, Star, Mail, Award, CircleDot, ChevronRight, Search,
  Send as SendIcon, Eye, CheckCircle2, XCircle, MessageSquare,
  Calendar, Handshake, Newspaper, PawPrint, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { format, differenceInDays, differenceInHours } from "date-fns";
import { fr } from "date-fns/locale";

/* ── status config ── */
const appStatusConfig: Record<string, { label: string; icon: React.ElementType; bg: string; text: string }> = {
  pending:    { label: "Envoyée",    icon: SendIcon,     bg: "bg-muted",           text: "text-muted-foreground" },
  viewed:     { label: "Vue",        icon: Eye,          bg: "bg-[#DBEAFE]",       text: "text-blue-700" },
  discussing: { label: "En discussion", icon: MessageSquare, bg: "bg-[#DBEAFE]",  text: "text-blue-700" },
  accepted:   { label: "Acceptée",   icon: CheckCircle2, bg: "bg-[#D8F3DC]",       text: "text-green-700" },
  rejected:   { label: "Déclinée",   icon: XCircle,      bg: "bg-[#FEE2E2]",       text: "text-red-700" },
  cancelled:  { label: "Annulée",    icon: XCircle,      bg: "bg-muted",           text: "text-muted-foreground" },
};

/* ── Count-up animation hook ── */
const useCountUp = (target: number, duration = 600) => {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
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

const SitterDashboard = () => {
  const { user } = useAuth();
  const [myApplications, setMyApplications] = useState<any[]>([]);
  const [nearbyListings, setNearbyListings] = useState<any[]>([]);
  const [smallMissions, setSmallMissions] = useState<any[]>([]);
  const [myMissions, setMyMissions] = useState<any[]>([]);
  const [myMissionResponses, setMyMissionResponses] = useState<any[]>([]);
  const [articles, setArticles] = useState<any[]>([]);
  const [isAvailable, setIsAvailable] = useState(false);
  const [metrics, setMetrics] = useState({ completed: 0, avgRating: 0, pendingApps: 0, badgeCount: 0, missionsPosted: 0, missionsHelped: 0 });
  const [verificationStatus, setVerificationStatus] = useState<string>("not_submitted");
  const [ongoingSit, setOngoingSit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingChecks, setOnboardingChecks] = useState({ hasName: false, hasAvatar: false, hasBio: false, hasIdentity: false, hasSitterProfile: false });
  const [emergencyEligible, setEmergencyEligible] = useState(false);
  const [hasEmergencyProfile, setHasEmergencyProfile] = useState(false);
  const [emergencyBlocked, setEmergencyBlocked] = useState<string | null>(null);
  const [showEmergencyForm, setShowEmergencyForm] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [appsRes, sitterRes, profileRes, reviewsRes, listingsRes, badgesRes, missionsRes, articlesRes] = await Promise.all([
        supabase.from("applications").select("*, sit:sits(id, title, start_date, end_date, status, user_id, property_id, properties:property_id(photos))").eq("sitter_id", user.id).order("created_at", { ascending: false }),
        supabase.from("sitter_profiles").select("is_available").eq("user_id", user.id).single(),
        supabase.from("profiles").select("identity_verification_status").eq("id", user.id).single(),
        supabase.from("reviews").select("overall_rating").eq("reviewee_id", user.id).eq("published", true),
        supabase.from("sits").select("id, title, start_date, end_date, user_id, property_id, status, created_at").eq("status", "published").order("created_at", { ascending: false }).limit(6),
        supabase.from("badge_attributions").select("id").eq("receiver_id", user.id),
        supabase.from("small_missions").select("id, title, category, exchange, city, created_at").eq("status", "open").order("created_at", { ascending: false }).limit(2),
        supabase.from("articles").select("id, title, slug, cover_image_url, excerpt").eq("published", true).order("published_at", { ascending: false }).limit(2),
      ]);

      setVerificationStatus(profileRes.data?.identity_verification_status || "not_submitted");
      setIsAvailable(sitterRes.data?.is_available || false);

      // Onboarding checks
      const fullProfileRes = await supabase.from("profiles").select("first_name, avatar_url, bio, identity_verification_status").eq("id", user.id).single();
      const p = fullProfileRes.data;
      const hasName = !!(p?.first_name);
      const hasAvatar = !!(p?.avatar_url);
      const hasBio = !!(p?.bio && p.bio.length > 10);
      const hasIdentity = p?.identity_verification_status === "verified" || p?.identity_verification_status === "pending";
      const hasSitterProfile = !!(sitterRes.data);
      setOnboardingChecks({ hasName, hasAvatar, hasBio, hasIdentity, hasSitterProfile });

      const dismissed = localStorage.getItem("onboarding_sitter_dismissed");
      if (!dismissed && user.profileCompletion < 50) {
        setShowOnboarding(true);
      }

      const apps = appsRes.data || [];
      setMyApplications(apps);

      // Metrics
      const reviews = reviewsRes.data || [];
      const acceptedApps = apps.filter((a: any) => a.status === "accepted");
      const completedCount = acceptedApps.filter((a: any) => a.sit?.status === "completed").length;
      const avg = reviews.length > 0 ? reviews.reduce((s: number, r: any) => s + r.overall_rating, 0) / reviews.length : 0;
      const pendingApps = apps.filter((a: any) => a.status === "pending").length;
      setMetrics({ completed: completedCount, avgRating: Math.round(avg * 10) / 10, pendingApps, badgeCount: badgesRes.data?.length || 0, missionsPosted: 0, missionsHelped: 0 });

      // Ongoing sit
      const now = new Date();
      const ongoing = acceptedApps.find((a: any) => {
        const s = a.sit;
        return s && s.start_date && new Date(s.start_date) <= now && s.end_date && new Date(s.end_date) >= now;
      });
      if (ongoing) {
        const ownerRes = await supabase.from("profiles").select("first_name").eq("id", ongoing.sit.user_id).single();
        setOngoingSit({ ...ongoing.sit, ownerName: ownerRes.data?.first_name, daysLeft: differenceInDays(new Date(ongoing.sit.end_date), now) });
      }

      // Nearby listings (exclude own)
      setNearbyListings((listingsRes.data || []).filter((s: any) => s.user_id !== user.id).slice(0, 3));
      setSmallMissions(missionsRes.data || []);
      setArticles(articlesRes.data || []);

      // My own missions + missions I responded to
      const [myMissionsRes, myResponsesRes, allMyMissionsRes, allMyResponsesRes] = await Promise.all([
        supabase.from("small_missions").select("id, title, category, status, created_at, small_mission_responses(id, status)").eq("user_id", user.id).order("created_at", { ascending: false }).limit(3),
        supabase.from("small_mission_responses").select("id, status, created_at, mission:small_missions(id, title, category, status, user_id)").eq("responder_id", user.id).order("created_at", { ascending: false }).limit(3),
        supabase.from("small_missions").select("id").eq("user_id", user.id),
        supabase.from("small_mission_responses").select("id").eq("responder_id", user.id).eq("status", "accepted"),
      ]);
      setMyMissions(myMissionsRes.data || []);
      setMyMissionResponses(myResponsesRes.data || []);

      setMetrics(prev => ({ ...prev, missionsPosted: allMyMissionsRes.data?.length || 0, missionsHelped: allMyResponsesRes.data?.length || 0 }));

      // Emergency sitter eligibility
      const { data: emProfile } = await supabase.from("emergency_sitter_profiles").select("id, blocked_until").eq("user_id", user.id).maybeSingle();
      if (emProfile) {
        const blockedUntil = (emProfile as any).blocked_until;
        if (blockedUntil && new Date(blockedUntil) > new Date()) {
          setEmergencyBlocked(blockedUntil);
        } else {
          setHasEmergencyProfile(true);
        }
      } else {
        const completedSits = acceptedApps.filter((a: any) => a.sit?.status === "completed").length;
        const avg = reviews.length > 0 ? reviews.reduce((s: number, r: any) => s + r.overall_rating, 0) / reviews.length : 0;
        const cancellations = (await supabase.from("profiles").select("cancellation_count, identity_verified").eq("id", user.id).single()).data;
        if (completedSits >= 5 && avg >= 4.7 && (cancellations?.cancellation_count || 0) === 0 && cancellations?.identity_verified) {
          setEmergencyEligible(true);
        }
      }

      setLoading(false);
    };
    load();
  }, [user]);

  if (loading) return <div className="p-6 text-muted-foreground">Chargement...</div>;

  if (showOnboarding) {
    return (
      <OnboardingWelcome
        role="sitter"
        checks={onboardingChecks}
        onDismiss={() => {
          localStorage.setItem("onboarding_sitter_dismissed", "1");
          setShowOnboarding(false);
        }}
      />
    );
  }

  /* ── Dynamic subtitle ── */
  const getSubtitle = () => {
    if (user && user.profileCompletion < 100) return { text: `Profil complété à ${user.profileCompletion}% — Complétez votre profil →`, to: "/profile" };
    if (verificationStatus !== "verified" && verificationStatus !== "pending") return { text: "Vérifiez votre identité pour 3× plus de réponses →", to: "/settings#verification" };
    return { text: "Vous êtes visible et prêt à garder.", to: "" };
  };
  const subtitle = getSubtitle();

  /* ── Priority banner ── */
  const getBanner = () => {
    if (verificationStatus !== "verified" && verificationStatus !== "pending")
      return { bg: "bg-[#FEF3C7] border-amber-200", text: "text-amber-800", label: "Vérifier mon identité", to: "/settings#verification" };
    if (ongoingSit)
      return { bg: "bg-[#D8F3DC] border-green-200", text: "text-green-800", label: `Garde en cours chez ${ongoingSit.ownerName || "…"} — ${ongoingSit.daysLeft} jour${ongoingSit.daysLeft > 1 ? "s" : ""} restant${ongoingSit.daysLeft > 1 ? "s" : ""}`, to: `/sits/${ongoingSit.id}` };
    return null;
  };
  const banner = getBanner();

  return (
    <div className="space-y-8">
      {/* 1. Header */}
      <div>
        <h1 className="font-heading text-2xl md:text-3xl font-bold">
          Bonjour{user?.firstName ? `, ${user.firstName}` : ""} 👋
        </h1>
        {subtitle.to ? (
          <Link to={subtitle.to} className="text-sm text-primary hover:underline mt-1 inline-block">{subtitle.text}</Link>
        ) : (
          <p className="text-sm text-muted-foreground mt-1">{subtitle.text}</p>
        )}
      </div>

      {/* 2. Priority banner */}
      {banner && (
        <Link to={banner.to} className={`block p-4 rounded-xl border ${banner.bg} hover:shadow-md transition-shadow`}>
          <p className={`text-sm font-medium ${banner.text}`}>{banner.label}</p>
        </Link>
      )}

      {/* 3. Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard icon={Home} iconColor="text-primary" label="Gardes réalisées" value={metrics.completed} delay={0} emptyMsg={metrics.completed === 0 ? "Votre première garde vous attend !" : undefined} />
        <StatCard icon={Star} iconColor="text-amber-500" label="Note moyenne" value={metrics.avgRating} delay={100} isDecimal emptyMsg={metrics.avgRating === 0 ? "Pas encore d'avis" : undefined} />
        <StatCard icon={Mail} iconColor="text-blue-500" label="Candidatures en attente" value={metrics.pendingApps} delay={200} />
        <StatCard icon={Award} iconColor="text-purple-500" label="Badges reçus" value={metrics.badgeCount} delay={300} />
        <div className="p-4 rounded-xl border border-border bg-card hover:shadow-md transition-shadow animate-fade-in" style={{ animationDelay: "400ms" }}>
          <Handshake className="h-4 w-4 text-primary mb-2" strokeWidth={1.8} />
          <div className="flex items-baseline gap-3">
            <div>
              <p className="font-heading text-[28px] font-bold leading-tight">{metrics.missionsPosted}</p>
              <p className="text-xs text-muted-foreground mt-1">Proposées</p>
            </div>
            <span className="text-muted-foreground/30 text-lg">/</span>
            <div>
              <p className="font-heading text-[28px] font-bold leading-tight">{metrics.missionsHelped}</p>
              <p className="text-xs text-muted-foreground mt-1">Coups de main</p>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5">Petites missions</p>
        </div>
      </div>

      {/* 4. Availability toggle */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <CircleDot className={`h-5 w-5 ${isAvailable ? "text-primary" : "text-muted-foreground"}`} />
          <div>
            <p className="font-semibold text-sm">Je suis disponible</p>
            <p className="text-xs text-muted-foreground">Les propriétaires peuvent vous trouver</p>
          </div>
        </div>
        <Switch
          checked={isAvailable}
          onCheckedChange={async (v) => {
            setIsAvailable(v);
            await supabase.from("sitter_profiles").update({ is_available: v }).eq("user_id", user!.id);
          }}
        />
      </div>

      {/* 4b. Emergency sitter section */}
      {hasEmergencyProfile && <EmergencyDashSection />}

      {/* 4c. Emergency sitter invitation */}
      {emergencyEligible && !hasEmergencyProfile && !showEmergencyForm && (
        <div className="rounded-xl border-2 border-amber-300 dark:border-amber-700 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-900/10 p-5 space-y-3">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow">
              <Zap className="h-4 w-4" fill="currentColor" />
            </span>
            <div>
              <p className="font-heading font-semibold text-sm">Vous êtes éligible au statut Gardien d'urgence !</p>
              <p className="text-xs text-muted-foreground">Mobilisable rapidement, fiable, expérimenté. Visibilité prioritaire + badge distinctif.</p>
            </div>
          </div>
          <Button onClick={() => setShowEmergencyForm(true)} className="gap-2 w-full">
            <Zap className="h-4 w-4" /> Activer le mode Gardien d'urgence
          </Button>
        </div>
      )}

      {emergencyEligible && !hasEmergencyProfile && showEmergencyForm && (
        <div className="rounded-xl border-2 border-amber-300 dark:border-amber-700 bg-card p-5">
          <h3 className="font-heading font-semibold mb-4 flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" /> Activer le mode Gardien d'urgence
          </h3>
          <EmergencyActivation onActivated={() => { setHasEmergencyProfile(true); setShowEmergencyForm(false); }} />
        </div>
      )}

      {/* 5. My applications */}
      <DashSection title="Mes candidatures" action={
        myApplications.length > 0 ? <Link to="/sits" className="text-xs text-primary hover:underline font-medium">Voir tout →</Link> : undefined
      }>
        {myApplications.length === 0 ? (
          <EmptyCard icon={Search} text="Vous n'avez pas encore candidaté" hint="Parcourez les annonces et trouvez la garde idéale" cta="Explorer les annonces" to="/search" />
        ) : (
          <div className="space-y-2">
            {myApplications.slice(0, 3).map(app => {
              const cfg = appStatusConfig[app.status] || appStatusConfig.pending;
              const StatusIcon = cfg.icon;
              const photo = app.sit?.properties?.photos?.[0];
              return (
                <Link key={app.id} to={`/sits/${app.sit_id}`} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:bg-accent/50 transition-colors">
                  {photo ? (
                    <img src={photo} alt="" className="w-[50px] h-[50px] rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="w-[50px] h-[50px] rounded-lg bg-accent flex items-center justify-center shrink-0">
                      <Home className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{app.sit?.title || "Garde"}</p>
                    <p className="text-xs text-muted-foreground">
                      {app.sit?.start_date && app.sit?.end_date
                        ? `${format(new Date(app.sit.start_date), "d MMM", { locale: fr })} → ${format(new Date(app.sit.end_date), "d MMM", { locale: fr })}`
                        : ""}
                    </p>
                  </div>
                  <span className={`flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full ${cfg.bg} ${cfg.text}`}>
                    <StatusIcon className="h-3 w-3" /> {cfg.label}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </DashSection>

      {/* 6. Nearby listings */}
      <DashSection title="Annonces près de chez vous" action={
        <Link to="/search" className="text-xs text-primary hover:underline font-medium">Voir tout →</Link>
      }>
        {nearbyListings.length === 0 ? (
          <EmptyCard icon={Search} text="Aucune annonce dans votre zone pour le moment" hint="Activez le mode disponible pour être contacté directement par les propriétaires" />
        ) : (
          <div className="space-y-2">
            {nearbyListings.map(sit => {
              const isNew = differenceInHours(new Date(), new Date(sit.created_at)) < 48;
              return (
                <Link key={sit.id} to={`/sits/${sit.id}`} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:bg-accent/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{sit.title}</p>
                      {isNew && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary text-primary-foreground">Nouveau</span>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {sit.start_date && sit.end_date
                        ? `${format(new Date(sit.start_date), "d MMM", { locale: fr })} → ${format(new Date(sit.end_date), "d MMM", { locale: fr })}`
                        : ""}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </Link>
              );
            })}
          </div>
        )}
      </DashSection>

      {/* 7. Mes petites missions */}
      {(myMissions.length > 0 || myMissionResponses.length > 0) && (
        <DashSection title="Mes petites missions" action={
          <Link to="/petites-missions" className="text-xs text-primary hover:underline font-medium">Voir tout →</Link>
        }>
          {myMissions.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Missions proposées</p>
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
            </div>
          )}
          {myMissionResponses.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Missions auxquelles j'ai répondu</p>
              <div className="space-y-2">
                {myMissionResponses.map((r: any) => {
                  const statusConfig: Record<string, { label: string; color: string }> = {
                    pending: { label: "En attente", color: "text-muted-foreground" },
                    accepted: { label: "Acceptée", color: "text-green-600" },
                    declined: { label: "Déclinée", color: "text-red-500" },
                  };
                  const cfg = statusConfig[r.status] || statusConfig.pending;
                  return (
                    <Link key={r.id} to={`/petites-missions/${r.mission?.id}`} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:bg-accent/50 transition-colors">
                      <Handshake className="h-5 w-5 text-amber-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{r.mission?.title}</p>
                        <p className={`text-xs ${cfg.color}`}>{cfg.label}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </DashSection>
      )}

      {/* 8. Petites missions à proximité */}
      <DashSection title="Coups de main près de chez vous" action={
        <Link to="/petites-missions" className="text-xs text-primary hover:underline font-medium">Voir tout →</Link>
      }>
        {smallMissions.length === 0 ? (
          <EmptyCard icon={Handshake} text="Aucune petite mission dans votre zone" hint="Proposez vos services ou revenez bientôt" cta="Voir les missions" to="/petites-missions" />
        ) : (
          <div className="space-y-2">
            {smallMissions.map((m: any) => (
              <Link key={m.id} to={`/petites-missions/${m.id}`} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:bg-accent/50 transition-colors">
                <Handshake className="h-5 w-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{m.title}</p>
                  {m.exchange && <p className="text-xs text-muted-foreground">En échange : {m.exchange}</p>}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </DashSection>

      {/* 8. Articles */}
      <DashSection title="Conseils pour vous">
        {articles.length === 0 ? (
          <EmptyCard icon={Newspaper} text="Les articles arrivent bientôt" hint="Conseils, astuces et histoires de gardiens" />
        ) : (
          <div className="space-y-2">
            {articles.map((a: any) => (
              <Link key={a.id} to={`/actualites/${a.slug}`} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:bg-accent/50 transition-colors">
                {a.cover_image_url ? (
                  <img src={a.cover_image_url} alt="" className="w-16 h-12 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-16 h-12 rounded-lg bg-accent flex items-center justify-center shrink-0">
                    <Newspaper className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{a.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">{a.excerpt}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </DashSection>
    </div>
  );
};

/* ── Shared components ── */

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

export default SitterDashboard;
