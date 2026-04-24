import { useState, useEffect } from "react";
import FounderBadge from "@/components/badges/FounderBadge";
import { useParams, Link, useSearchParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PageMeta from "@/components/PageMeta";
import BadgeRow from "@/components/badges/BadgeRow";
import SpecialBadgeHighlight from "@/components/badges/SpecialBadgeHighlight";
import { BadgeSceau } from "@/components/badges/BadgeSceau";
import StatutGardienBadge from "@/components/profile/StatutGardienBadge";
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
import TrustScore from "@/components/profile/TrustScore";
import FavoriteButton from "@/components/shared/FavoriteButton";
import ProfileSchemaOrg from "@/components/seo/ProfileSchemaOrg";
import { hydrateReviewers } from "@/lib/hydrateReviewers";

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
  const navigate = useNavigate();
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
  const [externalExperiences, setExternalExperiences] = useState<any[]>([]);

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

  // ── Helpers de rendu (sous-onglets de l'onglet Gardien) ────────────
  const ReviewGrid = ({ reviews, showAll, setShowAll, badgesBySitId }: {
    reviews: any[]; showAll: boolean; setShowAll: (v: boolean) => void; badgesBySitId?: Record<string, string[]>;
  }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {(showAll ? reviews : reviews.slice(0, 4)).map((r: any) => {
        const authorName = capitalize(r.reviewer?.first_name || "Membre");
        const avatarUrl = r.reviewer?.avatar_url || null;
        const reviewBadges = badgesBySitId && r.sit_id ? (badgesBySitId[r.sit_id] || []) : [];
        return (
          <article key={r.id} className="bg-card border border-border rounded-xl p-4 h-full">
            <header className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2.5">
                <Avatar className="w-9 h-9">
                  {avatarUrl ? <AvatarImage src={avatarUrl} /> : null}
                  <AvatarFallback className="text-xs bg-muted">{authorName.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground leading-tight font-body">{authorName}</span>
                  <span className="text-[11px] text-muted-foreground leading-tight font-body">
                    {format(new Date(r.created_at), "MMMM yyyy", { locale: fr })}
                  </span>
                </div>
              </div>
              {r.overall_rating !== null && (
                <div className="flex items-center gap-0.5" aria-label={`${r.overall_rating} sur 5`}>
                  {[1, 2, 3, 4, 5].map(i => (
                    <span key={i} className={`text-sm ${i <= r.overall_rating ? "text-primary" : "text-border"}`}>★</span>
                  ))}
                </div>
              )}
            </header>
            {r.comment && (
              <p className="text-sm text-foreground/80 leading-relaxed font-body">{r.comment}</p>
            )}
            {reviewBadges.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-border">
                {reviewBadges.map((badgeId: string) => (
                  <BadgeSceau key={badgeId} id={badgeId} size="compact" showCount={false} />
                ))}
              </div>
            )}
          </article>
        );
      })}
      {reviews.length > 4 && (
        <div className="md:col-span-2">
          <ShowMoreBtn items={reviews} showAll={showAll} setShowAll={setShowAll} />
        </div>
      )}
    </div>
  );

  const PracticalGrid = (props: {
    animalTypes: string[]; sitterProfile: any; hasVehicle: boolean; radius: number | null; city: string | null;
    competences: string[]; lifestyle: string[]; preferredEnvironments: string[];
    typeLine: string; durationLabel: string; frequencyLabel: string; noticeLabel: string;
  }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
      {props.animalTypes.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <PawPrint className="w-4 h-4 text-primary" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-foreground font-body">Animaux acceptés</h3>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {props.animalTypes.map(a => (
              <span key={a} className="border border-border bg-card rounded-full text-xs px-2.5 py-1 text-foreground font-body">
                {ANIMAL_LABELS[a] || a}
              </span>
            ))}
            {props.sitterProfile?.farm_animals_ok && (
              <span className="border border-primary text-primary rounded-full text-xs px-2.5 py-1 bg-primary/5 font-body">
                Races exigeantes
              </span>
            )}
          </div>
        </div>
      )}
      <div>
        <div className="flex items-center gap-2 mb-2.5">
          {props.hasVehicle ? <Car className="w-4 h-4 text-primary" aria-hidden="true" /> : <MapPin className="w-4 h-4 text-primary" aria-hidden="true" />}
          <h3 className="text-sm font-semibold text-foreground font-body">Zone d'intervention</h3>
        </div>
        <p className="text-sm text-foreground/70 font-body">
          {props.hasVehicle
            ? `Avec véhicule${props.radius ? ` — rayon ${props.radius} km${props.city ? ` · ${props.city}` : ''}` : ''}`
            : props.radius
              ? `Rayon ${props.radius} km${props.city ? ` · ${props.city}` : ''}`
              : 'Rayon non renseigné'}
        </p>
      </div>
      {props.competences.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <Heart className="w-4 h-4 text-primary" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-foreground font-body">Savoir-faire</h3>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {props.competences.map(c => (
              <span key={c} className="border border-border bg-card rounded-full text-xs px-2.5 py-1 text-foreground/80 font-body">{c}</span>
            ))}
          </div>
        </div>
      )}
      {props.lifestyle.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <Star className="w-4 h-4 text-primary" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-foreground font-body">Style de vie</h3>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {props.lifestyle.map(l => (
              <span key={l} className="border border-border bg-card rounded-full text-xs px-2.5 py-1 text-foreground font-body">{l}</span>
            ))}
          </div>
        </div>
      )}
      {props.preferredEnvironments.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <Home className="w-4 h-4 text-primary" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-foreground font-body">Environnements préférés</h3>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {props.preferredEnvironments.map(e => (
              <span key={e} className="border border-border bg-card rounded-full text-xs px-2.5 py-1 text-foreground font-body">{ENV_LABELS[e] || e}</span>
            ))}
          </div>
        </div>
      )}
      {(props.typeLine || props.durationLabel || props.frequencyLabel || props.noticeLabel) && (
        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <BadgeCheck className="w-4 h-4 text-primary" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-foreground font-body">Profil &amp; disponibilité</h3>
          </div>
          <div className="text-sm text-foreground/70 font-body space-y-0.5">
            {props.typeLine && <p>{props.typeLine}</p>}
            {props.durationLabel && <p>{props.durationLabel}</p>}
            {props.frequencyLabel && <p>{props.frequencyLabel}</p>}
            {props.noticeLabel && <p>{props.noticeLabel}</p>}
          </div>
        </div>
      )}
    </div>
  );

  const GallerySimple = ({ visibleGallery, setLightboxIdx }: { visibleGallery: any[]; setLightboxIdx: (n: number) => void }) => (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
      {visibleGallery.map((g: any, i: number) => (
        <button
          key={g.id}
          type="button"
          onClick={() => setLightboxIdx(i)}
          className="overflow-hidden rounded-xl aspect-square group relative"
        >
          <img
            src={g.photo_url}
            alt={g.caption || `Photo ${i + 1}`}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
            loading="lazy"
          />
        </button>
      ))}
    </div>
  );

  const handleTabChange = (tab: ProfileTab) => {
    setActiveTab(tab);
    setSearchParams({ tab }, { replace: true });
  };

  useEffect(() => {
    if (!id || id === "undefined" || id === "null") { setLoading(false); return; }
    const load = async () => {
      setLoading(true);
      const [profileRes, baseProfileRes, sitterRes, badgesRes, reviewsRes, galleryRes, emergencyRes, subRes, ownerRes, missionsRes, extExpRes] =
        await Promise.all([
          supabase.from("public_profiles").select("*").eq("id", id).maybeSingle(),
          supabase.from("profiles").select("id, first_name, last_name, avatar_url, bio, city, postal_code, created_at, identity_verified, is_founder, profile_completion, completed_sits_count, cancellation_count").eq("id", id).maybeSingle(),
          supabase.from("sitter_profiles").select("*").eq("user_id", id).maybeSingle(),
          supabase.from("badge_attributions").select("badge_id").eq("user_id", id),
          supabase
            .from("reviews")
            .select("*")
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
          supabase
            .from("external_experiences")
            .select("id, platform_name, summary, animal_types, city, country, duration, experience_date, verification_status")
            .eq("user_id", id)
            .eq("verification_status", "verified"),
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
      setExternalExperiences(extExpRes?.data || []);

      if (badgesRes.data) {
        const map: Record<string, number> = {};
        badgesRes.data.forEach((b: any) => {
          map[b.badge_id] = (map[b.badge_id] || 0) + 1;
        });
        setBadges(Object.entries(map).map(([badge_key, count]) => ({ badge_key, count })));
      }

      if (reviewsRes.data) {
        const enrichedReviews = await hydrateReviewers(reviewsRes.data as any[]);
        setReviews(enrichedReviews);
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
        .select('id, overall_rating, comment, created_at, review_type, reviewer_id')
        .eq('reviewee_id', id)
        .eq('published', true)
        .eq('moderation_status', 'valide')
        .in('review_type', ['proprio', 'owner'])
        .order('created_at', { ascending: false });
      if (revErr) console.error('[ownerReviews]', revErr);
      const enrichedOwnerReviews = await hydrateReviewers((revData ?? []) as any[]);
      setOwnerReviews(enrichedOwnerReviews);

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
  const rawTitle = city ? `${firstName} — Gardien à ${city}` : `${firstName} — Gardien de maison`;
  const pageTitle = rawTitle;
  const pageDesc = ((bio || motivation || "") as string).slice(0, 160) || `${firstName} garde des ${animalLabels || "animaux"} à ${city || "France"}. Profil vérifié sur Guardiens.fr.`;
  const pageUrl = buildAbsoluteUrl(`/gardiens/${id}`);
  // Politique : tous les profils gardiens en noindex (RGPD + données personnelles + thin content)
  const shouldNoindex = true;

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
      {/* JSON-LD */}
      {profile && (
        <ProfileSchemaOrg
          name={firstName}
          city={city || undefined}
          avatarUrl={profile.avatar_url || undefined}
          bio={bio || undefined}
          avgRating={avgRating}
          reviewCount={reviewCount}
          url={`https://guardiens.fr/gardiens/${id}`}
        />
      )}
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
      <div className="relative overflow-hidden w-full min-h-[280px] sm:min-h-[340px] flex items-end bg-[#F0EDE6]">
        {/* SVG fond — gravure à la plume, campagne/village */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <svg viewBox="0 0 1200 280" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" className="w-full h-full">
            <defs>
              {/* Fond papier crème légèrement dégradé */}
              <linearGradient id="paper" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#EDE7D8"/>
                <stop offset="60%" stopColor="#F0EDE6"/>
                <stop offset="100%" stopColor="#F4F1EA"/>
              </linearGradient>
              <linearGradient id="fadeBottom" x1="0" y1="0" x2="0" y2="1">
                <stop offset="55%" stopColor="#F0EDE6" stopOpacity="0"/>
                <stop offset="100%" stopColor="#FAF9F6" stopOpacity="1"/>
              </linearGradient>
              {/* Hachures parallèles serrées — pour ombres ciel et collines */}
              <pattern id="hatch" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="6" stroke="#1F4D38" strokeWidth="0.6"/>
              </pattern>
              <pattern id="hatchDense" patternUnits="userSpaceOnUse" width="4" height="4" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="4" stroke="#1F4D38" strokeWidth="0.7"/>
              </pattern>
              {/* Hachures croisées pour ombres profondes */}
              <pattern id="crossHatch" patternUnits="userSpaceOnUse" width="6" height="6">
                <line x1="0" y1="0" x2="6" y2="6" stroke="#1F4D38" strokeWidth="0.6"/>
                <line x1="6" y1="0" x2="0" y2="6" stroke="#1F4D38" strokeWidth="0.6"/>
              </pattern>
              {/* Pointillé pour textures douces (feuillages) */}
              <pattern id="stipple" patternUnits="userSpaceOnUse" width="8" height="8">
                <circle cx="2" cy="2" r="0.6" fill="#1F4D38"/>
                <circle cx="6" cy="5" r="0.5" fill="#1F4D38"/>
                <circle cx="3" cy="6" r="0.4" fill="#1F4D38"/>
              </pattern>
            </defs>

            {/* Papier */}
            <rect width="1200" height="280" fill="url(#paper)"/>

            {/* Hachures de ciel (très légères, en haut à gauche) */}
            <g opacity="0.10">
              <rect x="0" y="0" width="600" height="120" fill="url(#hatch)"/>
            </g>

            {/* Soleil — cercle au trait avec rayons */}
            <g stroke="#1F4D38" strokeWidth="1" fill="none" opacity="0.55">
              <circle cx="220" cy="68" r="30"/>
              <circle cx="220" cy="68" r="22" strokeWidth="0.6"/>
              {/* Petits rayons */}
              <line x1="220" y1="22" x2="220" y2="32"/>
              <line x1="220" y1="104" x2="220" y2="114"/>
              <line x1="174" y1="68" x2="184" y2="68"/>
              <line x1="256" y1="68" x2="266" y2="68"/>
              <line x1="187" y1="35" x2="194" y2="42"/>
              <line x1="246" y1="42" x2="253" y2="35"/>
              <line x1="187" y1="101" x2="194" y2="94"/>
              <line x1="246" y1="94" x2="253" y2="101"/>
            </g>

            {/* Oiseaux — traits libres */}
            <g stroke="#1F4D38" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.7">
              <path d="M380 88 q8 -8 16 0 q8 -8 16 0"/>
              <path d="M460 70 q6 -6 12 0 q6 -6 12 0"/>
              <path d="M820 100 q7 -7 14 0 q7 -7 14 0"/>
              <path d="M1020 60 q5 -5 10 0 q5 -5 10 0"/>
            </g>

            {/* Nuages — au trait, hachurés */}
            <g stroke="#1F4D38" strokeWidth="0.9" fill="none" opacity="0.45">
              <path d="M460 58 q12 -14 30 -8 q14 -10 28 0 q10 -2 14 6 q-4 6 -14 6 l-44 0 q-12 0 -14 -4 z"/>
              <path d="M880 78 q14 -16 34 -8 q16 -10 30 2 q10 -2 14 6 q-6 6 -16 6 l-48 0 q-12 0 -14 -6 z"/>
            </g>
            {/* Hachures intérieures nuages */}
            <g opacity="0.18">
              <path d="M460 58 q12 -14 30 -8 q14 -10 28 0 q10 -2 14 6 q-4 6 -14 6 l-44 0 q-12 0 -14 -4 z" fill="url(#hatch)"/>
            </g>

            {/* Collines lointaines — silhouettes au trait, hachures internes douces */}
            <path d="M0,180 Q150,148 320,168 T640,158 T960,172 T1200,162 L1200,210 L0,210 Z" fill="url(#hatch)" opacity="0.18"/>
            <path d="M0,180 Q150,148 320,168 T640,158 T960,172 T1200,162" stroke="#1F4D38" strokeWidth="1" fill="none" opacity="0.55"/>

            {/* Collines moyennes */}
            <path d="M0,205 Q200,175 420,193 T780,184 T1200,194 L1200,228 L0,228 Z" fill="url(#hatchDense)" opacity="0.20"/>
            <path d="M0,205 Q200,175 420,193 T780,184 T1200,194" stroke="#1F4D38" strokeWidth="1.1" fill="none" opacity="0.7"/>

            {/* === Maison gauche === */}
            <g stroke="#1F4D38" strokeWidth="1.2" fill="none">
              <rect x="80" y="170" width="62" height="42" fill="#F0EDE6"/>
              <polygon points="74,170 148,170 111,138" fill="#F0EDE6"/>
              <rect x="102" y="186" width="14" height="26"/>
              <rect x="88" y="178" width="12" height="12"/>
              <line x1="94" y1="178" x2="94" y2="190"/>
              <line x1="88" y1="184" x2="100" y2="184"/>
              <rect x="124" y="178" width="12" height="12"/>
              <line x1="130" y1="178" x2="130" y2="190"/>
              <line x1="124" y1="184" x2="136" y2="184"/>
              <rect x="128" y="142" width="6" height="14"/>
            </g>
            {/* Hachures toit maison gauche */}
            <polygon points="74,170 148,170 111,138" fill="url(#hatchDense)" opacity="0.45"/>
            <polygon points="74,170 148,170 111,138" stroke="#1F4D38" strokeWidth="1.2" fill="none"/>

            {/* Arbre près maison gauche — feuillage pointillé */}
            <g>
              <line x1="175" y1="178" x2="175" y2="212" stroke="#1F4D38" strokeWidth="1.4"/>
              <ellipse cx="175" cy="166" rx="22" ry="26" fill="url(#stipple)" opacity="0.55"/>
              <ellipse cx="175" cy="166" rx="22" ry="26" stroke="#1F4D38" strokeWidth="1" fill="none"/>
            </g>

            {/* === Maison centrale (église/grande maison) === */}
            <g stroke="#1F4D38" strokeWidth="1.3" fill="none">
              <rect x="540" y="158" width="84" height="56" fill="#F0EDE6"/>
              <polygon points="534,158 630,158 582,118" fill="#F0EDE6"/>
              <rect x="568" y="186" width="22" height="28"/>
              <line x1="579" y1="186" x2="579" y2="214"/>
              <rect x="548" y="170" width="16" height="14"/>
              <line x1="556" y1="170" x2="556" y2="184"/>
              <line x1="548" y1="177" x2="564" y2="177"/>
              <rect x="600" y="170" width="16" height="14"/>
              <line x1="608" y1="170" x2="608" y2="184"/>
              <line x1="600" y1="177" x2="616" y2="177"/>
              <rect x="604" y="120" width="8" height="18"/>
            </g>
            <polygon points="534,158 630,158 582,118" fill="url(#hatchDense)" opacity="0.5"/>
            <polygon points="534,158 630,158 582,118" stroke="#1F4D38" strokeWidth="1.3" fill="none"/>
            {/* Fumée — volutes au trait */}
            <g stroke="#1F4D38" strokeWidth="0.9" fill="none" opacity="0.55">
              <path d="M608 116 q-6 -6 0 -12 q6 -6 0 -12"/>
              <path d="M610 90 q-5 -5 0 -10 q5 -5 0 -10"/>
            </g>

            {/* Arbres autour */}
            <g>
              <line x1="491" y1="172" x2="491" y2="214" stroke="#1F4D38" strokeWidth="1.5"/>
              <ellipse cx="491" cy="158" rx="26" ry="30" fill="url(#stipple)" opacity="0.6"/>
              <ellipse cx="491" cy="158" rx="26" ry="30" stroke="#1F4D38" strokeWidth="1.1" fill="none"/>
            </g>
            <g>
              <line x1="653" y1="180" x2="653" y2="214" stroke="#1F4D38" strokeWidth="1.3"/>
              <ellipse cx="653" cy="166" rx="20" ry="23" fill="url(#stipple)" opacity="0.55"/>
              <ellipse cx="653" cy="166" rx="20" ry="23" stroke="#1F4D38" strokeWidth="1" fill="none"/>
            </g>

            {/* === Maison droite === */}
            <g stroke="#1F4D38" strokeWidth="1.2" fill="none">
              <rect x="980" y="172" width="58" height="42" fill="#F0EDE6"/>
              <polygon points="974,172 1044,172 1009,142" fill="#F0EDE6"/>
              <rect x="999" y="190" width="14" height="24"/>
              <rect x="986" y="180" width="12" height="12"/>
              <line x1="992" y1="180" x2="992" y2="192"/>
              <line x1="986" y1="186" x2="998" y2="186"/>
              <rect x="1020" y="180" width="12" height="12"/>
              <line x1="1026" y1="180" x2="1026" y2="192"/>
              <line x1="1020" y1="186" x2="1032" y2="186"/>
            </g>
            <polygon points="974,172 1044,172 1009,142" fill="url(#hatchDense)" opacity="0.45"/>
            <polygon points="974,172 1044,172 1009,142" stroke="#1F4D38" strokeWidth="1.2" fill="none"/>
            <g>
              <line x1="1061" y1="174" x2="1061" y2="214" stroke="#1F4D38" strokeWidth="1.4"/>
              <ellipse cx="1061" cy="160" rx="24" ry="28" fill="url(#stipple)" opacity="0.55"/>
              <ellipse cx="1061" cy="160" rx="24" ry="28" stroke="#1F4D38" strokeWidth="1" fill="none"/>
            </g>

            {/* Colline proche — hachurée croisée pour densité */}
            <path d="M0,228 Q180,210 380,222 T720,218 T1100,225 T1200,220 L1200,280 L0,280 Z" fill="url(#crossHatch)" opacity="0.22"/>
            <path d="M0,228 Q180,210 380,222 T720,218 T1100,225 T1200,220" stroke="#1F4D38" strokeWidth="1.3" fill="none" opacity="0.85"/>

            {/* Prairie — hachures verticales très douces */}
            <g opacity="0.16">
              <rect x="0" y="240" width="1200" height="40" fill="url(#hatchDense)"/>
            </g>

            {/* Touffes d'herbe au trait */}
            <g stroke="#1F4D38" strokeWidth="0.9" fill="none" opacity="0.7" strokeLinecap="round">
              <path d="M50 262 l2 -10 M55 262 l1 -8 M60 262 l3 -11"/>
              <path d="M250 262 l2 -9 M256 262 l2 -7 M262 262 l3 -10"/>
              <path d="M530 264 l2 -8 M536 264 l2 -10 M542 264 l2 -7"/>
              <path d="M880 264 l2 -10 M886 264 l3 -8 M892 264 l2 -11"/>
              <path d="M1080 263 l2 -8 M1086 263 l3 -10 M1092 263 l2 -7"/>
            </g>

            {/* Petits buissons — trait + pointillés */}
            <g>
              <ellipse cx="120" cy="246" rx="32" ry="9" fill="url(#stipple)" opacity="0.5"/>
              <path d="M88,246 q32,-18 64,0" stroke="#1F4D38" strokeWidth="1" fill="none" opacity="0.7"/>
              <ellipse cx="350" cy="248" rx="44" ry="10" fill="url(#stipple)" opacity="0.5"/>
              <path d="M306,248 q44,-20 88,0" stroke="#1F4D38" strokeWidth="1" fill="none" opacity="0.7"/>
              <ellipse cx="780" cy="250" rx="58" ry="11" fill="url(#stipple)" opacity="0.5"/>
              <path d="M722,250 q58,-22 116,0" stroke="#1F4D38" strokeWidth="1" fill="none" opacity="0.7"/>
              <ellipse cx="1130" cy="247" rx="48" ry="10" fill="url(#stipple)" opacity="0.5"/>
              <path d="M1082,247 q48,-20 96,0" stroke="#1F4D38" strokeWidth="1" fill="none" opacity="0.7"/>
            </g>

            {/* === Chien — silhouette à la plume === */}
            <g stroke="#1F4D38" strokeWidth="1.3" fill="#F0EDE6" transform="translate(330, 220)">
              <ellipse cx="34" cy="20" rx="32" ry="13"/>
              <circle cx="62" cy="13" r="11"/>
              <ellipse cx="69" cy="8" rx="5" ry="9" transform="rotate(15,69,8)"/>
              <path d="M2,18 Q-14,9 -10,2" fill="none" strokeLinecap="round"/>
              <rect x="10" y="30" width="5" height="14" rx="2"/>
              <rect x="20" y="30" width="5" height="12" rx="2"/>
              <rect x="38" y="30" width="5" height="14" rx="2"/>
              <rect x="48" y="30" width="5" height="12" rx="2"/>
              <circle cx="65" cy="11" r="1.2" fill="#1F4D38" stroke="none"/>
              <ellipse cx="71" cy="17" rx="2" ry="1.6" fill="#1F4D38" stroke="none"/>
            </g>
            {/* Hachures de volume sur le chien */}
            <g stroke="#1F4D38" strokeWidth="0.5" opacity="0.55" transform="translate(330, 220)">
              <line x1="14" y1="22" x2="22" y2="30"/>
              <line x1="20" y1="22" x2="28" y2="30"/>
              <line x1="26" y1="22" x2="34" y2="30"/>
              <line x1="32" y1="22" x2="40" y2="30"/>
              <line x1="38" y1="22" x2="46" y2="30"/>
              <line x1="44" y1="22" x2="52" y2="30"/>
            </g>

            {/* === Chat — silhouette à la plume === */}
            <g stroke="#1F4D38" strokeWidth="1.3" fill="#F0EDE6" transform="translate(820, 222)">
              <ellipse cx="18" cy="22" rx="16" ry="17"/>
              <circle cx="18" cy="7" r="11"/>
              <polygon points="9,1 5,-9 16,-3"/>
              <polygon points="27,1 31,-9 20,-3"/>
              <path d="M34,30 Q48,22 44,12" fill="none" strokeLinecap="round"/>
              <ellipse cx="13" cy="7" rx="1.6" ry="2.2" fill="#1F4D38" stroke="none"/>
              <ellipse cx="23" cy="7" rx="1.6" ry="2.2" fill="#1F4D38" stroke="none"/>
              <path d="M16 12 q2 1.5 4 0" fill="none" strokeWidth="0.8"/>
              {/* Moustaches */}
              <line x1="6" y1="11" x2="-2" y2="10" strokeWidth="0.5"/>
              <line x1="6" y1="13" x2="-2" y2="14" strokeWidth="0.5"/>
              <line x1="30" y1="11" x2="38" y2="10" strokeWidth="0.5"/>
              <line x1="30" y1="13" x2="38" y2="14" strokeWidth="0.5"/>
            </g>
            <g stroke="#1F4D38" strokeWidth="0.5" opacity="0.5" transform="translate(820, 222)">
              <line x1="6" y1="20" x2="14" y2="32"/>
              <line x1="12" y1="20" x2="20" y2="32"/>
              <line x1="18" y1="20" x2="26" y2="32"/>
              <line x1="24" y1="20" x2="32" y2="32"/>
            </g>

            {/* Fade bas vers la page */}
            <rect width="1200" height="280" fill="url(#fadeBottom)"/>
          </svg>
        </div>

        {/* Vignettage très subtil */}
        <div className="absolute inset-0 z-[1] pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, transparent 55%, rgba(31,77,56,0.07) 100%)' }} />

        {/* Dégradé bas */}
        <div className="absolute bottom-0 left-0 right-0 h-20 z-[1] bg-gradient-to-b from-transparent to-background pointer-events-none" />

        {/* Contenu header par-dessus */}
        <div className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 pb-8 pt-6">
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
          <div className="flex items-end gap-3 sm:gap-6 min-w-0">
            {/* Photo grande */}
            <div className="shrink-0 relative">
              <img
                src={profile.avatar_url || "/placeholder.svg"}
                alt={firstName}
                className="w-20 h-20 sm:w-28 sm:h-28 md:w-40 md:h-40 rounded-full object-cover object-center border-4 border-white shadow-md ring-2 ring-primary ring-offset-2"
              />
              {reputation && reputation.statut_gardien !== 'novice' && (
                <div className="absolute -bottom-2 -right-2">
                  <StatutGardienBadge statut={reputation.statut_gardien} />
                </div>
              )}
            </div>

            {/* Infos */}
            <div className="flex flex-col gap-1.5 pb-1 min-w-0 flex-1">
              {isAvailable && (
                <span className="inline-flex w-fit items-center text-xs bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-medium">
                  Disponible
                </span>
              )}

              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <h1 className="text-2xl sm:text-4xl md:text-5xl font-heading font-bold text-foreground leading-tight capitalize break-words min-w-0">
                  {firstName}
                </h1>
                {profile?.is_founder && <FounderBadge size="lg" />}
                {id && <FavoriteButton targetType="sitter" targetId={id} size="md" />}
              </div>

              {city && (
                <p className="text-base text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> Gardien à {city}
                </p>
              )}

              {(profile?.identity_verified || profile?.is_founder || emergencyActive || hasActiveSubscription) && (
                <div className="flex items-center gap-2 flex-wrap">
                  {hasActiveSubscription && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground border border-border rounded-full px-2 py-0.5 bg-card/80">
                      <BadgeCheck size={11} className="text-primary" /> Abonné
                    </span>
                  )}
                  {profile?.identity_verified && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground border border-border rounded-full px-2 py-0.5 bg-card/80">
                      <Shield size={11} className="text-primary" /> ID vérifiée
                    </span>
                  )}
                  {profile?.is_founder && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground border border-border rounded-full px-2 py-0.5 bg-card/80">
                      <Star size={11} className="text-primary" /> Fondateur
                    </span>
                  )}
                  {emergencyActive && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground border border-border rounded-full px-2 py-0.5 bg-card/80">
                      <Shield size={11} className="text-primary" /> Gardien d'urgence
                    </span>
                  )}
                </div>
              )}

              {/* Trust Score */}
              <TrustScore
                identityVerified={profile?.identity_verified || false}
                avgRating={avgRating}
                reviewCount={reviewCount}
                completedSits={completedSits}
                externalExperiencesCount={externalExperiences.length}
                memberSince={profile?.created_at || new Date().toISOString()}
                isFounder={profile?.is_founder || false}
              />

              <div className="flex items-center gap-2 sm:gap-4 text-sm text-muted-foreground mt-1 flex-wrap">
                {statsItems.map((s, i) => (
                  <span key={i} className="flex items-center gap-1">
                    {i > 0 && <span className="text-border mr-1 sm:mr-3">·</span>}
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

      {/* ── ONGLET GARDIEN (refonte "outil de décision") ───────────────── */}
      {activeTab === 'gardien' && (
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-8 pb-[calc(10.5rem+env(safe-area-inset-bottom))] md:pb-8">

          {/* ── A. BANDEAU DE QUALIFICATION RAPIDE (4 tuiles + CTA) ──── */}
          <section
            aria-label="Informations clés pour qualifier le gardien"
            className="mb-8 md:mb-10"
          >
            {(() => {
              // Helpers locaux pour des états "non renseigné" propres et homogènes
              const Empty = ({ label }: { label: string }) => (
                <p className="text-sm text-muted-foreground/70 italic font-body">{label}</p>
              );

              // Tuile Disponibilité : on distingue clairement
              // - Disponible (toggle ON)
              // - Sur demande (toggle OFF mais préférences renseignées)
              // - Non renseignée (rien)
              const hasAvailabilityHint = Boolean(durationLabel || frequencyLabel || noticeLabel);

              // Tuile Confiance : on a "quelque chose à dire" si avis OU gardes OU écussons OU identité vérifiée
              const identityVerified = Boolean(profile?.identity_verified);
              const hasTrustSignals =
                reviewCount > 0 || completedSits > 0 || totalBadgeCount > 0 || identityVerified;

              return (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-2.5 md:gap-3">
                  {/* Tuile 1 — Animaux acceptés */}
                  <div className="bg-card border border-border rounded-xl p-2.5 sm:p-3.5 md:p-4 flex flex-col gap-1 sm:gap-1.5 min-h-[88px] sm:min-h-[92px] min-w-0">
                    <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-[11px] uppercase tracking-wider text-muted-foreground font-body">
                      <PawPrint className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary shrink-0" aria-hidden="true" />
                      <span className="truncate">Animaux</span>
                    </div>
                    {animalTypes.length > 0 ? (
                      <p className="text-xs sm:text-sm text-foreground font-body leading-snug line-clamp-2 break-words">
                        {animalTypes.map(a => ANIMAL_LABELS[a] || a).join(', ')}
                      </p>
                    ) : (
                      <Empty label="Non renseigné" />
                    )}
                  </div>

                  {/* Tuile 2 — Zone d'intervention */}
                  <div className="bg-card border border-border rounded-xl p-2.5 sm:p-3.5 md:p-4 flex flex-col gap-1 sm:gap-1.5 min-h-[88px] sm:min-h-[92px] min-w-0">
                    <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-[11px] uppercase tracking-wider text-muted-foreground font-body">
                      {hasVehicle ? <Car className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary shrink-0" aria-hidden="true" /> : <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary shrink-0" aria-hidden="true" />}
                      <span className="truncate">Zone</span>
                    </div>
                    {radius || city ? (
                      <p className="text-xs sm:text-sm text-foreground font-body leading-snug break-words">
                        {radius && city ? (
                          <><span className="font-semibold whitespace-nowrap">Rayon {radius} km</span> <span className="text-muted-foreground">·</span> <span className="break-words">{city}</span></>
                        ) : radius ? (
                          <span className="font-semibold whitespace-nowrap">Rayon {radius} km</span>
                        ) : (
                          <>Secteur : <span className="font-semibold break-words">{city}</span></>
                        )}
                      </p>
                    ) : (
                      <Empty label="Non renseigné" />
                    )}
                    <span className={`text-[10px] sm:text-[11px] font-body ${hasVehicle ? 'text-primary' : 'text-muted-foreground/70'}`}>
                      {hasVehicle ? 'Avec véhicule' : 'Sans véhicule'}
                    </span>
                  </div>

                  {/* Tuile 3 — Disponibilité */}
                  <div className="bg-card border border-border rounded-xl p-2.5 sm:p-3.5 md:p-4 flex flex-col gap-1 sm:gap-1.5 min-h-[88px] sm:min-h-[92px] min-w-0">
                    <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-[11px] uppercase tracking-wider text-muted-foreground font-body">
                      <BadgeCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary shrink-0" aria-hidden="true" />
                      <span className="truncate">Disponibilité</span>
                    </div>
                    {isAvailable ? (
                      <p className="text-xs sm:text-sm text-foreground font-body leading-snug break-words">
                        <span className="font-semibold text-primary">Disponible</span>
                        {durationLabel && (
                          <span className="text-muted-foreground"> · {durationLabel.replace(' minimum', ' min.')}</span>
                        )}
                      </p>
                    ) : hasAvailabilityHint ? (
                      <p className="text-xs sm:text-sm text-foreground/80 font-body leading-snug break-words">
                        <span className="font-medium">Sur demande</span>
                        {(durationLabel || frequencyLabel) && (
                          <span className="text-muted-foreground"> · {durationLabel || frequencyLabel}</span>
                        )}
                      </p>
                    ) : (
                      <Empty label="Non renseigné" />
                    )}
                    {typeLine && (
                      <span className="text-[10px] sm:text-[11px] text-muted-foreground font-body line-clamp-1">{typeLine}</span>
                    )}
                  </div>

                  {/* Tuile 4 — Confiance / preuves */}
                  <div className="bg-card border border-border rounded-xl p-2.5 sm:p-3.5 md:p-4 flex flex-col gap-1 sm:gap-1.5 min-h-[88px] sm:min-h-[92px] min-w-0">
                    <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-[11px] uppercase tracking-wider text-muted-foreground font-body">
                      <Shield className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary shrink-0" aria-hidden="true" />
                      <span className="truncate">Confiance</span>
                    </div>
                    {hasTrustSignals ? (
                      <>
                        <div className="flex items-baseline flex-wrap gap-x-1.5 gap-y-0.5 text-xs sm:text-sm text-foreground font-body">
                          {reviewCount > 0 ? (
                            <>
                              <span className="font-semibold whitespace-nowrap">{avgRating.toFixed(1)}<span className="text-primary">★</span></span>
                              <span className="text-muted-foreground text-[11px] sm:text-xs">({reviewCount} avis)</span>
                            </>
                          ) : identityVerified ? (
                            <span className="text-foreground/80 text-[11px] sm:text-xs">Identité vérifiée</span>
                          ) : (
                            <span className="text-muted-foreground text-[11px] sm:text-xs italic">Aucun avis</span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-1 sm:gap-x-1.5 gap-y-0.5 text-[10px] sm:text-[11px] text-muted-foreground font-body">
                          {completedSits > 0 && <span className="whitespace-nowrap">{completedSits} garde{completedSits > 1 ? 's' : ''}</span>}
                          {completedSits > 0 && totalBadgeCount > 0 && <span aria-hidden="true">·</span>}
                          {totalBadgeCount > 0 && <span className="whitespace-nowrap">{totalBadgeCount} écusson{totalBadgeCount > 1 ? 's' : ''}</span>}
                          {reviewCount > 0 && identityVerified && (completedSits > 0 || totalBadgeCount > 0) && <span aria-hidden="true">·</span>}
                          {reviewCount > 0 && identityVerified && <span className="whitespace-nowrap">ID vérifiée</span>}
                        </div>
                      </>
                    ) : (
                      <Empty label="Nouveau profil" />
                    )}
                  </div>
                </div>
              );
            })()}

            {/* CTA primaire — visible immédiatement */}
            {showCTA && (
              <div className="mt-4 md:mt-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                {!isAuthenticated && (
                  <Link
                    to={`/inscription?redirect=/gardiens/${id}`}
                    className="inline-flex items-center justify-center bg-primary text-primary-foreground rounded-lg px-6 py-3 text-sm font-medium hover:bg-primary/90 transition-colors flex-1 sm:flex-initial"
                  >
                    S'inscrire pour contacter {firstName}
                  </Link>
                )}
                {isAuthenticated && isOwner && (
                  <button
                    onClick={async () => {
                      if (!auth?.user?.id || !id) return;
                      const { startConversation } = await import("@/lib/conversation");
                      const { conversationId, error } = await startConversation({
                        otherUserId: id,
                        context: "sitter_inquiry",
                      });
                      if (conversationId) {
                        navigate(`/messages?c=${conversationId}`);
                      } else if (error?.includes("propositions spontanées")) {
                        const { toast } = await import("sonner");
                        toast.error("Ce membre ne reçoit pas de propositions spontanées.");
                      } else {
                        const { toast } = await import("sonner");
                        toast.error("Impossible d'ouvrir la conversation.");
                      }
                    }}
                    className="inline-flex items-center justify-center bg-primary text-primary-foreground rounded-lg px-6 py-3 text-sm font-medium hover:bg-primary/90 transition-colors flex-1 sm:flex-initial cursor-pointer"
                  >
                    Contacter {firstName}
                  </button>
                )}
                <p className="text-[11px] sm:text-xs text-muted-foreground font-body sm:ml-2 self-center text-center sm:text-left leading-snug break-words">
                  Contact direct, sans intermédiaire.
                </p>
              </div>
            )}
          </section>

          {/* ── B. CONTENU EN ONGLETS (desktop) / FLUX (mobile) ───────── */}

          {/* — DESKTOP : Tabs Radix — */}
          <div className="hidden md:block">
            <Tabs defaultValue="apropos" className="w-full">
              <TabsList className="w-full justify-start bg-transparent border-b border-border rounded-none h-auto p-0 gap-1">
                <TabsTrigger
                  value="apropos"
                  className="data-[state=active]:bg-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-body"
                >
                  À propos
                </TabsTrigger>
                {reviewCount > 0 && (
                  <TabsTrigger
                    value="avis"
                    className="data-[state=active]:bg-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-body"
                  >
                    Avis ({reviewCount})
                  </TabsTrigger>
                )}
                <TabsTrigger
                  value="pratique"
                  className="data-[state=active]:bg-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-body"
                >
                  Pratique
                </TabsTrigger>
                {gallery.length > 0 && (
                  <TabsTrigger
                    value="galerie"
                    className="data-[state=active]:bg-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-body"
                  >
                    Galerie ({gallery.length})
                  </TabsTrigger>
                )}
                {userBadges && userBadges.length > 0 && (
                  <TabsTrigger
                    value="confiance"
                    className="data-[state=active]:bg-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-body"
                  >
                    Confiance
                  </TabsTrigger>
                )}
              </TabsList>

              {/* Onglet À propos */}
              <TabsContent value="apropos" className="pt-6 space-y-6">
                {(motivation || bio) ? (
                  <div className="space-y-4 max-w-2xl">
                    {motivation && (
                      <p className="text-base text-foreground leading-relaxed font-body">
                        {motivation}
                      </p>
                    )}
                    {bio && (
                      <p className="text-sm text-foreground/75 leading-relaxed font-body whitespace-pre-line">
                        {bio}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic font-body">
                    {firstName} n'a pas encore rédigé de présentation.
                  </p>
                )}
                <PublicExperiences experiences={externalExperiences} />
              </TabsContent>

              {/* Onglet Avis */}
              {reviewCount > 0 && (
                <TabsContent value="avis" className="pt-6">
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
                        <p className="text-sm text-muted-foreground italic py-4 font-body">
                          {firstName} n'a pas encore reçu d'avis de garde.
                        </p>
                      ) : (
                        <ReviewGrid
                          reviews={gardeReviews}
                          showAll={showAllGardeReviews}
                          setShowAll={setShowAllGardeReviews}
                          badgesBySitId={badgesBySitId}
                        />
                      )}
                    </TabsContent>
                    <TabsContent value="missions" forceMount>
                      {missionReviews.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic py-4 font-body">
                          {firstName} n'a pas encore reçu d'avis de mission.
                        </p>
                      ) : (
                        <ReviewGrid
                          reviews={missionReviews}
                          showAll={showAllMissionReviewsTab}
                          setShowAll={setShowAllMissionReviewsTab}
                        />
                      )}
                    </TabsContent>
                  </Tabs>
                </TabsContent>
              )}

              {/* Onglet Pratique */}
              <TabsContent value="pratique" className="pt-6">
                <PracticalGrid
                  animalTypes={animalTypes}
                  sitterProfile={sitterProfile}
                  hasVehicle={hasVehicle}
                  radius={radius}
                  city={city}
                  competences={competences}
                  lifestyle={lifestyle}
                  preferredEnvironments={preferredEnvironments}
                  typeLine={typeLine}
                  durationLabel={durationLabel}
                  frequencyLabel={frequencyLabel}
                  noticeLabel={noticeLabel}
                />
              </TabsContent>

              {/* Onglet Galerie */}
              {gallery.length > 0 && (
                <TabsContent value="galerie" className="pt-6">
                  <GallerySimple
                    visibleGallery={visibleGallery}
                    setLightboxIdx={setLightboxIdx}
                  />
                </TabsContent>
              )}

              {/* Onglet Confiance */}
              {userBadges && userBadges.length > 0 && (
                <TabsContent value="confiance" className="pt-6">
                  <div className="space-y-4">
                    <SpecialBadgeHighlight userBadges={userBadges} />
                    <BadgeRow badges={userBadges} />
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </div>

          {/* — MOBILE : flux vertical avec ancres — */}
          <div className="md:hidden space-y-10">
            {/* À propos */}
            <section id="apropos" aria-label={`À propos de ${firstName}`} className="scroll-mt-24">
              <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-body mb-3">
                À propos
              </h2>
              {(motivation || bio) ? (
                <div className="space-y-3">
                  {motivation && (
                    <p className="text-base text-foreground leading-relaxed font-body">{motivation}</p>
                  )}
                  {bio && (
                    <p className="text-sm text-foreground/75 leading-relaxed font-body whitespace-pre-line">{bio}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic font-body">
                  Pas encore de présentation.
                </p>
              )}
            </section>

            <PublicExperiences experiences={externalExperiences} />

            {/* Avis */}
            {reviewCount > 0 && (
              <section id="avis" aria-label="Avis reçus" className="scroll-mt-24">
                <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-body mb-3">
                  Avis ({reviewCount})
                </h2>
                <ReviewGrid
                  reviews={gardeReviews.length > 0 ? gardeReviews : missionReviews}
                  showAll={showAllGardeReviews}
                  setShowAll={setShowAllGardeReviews}
                  badgesBySitId={badgesBySitId}
                />
              </section>
            )}

            {/* Pratique */}
            <section id="infos-pratiques" aria-label="Infos pratiques" className="scroll-mt-24">
              <h2 className="text-lg font-semibold text-foreground font-display mb-3">
                Infos pratiques
              </h2>
              <PracticalGrid
                animalTypes={animalTypes}
                sitterProfile={sitterProfile}
                hasVehicle={hasVehicle}
                radius={radius}
                city={city}
                competences={competences}
                lifestyle={lifestyle}
                preferredEnvironments={preferredEnvironments}
                typeLine={typeLine}
                durationLabel={durationLabel}
                frequencyLabel={frequencyLabel}
                noticeLabel={noticeLabel}
              />
            </section>

            {/* Galerie */}
            {gallery.length > 0 && (
              <section id="galerie" aria-label="Galerie" className="scroll-mt-24">
                <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-body mb-3">
                  Galerie ({gallery.length})
                </h2>
                <GallerySimple visibleGallery={visibleGallery} setLightboxIdx={setLightboxIdx} />
              </section>
            )}

            {/* Confiance */}
            {userBadges && userBadges.length > 0 && (
              <section id="confiance" aria-label="Confiance et vérifications" className="scroll-mt-24">
                <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-body mb-3">
                  Confiance & vérifications
                </h2>
                <div className="space-y-4">
                  <SpecialBadgeHighlight userBadges={userBadges} />
                  <BadgeRow badges={userBadges} />
                </div>
              </section>
            )}
          </div>

          {/* CTA sticky bottom mobile */}
          {showCTA && (
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border px-3 sm:px-4 pt-2.5 sm:pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-lg">
              {!isAuthenticated && (
                <Link
                  to={`/inscription?redirect=/gardiens/${id}`}
                  className="flex items-center justify-center bg-primary text-primary-foreground rounded-lg px-3 sm:px-4 py-3 text-[13px] sm:text-sm font-medium w-full leading-tight text-center break-words"
                >
                  <span className="line-clamp-2">S'inscrire pour contacter {firstName}</span>
                </Link>
              )}
              {isAuthenticated && isOwner && (
                <button
                  onClick={async () => {
                    if (!auth?.user?.id || !id) return;
                    const { startConversation } = await import("@/lib/conversation");
                    const { conversationId, error } = await startConversation({
                      otherUserId: id,
                      context: "sitter_inquiry",
                    });
                    if (conversationId) {
                      navigate(`/messages?c=${conversationId}`);
                    } else if (error?.includes("propositions spontanées")) {
                      const { toast } = await import("sonner");
                      toast.error("Ce membre ne reçoit pas de propositions spontanées.");
                    } else {
                      const { toast } = await import("sonner");
                      toast.error("Impossible d'ouvrir la conversation.");
                    }
                  }}
                  className="flex items-center justify-center bg-primary text-primary-foreground rounded-lg px-3 sm:px-4 py-3 text-[13px] sm:text-sm font-medium w-full leading-tight text-center break-words"
                >
                  <span className="line-clamp-2">Contacter {firstName}</span>
                </button>
              )}
            </div>
          )}
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
                          <span className="text-xs bg-muted text-foreground/60 px-2 py-0.5 rounded-full font-body hidden sm:inline">
                            {{ animals: "Animaux", garden: "Jardin", house: "Maison", skills: "Compétences", coups_de_main: "Coups de main" }[m.category] || m.category}
                          </span>
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
