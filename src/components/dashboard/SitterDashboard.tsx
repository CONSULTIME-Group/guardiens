import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { Link, useNavigate } from "react-router-dom";
import EmergencyDashSection from "./EmergencyDashSection";
import MissionsNearbySection from "./MissionsNearbySection";
import BadgeTimbre, { TIMBRES_ORDER } from "@/components/badges/BadgeTimbre";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Home, Search, CheckCircle, Circle, ChevronRight,
  Newspaper,
} from "lucide-react";
import { format, differenceInDays, differenceInHours } from "date-fns";
import { fr } from "date-fns/locale";

const capitalize = (name: string) =>
  name ? name.charAt(0).toUpperCase() + name.slice(1).toLowerCase() : "";

const SitterDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
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
  const [isFounder, setIsFounder] = useState(false);
  const [articles, setArticles] = useState<any[]>([]);
  const [hasEmergencyProfile, setHasEmergencyProfile] = useState(false);
  const [hasAcceptedRecent, setHasAcceptedRecent] = useState(false);

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
        supabase.from("profiles").select("identity_verification_status, profile_completion, identity_verified, cancellation_count, is_founder").eq("id", user.id).single(),
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
      setIsFounder(profileRes.data?.is_founder || false);
      setIsAvailable(sitterRes.data?.is_available || false);

      const apps = appsRes.data || [];
      const acceptedApps = apps.filter((a: any) => a.status === "accepted");
      const completed = acceptedApps.filter((a: any) => a.sit?.status === "completed").length;
      setCompletedSits(completed);
      setTotalApps(apps.length);

      // Check for recently accepted application (last 7 days)
      const recentAccepted = acceptedApps.some((a: any) => {
        const created = new Date(a.created_at);
        return differenceInDays(new Date(), created) <= 7;
      });
      setHasAcceptedRecent(recentAccepted);

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

      const { data: emProfile } = await supabase.from("emergency_sitter_profiles").select("id").eq("user_id", user.id).maybeSingle();
      setHasEmergencyProfile(!!emProfile);

      setLoading(false);
    };
    load();
  }, [user]);

  // Realtime sync for is_available toggle
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('sitter-availability')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'sitter_profiles',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        if (typeof payload.new?.is_available === 'boolean') {
          setIsAvailable(payload.new.is_available);
          setOnboardingChecks(prev => ({ ...prev, availableMode: payload.new.is_available }));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const toggleAvailability = async () => {
    const newVal = !isAvailable;
    setIsAvailable(newVal);
    setOnboardingChecks(prev => ({ ...prev, availableMode: newVal }));
    await supabase.from("sitter_profiles").update({ is_available: newVal }).eq("user_id", user!.id);
  };

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
  const emergencyDone = emergencyConditions.filter(c => c.ok).length;

  // Badges unlocked set
  const unlockedSet: Record<string, boolean> = {};
  if (identityVerified) unlockedSet["id_verifiee"] = true;
  if (isFounder) unlockedSet["fondateur"] = true;
  badges.forEach((b: any) => {
    const key = b.badge_key || b.id;
    if (key) unlockedSet[key] = true;
  });
  const unlockedCount = TIMBRES_ORDER.filter(k => unlockedSet[k]).length;

  // Checklist
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
    <div className="space-y-0">
      {/* ═══ 1. HEADER — VERT FONCÉ ═══ */}
      <div className="relative overflow-hidden bg-[#1a4a35] rounded-b-3xl px-10 pt-8 pb-6 mb-8">
        {/* Formes décoratives */}
        <div className="absolute right-0 top-0 opacity-[0.07] pointer-events-none">
          <svg width="300" height="200" viewBox="0 0 300 200">
            <circle cx="250" cy="50" r="120" fill="white"/>
            <circle cx="200" cy="150" r="80" fill="white"/>
          </svg>
        </div>

        <div className="relative z-10 flex items-center justify-between">
          {/* Gauche — titre */}
          <div>
            <p className="text-xs uppercase tracking-[3px] text-white/60 font-sans mb-1">
              Espace gardien
            </p>
            <h1 className="text-4xl font-heading font-bold text-white leading-tight mb-1">
              Bonjour{user?.firstName ? `, ${capitalize(user.firstName)}` : ""} !
            </h1>
            <p className="text-sm text-white/75 font-sans">
              {subtitle}
            </p>
          </div>

          {/* Droite — lien profil + toggle */}
          <div className="flex flex-col items-end gap-3 shrink-0">
            <a
              href={`/gardiens/${user?.id}`}
              className="text-xs text-white/70 font-sans flex items-center gap-1 hover:text-white/90"
            >
              Voir votre profil public ↗
            </a>

            {/* Toggle disponibilité */}
            <div className="flex items-center gap-3 bg-white/10 border border-white/20 rounded-xl px-4 py-2.5">
              <div>
                <p className="text-sm text-white font-sans font-medium leading-none mb-0.5">
                  Je suis disponible
                </p>
                <p className="text-xs text-white/60 font-sans">
                  {isAvailable ? "Visible dans les résultats" : "Activez pour apparaître"}
                </p>
              </div>
              <button
                onClick={toggleAvailability}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${isAvailable ? 'bg-green-400' : 'bg-white/20'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200 ${isAvailable ? 'left-5' : 'left-0.5'}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ 2. BARRE DE STATUT UNIFIÉE ═══ */}
      <div className="mx-8 mb-8 bg-card border border-border rounded-2xl overflow-hidden grid grid-cols-3">
        {/* Zone 1 — MON PROFIL */}
        <div className="p-5 border-r border-border">
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
        <div className="p-5 border-r border-border">
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
              <p className="text-xs text-muted-foreground font-sans">Écussons</p>
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
        <div className="p-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-sans mb-3">
            Statut d'urgence
          </p>
          <div className="h-1.5 bg-muted rounded-full mb-1">
            <div
              className="h-1.5 bg-amber-400 rounded-full transition-all duration-500"
              style={{ width: `${(emergencyDone / 5) * 100}%` }}
            />
          </div>
          <p className="text-xs text-amber-600 font-sans mb-3">
            {emergencyDone}/5 conditions remplies
          </p>
          <div className="flex flex-col gap-1.5">
            {emergencyConditions.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full shrink-0 ${c.ok ? 'bg-primary' : 'bg-muted'}`} />
                <span className={`text-xs font-sans ${c.ok ? 'text-muted-foreground line-through' : 'text-foreground/70'}`}>
                  {c.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Emergency active section */}
      {hasEmergencyProfile && <div className="px-8"><EmergencyDashSection /></div>}

      {/* ═══ 3. CTA + TIMBRES ═══ */}
      <div className="px-8 mb-8">
        <button
          onClick={() => navigate('/search')}
          className="w-full bg-primary text-white rounded-2xl py-4 text-base font-sans font-semibold mb-6 hover:bg-primary/90 transition-colors"
        >
          Découvrez les gardes disponibles →
        </button>

        <div className="bg-card border border-border rounded-2xl p-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-sans mb-3">
            Mes écussons
          </p>
          <div className="grid grid-cols-6 gap-2.5 mb-3">
            {TIMBRES_ORDER.map((key) => (
              <div key={key} className="flex justify-center">
                <BadgeTimbre id={key} unlocked={!!unlockedSet[key]} size="compact" />
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground font-sans text-center">
            {unlockedCount} timbre(s) sur 12 débloqué(s)
            {unlockedCount === 0 && " — continuez à garder pour en collecter."}
          </p>
        </div>
      </div>

      {/* ═══ 4. CHECKLIST ═══ */}
      <div className="px-8 mb-8">
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
                      className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${isAvailable ? 'bg-green-400' : 'bg-muted'}`}
                    >
                      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200 ${isAvailable ? 'left-5' : 'left-0.5'}`} />
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
      <div className="grid grid-cols-2 gap-4 px-8 mb-8">
        {/* Colonne gauche — Annonces */}
        <div className="bg-card border border-border rounded-2xl p-5">
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
                        <span className="ml-2 text-xs bg-primary text-white rounded px-1.5 py-0.5">
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
        <div className="bg-card border border-border rounded-2xl p-5">
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
              onClick={() => navigate('/petites-missions')}
              className="w-full bg-primary text-white rounded-xl py-2.5 text-xs font-sans font-medium"
            >
              Publier un besoin →
            </button>
            <button
              onClick={() => navigate('/petites-missions')}
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

      {/* Conseils */}
      {articles.length > 0 && (
        <div className="px-8 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg font-semibold">Conseils pour vous</h2>
            <Link to="/actualites" className="text-xs text-primary hover:underline font-medium">Voir tout →</Link>
          </div>
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
