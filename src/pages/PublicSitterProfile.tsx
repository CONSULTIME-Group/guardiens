import { useState, useEffect } from "react";
import FounderBadge from "@/components/badges/FounderBadge";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PageMeta from "@/components/PageMeta";
import { BadgeRow } from "@/components/badges/BadgeRow";
import { BadgeSceau } from "@/components/badges/BadgeSceau";
import { StatutGardienBadge } from "@/components/profile/StatutGardienBadge";
import { useProfileReputation, useUserBadges } from "@/hooks/useProfileReputation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

import { Skeleton } from "@/components/ui/skeleton";
import { buildAbsoluteUrl } from "@/lib/seo";
import {
  Car, MapPin, X, BadgeCheck,
  ChevronLeft, ChevronRight,
  Shield, Star, PawPrint,
  Home, KeyRound, Handshake, Heart,
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import PublicExperiences from "@/components/profile/PublicExperiences";

const capitalize = (name: string) =>
  name ? name.charAt(0).toUpperCase() + name.slice(1).toLowerCase() : "";

const ANIMAL_LABELS: Record<string, string> = {
  dog: "Chiens", cat: "Chats", bird: "Oiseaux", fish: "Poissons",
  reptile: "Reptiles", rabbit: "Lapins", horse: "Chevaux",
  rodent: "Rongeurs", nac: "NAC", farm: "Animaux de ferme",
};

const SITTER_TYPE_LABELS: Record<string, string> = {
  solo: "Solo", couple: "Couple", family: "Famille", retired: "Retraité(e)",
};

const MIN_DURATION_LABELS: Record<string, string> = {
  "1-3 jours": "1 à 3 jours minimum",
  "short": "1 à 3 jours minimum",
  "1 semaine": "1 semaine minimum",
  "week": "1 semaine minimum",
  "2 semaines": "2 semaines minimum",
  "two_weeks": "2 semaines minimum",
  "1 mois": "1 mois minimum",
  "month": "1 mois minimum",
  "flexible": "Durée flexible",
};

const ENV_LABELS: Record<string, string> = {
  city: "Ville", countryside: "Campagne", mountain: "Montagne",
  sea: "Bord de mer", suburb: "Banlieue",
};

type ProfileTab = 'gardien' | 'proprio' | 'entraide';

interface OwnerProfileData {
  id: string;
  user_id: string;
  description: string | null;
  property_type: string | null;
  environments: string[];
  competences: string[] | null;
  competences_disponible: boolean | null;
}

export default function PublicSitterProfile() {
  const { id } = useParams<{ id: string }>();
  const auth = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');

  const { data: reputation } = useProfileReputation(id);
  const { data: userBadges } = useUserBadges(id);

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [sitterProfile, setSitterProfile] = useState<any>(null);
  const [ownerProfile, setOwnerProfile] = useState<OwnerProfileData | null>(null);
  const [missionCount, setMissionCount] = useState<number>(0);
  const [badges, setBadges] = useState<{ badge_key: string; count: number }[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewCount, setReviewCount] = useState(0);
  const [gallery, setGallery] = useState<any[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [emergencyActive, setEmergencyActive] = useState(false);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [badgesBySitId, setBadgesBySitId] = useState<Record<string, string[]>>({});
  const [activeTab, setActiveTab] = useState<ProfileTab>('gardien');
  const [pets, setPets] = useState<any[]>([]);
  const [ownerSits, setOwnerSits] = useState<any[]>([]);
  const [ownerReviews, setOwnerReviews] = useState<any[]>([]);
  const [missionFeedbacks, setMissionFeedbacks] = useState<any[]>([]);
  const [missionsPublished, setMissionsPublished] = useState<any[]>([]);
  const [missionsHelped, setMissionsHelped] = useState<any[]>([]);

  // Show-more states for list truncation
  const [showAllGardeReviews, setShowAllGardeReviews] = useState(false);
  const [showAllMissionReviewsTab, setShowAllMissionReviewsTab] = useState(false);
  const [showAllOwnerSits, setShowAllOwnerSits] = useState(false);
  const [showAllOwnerReviews, setShowAllOwnerReviews] = useState(false);
  const [showAllOwnerFeedbacks, setShowAllOwnerFeedbacks] = useState(false);
  const [showAllMissionsPublished, setShowAllMissionsPublished] = useState(false);
  const [showAllMissionsHelped, setShowAllMissionsHelped] = useState(false);
  const [showAllEntraideFeedbacks, setShowAllEntraideFeedbacks] = useState(false);

  const VISIBLE_COUNT = 3;
  const ShowMoreBtn = ({ items, showAll, setShowAll }: { items: any[]; showAll: boolean; setShowAll: (v: boolean) => void }) =>
    items.length > VISIBLE_COUNT ? (
      <button
        type="button"
        onClick={() => setShowAll(!showAll)}
        className="text-sm text-primary hover:underline font-body mt-2"
      >
        {showAll ? 'Voir moins' : `Voir les ${items.length - VISIBLE_COUNT} autres`}
      </button>
    ) : null;

  const handleTabChange = (tab: ProfileTab) => {
    setActiveTab(tab);
    setSearchParams({ tab }, { replace: true });
  };

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      const [profileRes, baseProfileRes, sitterRes, badgesRes, reviewsRes, galleryRes, emergencyRes, subRes, ownerRes, missionsRes] =
        await Promise.all([
          supabase.from("public_profiles").select("*").eq("id", id).maybeSingle(),
          supabase.from("profiles").select("id, first_name, last_name, avatar_url, bio, city, postal_code, created_at, identity_verified, is_founder, profile_completion, completed_sits_count, cancellation_count").eq("id", id).maybeSingle(),
          supabase.from("sitter_profiles").select("*").eq("user_id", id).maybeSingle(),
          supabase.from("badge_attributions").select("badge_id").eq("user_id", id),
          supabase
            .from("reviews")
            .select("*, reviewer:profiles!reviews_reviewer_id_fkey(first_name, avatar_url)")
            .eq("reviewee_id", id)
            .eq("published", true)
            .eq("moderation_status", "valide")
            .neq("review_type", "annulation")
            .order("created_at", { ascending: false })
            .limit(10),
          supabase.from("sitter_gallery").select("*").eq("user_id", id).order("created_at", { ascending: false }),
          supabase.from("emergency_sitter_profiles").select("is_active").eq("user_id", id).maybeSingle(),
          supabase.from("subscriptions").select("status").eq("user_id", id).eq("status", "active").limit(1),
          supabase
            .from("owner_profiles")
            .select("id, user_id, environments, competences, competences_disponible")
            .eq("user_id", id)
            .maybeSingle(),
          supabase
            .from("small_missions")
            .select("id", { count: "exact", head: true })
            .eq("user_id", id),
        ]);

      // Store in local variables before setState
      const fetchedPublicProfile = profileRes?.data ?? baseProfileRes?.data ?? null;
      const fetchedSitterProfile = sitterRes?.data ?? null;
      const fetchedOwnerProfile = (ownerRes?.data as OwnerProfileData | null) ?? null;
      const fetchedEmergencyProfile = emergencyRes?.data ?? null;
      const fetchedMissionCount = missionsRes?.count ?? 0;

      if (fetchedPublicProfile) setProfile(fetchedPublicProfile);
      if (fetchedSitterProfile) setSitterProfile(fetchedSitterProfile);
      if (galleryRes.data) setGallery(galleryRes.data);
      if (fetchedEmergencyProfile) setEmergencyActive(fetchedEmergencyProfile.is_active);
      setHasActiveSubscription(!!(subRes.data && (subRes.data as any[]).length > 0));
      setOwnerProfile(fetchedOwnerProfile);
      setMissionCount(fetchedMissionCount);

      if (badgesRes.data) {
        const map: Record<string, number> = {};
        badgesRes.data.forEach((b: any) => {
          map[b.badge_id] = (map[b.badge_id] || 0) + 1;
        });
        setBadges(Object.entries(map).map(([badge_key, count]) => ({ badge_key, count })));
      }

      if (reviewsRes.data) {
        setReviews(reviewsRes.data);
        setReviewCount(reviewsRes.data.length);
        if (reviewsRes.data.length > 0) {
          const sum = reviewsRes.data.reduce((a: number, r: any) => a + (r.overall_rating || 0), 0);
          setAvgRating(Math.round((sum / reviewsRes.data.length) * 10) / 10);
        }

        const sitIdsFromReviews = reviewsRes.data
          .map((r: any) => r.sit_id)
          .filter((sid: string | null): sid is string => sid !== null);
        if (sitIdsFromReviews.length > 0) {
          const { data: badgeAttrData } = await supabase
            .from("badge_attributions")
            .select("badge_id, sit_id")
            .in("sit_id", sitIdsFromReviews)
            .eq("user_id", id);
          const grouped: Record<string, string[]> = {};
          (badgeAttrData || []).forEach((b: any) => {
            if (!grouped[b.sit_id]) grouped[b.sit_id] = [];
            grouped[b.sit_id].push(b.badge_id);
          });
          setBadgesBySitId(grouped);
        }
      }

      // Calculate default tab from fetched data
      const hasSitterProfile = fetchedSitterProfile !== null;
      const hasOwnerProfile = fetchedOwnerProfile !== null;
      const hasEntraide = fetchedMissionCount > 0;
      const currentTabParam = searchParams.get('tab');

      let defaultTab: ProfileTab = 'gardien';
      if (currentTabParam === 'gardien' && hasSitterProfile) {
        defaultTab = 'gardien';
      } else if (currentTabParam === 'proprio' && hasOwnerProfile) {
        defaultTab = 'proprio';
      } else if (currentTabParam === 'entraide' && hasEntraide) {
        defaultTab = 'entraide';
      } else if (hasSitterProfile) {
        defaultTab = 'gardien';
      } else if (hasOwnerProfile) {
        defaultTab = 'proprio';
      } else if (hasEntraide) {
        defaultTab = 'entraide';
      }

      setActiveTab(defaultTab);

      // debug removed

      setLoading(false);
      window.prerenderReady = true;
    };
    load();
  }, [id]);
  useEffect(() => {
    if (activeTab !== 'proprio') return;
    if (!id || loading) return;

    const loadOwnerData = async () => {
      // Query 1 — Animaux via properties
      let fetchedPets: any[] = [];
      const { data: userProperties } = await supabase
        .from('properties')
        .select('id')
        .eq('user_id', id);
      const propertyIds = (userProperties || []).map((p: any) => p.id);
      if (propertyIds.length > 0) {
        const { data: petsData, error: petsErr } = await supabase
          .from('pets')
          .select('id, name, species, breed, age, photo_url, character')
          .in('property_id', propertyIds);
        if (petsErr) console.error('[pets]', petsErr);
        else fetchedPets = petsData ?? [];
      }
      setPets(fetchedPets);

      // Query 2 — Annonces publiées
      const { data: sitsData, error: sitsErr } = await supabase
        .from('sits')
        .select('id, title, start_date, end_date, status, created_at')
        .eq('user_id', id)
        .in('status', ['published', 'confirmed', 'completed'])
        .order('created_at', { ascending: false })
        .limit(10);
      if (sitsErr) console.error('[sits]', sitsErr);
      setOwnerSits(sitsData ?? []);

      // Query 3 — Avis reçus en tant que proprio
      const { data: revData, error: revErr } = await supabase
        .from('reviews')
        .select('id, overall_rating, comment, created_at, review_type, reviewer:profiles!reviews_reviewer_id_fkey(first_name, avatar_url)')
        .eq('reviewee_id', id)
        .eq('published', true)
        .eq('moderation_status', 'valide')
        .in('review_type', ['proprio', 'owner'])
        .order('created_at', { ascending: false });
      if (revErr) console.error('[ownerReviews]', revErr);
      setOwnerReviews(revData ?? []);

      // Query 4 — Feedbacks missions
      const { data: fbData, error: fbErr } = await supabase
        .from('mission_feedbacks')
        .select('id, positive, comment, created_at, badge_key')
        .eq('receiver_id', id)
        .order('created_at', { ascending: false });
      if (fbErr && fbErr.code !== 'PGRST116') console.error('[missionFeedbacks]', fbErr);
      setMissionFeedbacks(fbData ?? []);
    };

    loadOwnerData();
  }, [activeTab, id, loading]);

  // Load entraide data on demand
  useEffect(() => {
    if (activeTab !== 'entraide') return;
    if (!id) return;

    const loadEntraideData = async () => {
      const { data: published } = await supabase
        .from('small_missions')
        .select('id, title, category, status, created_at, exchange_offer')
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(20);

      const helpedResult = await supabase
        .from('small_mission_responses')
        .select('id, status, created_at, small_missions(id, title, category, status, created_at)')
        .eq('responder_id', id)
        .eq('status', 'accepted')
        .order('created_at', { ascending: false })
        .limit(20);

      setMissionsPublished(published ?? []);
      setMissionsHelped(!helpedResult.error ? (helpedResult.data ?? []) : []);
    };

    loadEntraideData();
  }, [activeTab, id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-5xl mx-auto px-6 py-10 space-y-6">
          <div className="flex items-center gap-8">
            <Skeleton className="w-24 h-24 rounded-full shrink-0" />
            <div className="space-y-3 flex-1">
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile && !ownerProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-foreground">Profil introuvable</p>
          <Link to="/" className="text-sm text-primary hover:underline mt-2 block">
            Retour à l'accueil
          </Link>
        </div>
      </div>
    );
  }

  const firstName = capitalize(profile?.first_name || "");
  const city = profile?.city || "";
  const bio = profile?.bio || "";
  const motivation = sitterProfile?.motivation || "";
  const animalTypes: string[] = sitterProfile?.animal_types || [];
  const hasVehicle = sitterProfile?.has_vehicle || false;
  const rawRadius = sitterProfile?.geographic_radius;
  const completedSits = profile?.completed_sits_count || 0;
  const cancellations = profile?.cancellation_count || 0;
  const radius = rawRadius && rawRadius > 0 ? rawRadius : null;
  const isOwn = auth?.user?.id === id;
  const isAuthenticated = auth?.isAuthenticated;
  const isOwner = auth?.activeRole === "owner";
  const isSitter = auth?.activeRole === "sitter";
  const isAvailable = sitterProfile?.is_available || false;

  const sitterType = sitterProfile?.sitter_type || "";
  const accompaniedBy = sitterProfile?.accompanied_by || "";
  const lifestyle: string[] = sitterProfile?.lifestyle || [];
  const minDuration: string = sitterProfile?.min_duration || "";
  const preferredEnvironments: string[] = sitterProfile?.preferred_environments || [];
  const competences: string[] = sitterProfile?.competences || [];
  const preferredFrequency: string = sitterProfile?.preferred_frequency || "";
  const minNotice: string = sitterProfile?.min_notice || "";

  const FREQUENCY_LABELS: Record<string, string> = {
    occasionnel: "Occasionnel",
    occasional: "Occasionnel",
    regulier: "Régulier",
    regular: "Régulier",
  };
  const NOTICE_LABELS: Record<string, string> = {
    "1_semaine": "Préavis : 1 semaine",
    "1_week": "Préavis : 1 semaine",
    "2_semaines": "Préavis : 2 semaines",
    "2_weeks": "Préavis : 2 semaines",
    "1_mois": "Préavis : 1 mois",
    "1_month": "Préavis : 1 mois",
  };
  const frequencyLabel = FREQUENCY_LABELS[preferredFrequency] || "";
  const noticeLabel = NOTICE_LABELS[minNotice] || "";

  const totalBadgeCount = badges.reduce((s: any, b: any) => s + b.count, 0);

  const gardeReviews = reviews.filter((r: any) => r.sit_id !== null);
  const missionReviews = reviews.filter((r: any) => r.sit_id === null);
  const visibleGallery = gallery.slice(0, 9);

  const showCTA = !(isOwn || (isAuthenticated && isSitter));

   // SEO
  const animalLabels = animalTypes.map(a => ANIMAL_LABELS[a] || a).join(", ");
  const rawTitle = `${firstName} — Gardien de maison en AURA`;
  const pageTitle = rawTitle;
  const pageDesc = ((bio || motivation || "") as string).slice(0, 160) || `${firstName} garde des ${animalLabels || "animaux"} à ${city || "France"}. Profil vérifié sur Guardiens.fr.`;
  const pageUrl = buildAbsoluteUrl(`/gardiens/${id}`);
  const shouldNoindex = !profile?.identity_verified || (profile?.profile_completion ?? 0) < 60;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: firstName,
    address: { "@type": "PostalAddress", addressLocality: city, addressCountry: "FR" },
    description: motivation || bio,
    url: pageUrl,
  };

  const typeLabel = SITTER_TYPE_LABELS[sitterType] || sitterType;
  const accompLabel = accompaniedBy ? `avec ${accompaniedBy}` : "";
  const typeLineItems = [typeLabel, accompLabel].filter(Boolean);
  const typeLine = typeLineItems.length > 0 ? typeLineItems.join(" · ") : "";

  const durationLabel = minDuration
    ? (MIN_DURATION_LABELS[minDuration] || "Durée flexible")
    : "";

  // Stats line
  const statsItems: string[] = [];
  statsItems.push(`${completedSits} garde${completedSits !== 1 ? "s" : ""}`);
  statsItems.push(avgRating > 0 ? `${avgRating} ★` : "Pas encore noté");
  statsItems.push(`${totalBadgeCount} écusson${totalBadgeCount !== 1 ? "s" : ""}`);

  // Relative date helper
  const relativeDate = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days < 1) return "Aujourd'hui";
    if (days < 30) return `il y a ${days} jour${days > 1 ? "s" : ""}`;
    const months = Math.floor(days / 30);
    if (months < 12) return `il y a ${months} mois`;
    const years = Math.floor(months / 12);
    return `il y a ${years} an${years > 1 ? "s" : ""}`;
  };

  // Tab visibility
  const hasSitterProfile = sitterProfile !== null;
  const hasOwnerProfile = ownerProfile !== null;
  const hasEntraide = missionCount > 0;
  const availableTabs = [hasSitterProfile, hasOwnerProfile, hasEntraide].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Bandes latérales décoratives */}
      <div style={{ position: 'fixed', left: 0, top: 0, bottom: 0, width: '56px', background: 'linear-gradient(to right, rgba(45,106,79,0.06), transparent)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: '56px', background: 'linear-gradient(to left, rgba(45,106,79,0.06), transparent)', pointerEvents: 'none', zIndex: 0 }} />
      {/* Texte vertical gauche */}
      <div style={{ position: 'fixed', left: '10px', top: '50%', transform: 'translateY(-50%) rotate(-90deg)', fontSize: '9px', letterSpacing: '4px', textTransform: 'uppercase' as const, color: 'rgba(45,106,79,0.28)', whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 0, fontFamily: 'sans-serif' }}>
        Guardiens · Auvergne-Rhône-Alpes
      </div>
      {/* Texte vertical droit */}
      <div style={{ position: 'fixed', right: '10px', top: '50%', transform: 'translateY(-50%) rotate(90deg)', fontSize: '9px', letterSpacing: '4px', textTransform: 'uppercase' as const, color: 'rgba(45,106,79,0.28)', whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 0, fontFamily: 'sans-serif' }}>
        Gardiens de confiance · Gens du coin
      </div>
      <PageMeta
        title={pageTitle}
        description={pageDesc}
        path={`/gardiens/${id}`}
        image={profile?.avatar_url || undefined}
        type="website"
        noindex={shouldNoindex}
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      {/* ── Contenu principal z-1 ── */}
      <div className="relative z-[1]">
      {/* ── HERO FUSIONNÉ : SVG + HEADER ── */}
      <div className="relative overflow-hidden w-full min-h-[240px] flex items-end bg-[#F0EDE6]">
        {/* SVG fond */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <svg viewBox="0 0 1200 240" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" className="w-full h-full">
            <defs>
              <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#E8E4DC"/>
                <stop offset="100%" stopColor="#F0EDE6"/>
              </linearGradient>
              <linearGradient id="fadeBottom" x1="0" y1="0" x2="0" y2="1">
                <stop offset="60%" stopColor="#F0EDE6" stopOpacity="0"/>
                <stop offset="100%" stopColor="#FAF9F6" stopOpacity="1"/>
              </linearGradient>
            </defs>
            <rect width="1200" height="240" fill="url(#sky)"/>
            <ellipse cx="200" cy="260" rx="300" ry="80" fill="#2D6A4F" opacity="0.06"/>
            <ellipse cx="900" cy="270" rx="350" ry="90" fill="#2D6A4F" opacity="0.05"/>
            <ellipse cx="600" cy="280" rx="400" ry="100" fill="#2D6A4F" opacity="0.07"/>
            <rect x="0" y="208" width="1200" height="32" fill="#2D6A4F" opacity="0.08"/>
            <g opacity="0.18" fill="#2D6A4F">
              <rect x="80" y="160" width="60" height="50"/>
              <polygon points="80,160 140,160 110,128"/>
              <rect x="100" y="180" width="16" height="30"/>
              <rect x="88" y="168" width="12" height="12"/>
              <rect x="120" y="168" width="12" height="12"/>
            </g>
            <g opacity="0.15" fill="#2D6A4F">
              <rect x="168" y="170" width="6" height="40"/>
              <ellipse cx="171" cy="160" rx="18" ry="22"/>
            </g>
            <g opacity="0.14" fill="#2D6A4F">
              <rect x="540" y="150" width="80" height="60"/>
              <polygon points="540,150 620,150 580,115"/>
              <rect x="565" y="178" width="20" height="32"/>
              <rect x="548" y="160" width="14" height="14"/>
              <rect x="598" y="160" width="14" height="14"/>
              <rect x="600" y="118" width="8" height="16"/>
            </g>
            <g opacity="0.12" fill="#2D6A4F">
              <rect x="488" y="165" width="7" height="45"/>
              <ellipse cx="491" cy="152" rx="22" ry="26"/>
            </g>
            <g opacity="0.13" fill="#2D6A4F">
              <rect x="648" y="172" width="6" height="38"/>
              <ellipse cx="651" cy="160" rx="17" ry="20"/>
            </g>
            <g opacity="0.12" fill="#2D6A4F">
              <rect x="980" y="165" width="55" height="45"/>
              <polygon points="980,165 1035,165 1007,136"/>
              <rect x="997" y="185" width="14" height="25"/>
              <rect x="986" y="173" width="10" height="10"/>
              <rect x="1015" y="173" width="10" height="10"/>
            </g>
            <g opacity="0.11" fill="#2D6A4F">
              <rect x="1055" y="168" width="6" height="42"/>
              <ellipse cx="1058" cy="156" rx="20" ry="24"/>
            </g>
            <g opacity="0.20" fill="#2D6A4F" transform="translate(340, 178)">
              <ellipse cx="30" cy="18" rx="28" ry="12"/>
              <circle cx="56" cy="12" r="10"/>
              <ellipse cx="62" cy="8" rx="5" ry="8" transform="rotate(15,62,8)"/>
              <path d="M2,16 Q-12,8 -8,2" stroke="#2D6A4F" strokeWidth="3" fill="none" opacity="0.20"/>
              <rect x="8" y="28" width="5" height="14" rx="2"/>
              <rect x="18" y="28" width="5" height="12" rx="2"/>
              <rect x="35" y="28" width="5" height="14" rx="2"/>
              <rect x="45" y="28" width="5" height="12" rx="2"/>
              <ellipse cx="64" cy="16" rx="4" ry="3"/>
            </g>
            <g opacity="0.16" fill="#2D6A4F" transform="translate(820, 180)">
              <ellipse cx="16" cy="20" rx="14" ry="16"/>
              <circle cx="16" cy="6" r="10"/>
              <polygon points="8,0 4,-8 14,-2"/>
              <polygon points="24,0 28,-8 18,-2"/>
              <path d="M30,28 Q44,20 40,10" stroke="#2D6A4F" strokeWidth="3" fill="none" opacity="0.16"/>
              <ellipse cx="11" cy="6" rx="2" ry="2.5" fill="#F0EDE6"/>
              <ellipse cx="21" cy="6" rx="2" ry="2.5" fill="#F0EDE6"/>
            </g>
            <rect width="1200" height="240" fill="url(#fadeBottom)"/>
          </svg>
        </div>

        {/* Dégradé bas */}
        <div className="absolute bottom-0 left-0 right-0 h-24 z-[1] bg-gradient-to-b from-transparent to-background pointer-events-none" />

        {/* Contenu header par-dessus */}
        <div className="relative z-10 w-full max-w-5xl mx-auto px-6 pb-8 pt-6">
          {/* Ligne retour */}
          <div className="flex justify-end mb-4">
            <Link
              to="/recherche-gardiens"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← Retour aux gardiens
            </Link>
          </div>

          {/* Flex photo + infos */}
          <div className="flex items-end gap-6">
            {/* Photo grande */}
            <div className="shrink-0 relative">
              <img
                src={profile.avatar_url || "/placeholder.svg"}
                alt={firstName}
                className="w-28 h-28 md:w-40 md:h-40 rounded-full object-cover object-center border-4 border-white shadow-md ring-2 ring-primary ring-offset-2"
              />
              {reputation && reputation.statut_gardien !== 'novice' && (
                <div className="absolute -bottom-2 -right-2">
                  <StatutGardienBadge statut={reputation.statut_gardien} />
                </div>
              )}
            </div>

            {/* Infos */}
            <div className="flex flex-col gap-1.5 pb-1">
              {isAvailable && (
                <span className="inline-flex w-fit items-center text-xs bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-medium">
                  Disponible
                </span>
              )}

              <div className="flex items-center gap-3">
                <h1 className="text-4xl md:text-5xl font-heading font-bold text-foreground leading-tight capitalize">
                  {firstName}
                </h1>
                {profile?.is_founder && <FounderBadge size="lg" />}
              </div>

              {city && (
                <p className="text-base text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> Gardien à {city}
                </p>
              )}

              {(profile?.identity_verified || profile?.is_founder || emergencyActive || hasActiveSubscription) && (
                <div className="flex items-center gap-2 flex-wrap">
                  {hasActiveSubscription && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground border border-border rounded-full px-2 py-0.5 bg-white/80">
                      <BadgeCheck size={11} className="text-primary" /> Abonné
                    </span>
                  )}
                  {profile?.identity_verified && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground border border-border rounded-full px-2 py-0.5 bg-white/80">
                      <Shield size={11} className="text-primary" /> ID vérifiée
                    </span>
                  )}
                  {profile?.is_founder && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground border border-border rounded-full px-2 py-0.5 bg-white/80">
                      <Star size={11} className="text-primary" /> Fondateur
                    </span>
                  )}
                  {emergencyActive && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground border border-border rounded-full px-2 py-0.5 bg-white/80">
                      <Shield size={11} className="text-primary" /> Gardien d'urgence
                    </span>
                  )}
                </div>
              )}

              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                {statsItems.map((s, i) => (
                  <span key={i} className="flex items-center gap-1">
                    {i > 0 && <span className="text-border mr-3">·</span>}
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── BARRE D'ONGLETS — visible si ≥ 2 onglets ── */}
      {availableTabs > 1 && (
        <div className="flex border-b border-border bg-card sticky top-0 z-10 max-w-5xl mx-auto">
          {hasSitterProfile && (
            <button
              type="button"
              onClick={() => handleTabChange('gardien')}
              className={[
                'flex items-center gap-2 px-5 py-3.5',
                'text-sm font-medium font-body',
                'border-b-2 transition-all',
                'focus-visible:outline-none',
                activeTab === 'gardien'
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-foreground/60 hover:text-foreground hover:bg-muted/50',
              ].join(' ')}
            >
              <Home className="w-4 h-4" aria-hidden="true" />
              Gardien
            </button>
          )}
          {hasOwnerProfile && (
            <button
              type="button"
              onClick={() => handleTabChange('proprio')}
              className={[
                'flex items-center gap-2 px-5 py-3.5',
                'text-sm font-medium font-body',
                'border-b-2 transition-all',
                'focus-visible:outline-none',
                activeTab === 'proprio'
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-foreground/60 hover:text-foreground hover:bg-muted/50',
              ].join(' ')}
            >
              <KeyRound className="w-4 h-4" aria-hidden="true" />
              Propriétaire
            </button>
          )}
          {hasEntraide && (
            <button
              type="button"
              onClick={() => handleTabChange('entraide')}
              className={[
                'flex items-center gap-2 px-5 py-3.5',
                'text-sm font-medium font-body',
                'border-b-2 transition-all',
                'focus-visible:outline-none',
                activeTab === 'entraide'
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-foreground/60 hover:text-foreground hover:bg-muted/50',
              ].join(' ')}
            >
              <Handshake className="w-4 h-4" aria-hidden="true" />
              Entraide
            </button>
          )}
        </div>
      )}

      {/* ── SÉPARATEUR ── */}
      {availableTabs <= 1 && <hr className="border-border max-w-5xl mx-auto" />}

      {/* ── ONGLET GARDIEN ── */}
      {activeTab === 'gardien' && (
        <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col md:flex-row gap-8 md:gap-12 items-start">

          {/* ── LEFT COLUMN ── */}
          <div className="w-full md:w-[260px] md:shrink-0 md:sticky md:top-8 space-y-6">

            {/* Lifestyle */}
            {lifestyle.length > 0 && (
              <div className="border-b border-border pb-4 mb-4">
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Style de vie</p>
                <div className="flex flex-wrap gap-1.5">
                  {lifestyle.map(l => (
                    <span key={l} className="border border-border rounded-full text-xs px-2.5 py-0.5 text-foreground">
                      {l}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Profile info */}
            {(typeLine || durationLabel) && (
              <div className="border-b border-border pb-4 mb-4">
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Profil</p>
                <div className="text-sm text-foreground/70 space-y-0.5">
                 {typeLine && <p>{typeLine}</p>}
                  {durationLabel && <p>{durationLabel}</p>}
                  {frequencyLabel && <p>{frequencyLabel}</p>}
                  {noticeLabel && <p>{noticeLabel}</p>}
                </div>
              </div>
            )}

            {/* Preferred environments */}
            {preferredEnvironments.length > 0 && (
              <div className="border-b border-border pb-4 mb-4">
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Environnements</p>
                <div className="flex flex-wrap gap-1.5">
                  {preferredEnvironments.map(e => (
                    <span key={e} className="border border-border rounded-full text-xs px-2.5 py-0.5 text-foreground">
                      {ENV_LABELS[e] || e}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* CTA */}
            {showCTA && (
              <>
                <hr className="border-border" />
                {!isAuthenticated && (
                  <>
                    <Link
                      to={`/inscription?redirect=/gardiens/${id}`}
                      className="block bg-primary text-primary-foreground rounded-xl py-3 text-sm font-medium w-full text-center"
                    >
                      S'inscrire pour contacter
                    </Link>
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      Gratuit pour les propriétaires.
                    </p>
                  </>
                )}
                {isAuthenticated && isOwner && (
                  <button
                    onClick={async () => {
                      if (!auth?.user?.id) return;
                      const uid = auth.user.id;
                      const { data: convs } = await supabase
                        .from("conversations")
                        .select("id, sit_id, updated_at")
                        .or(
                          `and(owner_id.eq.${uid},sitter_id.eq.${id}),and(owner_id.eq.${id},sitter_id.eq.${uid})`
                        );
                      if (convs && convs.length > 0) {
                        const best = convs.sort((a, b) => {
                          if (a.sit_id && !b.sit_id) return -1;
                          if (!a.sit_id && b.sit_id) return 1;
                          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
                        })[0];
                        window.location.href = `/messages?conversation=${best.id}`;
                      } else {
                        window.location.href = `/messages?gardien=${id}`;
                      }
                    }}
                    className="block bg-primary text-primary-foreground rounded-xl py-3 text-sm font-medium w-full text-center cursor-pointer"
                  >
                    Contacter {firstName}
                  </button>
                )}
              </>
            )}
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className="flex-1 space-y-10 min-w-0">

            {/* Motivation */}
            {motivation && (
              <p className="text-base font-normal leading-loose text-foreground/80">
                {motivation}
              </p>
            )}

            {/* Bio */}
            {bio && (
              <>
                <p className="text-sm italic text-muted-foreground mt-3">{bio}</p>
                <hr className="border-border" />
              </>
            )}

            {/* Animaux acceptés */}
            {animalTypes.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Animaux acceptés</p>
                <div className="flex flex-wrap gap-2">
                  {animalTypes.map(a => (
                    <span key={a} className="border border-border rounded-full text-sm px-3 py-1 text-foreground">
                      {ANIMAL_LABELS[a] || a}
                    </span>
                  ))}
                  {sitterProfile?.farm_animals_ok && (
                    <span className="border border-primary text-primary rounded-full text-sm px-3 py-1">
                      Races exigeantes
                    </span>
                  )}
                </div>
                <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                  {hasVehicle ? (
                    <>
                      <Car className="w-4 h-4" />
                      <span>Avec véhicule{radius ? ` — rayon ${radius}km` : ""}</span>
                    </>
                  ) : radius ? (
                    <>
                      <MapPin className="w-4 h-4" />
                      <span>Rayon {radius}km</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">Rayon : Non renseigné</span>
                  )}
                </div>
              </div>
            )}

            {/* Compétences */}
            {competences.length > 0 && (
              <>
                <hr className="border-border" />
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Compétences</p>
                  <div className="flex flex-wrap gap-2">
                    {competences.map(c => (
                      <span key={c} className="border border-border rounded-full text-sm px-3 py-1 text-foreground/80">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}

            <hr className="border-border" />

            {/* Avis */}
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
                Avis{reviewCount > 0 ? ` (${reviewCount})` : ""}
              </p>
              {reviewCount > 0 ? (
                <Tabs defaultValue="gardes" className="w-full">
                  <TabsList className="mb-4">
                    <TabsTrigger value="gardes">
                      Gardes{gardeReviews.length > 0 ? ` (${gardeReviews.length})` : ""}
                    </TabsTrigger>
                    <TabsTrigger value="missions">
                      Missions{missionReviews.length > 0 ? ` (${missionReviews.length})` : ""}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="gardes" forceMount>
                    {gardeReviews.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic py-4">
                        Ce gardien n'a pas encore reçu d'avis de garde sur Guardiens.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {(showAllGardeReviews ? gardeReviews : gardeReviews.slice(0, VISIBLE_COUNT)).map((r: any) => {
                          const authorName = capitalize(r.reviewer?.first_name || "Membre");
                          const avatarUrl = r.reviewer?.avatar_url || null;
                          const reviewBadges = r.sit_id ? (badgesBySitId[r.sit_id] || []) : [];
                          return (
                            <div key={r.id} className="bg-card border border-border rounded-2xl p-4">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Avatar className="w-8 h-8">
                                    {avatarUrl ? <AvatarImage src={avatarUrl} /> : null}
                                    <AvatarFallback className="text-xs bg-muted">
                                      {authorName.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm font-medium text-foreground">{authorName}</span>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(r.created_at), "MMMM yyyy", { locale: fr })}
                                </span>
                              </div>
                              {r.overall_rating !== null && (
                                <div className="flex items-center gap-0.5 mb-2">
                                  {[1, 2, 3, 4, 5].map(i => (
                                    <span key={i} className={`text-sm ${i <= r.overall_rating ? "text-primary" : "text-muted"}`}>★</span>
                                  ))}
                                </div>
                              )}
                              {r.comment && (
                                <p className="text-sm text-foreground/80">{r.comment}</p>
                              )}
                              {reviewBadges.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-3">
                                  {reviewBadges.map((badgeId: string) => (
                                    <BadgeSceau key={badgeId} id={badgeId} size="compact" showCount={false} />
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                        <ShowMoreBtn items={gardeReviews} showAll={showAllGardeReviews} setShowAll={setShowAllGardeReviews} />
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="missions" forceMount>
                    {missionReviews.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic py-4">
                        Ce gardien n'a pas encore reçu d'avis de mission.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {(showAllMissionReviewsTab ? missionReviews : missionReviews.slice(0, VISIBLE_COUNT)).map((r: any) => {
                          const authorName = capitalize(r.reviewer?.first_name || "Membre");
                          const avatarUrl = r.reviewer?.avatar_url || null;
                          return (
                            <div key={r.id} className="bg-card border border-border rounded-2xl p-4">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Avatar className="w-8 h-8">
                                    {avatarUrl ? <AvatarImage src={avatarUrl} /> : null}
                                    <AvatarFallback className="text-xs bg-muted">
                                      {authorName.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm font-medium text-foreground">{authorName}</span>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(r.created_at), "MMMM yyyy", { locale: fr })}
                                </span>
                              </div>
                              {r.overall_rating !== null && (
                                <div className="flex items-center gap-0.5 mb-2">
                                  {[1, 2, 3, 4, 5].map(i => (
                                    <span key={i} className={`text-sm ${i <= r.overall_rating ? "text-primary" : "text-muted"}`}>★</span>
                                  ))}
                                </div>
                              )}
                              {r.comment && (
                                <p className="text-sm text-foreground/80">{r.comment}</p>
                              )}
                            </div>
                          );
                        })}
                        <ShowMoreBtn items={missionReviews} showAll={showAllMissionReviewsTab} setShowAll={setShowAllMissionReviewsTab} />
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              ) : (
                <div className="border border-border rounded-xl p-5 bg-card text-sm text-muted-foreground italic">
                  Les avis apparaîtront ici après la première garde.
                  Chaque propriétaire évalue le gardien et peut attribuer
                  jusqu'à 3 écussons.
                </div>
              )}
            </div>

            <hr className="border-border" />

            {userBadges && userBadges.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">Badges</h3>
                <BadgeRow badges={userBadges} />
              </div>
            )}

            {/* Galerie */}
            {gallery.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Galerie</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {visibleGallery.map((g, i) => (
                    <img
                      key={g.id}
                      src={g.photo_url}
                      alt={g.caption || "Photo"}
                      className="aspect-square object-cover rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setLightboxIdx(i)}
                    />
                  ))}
                </div>
                {gallery.length > 9 && (
                  <p className="text-xs text-primary hover:underline mt-3 cursor-pointer">
                    Voir toutes les photos →
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ONGLET PROPRIO ── */}
      {activeTab === 'proprio' && (
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-10">

          {/* ── DESCRIPTION + ENVIRONNEMENTS ── */}
          {(ownerProfile?.environments?.length ?? 0) > 0 && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {ownerProfile?.environments?.map((env: string) => (
                  <span key={env} className="text-sm bg-muted text-foreground/70 px-3 py-1 rounded-full font-body">
                    {ENV_LABELS[env] || env}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ── ANIMAUX ── */}
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-widest text-foreground/50 font-body">
              {pets.length > 0 ? `Ses animaux (${pets.length})` : 'Ses animaux'}
            </p>
            {pets.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {pets.map((pet) => {
                  const ageNum = parseInt(String(pet.age ?? ''));
                  const ageLabel = !isNaN(ageNum) ? `${ageNum} an${ageNum > 1 ? 's' : ''}` : null;
                  return (
                    <div key={pet.id} className="flex items-center gap-3 bg-card border border-border rounded-xl p-4">
                      {pet.photo_url ? (
                        <img src={pet.photo_url} alt={pet.name} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          <PawPrint className="w-5 h-5 text-foreground/30" aria-hidden="true" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-heading font-semibold text-foreground text-sm truncate">{pet.name}</p>
                        <p className="text-xs text-foreground/60 font-body truncate">
                          {[pet.species, pet.breed, ageLabel].filter(Boolean).join(' · ')}
                        </p>
                        {pet.character && (
                          <p className="text-xs text-foreground/50 font-body mt-0.5 truncate italic">{pet.character}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-foreground/50 font-body italic">Aucun animal renseigné pour l'instant.</p>
            )}
          </div>

          {/* ── ANNONCES ── */}
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-widest text-foreground/50 font-body">
              Gardes publiées{ownerSits.length > 0 && ` (${ownerSits.length})`}
            </p>
            {ownerSits.length > 0 ? (
              <div className="space-y-2">
                {(showAllOwnerSits ? ownerSits : ownerSits.slice(0, VISIBLE_COUNT)).map((sit) => {
                  const statusMap: Record<string, { label: string; style: string }> = {
                    published: { label: 'Publiée', style: 'bg-primary/10 text-primary' },
                    active: { label: 'Active', style: 'bg-primary/10 text-primary' },
                    confirmed: { label: 'Confirmée', style: 'bg-primary/10 text-primary' },
                    completed: { label: 'Terminée', style: 'bg-muted text-foreground/60' },
                    finished: { label: 'Terminée', style: 'bg-muted text-foreground/60' },
                    cancelled: { label: 'Annulée', style: 'bg-destructive/10 text-destructive' },
                    draft: { label: 'Brouillon', style: 'bg-muted text-foreground/40' },
                    archived: { label: 'Archivée', style: 'bg-muted text-foreground/40' },
                    pending: { label: 'En attente', style: 'bg-muted text-foreground/60' },
                  };
                  const s = statusMap[sit.status] ?? { label: '—', style: 'bg-muted text-foreground/40' };
                  const fmt = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
                  return (
                    <div key={sit.id} className="flex items-center justify-between gap-4 bg-card border border-border rounded-xl px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground font-body truncate">{sit.title || 'Garde'}</p>
                        {(sit.start_date || sit.end_date) && (
                          <p className="text-xs text-foreground/50 font-body mt-0.5">
                            {sit.start_date && fmt(sit.start_date)}{sit.end_date && ` → ${fmt(sit.end_date)}`}
                          </p>
                        )}
                      </div>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 font-body whitespace-nowrap ${s.style}`}>
                        {s.label}
                      </span>
                    </div>
                  );
                })}
                <ShowMoreBtn items={ownerSits} showAll={showAllOwnerSits} setShowAll={setShowAllOwnerSits} />
              </div>
            ) : (
              <p className="text-sm text-foreground/50 font-body italic">Aucune garde publiée pour l'instant.</p>
            )}
          </div>

          {/* ── AVIS GARDES ── */}
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-widest text-foreground/50 font-body">
              Avis des gardiens{ownerReviews.length > 0 && ` (${ownerReviews.length})`}
            </p>
            {ownerReviews.length > 0 ? (
              <div className="space-y-3">
                {(showAllOwnerReviews ? ownerReviews : ownerReviews.slice(0, VISIBLE_COUNT)).map((review) => {
                  const stars = Math.min(5, Math.max(0, Number(review.overall_rating) || 0));
                  return (
                    <div key={review.id} className="bg-card border border-border rounded-xl p-4 space-y-2">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        {review.reviewer?.avatar_url ? (
                          <img src={review.reviewer.avatar_url} alt={review.reviewer.first_name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-muted flex-shrink-0" />
                        )}
                        <span className="text-sm font-medium text-foreground font-body">{review.reviewer?.first_name}</span>
                        {stars > 0 && (
                          <span className="text-xs text-amber-500 font-body tracking-wider" aria-label={`${stars} étoiles sur 5`}>
                            {'★'.repeat(stars)}{'☆'.repeat(5 - stars)}
                          </span>
                        )}
                        <span className="text-xs text-foreground/40 font-body ml-auto">
                          {new Date(review.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                        </span>
                      </div>
                      {review.comment && (
                        <p className="text-sm text-foreground/70 font-body leading-relaxed">{review.comment}</p>
                      )}
                    </div>
                  );
                })}
                <ShowMoreBtn items={ownerReviews} showAll={showAllOwnerReviews} setShowAll={setShowAllOwnerReviews} />
              </div>
            ) : (
              <p className="text-sm text-foreground/50 font-body italic">Les avis des gardiens apparaîtront ici après la première garde.</p>
            )}
          </div>

          {/* ── AVIS MISSIONS ── */}
          <div className="space-y-3 border-t border-border/50 pt-8">
            <p className="text-xs uppercase tracking-widest text-foreground/50 font-body">
              Avis d'entraide{missionFeedbacks.length > 0 && ` (${missionFeedbacks.length})`}
            </p>
            {missionFeedbacks.length > 0 ? (
              <div className="space-y-3">
                {(showAllOwnerFeedbacks ? missionFeedbacks : missionFeedbacks.slice(0, VISIBLE_COUNT)).map((fb) => (
                  <div key={fb.id} className="bg-card border border-border rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <div className="w-8 h-8 rounded-full bg-muted flex-shrink-0" />
                      <span className={`text-xs px-2 py-0.5 rounded-full font-body flex-shrink-0 ${fb.positive ? 'bg-primary/10 text-primary' : 'bg-muted text-foreground/50'}`}>
                        {fb.positive ? 'Recommande' : 'Mitigé'}
                      </span>
                      <span className="text-xs text-foreground/40 font-body ml-auto">
                        {new Date(fb.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                    {fb.comment && (
                      <p className="text-sm text-foreground/70 font-body leading-relaxed">{fb.comment}</p>
                    )}
                  </div>
                ))}
                <ShowMoreBtn items={missionFeedbacks} showAll={showAllOwnerFeedbacks} setShowAll={setShowAllOwnerFeedbacks} />
              </div>
            ) : (
              <p className="text-sm text-foreground/50 font-body italic">Les avis d'entraide apparaîtront ici après la première mission.</p>
            )}
          </div>

        </div>
      )}

      {/* ── ONGLET ENTRAIDE ── */}
      {activeTab === 'entraide' && (
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-10">

          {(missionsPublished.length > 0 || missionsHelped.length > 0 || missionFeedbacks.length > 0) && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: missionsPublished.length, label: 'Mission' + (missionsPublished.length > 1 ? 's publiées' : ' publiée') },
                { value: missionsHelped.length, label: 'Coup' + (missionsHelped.length > 1 ? 's de main donnés' : ' de main donné') },
                { value: missionFeedbacks.length, label: 'Avis reçu' + (missionFeedbacks.length > 1 ? 's' : '') },
              ].map(({ value, label }) => (
                <div key={label} className="bg-card border border-border rounded-xl px-4 py-4 text-center">
                  <p className="font-heading text-2xl font-bold text-foreground">{value}</p>
                  <p className="text-xs text-foreground/50 font-body mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-3">
            <p className="text-xs uppercase tracking-widest text-foreground/50 font-body">
              Missions publiées{missionsPublished.length > 0 && ` (${missionsPublished.length})`}
            </p>
            {missionsPublished.length > 0 ? (
              <div className="space-y-2">
                {(showAllMissionsPublished ? missionsPublished : missionsPublished.slice(0, VISIBLE_COUNT)).map((m) => {
                  const statusMap: Record<string, { label: string; style: string }> = {
                    open: { label: 'Ouverte', style: 'bg-primary/10 text-primary' },
                    matched: { label: 'Pourvue', style: 'bg-muted text-foreground/60' },
                    completed: { label: 'Terminée', style: 'bg-muted text-foreground/60' },
                    closed: { label: 'Fermée', style: 'bg-muted text-foreground/40' },
                  };
                  const s = statusMap[m.status] ?? { label: m.status ?? '—', style: 'bg-muted text-foreground/40' };
                  return (
                    <div key={m.id} className="flex items-center justify-between gap-4 bg-card border border-border rounded-xl px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground font-body truncate">{m.title || m.category || 'Mission'}</p>
                        {m.exchange_offer && (
                          <p className="text-xs text-foreground/50 font-body mt-0.5 truncate italic">En échange : {m.exchange_offer}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {m.category && (
                          <span className="text-xs bg-muted text-foreground/60 px-2 py-0.5 rounded-full font-body hidden sm:inline">{m.category}</span>
                        )}
                        <span className={['text-xs font-medium', 'px-2.5 py-1 rounded-full', 'font-body whitespace-nowrap', s.style].join(' ')}>{s.label}</span>
                      </div>
                    </div>
                  );
                })}
                <ShowMoreBtn items={missionsPublished} showAll={showAllMissionsPublished} setShowAll={setShowAllMissionsPublished} />
              </div>
            ) : (
              <p className="text-sm text-foreground/50 font-body italic">Aucune mission publiée pour l'instant.</p>
            )}
          </div>

          <div className="space-y-3">
            <p className="text-xs uppercase tracking-widest text-foreground/50 font-body">
              Coups de main donnés{missionsHelped.length > 0 && ` (${missionsHelped.length})`}
            </p>
            {missionsHelped.length > 0 ? (
              <div className="space-y-2">
                {(showAllMissionsHelped ? missionsHelped : missionsHelped.slice(0, VISIBLE_COUNT)).map((r) => {
                  const m = r.small_missions;
                  return (
                    <div key={r.id} className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3">
                      <Heart className="w-4 h-4 text-primary flex-shrink-0" aria-hidden="true" />
                      <p className="text-sm font-medium text-foreground font-body truncate min-w-0">{m?.title || m?.category || 'Coup de main'}</p>
                      {r.created_at && (
                        <p className="text-xs text-foreground/40 font-body ml-auto flex-shrink-0 whitespace-nowrap">
                          {new Date(r.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                        </p>
                      )}
                    </div>
                  );
                })}
                <ShowMoreBtn items={missionsHelped} showAll={showAllMissionsHelped} setShowAll={setShowAllMissionsHelped} />
              </div>
            ) : (
              <p className="text-sm text-foreground/50 font-body italic">Aucun coup de main enregistré pour l'instant.</p>
            )}
          </div>

          <div className="space-y-3 border-t border-border/50 pt-8">
            <p className="text-xs uppercase tracking-widest text-foreground/50 font-body">
              Avis d'entraide reçus{missionFeedbacks.length > 0 && ` (${missionFeedbacks.length})`}
            </p>
            {missionFeedbacks.length > 0 ? (
              <div className="space-y-3">
                {(showAllEntraideFeedbacks ? missionFeedbacks : missionFeedbacks.slice(0, VISIBLE_COUNT)).map((fb) => (
                  <div key={fb.id} className="bg-card border border-border rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <div className="w-8 h-8 rounded-full bg-muted flex-shrink-0" />
                      <span className={`text-xs px-2 py-0.5 rounded-full font-body flex-shrink-0 ${fb.positive ? 'bg-primary/10 text-primary' : 'bg-muted text-foreground/50'}`}>
                        {fb.positive ? 'Recommande' : 'Mitigé'}
                      </span>
                      <span className="text-xs text-foreground/40 font-body ml-auto">
                        {new Date(fb.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                    {fb.comment && (
                      <p className="text-sm text-foreground/70 font-body leading-relaxed">{fb.comment}</p>
                    )}
                  </div>
                ))}
                <ShowMoreBtn items={missionFeedbacks} showAll={showAllEntraideFeedbacks} setShowAll={setShowAllEntraideFeedbacks} />
              </div>
            ) : (
              <p className="text-sm text-foreground/50 font-body italic">Les avis d'entraide apparaîtront ici après la première mission.</p>
            )}
          </div>

          {missionsPublished.length === 0 && missionsHelped.length === 0 && missionFeedbacks.length === 0 && (
            <div className="text-center py-12 space-y-2">
              <p className="text-base text-foreground/50 font-body">Pas encore de missions d'entraide.</p>
              <p className="text-sm text-foreground/40 font-body italic">Les échanges de services apparaîtront ici après la première mission.</p>
            </div>
          )}

        </div>
      )}

      {/* ── Lightbox ── */}
      {lightboxIdx !== null && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center"
          onClick={() => setLightboxIdx(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white"
            onClick={() => setLightboxIdx(null)}
          >
            <X className="w-6 h-6" />
          </button>
          {lightboxIdx > 0 && (
            <button
              className="absolute left-4 text-white/80 hover:text-white"
              onClick={(e) => { e.stopPropagation(); setLightboxIdx(lightboxIdx - 1); }}
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
          )}
          {lightboxIdx < visibleGallery.length - 1 && (
            <button
              className="absolute right-4 text-white/80 hover:text-white"
              onClick={(e) => { e.stopPropagation(); setLightboxIdx(lightboxIdx + 1); }}
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          )}
          <img
            src={visibleGallery[lightboxIdx]?.photo_url}
            alt=""
            className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
      </div>
    </div>
  );
}
