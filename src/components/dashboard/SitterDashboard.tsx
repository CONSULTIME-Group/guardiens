import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { Link } from "react-router-dom";
import EmergencyDashSection from "./EmergencyDashSection";
import MissionsNearbySection from "./MissionsNearbySection";
import BadgeShield from "@/components/badges/BadgeShield";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import {
  Home, Star, Search, Send as SendIcon, CheckCircle2, XCircle,
  MessageSquare, Calendar, Handshake, Newspaper, Zap, ChevronRight,
  Eye, Circle, CheckCircle, ChevronDown,
} from "lucide-react";
import { format, differenceInDays, differenceInHours } from "date-fns";
import { fr } from "date-fns/locale";

const capitalize = (name: string) =>
  name ? name.charAt(0).toUpperCase() + name.slice(1).toLowerCase() : "";

/* ── status config ── */
const appStatusConfig: Record<string, { label: string; icon: React.ElementType; bg: string; text: string }> = {
  pending:    { label: "Envoyée",       icon: SendIcon,      bg: "bg-muted",         text: "text-muted-foreground" },
  viewed:     { label: "Vue",           icon: Eye,           bg: "bg-accent",        text: "text-foreground" },
  discussing: { label: "En discussion", icon: MessageSquare, bg: "bg-accent",        text: "text-foreground" },
  accepted:   { label: "Acceptée",      icon: CheckCircle2,  bg: "bg-primary/10",    text: "text-primary" },
  rejected:   { label: "Déclinée",      icon: XCircle,       bg: "bg-destructive/10",text: "text-destructive" },
  cancelled:  { label: "Annulée",       icon: XCircle,       bg: "bg-muted",         text: "text-muted-foreground" },
};

const SitterDashboard = () => {
  const { user } = useAuth();
  const { hasAccess: hasSubscription } = useSubscriptionAccess();

  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingAppsCount, setPendingAppsCount] = useState(0);
  const [nextGuard, setNextGuard] = useState<any>(null);
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [identityVerified, setIdentityVerified] = useState(false);
  const [completedSits, setCompletedSits] = useState(0);
  const [avgRating, setAvgRating] = useState(0);
  const [badgeCount, setBadgeCount] = useState(0);
  const [totalApps, setTotalApps] = useState(0);
  const [cancellations, setCancellations] = useState(0);
  const [badges, setBadges] = useState<any[]>([]);
  const [isAvailable, setIsAvailable] = useState(false);
  const [nearbyListings, setNearbyListings] = useState<any[]>([]);
  const [articles, setArticles] = useState<any[]>([]);
  const [hasEmergencyProfile, setHasEmergencyProfile] = useState(false);

  const [onboardingChecks, setOnboardingChecks] = useState({
    profileComplete: false,
    identityVerified: false,
    firstSearch: false,
    availableMode: false,
  });

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [
        appsRes, sitterRes, profileRes, reviewsRes, listingsRes,
        badgesRes, articlesRes, unreadRes, badgeDetailsRes,
      ] = await Promise.all([
        supabase.from("applications").select("*, sit:sits(id, title, start_date, end_date, status, user_id, property_id, properties:property_id(photos))").eq("sitter_id", user.id).order("created_at", { ascending: false }),
        supabase.from("sitter_profiles").select("is_available").eq("user_id", user.id).single(),
        supabase.from("profiles").select("identity_verification_status, profile_completion, identity_verified, cancellation_count").eq("id", user.id).single(),
        supabase.from("reviews").select("overall_rating").eq("reviewee_id", user.id).eq("published", true),
        supabase.from("sits").select("id, title, start_date, end_date, user_id, property_id, status, created_at, is_urgent, properties:property_id(photos, type, environment)").eq("status", "published").order("created_at", { ascending: false }).limit(6),
        supabase.from("badge_attributions").select("id").eq("receiver_id", user.id),
        supabase.from("articles").select("id, title, slug, cover_image_url, excerpt, category").eq("published", true).eq("category", "conseil_gardien").order("published_at", { ascending: false }).limit(3),
        supabase.from("messages").select("id", { count: "exact", head: true }).neq("sender_id", user.id).is("read_at", null),
        supabase.from("badge_attributions").select("id, badge_key, created_at").eq("receiver_id", user.id).order("created_at", { ascending: false }).limit(6),
      ]);

      const pCompletion = profileRes.data?.profile_completion || 0;
      const idVerified = profileRes.data?.identity_verified || false;
      const vStatus = profileRes.data?.identity_verification_status || "not_submitted";
      setProfileCompletion(pCompletion);
      setIdentityVerified(idVerified);
      setCancellations(profileRes.data?.cancellation_count || 0);
      setIsAvailable(sitterRes.data?.is_available || false);

      const apps = appsRes.data || [];
      const acceptedApps = apps.filter((a: any) => a.status === "accepted");
      const completed = acceptedApps.filter((a: any) => a.sit?.status === "completed").length;
      setCompletedSits(completed);
      setTotalApps(apps.length);

      const pending = apps.filter((a: any) => ["pending", "viewed", "discussing"].includes(a.status)).length;
      setPendingAppsCount(pending);

      const reviews = reviewsRes.data || [];
      const avg = reviews.length > 0 ? reviews.reduce((s: number, r: any) => s + r.overall_rating, 0) / reviews.length : 0;
      setAvgRating(Math.round(avg * 10) / 10);

      setBadgeCount(badgesRes.data?.length || 0);
      setBadges(badgeDetailsRes.data || []);
      setUnreadCount(unreadRes.count || 0);

      // Next confirmed guard
      const now = new Date();
      const futureGuards = acceptedApps
        .filter((a: any) => a.sit?.start_date && new Date(a.sit.start_date) > now)
        .sort((a: any, b: any) => new Date(a.sit.start_date).getTime() - new Date(b.sit.start_date).getTime());

      if (futureGuards.length > 0) {
        const g = futureGuards[0];
        const ownerRes = await supabase.from("profiles").select("first_name").eq("id", g.sit.user_id).single();
        // Get pets for this guard
        const petsRes = await supabase.from("pets").select("species").eq("property_id", g.sit.property_id);
        setNextGuard({
          ...g.sit,
          ownerName: ownerRes.data?.first_name || "",
          daysUntil: differenceInDays(new Date(g.sit.start_date), now),
          pets: petsRes.data || [],
        });
      }

      setNearbyListings((listingsRes.data || []).filter((s: any) => s.user_id !== user.id).slice(0, 4));
      setArticles(articlesRes.data || []);

      setOnboardingChecks({
        profileComplete: pCompletion >= 100,
        identityVerified: vStatus === "verified" || idVerified,
        firstSearch: false,
        availableMode: sitterRes.data?.is_available || false,
      });

      // Emergency profile check
      const { data: emProfile } = await supabase.from("emergency_sitter_profiles").select("id").eq("user_id", user.id).maybeSingle();
      setHasEmergencyProfile(!!emProfile);

      setLoading(false);
    };
    load();
  }, [user]);

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

  // Dynamic subtitle priority
  const subtitle = nextGuard
    ? `Ta prochaine garde commence dans ${nextGuard.daysUntil} jour${nextGuard.daysUntil > 1 ? "s" : ""}.`
    : pendingAppsCount > 0
    ? `Tu as ${pendingAppsCount} candidature${pendingAppsCount > 1 ? "s" : ""} en attente de réponse.`
    : unreadCount > 0
    ? `Tu as ${unreadCount} message${unreadCount > 1 ? "s" : ""} non lu${unreadCount > 1 ? "s" : ""}.`
    : "Explore les annonces près de chez toi.";

  // Emergency conditions
  const emergencyConditions = [
    { label: `5 gardes réalisées (${completedSits}/5)`, ok: completedSits >= 5, progress: completedSits < 5 ? (completedSits / 5) * 100 : undefined },
    { label: "Note ≥ 4.7", ok: avgRating >= 4.7 },
    { label: "Aucune annulation", ok: cancellations === 0 },
    { label: "Identité vérifiée", ok: identityVerified },
    { label: "Abonnement actif", ok: !!hasSubscription },
  ];
  const emergencyDone = emergencyConditions.filter(c => c.ok).length;
  const allEmergencyDone = emergencyDone === 5;

  // Onboarding checklist
  const checklistItems = [
    { done: onboardingChecks.profileComplete, label: `Compléter mon profil (${profileCompletion}%)`, to: "/mon-profil" },
    { done: onboardingChecks.identityVerified, label: "Vérifier mon identité", to: "/mon-profil#identite" },
    { done: false, label: "Découvre les gardes disponibles", to: "/recherche" },
  ];
  const checklistDone = checklistItems.filter(c => c.done).length + (onboardingChecks.availableMode ? 1 : 0);
  const allChecklistDone = checklistDone === 4;

  // Has anything to show in bloc 2
  const showBloc2 = unreadCount > 0 || pendingAppsCount > 0 || !!nextGuard;

  // Priority CTA
  const priorityCTA = profileCompletion < 60
    ? { label: "Compléter mon profil →", to: "/mon-profil", style: "bg-primary text-primary-foreground" }
    : !identityVerified
    ? { label: "Vérifier mon identité →", to: "/mon-profil#identite", style: "bg-amber-500 text-white" }
    : totalApps === 0
    ? { label: "Découvre les gardes disponibles →", to: "/recherche", style: "bg-primary text-primary-foreground" }
    : pendingAppsCount > 0
    ? { label: "Voir mes candidatures →", to: "/mes-gardes", style: "border border-primary text-primary" }
    : { label: "Explorer les nouvelles annonces →", to: "/recherche", style: "border border-border text-foreground" };

  return (
    <div className="space-y-8">
      {/* ═══ BLOC 1 — Header dynamique ═══ */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-foreground">
            Bonjour{user?.firstName ? `, ${capitalize(user.firstName)}` : ""} !
          </h1>
          <a
            href={`/gardiens/${user?.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            Voir mon profil public
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
      </div>

      {/* ═══ BLOC 2 — Ce qui m'attend ═══ */}
      {showBloc2 && (
        <div>
          <p className="text-sm font-semibold text-foreground mb-3">Ce qui t'attend</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Messages */}
            {unreadCount > 0 ? (
              <Link to="/messagerie" className="bg-card border border-border rounded-2xl p-4 cursor-pointer hover:border-primary transition-colors">
                <MessageSquare className="h-5 w-5 text-primary mb-2" />
                <p className="text-2xl font-semibold text-foreground">{unreadCount}</p>
                <p className="text-xs text-muted-foreground">message{unreadCount > 1 ? "s" : ""} non lu{unreadCount > 1 ? "s" : ""}</p>
              </Link>
            ) : (
              <div className="bg-card border border-border rounded-2xl p-4 opacity-40 pointer-events-none">
                <MessageSquare className="h-5 w-5 text-primary mb-2" />
                <p className="text-2xl font-semibold text-foreground">0</p>
                <p className="text-xs text-muted-foreground">message non lu</p>
              </div>
            )}

            {/* Candidatures */}
            {pendingAppsCount > 0 ? (
              <Link to="/mes-gardes" className="bg-card border border-border rounded-2xl p-4 cursor-pointer hover:border-primary transition-colors">
                <SendIcon className="h-5 w-5 text-primary mb-2" />
                <p className="text-2xl font-semibold text-foreground">{pendingAppsCount}</p>
                <p className="text-xs text-muted-foreground">candidature{pendingAppsCount > 1 ? "s" : ""} en cours</p>
              </Link>
            ) : (
              <div className="bg-card border border-border rounded-2xl p-4 opacity-40 pointer-events-none">
                <SendIcon className="h-5 w-5 text-primary mb-2" />
                <p className="text-2xl font-semibold text-foreground">0</p>
                <p className="text-xs text-muted-foreground">candidature en cours</p>
              </div>
            )}

            {/* Prochaine garde */}
            {nextGuard ? (
              <Link to="/mes-gardes" className="bg-primary/5 border border-primary/30 rounded-2xl p-4 cursor-pointer hover:border-primary transition-colors">
                <Calendar className="h-5 w-5 text-primary mb-2" />
                <p className="text-sm font-medium text-foreground">{capitalize(nextGuard.ownerName || "—")}</p>
                <p className="text-xs text-muted-foreground">
                  Du {format(new Date(nextGuard.start_date), "d MMM", { locale: fr })} au {format(new Date(nextGuard.end_date), "d MMM", { locale: fr })}
                </p>
                {nextGuard.pets?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {nextGuard.pets.map((p: any, i: number) => (
                      <span key={i} className="text-xs bg-muted rounded-full px-2 py-0.5">{p.species || "Animal"}</span>
                    ))}
                  </div>
                )}
              </Link>
            ) : (
              <div className="bg-card border border-border rounded-2xl p-4 opacity-40 pointer-events-none">
                <Calendar className="h-5 w-5 text-primary mb-2" />
                <p className="text-sm font-medium text-foreground">Aucune garde à venir</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ BLOC 3 — Où j'en suis ═══ */}
      <div>
        <p className="text-sm font-semibold text-foreground mb-3">Où tu en es</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Profil */}
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">Mon profil</p>
            <div className="h-2 rounded-full bg-muted mb-1 overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${profileCompletion}%` }} />
            </div>
            <p className="text-sm font-semibold text-foreground">{profileCompletion}% complété</p>
            {profileCompletion >= 60 ? (
              <span className="inline-block bg-primary/10 text-primary text-xs rounded-full px-2 py-0.5 mt-2">✓ Visible par les proprios</span>
            ) : (
              <span className="inline-block bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 text-xs rounded-full px-2 py-0.5 mt-2">⚠ Non visible — 60% requis</span>
            )}
            <Link to="/mon-profil" className="text-xs text-primary hover:underline mt-3 block">Compléter →</Link>
          </div>

          {/* Stats */}
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">Mes stats</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-center">
                <p className="text-xl font-semibold text-foreground">{completedSits}</p>
                <p className="text-xs text-muted-foreground">Gardes</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-semibold text-foreground">{avgRating > 0 ? `${avgRating}` : "—"}</p>
                <p className="text-xs text-muted-foreground">Note ★</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-semibold text-foreground">{badgeCount}</p>
                <p className="text-xs text-muted-foreground">Écussons</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-semibold text-foreground">{totalApps}</p>
                <p className="text-xs text-muted-foreground">Candidatures</p>
              </div>
            </div>
            {completedSits === 0 && (
              <p className="text-xs text-muted-foreground italic mt-3">Tes stats apparaîtront après ta première garde.</p>
            )}
          </div>

          {/* Gardien d'urgence */}
          <div className={`border rounded-2xl p-4 ${allEmergencyDone || hasEmergencyProfile ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800" : "bg-card border-border"}`}>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">Statut d'urgence</p>
            {hasEmergencyProfile ? (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">Statut actif ✓</p>
                </div>
                <Link to="/mon-profil#urgence" className="text-xs text-primary hover:underline">Gérer →</Link>
              </div>
            ) : allEmergencyDone ? (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">Éligible !</p>
                </div>
                <Link to="/mon-profil#urgence" className="inline-block bg-amber-500 text-white rounded-full px-4 py-2 text-sm hover:bg-amber-600 transition-colors mt-1">
                  Activer le statut →
                </Link>
              </div>
            ) : (
              <div>
                <div className="h-2 rounded-full bg-muted mb-2 overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full transition-all duration-500" style={{ width: `${(emergencyDone / 5) * 100}%` }} />
                </div>
                <p className="text-xs text-muted-foreground mb-3">{emergencyDone}/5 conditions</p>
                <div className="space-y-0.5">
                  {emergencyConditions.map((c, i) => (
                    <div key={i} className="text-xs flex items-center gap-1.5 py-0.5">
                      {c.ok
                        ? <CheckCircle className="h-3.5 w-3.5 text-primary shrink-0" />
                        : <Circle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      }
                      <span className={c.ok ? "text-muted-foreground line-through" : "text-foreground"}>{c.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Emergency active section */}
      {hasEmergencyProfile && <EmergencyDashSection />}

      {/* ═══ BLOC 4 — Quoi faire ═══ */}
      <div>
        <p className="text-sm font-semibold text-foreground mb-3">Quoi faire</p>

        {/* Priority CTA */}
        <Link to={priorityCTA.to} className={`block rounded-xl px-4 py-3 w-full text-sm font-medium text-center transition-colors ${priorityCTA.style}`}>
          {priorityCTA.label}
        </Link>

        {/* Badges collection */}
        <div className="mt-4 bg-card border border-border rounded-2xl p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">Mes écussons</p>
          {badges.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Tes premiers écussons apparaîtront après ta première garde.</p>
          ) : (
            <div>
              <div className="flex flex-wrap gap-2">
                {badges.slice(0, 6).map((b: any) => (
                  <div key={b.id} title={b.badge_key}>
                    <BadgeShield badgeKey={b.badge_key} size="sm" showLabel={false} />
                  </div>
                ))}
              </div>
              {badges.length > 6 && (
                <Link to="/mon-profil#ecussons" className="text-xs text-primary hover:underline mt-2 inline-block">Voir tous mes écussons →</Link>
              )}
            </div>
          )}
        </div>

        {/* Checklist accordion */}
        <div className="mt-4">
          <Accordion type="single" collapsible defaultValue={allChecklistDone ? undefined : "checklist"}>
            <AccordionItem value="checklist" className="border-none">
              <AccordionTrigger className="flex items-center justify-between bg-muted/30 rounded-xl px-4 py-3 cursor-pointer hover:no-underline [&[data-state=open]>svg]:rotate-180">
                <div className="flex items-center gap-2">
                  {allChecklistDone ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium text-primary">4/4 étapes complétées ✓</span>
                    </>
                  ) : (
                    <span className="text-sm font-medium text-foreground">Tes prochaines étapes ({checklistDone}/4 complétées)</span>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-0">
                <div className="space-y-2">
                  {checklistItems.map((item, i) => (
                    <Link key={i} to={item.to} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:bg-accent/50 transition-colors">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${item.done ? "bg-primary text-primary-foreground" : "border-2 border-muted-foreground/30"}`}>
                        {item.done && <CheckCircle2 className="h-4 w-4" />}
                      </div>
                      <span className={`text-sm flex-1 ${item.done ? "line-through text-muted-foreground" : "font-medium"}`}>{item.label}</span>
                      {!item.done && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                    </Link>
                  ))}
                  {/* Available mode toggle */}
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${onboardingChecks.availableMode ? "bg-primary text-primary-foreground" : "border-2 border-muted-foreground/30"}`}>
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
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>

      {/* ═══ BLOC 5 — Annonces et missions ═══ */}
      <div className="space-y-8">
        {/* Annonces */}
        <div className="animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg font-semibold">Annonces près de chez toi</h2>
            <Link to="/recherche" className="text-xs text-primary hover:underline font-medium">Voir tout →</Link>
          </div>
          {nearbyListings.length === 0 ? (
            <div className="p-8 rounded-xl border border-dashed border-border bg-accent/30 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Search className="h-7 w-7 text-primary/60" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground/80">Pas encore d'annonce dans ta zone</p>
                <p className="text-xs text-muted-foreground mt-1.5 max-w-xs mx-auto">Active le mode disponible pour être contacté directement par les proprios.</p>
              </div>
              <Link to="/recherche">
                <span className="inline-block border border-border rounded-full px-4 py-2 text-sm text-foreground hover:border-primary transition-colors mt-1">
                  Explorer les annonces →
                </span>
              </Link>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {nearbyListings.map(sit => <ListingCard key={sit.id} sit={sit} />)}
            </div>
          )}
        </div>

        {/* Échanges */}
        <MissionsNearbySection />

        {/* Conseils */}
        <div className="animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg font-semibold">Conseils pour toi</h2>
            <Link to="/actualites" className="text-xs text-primary hover:underline font-medium">Voir tout →</Link>
          </div>
          {articles.length === 0 ? (
            <div className="p-8 rounded-xl border border-dashed border-border bg-accent/30 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Newspaper className="h-7 w-7 text-primary/60" />
              </div>
              <p className="text-sm font-medium text-foreground/80">Les articles arrivent bientôt</p>
              <p className="text-xs text-muted-foreground">Conseils, astuces et histoires de gardiens</p>
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
              {articles.map((a: any) => (
                <a key={a.id} href={`/actualites/${a.slug}`} className="flex-shrink-0 w-64 rounded-xl border border-border bg-card overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
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
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ── Shared components ── */

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
          {durationDays >= 30 && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-accent text-foreground">Longue durée</span>}
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

export default SitterDashboard;
