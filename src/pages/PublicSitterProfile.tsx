import { useState, useEffect } from "react";
import FounderBadge from "@/components/badges/FounderBadge";
import ProBadge from "@/components/badges/ProBadge";
import { useParams, Link, useSearchParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PageMeta from "@/components/PageMeta";
import BadgeRow from "@/components/badges/BadgeRow";
import SpecialBadgeHighlight from "@/components/badges/SpecialBadgeHighlight";
import { BadgeSceau } from "@/components/badges/BadgeSceau";
import StatutGardienBadge from "@/components/profile/StatutGardienBadge";
import ReplyTimeBadge from "@/components/sitters/ReplyTimeBadge";
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
  Image as ImageIcon,
} from "lucide-react";
import { HeroPickerModal } from "@/components/profile/HeroPickerModal";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import PublicExperiences from "@/components/profile/PublicExperiences";
import TrustScore from "@/components/profile/TrustScore";
import FavoriteButton from "@/components/shared/FavoriteButton";
import OwnerToSitterAffinity from "@/components/matching/OwnerToSitterAffinity";
import ProfileSchemaOrg from "@/components/seo/ProfileSchemaOrg";
import TrustTimeline from "@/components/profile/TrustTimeline";
import { buildTrustTimeline } from "@/lib/trustTimeline";
import { hydrateReviewers } from "@/lib/hydrateReviewers";
import { getSitterHeroImage, getSitterHeroAnchor, getSitterHeroSources } from "@/lib/heroBank";
import { useHeroWeights } from "@/hooks/useHeroWeights";

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
  const heroWeights = useHeroWeights();

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
  const [heroPickerOpen, setHeroPickerOpen] = useState(false);
  const [badgesBySitId, setBadgesBySitId] = useState<Record<string, string[]>>({});
  const [activeTab, setActiveTab] = useState<ProfileTab>('gardien');
  const [pets, setPets] = useState<any[]>([]);
  const [ownerSits, setOwnerSits] = useState<any[]>([]);
  const [ownerSitsTotal, setOwnerSitsTotal] = useState<number>(0);
  const [ownerSitsLoadingMore, setOwnerSitsLoadingMore] = useState(false);
  const OWNER_SITS_PAGE_SIZE = 50;
  const [ownerReviews, setOwnerReviews] = useState<any[]>([]);
  const [missionFeedbacks, setMissionFeedbacks] = useState<any[]>([]);
  const [ownerDataLoading, setOwnerDataLoading] = useState(true);
  const [missionsPublished, setMissionsPublished] = useState<any[]>([]);
  const [missionsHelped, setMissionsHelped] = useState<any[]>([]);
  const [thanksReceived, setThanksReceived] = useState<number>(0);
  const [externalExperiences, setExternalExperiences] = useState<any[]>([]);
  const [ownerGalleryPhotos, setOwnerGalleryPhotos] = useState<any[]>([]);

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
        aria-expanded={showAll}
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
          <h3 className="text-sm font-semibold text-foreground font-body mb-2.5">Animaux acceptés</h3>
          <div className="flex flex-wrap gap-1.5">
            {props.animalTypes.map(a => (
              <span key={a} className="border border-border bg-card rounded-full text-xs px-2.5 py-1 text-foreground font-body">
                {ANIMAL_LABELS[a] || a}
              </span>
            ))}
            {props.sitterProfile?.farm_animals_ok && (
              <span className="border border-primary text-primary rounded-full text-xs px-2.5 py-1 bg-primary/5 font-body">
                Animaux de ferme
              </span>
            )}
          </div>
        </div>
      )}
      <div>
        <h3 className="text-sm font-semibold text-foreground font-body mb-2.5">Zone d'intervention</h3>
        <p className="text-sm text-foreground/70 font-body">
          {props.hasVehicle
            ? `Avec véhicule${props.radius ? `, peut intervenir jusqu'à ${props.radius} km${props.city ? ` autour de ${props.city}` : ''}` : ''}`
            : props.radius
              ? `Jusqu'à ${props.radius} km${props.city ? ` autour de ${props.city}` : ''}`
              : 'Zone d\'intervention non précisée'}
        </p>
      </div>
      {props.competences.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground font-body mb-2.5">Savoir-faire</h3>
          <div className="flex flex-wrap gap-1.5">
            {props.competences.map(c => (
              <span key={c} className="border border-border bg-card rounded-full text-xs px-2.5 py-1 text-foreground/80 font-body">{c}</span>
            ))}
          </div>
        </div>
      )}
      {props.lifestyle.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground font-body mb-2.5">Style de vie</h3>
          <div className="flex flex-wrap gap-1.5">
            {props.lifestyle.map(l => (
              <span key={l} className="border border-border bg-card rounded-full text-xs px-2.5 py-1 text-foreground font-body">{l}</span>
            ))}
          </div>
        </div>
      )}
      {props.preferredEnvironments.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground font-body mb-2.5">Environnements préférés</h3>
          <div className="flex flex-wrap gap-1.5">
            {props.preferredEnvironments.map(e => (
              <span key={e} className="border border-border bg-card rounded-full text-xs px-2.5 py-1 text-foreground font-body">{ENV_LABELS[e] || e}</span>
            ))}
          </div>
        </div>
      )}
      {(props.typeLine || props.durationLabel || props.frequencyLabel || props.noticeLabel) && (
        <div>
          <h3 className="text-sm font-semibold text-foreground font-body mb-2.5">Profil &amp; disponibilité</h3>
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
    // push (pas replace) → la back nav restitue l'onglet précédent.
    setSearchParams({ tab });
  };

  // Sync activeTab quand ?tab= change via back/forward ou ouverture en nouvel
  // onglet, après le premier chargement.
  useEffect(() => {
    if (loading) return;
    const requested = tabParam as ProfileTab | null;
    if (!requested) return;
    if (requested === activeTab) return;
    const availability: Record<ProfileTab, boolean> = {
      gardien: sitterProfile !== null,
      proprio: ownerProfile !== null,
      entraide: missionCount > 0,
    };
    if (availability[requested]) setActiveTab(requested);
  }, [tabParam, loading, sitterProfile, ownerProfile, missionCount]);

  // Scroll vers l'ancre (#confiance, #verification, …) une fois les données
  // chargées : en SPA, le hash natif ne déclenche pas le scroll car l'élément
  // n'existe pas encore au moment de la navigation.
  useEffect(() => {
    if (loading) return;
    const hash = typeof window !== "undefined" ? window.location.hash.slice(1) : "";
    if (!hash) return;
    // Léger délai pour laisser le DOM des Tabs/sections se monter.
    const t = setTimeout(() => {
      const el = document.getElementById(hash);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 250);
    return () => clearTimeout(t);
  }, [loading, activeTab]);

  useEffect(() => {
    if (!id || id === "undefined" || id === "null") { setLoading(false); return; }
    const load = async () => {
      setLoading(true);
      const [profileRes, baseProfileRes, sitterRes, badgesRes, reviewsRes, galleryRes, emergencyRes, subRes, ownerRes, missionsRes, extExpRes] =
        await Promise.all([
          supabase.from("public_profiles").select("*").eq("id", id).maybeSingle(),
          supabase.from("profiles").select("id, first_name, last_name, avatar_url, bio, city, postal_code, created_at, identity_verified, is_founder, profile_completion, completed_sits_count, cancellation_count, hero_image_index, pro_status, pro_specialty, pro_tagline, pro_pricing_note, pro_business_name").eq("id", id).maybeSingle(),
          supabase.from("sitter_profiles").select("*").eq("user_id", id).maybeSingle(),
          supabase.from("badge_attributions").select("badge_id").eq("user_id", id),
          supabase
            .from("reviews")
            .select("*")
            .eq("reviewee_id", id)
            .eq("published", true)
            .eq("moderation_status", "valide")
            .neq("review_type", "annulation")
            .order("created_at", { ascending: false }),
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

      // Store in local variables before setState.
      // ⚠️ `public_profiles` (vue publique) ne contient PAS `hero_image_index` ,       // on doit donc le merger explicitement depuis `profiles` pour que la
      // sélection manuelle survive au reload.
      const publicData = profileRes?.data ?? null;
      const baseData = baseProfileRes?.data ?? null;
      const fetchedPublicProfile = publicData
        ? { ...publicData, hero_image_index: baseData?.hero_image_index ?? null }
        : baseData;
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

      const tabAvailability: Record<ProfileTab, boolean> = {
        gardien: hasSitterProfile,
        proprio: hasOwnerProfile,
        entraide: hasEntraide,
      };
      const tabLabels: Record<ProfileTab, string> = {
        gardien: 'Gardien',
        proprio: 'Propriétaire',
        entraide: 'Entraide',
      };

      let defaultTab: ProfileTab = 'gardien';
      const requested = currentTabParam as ProfileTab | null;
      if (requested && tabAvailability[requested]) {
        defaultTab = requested;
      } else {
        if (hasSitterProfile) defaultTab = 'gardien';
        else if (hasOwnerProfile) defaultTab = 'proprio';
        else if (hasEntraide) defaultTab = 'entraide';

        // Toast si l'onglet demandé n'est pas disponible
        if (requested && tabAvailability[requested] === false) {
          import('sonner').then(({ toast }) => {
            toast.info(`L'onglet « ${tabLabels[requested]} » n'est pas disponible pour ce profil.`);
          });
          // Nettoie l'URL pour éviter de re-déclencher
          const sp = new URLSearchParams(searchParams);
          sp.delete('tab');
          setSearchParams(sp, { replace: true });
        }
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
      setOwnerDataLoading(true);
      try {
        // Query 1, Animaux via properties
        let fetchedPets: any[] = [];
        const { data: userProperties } = await supabase
          .from('properties')
          .select('id')
          .eq('user_id', id);
        const propertyIds = (userProperties || []).map((p: any) => p.id);
        if (propertyIds.length > 0) {
          const { data: petsData, error: petsErr } = await supabase
            .from('public_pets' as any)
            .select('id, name, species, breed, age, photo_url, character')
            .in('property_id', propertyIds);
          if (petsErr) console.error('[pets]', petsErr);
          else fetchedPets = petsData ?? [];
        }
        setPets(fetchedPets);

        // Query 2, Annonces publiées (pagination progressive : 50 par lot, "Voir plus" charge la suite)
        const { data: sitsData, error: sitsErr, count: sitsCount } = await supabase
          .from('sits')
          .select('id, title, start_date, end_date, status, created_at', { count: 'exact' })
          .eq('user_id', id)
          .in('status', ['published', 'confirmed', 'completed'])
          .order('created_at', { ascending: false })
          .range(0, OWNER_SITS_PAGE_SIZE - 1);
        if (sitsErr) console.error('[sits]', sitsErr);
        setOwnerSits(sitsData ?? []);
        setOwnerSitsTotal(sitsCount ?? (sitsData?.length ?? 0));

        // Query 3, Avis reçus en tant que propriétaire
        const { data: revData, error: revErr } = await supabase
          .from('reviews')
          .select('id, overall_rating, comment, created_at, review_type, reviewer_id, sit_id')
          .eq('reviewee_id', id)
          .eq('published', true)
          .eq('moderation_status', 'valide')
          .neq('review_type', 'annulation')
          .order('created_at', { ascending: false });
        if (revErr) console.error('[ownerReviews]', revErr);
        const enrichedOwnerReviews = await hydrateReviewers((revData ?? []) as any[]);
        setOwnerReviews(enrichedOwnerReviews);

        // Query 4, Feedbacks missions
        const { data: fbData, error: fbErr } = await supabase
          .from('mission_feedbacks')
          .select('id, positive, comment, created_at, badge_key')
          .eq('receiver_id', id)
          .order('created_at', { ascending: false });
        if (fbErr && fbErr.code !== 'PGRST116') console.error('[missionFeedbacks]', fbErr);
        setMissionFeedbacks(fbData ?? []);

        const { data: ownerGalData } = await supabase
          .from('owner_gallery')
          .select('id, photo_url, caption, category, season')
          .eq('user_id', id)
          .order('created_at', { ascending: false });
        setOwnerGalleryPhotos(ownerGalData ?? []);
      } finally {
        setOwnerDataLoading(false);
      }
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

      const { data: recognition } = await (supabase as any)
        .from('helper_recognition_stats')
        .select('useful_count')
        .eq('user_id', id)
        .maybeSingle();

      setMissionsPublished(published ?? []);
      setMissionsHelped(!helpedResult.error ? (helpedResult.data ?? []) : []);
      setThanksReceived(Number(recognition?.useful_count ?? 0));
    };

    loadEntraideData();
  }, [activeTab, id]);

  // Lightbox keyboard navigation (Escape to close, arrows to navigate)
  useEffect(() => {
    if (lightboxIdx === null) return;
    const max = gallery.slice(0, 9).length;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxIdx(null);
      else if (e.key === 'ArrowLeft' && lightboxIdx > 0) setLightboxIdx(lightboxIdx - 1);
      else if (e.key === 'ArrowRight' && lightboxIdx < max - 1) setLightboxIdx(lightboxIdx + 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxIdx, gallery]);

  const loadMoreOwnerSits = async () => {
    if (!id || ownerSitsLoadingMore) return;
    if (ownerSits.length >= ownerSitsTotal) return;
    setOwnerSitsLoadingMore(true);
    const from = ownerSits.length;
    const to = from + OWNER_SITS_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from('sits')
      .select('id, title, start_date, end_date, status, created_at')
      .eq('user_id', id)
      .in('status', ['published', 'confirmed', 'completed'])
      .order('created_at', { ascending: false })
      .range(from, to);
    if (error) console.error('[ownerSits loadMore]', error);
    if (data && data.length) setOwnerSits((prev) => [...prev, ...data]);
    setOwnerSitsLoadingMore(false);
  };

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
  // Cohérence : la valeur DB est désormais maintenue par un trigger sur la table
  // reviews (recalc_completed_sits_count). Plus besoin de Math.max côté client.
  const gardeReviewsCount = reviews.filter((r: any) => r.sit_id !== null).length;
  const completedSits = profile?.completed_sits_count ?? 0;
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

  const showCTA = !(isAuthenticated && isSitter); // visible aussi pour soi-même (état désactivé)

   // SEO
  const animalLabels = animalTypes.map(a => ANIMAL_LABELS[a] || a).join(", ");
  // Title structuré : nom · ville · signaux de confiance, limité à ~60 caractères.
  const trustSignals: string[] = [];
  if (profile?.identity_verified) trustSignals.push("identité vérifiée");
  if (avgRating > 0 && reviewCount > 0) trustSignals.push(`${avgRating.toFixed(1)} ★`);
  const trustPart = trustSignals.length ? `, ${trustSignals.join(" · ")}` : "";
  const baseTitle = city ? `${firstName}, gardien à ${city}` : `${firstName}, gardien d'animaux`;
  const candidateTitle = `${baseTitle}${trustPart}`;
  const pageTitle = candidateTitle.length <= 60 ? candidateTitle : baseTitle;
  // Meta description structurée : promesse + animaux + zone + signaux de confiance.
  const animalsForDesc = animalLabels || "animaux";
  const cityForDesc = city ? `à ${city}${radius ? ` (rayon ${radius} km)` : ''}` : "près de chez vous";
  const trustForDesc = [
    profile?.identity_verified ? "identité vérifiée" : null,
    completedSits > 0 ? `${completedSits} garde${completedSits > 1 ? 's' : ''}` : null,
    reviewCount > 0 ? `${avgRating.toFixed(1)}/5 (${reviewCount} avis)` : null,
  ].filter(Boolean).join(" · ");
  const descBase = `${firstName} garde vos ${animalsForDesc} ${cityForDesc}.`;
  const pageDesc = (descBase + (trustForDesc ? ` ${trustForDesc}.` : '')).slice(0, 160);
  const pageUrl = buildAbsoluteUrl(`/gardiens/${id}`);
  // Politique : profils riches indexables (≥1 avis publié OU ≥1 garde réalisée),
  // identité vérifiée et bio substantielle. Sinon noindex (RGPD + thin content).
  const hasSubstantialBio = ((bio || motivation || "") as string).length >= 80;
  const isRichProfile =
    (reviewCount >= 1 || completedSits >= 1) &&
    !!profile?.identity_verified &&
    hasSubstantialBio;
  const shouldNoindex = !isRichProfile;

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
  const anciennete = (dateStr: string) => {
    const months = Math.floor((Date.now() - new Date(dateStr).getTime()) / (30 * 86400000));
    if (months < 1) return 'Ce mois';
    if (months < 12) return `${months} mois`;
    const y = Math.floor(months / 12);
    return `${y} an${y > 1 ? 's' : ''}`;
  };

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
          postalCode={profile.postal_code || undefined}
          avatarUrl={profile.avatar_url || undefined}
          bio={bio || motivation || undefined}
          avgRating={avgRating}
          reviewCount={reviewCount}
          completedSits={completedSits}
          identityVerified={profile.identity_verified || false}
          knowsAbout={animalLabels ? animalLabels.split(', ') : undefined}
          role={hasSitterProfile && hasOwnerProfile ? 'both' : hasSitterProfile ? 'sitter' : hasOwnerProfile ? 'owner' : undefined}
          url={`https://guardiens.fr/gardiens/${id}`}
          events={buildTrustTimeline({
            memberSince: profile?.created_at,
            reviews,
            badges: (userBadges || []).map((b: any) => ({
              badge_id: b.badge_id,
              created_at: b.created_at,
              count: b.count ?? 1,
            })),
            completedSits,
            lastActivity: sitterProfile?.last_seen_at ?? null,
          }).map((e) => ({ name: e.label, date: e.date }))}
        />
      )}
      {/* Bandes latérales décoratives, desktop ≥ lg uniquement (sinon traversent le contenu en mobile) */}
      <div className="hidden lg:block" style={{ position: 'fixed', left: 0, top: 0, bottom: 0, width: '56px', background: 'linear-gradient(to right, rgba(45,106,79,0.06), transparent)', pointerEvents: 'none', zIndex: 0 }} aria-hidden="true" />
      <div className="hidden lg:block" style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: '56px', background: 'linear-gradient(to left, rgba(45,106,79,0.06), transparent)', pointerEvents: 'none', zIndex: 0 }} aria-hidden="true" />
      {/* Texte vertical gauche, desktop ≥ lg uniquement */}
      <div className="hidden lg:block" style={{ position: 'fixed', left: '10px', top: '50%', transform: 'translateY(-50%) rotate(-90deg)', fontSize: '9px', letterSpacing: '4px', textTransform: 'uppercase' as const, color: 'rgba(45,106,79,0.28)', whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 0, fontFamily: 'sans-serif' }} aria-hidden="true">
        Guardiens · House-sitting de proximité
      </div>
      {/* Texte vertical droit, desktop ≥ lg uniquement */}
      <div className="hidden lg:block" style={{ position: 'fixed', right: '10px', top: '50%', transform: 'translateY(-50%) rotate(90deg)', fontSize: '9px', letterSpacing: '4px', textTransform: 'uppercase' as const, color: 'rgba(45,106,79,0.28)', whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 0, fontFamily: 'sans-serif' }} aria-hidden="true">
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
        {/* JSON-LD Person détaillé géré par <ProfileSchemaOrg /> ci-dessus */}
      </Helmet>

      {/* ── Contenu principal z-1 ── */}
      <div className="relative z-[1]">
      {/* ── HERO FUSIONNÉ : illustration carnet de voyage (banque, hashée par sitter.id) ──
          Mode "spirale visible / rognage minimal" :
          - object-contain au lieu de object-cover → l'intégralité du carnet (spirales,
            reliure, marges) est affichée sans coupe.
          - Le conteneur respecte l'aspect-ratio natif (1536/544 ≈ 2.82) plutôt qu'une
            min-height arbitraire qui forcerait à zoomer/recadrer.
          - Fond #FBF6EC = couleur du papier des illustrations → liserés invisibles. */}
      {(() => {
        // L'ancrage horizontal n'est plus utile en mode contain (toute l'image est visible),
        // mais on conserve le calcul pour pouvoir basculer rapidement entre les deux modes.
        // `hero_image_index` (override manuel choisi par le gardien) prend le pas sur le hash.
        const overrideIndex = profile?.hero_image_index ?? null;
        const anchor = getSitterHeroAnchor(id, heroWeights, overrideIndex);
        const { desktop: heroDesktop, mobile: heroMobile } = getSitterHeroSources(
          id,
          heroWeights,
          overrideIndex
        );
        const isOwnProfile = !!auth.user?.id && auth.user.id === id;
        return (
          <div
            className="relative overflow-hidden w-full flex items-end bg-[hsl(var(--hero-paper))] md:max-h-[520px] md:[aspect-ratio:1536/544]"
          >
            {/* Illustration de fond, sketchbook style, déterministe par profil.
                object-contain : on montre le carnet entier (spirales, marges) sans rogner. */}
            <div className="absolute inset-0 z-0 pointer-events-none">
              <img
                src={heroDesktop}
                srcSet={`${heroMobile} 768w, ${heroDesktop} 1536w`}
                sizes="(max-width: 767px) 100vw, 1536px"
                alt=""
                aria-hidden="true"
                data-hero-anchor={anchor}
                width={1536}
                height={544}
                loading="eager"
                decoding="async"
                fetchPriority="high"
                style={{
                  // GPU layer : préserve les perfs de scroll même sans transform.
                  willChange: 'transform',
                  transform: 'translateZ(0)',
                  backfaceVisibility: 'hidden',
                }}
                className="w-full h-full object-contain object-center"
              />
            </div>

            {/* Bouton "Changer l'image", visible uniquement pour le propriétaire du profil.
                Position en haut à droite du hero, au-dessus des scrims, en z-20 pour
                rester cliquable malgré les overlays. */}
            {isOwnProfile && (
              <button
                type="button"
                onClick={() => setHeroPickerOpen(true)}
                className="absolute top-3 right-3 z-20 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/90 backdrop-blur border border-border text-xs font-medium shadow-sm hover:bg-background transition-colors"
                title="Choisir une autre illustration de carnet"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                Changer l'image
              </button>
            )}

        {/* Vignettage très subtil */}
        <div className="absolute inset-0 z-[1] pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, transparent 55%, rgba(90,69,48,0.08) 100%)' }} />

        {/* Scrim de lisibilité, dégradé bas qui remonte derrière le bloc texte.
            Plus présent (60% de la hauteur) pour garantir le contraste de la h1, ville,
            badges et stats peu importe la zone de l'illustration. */}
        <div
          className="absolute inset-x-0 bottom-0 h-[75%] z-[1] pointer-events-none"
          style={{
            background:
              'linear-gradient(to top, hsl(var(--background)) 0%, hsl(var(--background) / 0.85) 30%, hsl(var(--background) / 0.45) 65%, transparent 100%)',
          }}
        />

        {/* Scrim haut très léger pour le lien "Retour aux gardiens" */}
        <div
          className="absolute inset-x-0 top-0 h-24 z-[1] pointer-events-none"
          style={{
            background:
              'linear-gradient(to bottom, hsl(var(--background) / 0.55) 0%, transparent 100%)',
          }}
        />

        {/* Contenu header par-dessus */}
        <div className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 pb-5 sm:pb-8 pt-4 sm:pt-6">
          {/* Ligne retour */}
          <div className="flex justify-end mb-4">
            <Link
              to="/recherche-gardiens"
              className="inline-flex items-center gap-1 text-sm text-foreground font-medium px-3 py-1.5 rounded-full bg-background/90 backdrop-blur-md border border-border/60 shadow-md hover:bg-background hover:shadow-lg transition-all"
            >
              ← Retour aux gardiens
            </Link>
          </div>

          {/* Flex photo + infos */}
          <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-6 min-w-0">
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
                <span className="inline-flex w-fit items-center gap-1.5 text-xs bg-primary text-primary-foreground px-3 py-1 rounded-full font-semibold shadow-md border border-primary/40 backdrop-blur-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-foreground opacity-60" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-foreground" />
                  </span>
                  Disponible
                </span>
              )}

              {/* Pastille opaque englobant titre + ville → lisibilité garantie quelle
                  que soit l'illustration de fond.
                  - `max-w-full` + `min-w-0` empêchent tout débordement horizontal.
                  - La rangée interne passe en `flex-wrap` : si le prénom est très
                    long, le bouton favori et le badge fondateur descendent à la
                    ligne au lieu de chevaucher le texte.
                  - `break-words` + `[overflow-wrap:anywhere]` cassent même les
                    prénoms composés sans espace (ex. "Marie-Christophe-Alexandre"). */}
              <div
                tabIndex={0}
                className="group/hero-card self-start max-w-full min-w-0 inline-flex flex-col gap-1 rounded-2xl bg-background/90 backdrop-blur-md border border-border/60 shadow-md px-3 py-2 sm:px-4 sm:py-2.5 outline-none transition-all duration-300 ease-out hover:bg-background hover:shadow-xl hover:-translate-y-0.5 focus-visible:bg-background focus-visible:shadow-xl focus-visible:ring-2 focus-visible:ring-primary/40 active:bg-background active:shadow-xl"
              >
                <div className="flex flex-wrap items-center gap-x-2 sm:gap-x-3 gap-y-1.5 min-w-0 max-w-full">
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold text-foreground leading-tight capitalize break-words [overflow-wrap:anywhere] hyphens-auto min-w-0">
                    {firstName}
                  </h1>
                  {profile?.is_founder && <FounderBadge size="sm" />}
                  <ProBadge status={(profile as any)?.pro_status} size="sm" />
                  {id && <FavoriteButton targetType="sitter" targetId={id} size="md" />}
                  {avgRating > 0 && reviewCount > 0 && (
                    <span className="inline-flex items-baseline gap-1 text-sm font-medium text-foreground/85">
                      <span className="font-semibold">{avgRating.toFixed(1)}</span>
                      <span className="text-primary">★</span>
                      <span className="text-muted-foreground text-xs">({reviewCount})</span>
                    </span>
                  )}
                </div>

                {sitterProfile?.reply_median_minutes != null && (
                  <ReplyTimeBadge minutes={sitterProfile.reply_median_minutes} className="self-start mt-1" />
                )}

                {city && (
                  <p className="text-sm sm:text-base text-foreground/80 flex items-center gap-1 font-medium min-w-0 max-w-full break-words">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span className="min-w-0 break-words">Gardien à {city}</span>
                  </p>
                )}
                {(profile as any)?.pro_status === "verified" && (profile as any)?.pro_tagline && (
                  <p className="text-xs sm:text-sm text-foreground/75 italic mt-1 max-w-full break-words">
                    « {(profile as any).pro_tagline} »
                  </p>
                )}
                {(profile as any)?.pro_status === "verified" && (profile as any)?.pro_pricing_note && (
                  <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                    Tarif indicatif : {(profile as any).pro_pricing_note}
                  </p>
                )}
              </div>

              {(profile?.identity_verified || profile?.is_founder || emergencyActive || hasActiveSubscription) && (
                <div className="flex items-center gap-2 flex-wrap">
                  {hasActiveSubscription && (
                    <span className="inline-flex items-center gap-1 text-xs text-foreground/85 border border-border/60 rounded-full px-2 py-0.5 bg-background/85 backdrop-blur-sm">
                      <BadgeCheck size={11} className="text-primary" /> Abonné
                    </span>
                  )}
                  {profile?.identity_verified && (
                    <button
                      type="button"
                      onClick={() => {
                        const el = document.getElementById('confiance');
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                      aria-label="Voir les détails de confiance et vérifications"
                      className="inline-flex items-center gap-1 text-xs text-foreground/85 border border-border/60 rounded-full px-2 py-0.5 bg-background/85 backdrop-blur-sm hover:bg-background hover:border-primary/40 transition-colors cursor-pointer"
                    >
                      <Shield size={11} className="text-primary" /> ID vérifiée
                    </button>
                  )}
                  {profile?.is_founder && (
                    <span className="inline-flex items-center gap-1 text-xs text-foreground/85 border border-border/60 rounded-full px-2 py-0.5 bg-background/85 backdrop-blur-sm">
                      <Star size={11} className="text-primary" /> Fondateur
                    </span>
                  )}
                  {emergencyActive && (
                    <span className="inline-flex items-center gap-1 text-xs text-foreground/85 border border-border/60 rounded-full px-2 py-0.5 bg-background/85 backdrop-blur-sm">
                      <Shield size={11} className="text-primary" /> Gardien d'urgence
                    </span>
                  )}
                </div>
              )}

              {/* Trust Score, wrapper self-start pour éviter l'étirement en pleine largeur dans le flex-col */}
              <div className="self-start">
                <TrustScore
                  identityVerified={profile?.identity_verified || false}
                  avgRating={avgRating}
                  reviewCount={reviewCount}
                  completedSits={completedSits}
                  externalExperiencesCount={externalExperiences.length}
                  memberSince={profile?.created_at || new Date().toISOString()}
                  isFounder={profile?.is_founder || false}
                />
              </div>

              {/* Affinité côté propriétaire visitant un gardien */}
              {activeTab === 'gardien' && auth.user?.id && id && auth.user.id !== id && sitterProfile && (
                <div className="self-start mt-2">
                  <OwnerToSitterAffinity
                    sitterProfile={sitterProfile}
                    context="public_sitter_profile"
                    targetId={id}
                    size="md"
                    scope="single"
                    caption="Votre affinité avec ce gardien"
                  />
                </div>
              )}

              {/* Alma Pass 2 — Chantier 2 : bulle fit gardien pour owner avec au moins une annonce publiée */}
              {activeTab === 'gardien' && id && sitterProfile && (
                <div className="self-stretch mt-3">
                  <AlmaFitGardien
                    sitter={{
                      id,
                      first_name: profile?.first_name ?? null,
                      reviewCount: reviewCount,
                    }}
                    sitterProfile={sitterProfile}
                  />
                </div>
              )}

              <div className="flex items-center gap-2 sm:gap-4 text-sm text-foreground/80 mt-1 flex-wrap font-medium drop-shadow-sm">
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
        );
      })()}

      {/* ── STATS STRIP MOBILE (tab-aware) ── */}
      {profile && (
        <div className="md:hidden overflow-x-auto scrollbar-none bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex divide-x divide-border/60 min-w-max">
            {(() => {
              const ownerAvgStrip = ownerReviews.length > 0 ? ownerReviews.reduce((s, r) => s + (Number(r.overall_rating) || 0), 0) / ownerReviews.length : 0;
              const stripItems: Array<{ label: string; value: string }> = activeTab === 'proprio'
                ? ([
                    ownerAvgStrip > 0 ? { label: 'Note', value: `${ownerAvgStrip.toFixed(1)}★` } : null,
                    ownerSitsTotal > 0 ? { label: 'Gardes publiées', value: String(ownerSitsTotal) } : null,
                    profile?.created_at ? { label: 'Membre depuis', value: anciennete(profile.created_at) } : null,
                    totalBadgeCount > 0 ? { label: 'Écussons', value: String(totalBadgeCount) } : null,
                    pets.length > 0 ? { label: pets.length > 1 ? 'Animaux' : 'Animal', value: String(pets.length) } : null,
                  ] as Array<{ label: string; value: string } | null>).filter((s): s is { label: string; value: string } => s !== null)
                : ([
                    reviewCount > 0 ? { label: 'Note', value: `${avgRating.toFixed(1)}★` } : null,
                    { label: 'Gardes', value: String(completedSits) },
                    profile?.created_at ? { label: 'Membre depuis', value: anciennete(profile.created_at) } : null,
                    totalBadgeCount > 0 ? { label: 'Écussons', value: String(totalBadgeCount) } : null,
                    externalExperiences.length > 0 ? { label: 'Expé. vérif.', value: String(externalExperiences.length) } : null,
                  ] as Array<{ label: string; value: string } | null>).filter((s): s is { label: string; value: string } => s !== null);
              return stripItems.map((s) => (
                <div key={s.label} className="flex flex-col items-center justify-center px-4 py-2.5 shrink-0">
                  <span className="text-sm font-bold text-foreground font-heading leading-tight tabular-nums">{s.value}</span>
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-body mt-0.5 whitespace-nowrap">{s.label}</span>
                </div>
              ));
            })()}
          </div>
        </div>
      )}

      {/* ── BARRE D'ONGLETS, visible si ≥ 2 onglets ── */}
      {availableTabs > 1 && (
        <div className="flex border-b border-border bg-card sticky top-12 md:top-0 z-10 max-w-5xl mx-auto">
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
              {completedSits > 0 && (
                <span className="ml-1 text-xs font-normal opacity-70">({completedSits})</span>
              )}
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
              {missionCount > 0 && (
                <span className="ml-1 text-xs font-normal opacity-70">({missionCount})</span>
              )}
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
                  {/* Tuile 1, Animaux acceptés */}
                  <div className="bg-card border border-border rounded-xl p-2.5 sm:p-3.5 md:p-4 flex flex-col gap-1 sm:gap-1.5 min-h-[88px] sm:min-h-[92px] min-w-0">
                    <div className="text-[10px] sm:text-[11px] uppercase tracking-wider text-muted-foreground font-body">
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

                  {/* Tuile 2, Zone d'intervention */}
                  <div className="bg-card border border-border rounded-xl p-2.5 sm:p-3.5 md:p-4 flex flex-col gap-1 sm:gap-1.5 min-h-[88px] sm:min-h-[92px] min-w-0">
                    <div className="text-[10px] sm:text-[11px] uppercase tracking-wider text-muted-foreground font-body">
                      <span className="truncate">Zone</span>
                    </div>
                    {radius || city ? (
                      <p className="text-xs sm:text-sm text-foreground font-body leading-snug break-words">
                        {radius && city ? (
                          <><span className="break-words">{city}</span> <span className="text-muted-foreground">·</span> <span className="font-semibold whitespace-nowrap">jusqu'à {radius} km</span></>
                        ) : radius ? (
                          <span className="font-semibold whitespace-nowrap">Jusqu'à {radius} km autour</span>
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

                  {/* Tuile 3, Disponibilité */}
                  <div className="bg-card border border-border rounded-xl p-2.5 sm:p-3.5 md:p-4 flex flex-col gap-1 sm:gap-1.5 min-h-[88px] sm:min-h-[92px] min-w-0">
                    <div className="text-[10px] sm:text-[11px] uppercase tracking-wider text-muted-foreground font-body">
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

                  {/* Tuile 4, Confiance / preuves */}
                  <div className="bg-card border border-border rounded-xl p-2.5 sm:p-3.5 md:p-4 flex flex-col gap-1 sm:gap-1.5 min-h-[88px] sm:min-h-[92px] min-w-0">
                    <div className="text-[10px] sm:text-[11px] uppercase tracking-wider text-muted-foreground font-body">
                      <span className="truncate">Confiance</span>
                    </div>
                    {hasTrustSignals ? (
                      <>
                        <div className="flex items-baseline flex-wrap gap-x-1.5 gap-y-0.5 text-xs sm:text-sm text-foreground font-body">
                          {reviewCount > 0 ? (
                            <>
                              <span className="font-semibold whitespace-nowrap">{avgRating.toFixed(1)}<span className="text-primary">★</span></span>
                              <span className="text-muted-foreground text-[11px] sm:text-xs">
                                ({reviewCount} avis{reviewCount === 1 ? ', premier retour' : ''})
                              </span>
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

            {/* CTA primaire, visible immédiatement */}
            {showCTA && (
              <div className="mt-4 md:mt-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                {isOwn ? (
                  <button
                    type="button"
                    disabled
                    title="Ceci est votre profil public, utilisez « Modifier mon profil » pour le mettre à jour."
                    aria-disabled="true"
                    className="inline-flex items-center justify-center bg-muted text-muted-foreground rounded-lg px-6 py-3 text-sm font-medium flex-1 sm:flex-initial cursor-not-allowed opacity-70"
                  >
                    Aperçu de votre profil
                  </button>
                ) : !isAuthenticated ? (
                  <Link
                    to={`/inscription?redirect=/gardiens/${id}`}
                    className="inline-flex items-center justify-center bg-primary text-primary-foreground rounded-lg px-6 py-3 text-sm font-medium hover:bg-primary/90 transition-colors flex-1 sm:flex-initial"
                  >
                    S'inscrire pour contacter {firstName}
                  </Link>
                ) : isOwner ? (
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
                ) : null}
                <p className="text-[11px] sm:text-xs text-muted-foreground font-body sm:ml-2 self-center text-center sm:text-left leading-snug break-words">
                  {isOwn ? "Vous voyez cette page comme un visiteur." : "Contact direct, sans intermédiaire."}
                </p>
              </div>
            )}
          </section>

          {/* ── B. CONTENU EN ONGLETS (desktop) / FLUX (mobile) ───────── */}

          {/*, DESKTOP : Tabs Radix, */}
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
                {((userBadges && userBadges.length > 0) || profile?.created_at) && (
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
              {((userBadges && userBadges.length > 0) || profile?.created_at) && (
                <TabsContent value="confiance" className="pt-6">
                  <div className="space-y-6">
                    {userBadges && userBadges.length > 0 && (
                      <>
                        <SpecialBadgeHighlight userBadges={userBadges} />
                        <BadgeRow badges={userBadges} />
                      </>
                    )}
                    <TrustTimeline
                      memberSince={profile?.created_at}
                      reviews={reviews}
                      badges={(userBadges || []).map((b: any) => ({
                        badge_id: b.badge_id,
                        created_at: b.created_at,
                        count: b.count ?? 1,
                      }))}
                      completedSits={completedSits}
                      lastActivity={sitterProfile?.last_seen_at ?? null}
                      firstName={firstName}
                    />
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </div>

          {/* MOBILE : onglets sticky scrollables (forceMount pour SEO) */}
          <div className="md:hidden">
            <Tabs defaultValue="apropos" className="w-full">
              <TabsList className="sticky top-[49px] z-10 w-full flex overflow-x-auto scrollbar-none justify-start rounded-none border-b border-border bg-background/95 backdrop-blur-sm h-auto p-0 gap-0 [&>*]:rounded-none [&>*]:border-b-2 [&>*]:border-transparent [&>*[data-state=active]]:border-primary [&>*[data-state=active]]:text-primary [&>*[data-state=active]]:bg-transparent [&>*[data-state=active]]:shadow-none">
                <TabsTrigger value="apropos" className="shrink-0 px-4 py-3 text-sm font-body text-foreground/60 hover:text-foreground">
                  À propos
                </TabsTrigger>
                {reviewCount > 0 && (
                  <TabsTrigger value="avis" className="shrink-0 px-4 py-3 text-sm font-body text-foreground/60 hover:text-foreground">
                    Avis&nbsp;({reviewCount})
                  </TabsTrigger>
                )}
                <TabsTrigger value="pratique" className="shrink-0 px-4 py-3 text-sm font-body text-foreground/60 hover:text-foreground">
                  Pratique
                </TabsTrigger>
                {gallery.length > 0 && (
                  <TabsTrigger value="galerie" className="shrink-0 px-4 py-3 text-sm font-body text-foreground/60 hover:text-foreground">
                    Galerie
                  </TabsTrigger>
                )}
                {((userBadges && userBadges.length > 0) || profile?.created_at) && (
                  <TabsTrigger value="confiance" className="shrink-0 px-4 py-3 text-sm font-body text-foreground/60 hover:text-foreground">
                    Confiance
                  </TabsTrigger>
                )}
              </TabsList>

              {/* Onglet À propos */}
              <TabsContent value="apropos" forceMount className="mt-0 data-[state=inactive]:hidden px-4 pt-5 space-y-5">
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
                <PublicExperiences experiences={externalExperiences} />
              </TabsContent>

              {/* Onglet Avis */}
              {reviewCount > 0 && (
                <TabsContent value="avis" forceMount className="mt-0 data-[state=inactive]:hidden px-4 pt-5">
                  <Tabs defaultValue={gardeReviews.length > 0 ? "gardes" : "missions"} className="w-full">
                    <TabsList className="mb-3">
                      <TabsTrigger value="gardes">Gardes{gardeReviews.length > 0 ? ` (${gardeReviews.length})` : ''}</TabsTrigger>
                      <TabsTrigger value="missions">Missions{missionReviews.length > 0 ? ` (${missionReviews.length})` : ''}</TabsTrigger>
                    </TabsList>
                    <TabsContent value="gardes" forceMount>
                      {gardeReviews.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic py-2 font-body">Pas encore d'avis de garde.</p>
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
                        <p className="text-sm text-muted-foreground italic py-2 font-body">Pas encore d'avis de mission.</p>
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
              <TabsContent value="pratique" forceMount className="mt-0 data-[state=inactive]:hidden px-4 pt-5">
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
                <TabsContent value="galerie" forceMount className="mt-0 data-[state=inactive]:hidden px-4 pt-5">
                  <GallerySimple visibleGallery={visibleGallery} setLightboxIdx={setLightboxIdx} />
                </TabsContent>
              )}

              {/* Onglet Confiance */}
              {((userBadges && userBadges.length > 0) || profile?.created_at) && (
                <TabsContent value="confiance" forceMount className="mt-0 data-[state=inactive]:hidden px-4 pt-5 space-y-5" id="confiance">
                  {userBadges && userBadges.length > 0 && (
                    <>
                      <SpecialBadgeHighlight userBadges={userBadges} />
                      <BadgeRow badges={userBadges} />
                    </>
                  )}
                  <TrustTimeline
                    memberSince={profile?.created_at}
                    reviews={reviews}
                    badges={(userBadges || []).map((b: any) => ({
                      badge_id: b.badge_id,
                      created_at: b.created_at,
                      count: b.count ?? 1,
                    }))}
                    completedSits={completedSits}
                    lastActivity={sitterProfile?.last_seen_at ?? null}
                    firstName={firstName}
                  />
                </TabsContent>
              )}
            </Tabs>
          </div>

          {/* CTA sticky bottom mobile */}
          {showCTA && (
            <div className="md:hidden fixed bottom-16 left-0 right-0 z-40 bg-background border-t border-border px-3 sm:px-4 pt-2.5 sm:pt-3 pb-[calc(env(safe-area-inset-bottom)+0.625rem)] shadow-lg">
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
        <div className="max-w-4xl mx-auto pb-[calc(10.5rem+env(safe-area-inset-bottom))] md:pb-8">

          {/* Hero compact propriétaire */}
          <div className="px-4 pt-5 pb-4 border-b border-border/60">
            <div className="flex items-center gap-3 max-w-xl">
              <img
                src={profile?.avatar_url || '/placeholder.svg'}
                alt={firstName}
                className="w-14 h-14 rounded-full object-cover border-2 border-background shadow-sm ring-2 ring-primary/30 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-heading text-lg font-bold text-foreground capitalize leading-tight">{firstName}</h2>
                  {profile?.identity_verified && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-primary border border-primary/30 rounded-full px-2 py-0.5 bg-primary/5 font-body">
                      <Shield size={10} aria-hidden="true" /> ID vérifiée
                    </span>
                  )}
                  {profile?.is_founder && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-foreground/70 border border-border rounded-full px-2 py-0.5 bg-card font-body">
                      <Star size={10} aria-hidden="true" /> Fondateur
                    </span>
                  )}
                </div>
                {city && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5 font-body">
                    <MapPin className="w-3 h-3 shrink-0" aria-hidden="true" />
                    Propriétaire à {city}
                  </p>
                )}
                {(() => {
                  const ownerAvgHero = ownerReviews.length > 0
                    ? ownerReviews.reduce((s, r) => s + (Number(r.overall_rating) || 0), 0) / ownerReviews.length
                    : 0;
                  return ownerAvgHero > 0 && (
                    <p className="text-xs text-foreground/70 font-body mt-0.5">
                      <span className="font-semibold">{ownerAvgHero.toFixed(1)}</span>
                      <span className="text-primary ml-0.5">★</span>
                      <span className="text-muted-foreground ml-1">({ownerReviews.length} avis)</span>
                    </p>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Sous-onglets sticky scrollables (forceMount SEO) */}
          <Tabs defaultValue="apropos" className="w-full">
            <TabsList className="sticky top-[49px] z-10 w-full flex overflow-x-auto scrollbar-none justify-start rounded-none border-b border-border bg-background/95 backdrop-blur-sm h-auto p-0 gap-0 [&>*]:rounded-none [&>*]:border-b-2 [&>*]:border-transparent [&>*[data-state=active]]:border-primary [&>*[data-state=active]]:text-primary [&>*[data-state=active]]:bg-transparent [&>*[data-state=active]]:shadow-none">
              <TabsTrigger value="apropos" className="shrink-0 px-4 py-3 text-sm font-body text-foreground/60 hover:text-foreground">
                À propos
              </TabsTrigger>
              <TabsTrigger value="avis" className="shrink-0 px-4 py-3 text-sm font-body text-foreground/60 hover:text-foreground">
                Avis{ownerReviews.length > 0 ? ` (${ownerReviews.length})` : ''}
              </TabsTrigger>
              <TabsTrigger value="animaux" className="shrink-0 px-4 py-3 text-sm font-body text-foreground/60 hover:text-foreground">
                Animaux{pets.length > 0 ? ` (${pets.length})` : ''}
              </TabsTrigger>
              <TabsTrigger value="annonces" className="shrink-0 px-4 py-3 text-sm font-body text-foreground/60 hover:text-foreground">
                Gardes{ownerSitsTotal > 0 ? ` (${ownerSitsTotal})` : ''}
              </TabsTrigger>
              {ownerGalleryPhotos.length > 0 && (
                <TabsTrigger value="galerie" className="shrink-0 px-4 py-3 text-sm font-body text-foreground/60 hover:text-foreground">
                  Galerie ({ownerGalleryPhotos.length})
                </TabsTrigger>
              )}
            </TabsList>

            {/* Onglet À propos */}
            <TabsContent value="apropos" forceMount className="mt-0 data-[state=inactive]:hidden px-4 pt-5 pb-4 space-y-5">
              {/* Description propriétaire */}
              {ownerProfile?.description ? (
                <div>
                  <p className="text-sm text-foreground leading-relaxed font-body whitespace-pre-line">{ownerProfile.description}</p>
                </div>
              ) : bio ? (
                <p className="text-sm text-foreground/75 leading-relaxed font-body whitespace-pre-line">{bio}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic font-body">Pas encore de présentation.</p>
              )}

              {/* Environnements */}
              {(ownerProfile?.environments?.length ?? 0) > 0 && (
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-widest text-foreground/50 font-body">Environnements</p>
                  <div className="flex flex-wrap gap-2">
                    {ownerProfile?.environments?.map((env: string) => (
                      <span key={env} className="text-sm bg-muted text-foreground/70 px-3 py-1 rounded-full font-body">
                        {ENV_LABELS[env] || env}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Compétences propriétaire */}
              {(ownerProfile?.competences?.length ?? 0) > 0 && (
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-widest text-foreground/50 font-body">Savoir-faire</p>
                  <div className="flex flex-wrap gap-1.5">
                    {ownerProfile?.competences?.map((c: string) => (
                      <span key={c} className="border border-border bg-card rounded-full text-xs px-2.5 py-1 text-foreground/80 font-body">{c}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Badges confiance */}
              {userBadges && userBadges.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-widest text-foreground/50 font-body">Écussons de confiance</p>
                  <BadgeRow badges={userBadges} size="compact" />
                </div>
              )}
            </TabsContent>

            {/* Onglet Avis */}
            <TabsContent value="avis" forceMount className="mt-0 data-[state=inactive]:hidden px-4 pt-5 pb-4 space-y-6">
              {/* Avis gardes */}
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-widest text-foreground/50 font-body">
                  Avis des gardiens{ownerReviews.length > 0 ? ` (${ownerReviews.length})` : ''}
                </p>
                {ownerDataLoading ? (
                  <div className="space-y-3" aria-busy="true">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="bg-card border border-border rounded-xl p-4 space-y-2">
                        <div className="flex items-center gap-2.5">
                          <Skeleton className="h-8 w-8 rounded-full" />
                          <Skeleton className="h-3 w-24" />
                          <Skeleton className="h-3 w-16 ml-auto" />
                        </div>
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-4/5" />
                      </div>
                    ))}
                  </div>
                ) : ownerReviews.length > 0 ? (
                  <div className="space-y-3">
                    {(showAllOwnerReviews ? ownerReviews : ownerReviews.slice(0, VISIBLE_COUNT)).map((review) => {
                      const stars = Math.min(5, Math.max(0, Number(review.overall_rating) || 0));
                      return (
                        <article key={review.id} className="bg-card border border-border rounded-xl p-4 space-y-2">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            {review.reviewer?.avatar_url ? (
                              <img src={review.reviewer.avatar_url} alt={review.reviewer.first_name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-muted shrink-0 flex items-center justify-center text-xs font-bold text-foreground/40">
                                {(review.reviewer?.first_name || '?').charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span className="text-sm font-medium text-foreground font-body">{review.reviewer?.first_name || 'Gardien'}</span>
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
                        </article>
                      );
                    })}
                    <ShowMoreBtn items={ownerReviews} showAll={showAllOwnerReviews} setShowAll={setShowAllOwnerReviews} />
                  </div>
                ) : (
                  <p className="text-sm text-foreground/50 font-body italic">Les avis des gardiens apparaîtront ici après la première garde.</p>
                )}
              </div>

              {/* Avis entraide */}
              {(ownerDataLoading || missionFeedbacks.length > 0) && (
                <div className="space-y-3 border-t border-border/50 pt-5">
                  <p className="text-xs uppercase tracking-widest text-foreground/50 font-body">
                    Avis d'entraide{missionFeedbacks.length > 0 ? ` (${missionFeedbacks.length})` : ''}
                  </p>
                  {ownerDataLoading ? (
                    <div className="space-y-3" aria-busy="true">
                      {[0, 1].map((i) => (
                        <div key={i} className="bg-card border border-border rounded-xl p-4 space-y-2">
                          <div className="flex items-center gap-2.5">
                            <Skeleton className="h-8 w-8 rounded-full" />
                            <Skeleton className="h-5 w-20 rounded-full" />
                            <Skeleton className="h-3 w-16 ml-auto" />
                          </div>
                          <Skeleton className="h-3 w-3/4" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(showAllOwnerFeedbacks ? missionFeedbacks : missionFeedbacks.slice(0, VISIBLE_COUNT)).map((fb) => (
                        <article key={fb.id} className="bg-card border border-border rounded-xl p-4 space-y-2">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <div className="w-8 h-8 rounded-full bg-muted shrink-0" />
                            <span className={`text-xs px-2 py-0.5 rounded-full font-body shrink-0 ${fb.positive ? 'bg-primary/10 text-primary' : 'bg-muted text-foreground/50'}`}>
                              {fb.positive ? 'Recommande' : 'Mitigé'}
                            </span>
                            <span className="text-xs text-foreground/40 font-body ml-auto">
                              {new Date(fb.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                            </span>
                          </div>
                          {fb.comment && (
                            <p className="text-sm text-foreground/70 font-body leading-relaxed">{fb.comment}</p>
                          )}
                        </article>
                      ))}
                      <ShowMoreBtn items={missionFeedbacks} showAll={showAllOwnerFeedbacks} setShowAll={setShowAllOwnerFeedbacks} />
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            {/* Onglet Animaux */}
            <TabsContent value="animaux" forceMount className="mt-0 data-[state=inactive]:hidden px-4 pt-5 pb-4">
              {ownerDataLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" aria-busy="true">
                  {[0, 1].map((i) => (
                    <div key={i} className="flex items-center gap-3 bg-card border border-border rounded-xl p-4">
                      <Skeleton className="w-12 h-12 rounded-full shrink-0" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : pets.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {pets.map((pet) => {
                    const ageNum = parseInt(String(pet.age ?? ''));
                    const ageLabel = !isNaN(ageNum) ? `${ageNum} an${ageNum > 1 ? 's' : ''}` : null;
                    return (
                      <div key={pet.id} className="flex items-center gap-3 bg-card border border-border rounded-xl p-4">
                        {pet.photo_url ? (
                          <img src={pet.photo_url} alt={pet.name} className="w-12 h-12 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center shrink-0">
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
            </TabsContent>

            {/* Onglet Annonces/Gardes */}
            <TabsContent value="annonces" forceMount className="mt-0 data-[state=inactive]:hidden px-4 pt-5 pb-4 space-y-3">
              {ownerDataLoading ? (
                <div className="space-y-2" aria-busy="true">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex items-center justify-between gap-4 bg-card border border-border rounded-xl px-4 py-3">
                      <div className="min-w-0 flex-1 space-y-2">
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                      <Skeleton className="h-6 w-20 rounded-full" />
                    </div>
                  ))}
                </div>
              ) : ownerSits.length > 0 ? (
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
                    const s = statusMap[sit.status] ?? { label: sit.status, style: 'bg-muted text-foreground/40' };
                    const fmt = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
                    const isPast = ['completed', 'finished', 'cancelled', 'archived'].includes(sit.status);
                    return (
                      <div
                        key={sit.id}
                        className={`flex items-center justify-between gap-4 bg-card border border-border rounded-xl px-4 py-3 ${isPast ? 'opacity-60' : ''}`}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground font-body truncate">{sit.title || 'Garde'}</p>
                          {(sit.start_date || sit.end_date) && (
                            <p className="text-xs text-foreground/50 font-body mt-0.5">
                              {sit.start_date && fmt(sit.start_date)}{sit.end_date && ` → ${fmt(sit.end_date)}`}
                            </p>
                          )}
                        </div>
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 font-body whitespace-nowrap ${s.style}`}>
                          {s.label}
                        </span>
                      </div>
                    );
                  })}
                  <div className="flex flex-col items-start gap-2 mt-2">
                    <ShowMoreBtn items={ownerSits} showAll={showAllOwnerSits} setShowAll={setShowAllOwnerSits} />
                    {showAllOwnerSits && ownerSits.length < ownerSitsTotal && (
                      <button
                        type="button"
                        onClick={loadMoreOwnerSits}
                        disabled={ownerSitsLoadingMore}
                        className="text-sm text-primary hover:underline font-body disabled:opacity-50"
                      >
                        {ownerSitsLoadingMore
                          ? 'Chargement...'
                          : `Charger ${Math.min(OWNER_SITS_PAGE_SIZE, ownerSitsTotal - ownerSits.length)} de plus`}
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-foreground/50 font-body italic">Aucune garde publiée pour l'instant.</p>
              )}
            </TabsContent>

            {/* Onglet Galerie */}
            {ownerGalleryPhotos.length > 0 && (
              <TabsContent value="galerie" forceMount className="mt-0 data-[state=inactive]:hidden px-4 pt-5 pb-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ownerGalleryPhotos.map((photo, i) => (
                    <div key={photo.id} className="group relative rounded-xl overflow-hidden aspect-square">
                      <img
                        src={photo.photo_url}
                        alt={photo.caption || `Photo ${i + 1} de ${firstName}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      {photo.caption && (
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end">
                          <p className="p-2 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity line-clamp-2">{photo.caption}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </TabsContent>
            )}
          </Tabs>

          {/* CTA sticky bottom-16, au-dessus de la BottomNav h-16 */}
          {showCTA && (
            <div className="md:hidden fixed bottom-16 left-0 right-0 z-40 bg-background border-t border-border px-3 sm:px-4 pt-2.5 sm:pt-3 pb-[calc(env(safe-area-inset-bottom)+0.625rem)] shadow-lg">
              {isOwn ? (
                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  className="flex items-center justify-center bg-muted text-muted-foreground rounded-lg px-4 py-3 text-sm font-medium w-full opacity-70 cursor-not-allowed"
                >
                  Aperçu de votre profil propriétaire
                </button>
              ) : !isAuthenticated ? (
                <Link
                  to={`/inscription?redirect=/gardiens/${id}?tab=proprio`}
                  className="flex items-center justify-center bg-primary text-primary-foreground rounded-lg px-4 py-3 text-sm font-medium w-full"
                >
                  S'inscrire pour contacter {firstName}
                </Link>
              ) : isSitter ? (
                <button
                  type="button"
                  onClick={async () => {
                    if (!auth?.user?.id || !id) return;
                    const { startConversation } = await import('@/lib/conversation');
                    const { conversationId, error } = await startConversation({
                      otherUserId: id,
                      context: 'owner_pitch',
                    });
                    if (conversationId) {
                      navigate(`/messages?c=${conversationId}`);
                    } else if (error?.includes('propositions spontanées')) {
                      const { toast } = await import('sonner');
                      toast.error('Ce propriétaire ne reçoit pas de propositions spontanées.');
                    } else {
                      const { toast } = await import('sonner');
                      toast.error("Impossible d'ouvrir la conversation.");
                    }
                  }}
                  className="flex items-center justify-center bg-primary text-primary-foreground rounded-lg px-4 py-3 text-sm font-medium w-full"
                >
                  Contacter {firstName}
                </button>
              ) : null}
            </div>
          )}
        </div>
      )}


      {/* ── ONGLET ENTRAIDE ── */}
      {activeTab === 'entraide' && (
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-10">

          {(missionsPublished.length > 0 || missionsHelped.length > 0 || missionFeedbacks.length > 0 || thanksReceived > 0) && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { value: missionsPublished.length, label: 'Mission' + (missionsPublished.length > 1 ? 's publiées' : ' publiée') },
                { value: missionsHelped.length, label: 'Coup' + (missionsHelped.length > 1 ? 's de main donnés' : ' de main donné') },
                { value: thanksReceived, label: 'Merci' + (thanksReceived > 1 ? 's reçus' : ' reçu') },
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
                  const s = statusMap[m.status] ?? { label: m.status ?? ',', style: 'bg-muted text-foreground/40' };
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

      {/* Modale de sélection manuelle de l'image hero (visible si on est sur son propre profil) */}
      {auth.user?.id && id && auth.user.id === id && (
        <HeroPickerModal
          open={heroPickerOpen}
          onClose={() => setHeroPickerOpen(false)}
          userId={auth.user.id}
          currentIndex={profile?.hero_image_index ?? null}
          onSaved={(newIndex) =>
            setProfile((p: any) => (p ? { ...p, hero_image_index: newIndex } : p))
          }
        />
      )}
      </div>
    </div>
  );
}
