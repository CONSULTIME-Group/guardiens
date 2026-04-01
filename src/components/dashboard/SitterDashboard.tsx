import { useState, useEffect, useRef } from "react";
import TwoColumnLayout from "@/components/layout/TwoColumnLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import EmergencyActivation from "./EmergencyActivation";
import CancelSitModal from "@/components/sits/CancelSitModal";
import EmergencyDashSection from "./EmergencyDashSection";
import MissionsNearbySection from "./MissionsNearbySection";
import ResourceSection from "@/components/shared/ResourceSection";
import type { ResourceItem } from "@/components/shared/ResourceCard";
import {
  Home, Star, Mail, Award, CircleDot, ChevronRight, Search,
  Send as SendIcon, Eye, CheckCircle2, XCircle, MessageSquare,
  Calendar, Handshake, Newspaper, PawPrint, Zap, ShieldCheck,
  UserCircle, Sparkles, MapPin,
} from "lucide-react";
import { capitalizeName } from "@/lib/capitalize";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { format, differenceInDays, differenceInHours } from "date-fns";
import { fr } from "date-fns/locale";

/* ── status config ── */
const appStatusConfig: Record<string, { label: string; icon: React.ElementType; bg: string; text: string }> = {
  pending:    { label: "Envoyée",    icon: SendIcon,     bg: "bg-muted",           text: "text-muted-foreground" },
  viewed:     { label: "Vue",        icon: Eye,          bg: "bg-accent",           text: "text-foreground" },
  discussing: { label: "En discussion", icon: MessageSquare, bg: "bg-accent",       text: "text-foreground" },
  accepted:   { label: "Acceptée",   icon: CheckCircle2, bg: "bg-primary/10",       text: "text-primary" },
  rejected:   { label: "Déclinée",   icon: XCircle,      bg: "bg-destructive/10",   text: "text-destructive" },
  cancelled:  { label: "Annulée",    icon: XCircle,      bg: "bg-muted",           text: "text-muted-foreground" },
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

const SitterDashboard = () => {
  const { user } = useAuth();
  const [myApplications, setMyApplications] = useState<any[]>([]);
  const [nearbyListings, setNearbyListings] = useState<any[]>([]);
  const [smallMissions, setSmallMissions] = useState<any[]>([]);
  const [myMissions, setMyMissions] = useState<any[]>([]);
  const [myMissionResponses, setMyMissionResponses] = useState<any[]>([]);
  const [articles, setArticles] = useState<any[]>([]);
  const [isAvailable, setIsAvailable] = useState(false);
  const [metrics, setMetrics] = useState({ completed: 0, avgRating: 0, pendingApps: 0, badgeCount: 0 });
  const [verificationStatus, setVerificationStatus] = useState<string>("not_submitted");
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [ongoingSit, setOngoingSit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [emergencyEligible, setEmergencyEligible] = useState(false);
  const [hasEmergencyProfile, setHasEmergencyProfile] = useState(false);
  const [emergencyBlocked, setEmergencyBlocked] = useState<string | null>(null);
  const [showEmergencyForm, setShowEmergencyForm] = useState(false);
  const [cancelSitOpen, setCancelSitOpen] = useState(false);

  // Onboarding checks for new sitters
  const [onboardingChecks, setOnboardingChecks] = useState({
    profileComplete: false,
    identityVerified: false,
    firstSearch: false,
    availableMode: false,
  });

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [appsRes, sitterRes, profileRes, reviewsRes, listingsRes, badgesRes, missionsRes, articlesRes] = await Promise.all([
        supabase.from("applications").select("*, sit:sits(id, title, start_date, end_date, status, user_id, property_id, properties:property_id(photos))").eq("sitter_id", user.id).order("created_at", { ascending: false }),
        supabase.from("sitter_profiles").select("is_available").eq("user_id", user.id).single(),
        supabase.from("profiles").select("identity_verification_status, profile_completion, identity_verified").eq("id", user.id).single(),
        supabase.from("reviews").select("overall_rating").eq("reviewee_id", user.id).eq("published", true),
        supabase.from("sits").select("id, title, start_date, end_date, user_id, property_id, status, created_at, is_urgent, properties:property_id(photos, type, environment)").eq("status", "published").order("created_at", { ascending: false }).limit(6),
        supabase.from("badge_attributions").select("id").eq("receiver_id", user.id),
        supabase.from("small_missions").select("id, title, category, city, created_at, exchange_offer, user_id").eq("status", "open").order("created_at", { ascending: false }).limit(6),
        supabase.from("articles").select("id, title, slug, cover_image_url, excerpt, category").eq("published", true).eq("category", "conseil_gardien").order("published_at", { ascending: false }).limit(3),
      ]);

      const vStatus = profileRes.data?.identity_verification_status || "not_submitted";
      const pCompletion = profileRes.data?.profile_completion || 0;
      setVerificationStatus(vStatus);
      setProfileCompletion(pCompletion);
      setIsAvailable(sitterRes.data?.is_available || false);

      const apps = appsRes.data || [];
      setMyApplications(apps);

      const reviews = reviewsRes.data || [];
      const acceptedApps = apps.filter((a: any) => a.status === "accepted");
      const completedCount = acceptedApps.filter((a: any) => a.sit?.status === "completed").length;
      const avg = reviews.length > 0 ? reviews.reduce((s: number, r: any) => s + r.overall_rating, 0) / reviews.length : 0;
      const pendingApps = apps.filter((a: any) => ["pending", "viewed", "discussing"].includes(a.status)).length;
      setMetrics({
        completed: completedCount,
        avgRating: Math.round(avg * 10) / 10,
        pendingApps,
        badgeCount: badgesRes.data?.length || 0,
      });

      // Onboarding checks
      setOnboardingChecks({
        profileComplete: pCompletion >= 100,
        identityVerified: vStatus === "verified" || vStatus === "pending",
        firstSearch: false, // can't track this easily
        availableMode: sitterRes.data?.is_available || false,
      });

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

      setNearbyListings((listingsRes.data || []).filter((s: any) => s.user_id !== user.id).slice(0, 4));
      setSmallMissions(missionsRes.data || []);
      setArticles(articlesRes.data || []);

      // My missions
      const [myMissionsRes, myResponsesRes] = await Promise.all([
        supabase.from("small_missions").select("id, title, category, status, created_at, small_mission_responses(id, status)").eq("user_id", user.id).order("created_at", { ascending: false }).limit(3),
        supabase.from("small_mission_responses").select("id, status, created_at, mission:small_missions(id, title, category, status, user_id)").eq("responder_id", user.id).order("created_at", { ascending: false }).limit(3),
      ]);
      setMyMissions(myMissionsRes.data || []);
      setMyMissionResponses(myResponsesRes.data || []);

      // Emergency sitter
      const { data: emProfile } = await supabase.from("emergency_sitter_profiles").select("id, blocked_until").eq("user_id", user.id).maybeSingle();
      if (emProfile) {
        const blockedUntil = (emProfile as any).blocked_until;
        if (blockedUntil && new Date(blockedUntil) > new Date()) {
          setEmergencyBlocked(blockedUntil);
        } else {
          setHasEmergencyProfile(true);
        }
      } else {
        const cancellations = (await supabase.from("profiles").select("cancellation_count, identity_verified").eq("id", user.id).single()).data;
        if (completedCount >= 5 && avg >= 4.7 && (cancellations?.cancellation_count || 0) === 0 && cancellations?.identity_verified) {
          setEmergencyEligible(true);
        }
      }

      setLoading(false);
    };
    load();
  }, [user]);

  if (loading) return (
    <div className="p-8 flex items-center justify-center">
      <div className="animate-pulse space-y-4 w-full max-w-lg">
        <div className="h-8 bg-muted rounded-lg w-2/3" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-24 bg-muted rounded-xl" />
          <div className="h-24 bg-muted rounded-xl" />
        </div>
        <div className="h-16 bg-muted rounded-xl" />
        <div className="h-32 bg-muted rounded-xl" />
      </div>
    </div>
  );

  const isNewSitter = metrics.completed === 0 && profileCompletion < 100;
  const isActiveSitter = metrics.completed > 0 || profileCompletion >= 100;

  /* ─────────────────────────────────────────────
   *  NEW SITTER DASHBOARD (guided journey)
   * ───────────────────────────────────────────── */
  if (isNewSitter) {
    return (
      <div className="space-y-10">
        {/* Welcome card with checklist */}
        <div className="rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/30 p-6 md:p-8 space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="font-heading text-xl md:text-2xl font-bold">
                Bienvenue{user?.firstName ? `, ${capitalizeName(user.firstName)}` : ""}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Voici tes premières étapes pour décrocher ta première garde :
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <ChecklistItem
              done={onboardingChecks.profileComplete}
              label={`Compléter mon profil (${profileCompletion}%)`}
              to="/profile"
            />
            <ChecklistItem
              done={onboardingChecks.identityVerified}
              label="Vérifier mon identité"
              to="/settings#verification"
            />
            <ChecklistItem
              done={false}
              label="Trouver ma première garde"
              to="/search"
            />
            <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                onboardingChecks.availableMode ? "bg-primary text-primary-foreground" : "border-2 border-muted-foreground/30"
              }`}>
                {onboardingChecks.availableMode && <CheckCircle2 className="h-4 w-4" />}
              </div>
              <span className={`text-sm flex-1 ${onboardingChecks.availableMode ? "line-through text-muted-foreground" : "font-medium"}`}>
                Activer le mode disponible
              </span>
              <Switch
                checked={isAvailable}
                onCheckedChange={async (v) => {
                  setIsAvailable(v);
                  setOnboardingChecks(prev => ({ ...prev, availableMode: v }));
                  await supabase.from("sitter_profiles").update({ is_available: v }).eq("user_id", user!.id);
                }}
              />
            </div>
          </div>
        </div>

        {/* Priority: nearby listings */}
        <DashSection title="Annonces près de chez vous" action={
          <Link to="/search" className="text-xs text-primary hover:underline font-medium">Voir tout →</Link>
        }>
          {nearbyListings.length === 0 ? (
            <EmptyCard
              icon={Search}
              text="Pas encore d'annonce dans votre zone"
              hint="Activez le mode Disponible pour être contacté directement par les propriétaires !"
              cta="Explorer les annonces"
              to="/search"
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {nearbyListings.map(sit => <ListingCard key={sit.id} sit={sit} />)}
            </div>
          )}
        </DashSection>

      {/* Échanges autour de toi */}
        <MissionsNearbySection />

        {/* Tips */}
        <DashSection title="Conseils pour vous" action={
          <Link to="/actualites" className="text-xs text-primary hover:underline font-medium">Voir tout →</Link>
        }>
          <ArticleCards articles={articles} />
        </DashSection>
      </div>
    );
  }

  /* ─────────────────────────────────────────────
   *  ACTIVE SITTER DASHBOARD
   * ───────────────────────────────────────────── */
  const sitterLeftContent = (
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
            <p className="font-heading font-semibold text-sm">{capitalizeName(user?.firstName) || "Gardien"}</p>
            <p className="text-xs text-muted-foreground">{(user as any)?.city || ""}</p>
          </div>
        </div>
        {profileCompletion < 100 ? (
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Profil</span>
              <span className="font-medium">{profileCompletion}% complété</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${profileCompletion}%` }} />
            </div>
          </div>
        ) : (
          <p className="text-xs text-primary font-medium">✓ Profil complet</p>
        )}
        {profileCompletion < 60 && (
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
            <p className="text-xs text-amber-800 dark:text-amber-200">Complète ton profil pour apparaître dans les recherches</p>
            <Link to="/profile" className="text-xs font-medium text-primary hover:underline mt-1 inline-block">Compléter →</Link>
          </div>
        )}
      </div>

      {/* BLOC 2 — 4 métriques */}
      <div className="grid grid-cols-2 gap-3">
        <MiniMetric label="Gardes réalisées" value={metrics.completed} />
        <MiniMetric label="Note moyenne" value={metrics.avgRating > 0 ? `★ ${metrics.avgRating}` : "—"} />
        <MiniMetric label="Candidatures en cours" value={metrics.pendingApps} />
        <MiniMetric label="Écussons reçus" value={metrics.badgeCount} />
      </div>

      {/* BLOC 3 — Toggle disponibilité */}
      <div className="rounded-xl border border-border bg-card p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${isAvailable ? "bg-primary animate-pulse" : "bg-muted-foreground/30"}`} />
            <p className="font-semibold text-xs">Je suis disponible</p>
          </div>
          <Switch
            checked={isAvailable}
            onCheckedChange={async (v) => {
              setIsAvailable(v);
              await supabase.from("sitter_profiles").update({ is_available: v }).eq("user_id", user!.id);
            }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground">Apparais en premier dans les recherches</p>
      </div>

      {/* BLOC 4 — Abonnement (placeholder - check subscription) */}
      {/* Will show if user doesn't have an active subscription */}
    </div>
  );

  const sitterRightContent = (
    <div className="space-y-10">
      {/* Ongoing sit banner */}
      {ongoingSit && (
        <>
          <div className="rounded-xl border-2 border-primary/30 bg-primary/5">
            <Link to={`/sits/${ongoingSit.id}`} className="block p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">Garde en cours</p>
                  <p className="text-xs text-muted-foreground">{ongoingSit.title} — chez {ongoingSit.ownerName}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>
            <div className="px-4 pb-3">
              <a href="/actualites/gerer-imprevu-pendant-garde" className="text-xs text-primary/70 hover:text-primary hover:underline">
                Un imprévu ? Voir le guide →
              </a>
            </div>
            <div className="border-t border-border mt-4 pt-4 px-4 pb-4">
              <button
                onClick={() => setCancelSitOpen(true)}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors underline-offset-2 hover:underline cursor-pointer w-full text-center"
              >
                Annuler ma garde
              </button>
            </div>
          </div>

          <CancelSitModal
            open={cancelSitOpen}
            onOpenChange={setCancelSitOpen}
            sitId={ongoingSit.id}
            sitTitle={ongoingSit.title || "Garde"}
            sitOwnerId={ongoingSit.user_id}
            otherPartyName={ongoingSit.ownerName}
            startDate={ongoingSit.start_date}
            endDate={ongoingSit.end_date}
            onCancelled={() => { setOngoingSit(null); }}
          />
        </>
      )}

      {/* Emergency active section */}
      {hasEmergencyProfile && <EmergencyDashSection />}

      {/* Applications - PRIORITY section */}
      <DashSection title="Mes candidatures" action={
        myApplications.length > 0 ? <Link to="/sits" className="text-xs text-primary hover:underline font-medium">Voir tout →</Link> : undefined
      }>
        {myApplications.length === 0 ? (
          <EmptyCard icon={SendIcon} text="Aucune candidature en cours" hint="Postule à des gardes pour les voir apparaître ici." cta="Trouver une garde" to="/search" />
        ) : (
          <div className="space-y-2">
            {myApplications.slice(0, 4).map(app => {
              const cfg = appStatusConfig[app.status] || appStatusConfig.pending;
              const StatusIcon = cfg.icon;
              const photo = app.sit?.properties?.photos?.[0];
              return (
                <Link key={app.id} to={`/sits/${app.sit_id}`} className="flex items-center gap-3 p-4 rounded-xl bg-card border-2 border-border hover:border-primary/20 hover:shadow-md transition-all">
                  {photo ? (
                    <img src={photo} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-accent flex items-center justify-center shrink-0">
                      <Home className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{app.sit?.title || "Garde"}</p>
                    <p className="text-xs text-muted-foreground">
                      {app.sit?.start_date && app.sit?.end_date
                        ? `${format(new Date(app.sit.start_date), "d MMM", { locale: fr })} → ${format(new Date(app.sit.end_date), "d MMM", { locale: fr })}`
                        : ""}
                    </p>
                  </div>
                  <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                    <StatusIcon className="h-3 w-3" /> {cfg.label}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </DashSection>

      {/* Contextual resources */}
      {!hasEmergencyProfile && (() => {
        const completedCount = metrics.completed;
        let resTitle = "";
        let resItems: ResourceItem[] = [];

        if (profileCompletion < 60 || verificationStatus !== "verified") {
          resTitle = "Bien démarrer sur Guardiens";
          resItems = [
            { title: "Créer un profil qui attire des missions", description: "Photo, bio, expérience : ce qui convainc.", href: "/actualites/creer-profil-gardien-attractif", icon: "gardien" },
            { title: "Réussir sa première garde", description: "La rencontre, le premier soir, la communication.", href: "/actualites/reussir-premiere-garde-house-sitting", icon: "gardien" },
            { title: "Devenir Gardien d'Urgence", description: "Les conditions, les avantages, les obligations.", href: "/actualites/devenir-gardien-urgence-guardiens", icon: "urgence" },
          ];
        } else if (completedCount >= 1 && completedCount < 5) {
          resTitle = "Progresser sur Guardiens";
          resItems = [
            { title: "Gérer les animaux difficiles", description: "Chien anxieux, chat caché, animal malade.", href: "/actualites/gerer-animaux-difficiles-garde", icon: "animal" },
            { title: "Gérer les imprévus pendant une garde", description: "Panne, urgence, départ anticipé : les protocoles.", href: "/actualites/gerer-imprevu-pendant-garde", icon: "gardien" },
            { title: "Devenir Gardien d'Urgence", description: "Encore quelques gardes avant d'y accéder.", href: "/actualites/devenir-gardien-urgence-guardiens", icon: "urgence" },
          ];
        } else if (completedCount >= 5) {
          resTitle = "Passer au niveau supérieur";
          resItems = [
            { title: "Devenir Gardien d'Urgence", description: "Vous remplissez peut-être déjà les conditions.", href: "/actualites/devenir-gardien-urgence-guardiens", icon: "urgence" },
            { title: "Gérer les animaux difficiles", description: "Les situations que les bons gardiens gèrent.", href: "/actualites/gerer-animaux-difficiles-garde", icon: "animal" },
            { title: "Gérer les imprévus pendant une garde", description: "Panne, urgence, départ anticipé : les protocoles.", href: "/actualites/gerer-imprevu-pendant-garde", icon: "gardien" },
          ];
        }

        return resItems.length > 0 ? <ResourceSection title={resTitle} resources={resItems} /> : null;
      })()}

      {/* Nearby listings */}
      <DashSection title="Annonces près de chez vous" action={
        <Link to="/search" className="text-xs text-primary hover:underline font-medium">Voir tout →</Link>
      }>
        {nearbyListings.length === 0 ? (
          <EmptyCard icon={Search} text="Pas encore d'annonce dans ta zone" hint="Active le mode disponible pour être contacté directement." cta="Explorer les annonces" to="/search" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {nearbyListings.map(sit => <ListingCard key={sit.id} sit={sit} />)}
          </div>
        )}
      </DashSection>

      {/* Échanges autour de toi */}
      <MissionsNearbySection />

      {/* Emergency section */}
      {emergencyEligible && !hasEmergencyProfile && !showEmergencyForm && (
        <div className="rounded-2xl border-2 border-secondary/40 bg-secondary/5 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-secondary text-secondary-foreground shadow">
              <Zap className="h-5 w-5" fill="currentColor" />
            </span>
            <div>
              <p className="font-heading font-semibold">Vous êtes éligible au statut Gardien d'urgence !</p>
              <p className="text-xs text-muted-foreground">Mobilisable rapidement, fiable, expérimenté. Visibilité prioritaire.</p>
            </div>
          </div>
          <Button onClick={() => setShowEmergencyForm(true)} className="gap-2 w-full">
            <Zap className="h-4 w-4" /> Activer le mode Gardien d'urgence
          </Button>
        </div>
      )}

      {emergencyEligible && !hasEmergencyProfile && showEmergencyForm && (
        <div className="rounded-2xl border-2 border-secondary/40 bg-card p-6">
          <h3 className="font-heading font-semibold mb-4 flex items-center gap-2">
            <Zap className="h-4 w-4 text-secondary" /> Activer le mode Gardien d'urgence
          </h3>
          <EmergencyActivation onActivated={() => { setHasEmergencyProfile(true); setShowEmergencyForm(false); }} />
        </div>
      )}

      {emergencyBlocked && (
        <div className="rounded-xl border border-border bg-muted/50 p-5 space-y-2">
          <div className="flex items-center gap-2.5">
            <Zap className="h-4 w-4 text-muted-foreground" />
            <p className="font-heading font-semibold text-sm text-muted-foreground">Gardien d'urgence — en pause</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Votre statut est en pause jusqu'au {new Date(emergencyBlocked).toLocaleDateString("fr-FR")}.
          </p>
        </div>
      )}

      {!emergencyEligible && !hasEmergencyProfile && !emergencyBlocked && <EmergencyProgress />}

      {/* Tips */}
      <DashSection title="Conseils pour vous" action={
        <Link to="/actualites" className="text-xs text-primary hover:underline font-medium">Voir tout →</Link>
      }>
        <ArticleCards articles={articles} />
      </DashSection>
    </div>
  );

  return (
    <TwoColumnLayout
      leftWidth={260}
      leftContent={sitterLeftContent}
      rightContent={sitterRightContent}
    />
  );
};

const MiniMetric = ({ label, value }: { label: string; value: number | string }) => (
  <div className="bg-muted/50 rounded-xl p-3">
    <p className="text-2xl font-semibold">{typeof value === "number" && value === 0 ? "—" : value}</p>
    <p className="text-xs text-muted-foreground">{label}</p>
  </div>
);

/* ── Shared components ── */

const ChecklistItem = ({ done, label, to }: { done: boolean; label: string; to: string }) => (
  <Link to={to} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:bg-accent/50 transition-colors group">
    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
      done ? "bg-primary text-primary-foreground" : "border-2 border-muted-foreground/30 group-hover:border-primary/50"
    }`}>
      {done && <CheckCircle2 className="h-4 w-4" />}
    </div>
    <span className={`text-sm flex-1 ${done ? "line-through text-muted-foreground" : "font-medium"}`}>{label}</span>
    {!done && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
  </Link>
);

const StatCard = ({ icon: Icon, iconColor, label, value, delay, isDecimal, suffix }: {
  icon: React.ElementType; iconColor: string; label: string; value: number; delay: number; isDecimal?: boolean; suffix?: string;
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
        {formatted}{suffix && <span className="text-base font-normal text-muted-foreground">{suffix}</span>}
      </p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
};

const ListingCard = ({ sit }: { sit: any }) => {
  const isNew = differenceInHours(new Date(), new Date(sit.created_at)) < 48;
  const photo = sit.properties?.photos?.[0];
  const durationDays = sit.start_date && sit.end_date ? differenceInDays(new Date(sit.end_date), new Date(sit.start_date)) : 0;

  return (
    <Link to={`/sits/${sit.id}`} className="flex gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/20 hover:shadow-md transition-all">
      {photo ? (
        <img src={photo} alt="" className="w-20 h-16 rounded-lg object-cover shrink-0" />
      ) : (
        <div className="w-20 h-16 rounded-lg bg-accent flex items-center justify-center shrink-0">
          <Home className="h-6 w-6 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1 min-w-0 py-0.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-sm font-semibold truncate">{sit.title}</p>
          {isNew && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary text-primary-foreground">Nouveau</span>}
          {sit.is_urgent && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-destructive text-destructive-foreground">Urgent</span>}
          {durationDays >= 30 && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">Longue durée</span>}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {sit.start_date && sit.end_date
            ? `${format(new Date(sit.start_date), "d MMM", { locale: fr })} → ${format(new Date(sit.end_date), "d MMM", { locale: fr })}`
            : "Dates flexibles"}
        </p>
      </div>
    </Link>
  );
};

const MissionCard = ({ mission }: { mission: any }) => (
  <Link to={`/petites-missions/${mission.id}`} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:bg-accent/50 transition-colors">
    <Handshake className="h-5 w-5 text-primary shrink-0" />
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium truncate">{mission.title}</p>
      <p className="text-xs text-muted-foreground">
        {mission.city && <span>{mission.city} · </span>}
        {mission.exchange_offer && `En échange : ${mission.exchange_offer}`}
      </p>
    </div>
    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
  </Link>
);

const ArticleCards = ({ articles }: { articles: any[] }) => {
  if (articles.length === 0) {
    return (
      <EmptyCard icon={Newspaper} text="Les articles arrivent bientôt" hint="Conseils, astuces et histoires de gardiens" />
    );
  }
  return (
    <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
      {articles.map((a: any) => (
        <Link key={a.id} to={`/actualites/${a.slug}`} className="flex-shrink-0 w-64 rounded-xl border border-border bg-card overflow-hidden hover:shadow-md transition-shadow">
          {a.cover_image_url ? (
            <img src={a.cover_image_url} alt="" className="w-full h-28 object-cover" />
          ) : (
            <div className="w-full h-28 bg-accent flex items-center justify-center">
              <Newspaper className="h-8 w-8 text-muted-foreground/40" />
            </div>
          )}
          <div className="p-3">
            <p className="text-sm font-semibold line-clamp-2">{a.title}</p>
            <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{a.excerpt}</p>
          </div>
        </Link>
      ))}
    </div>
  );
};

const EmergencyProgress = () => {
  const { user } = useAuth();
  const [checks, setChecks] = useState<{ completedSits: number; avgRating: number; recentCancellations: number; identityVerified: boolean } | null>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const [appsRes, reviewsRes, profileRes, cancellationsRes] = await Promise.all([
        supabase.from("applications").select("id, sit:sits!inner(status)").eq("sitter_id", user.id).eq("status", "accepted"),
        supabase.from("reviews").select("overall_rating").eq("reviewee_id", user.id).eq("published", true),
        supabase.from("profiles").select("identity_verified").eq("id", user.id).single(),
        supabase.from("sits").select("id").eq("cancelled_by", user.id).gte("cancelled_at", sixMonthsAgo.toISOString()),
      ]);
      const completedSits = (appsRes.data || []).filter((a: any) => a.sit?.status === "completed").length;
      const reviews = reviewsRes.data || [];
      const avgRating = reviews.length > 0 ? reviews.reduce((s: number, r: any) => s + r.overall_rating, 0) / reviews.length : 0;
      setChecks({
        completedSits,
        avgRating: Math.round(avgRating * 10) / 10,
        recentCancellations: cancellationsRes.data?.length || 0,
        identityVerified: profileRes.data?.identity_verified || false,
      });
    };
    load();
  }, [user]);

  if (!checks) return null;

  const items = [
    { label: `Gardes : ${checks.completedSits}/5`, ok: checks.completedSits >= 5 },
    { label: `Note : ${checks.avgRating || "—"}/4.7`, ok: checks.avgRating >= 4.7 },
    { label: `Annulations (6 mois) : ${checks.recentCancellations}`, ok: checks.recentCancellations === 0 },
    { label: "ID vérifiée", ok: checks.identityVerified },
  ];

  const remaining = Math.max(0, 5 - checks.completedSits);

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-center gap-2.5">
        <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-muted">
          <Zap className="h-4 w-4 text-amber-500" />
        </span>
        <div>
          <p className="font-heading font-semibold text-sm">Gardien d'urgence</p>
          <p className="text-xs text-muted-foreground">Le plus haut niveau de confiance sur Guardiens</p>
        </div>
      </div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            {item.ok ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" /> : <XCircle className="h-4 w-4 text-red-400 shrink-0" />}
            <span className={item.ok ? "text-foreground" : "text-muted-foreground"}>{item.label}</span>
          </div>
        ))}
      </div>
      {remaining > 0 && (
        <p className="text-xs text-muted-foreground">Encore {remaining} garde{remaining > 1 ? "s" : ""} pour débloquer le statut !</p>
      )}
      <Link to="/gardien-urgence" className="text-xs text-primary hover:underline inline-block">En savoir plus →</Link>
    </div>
  );
};

const DashSection = ({ title, action, children }: {
  title: string; action?: React.ReactNode; children: React.ReactNode;
}) => (
  <div className="animate-fade-in">
    <div className="flex items-center justify-between mb-4">
      <h2 className="font-heading text-lg font-semibold">{title}</h2>
      {action}
    </div>
    {children}
  </div>
);

const EmptyCard = ({ icon: Icon, text, cta, to, hint }: { icon?: React.ElementType; text: string; cta?: string; to?: string; hint?: string }) => (
  <div className="p-8 rounded-xl border border-dashed border-border bg-accent/30 text-center space-y-3">
    {Icon && (
      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
        <Icon className="h-7 w-7 text-primary/60" />
      </div>
    )}
    <div>
      <p className="text-sm font-medium text-foreground/80">{text}</p>
      {hint && <p className="text-xs text-muted-foreground mt-1.5 max-w-xs mx-auto">{hint}</p>}
    </div>
    {cta && to && <Link to={to}><Button size="sm" className="mt-1">{cta}</Button></Link>}
  </div>
);

export default SitterDashboard;
