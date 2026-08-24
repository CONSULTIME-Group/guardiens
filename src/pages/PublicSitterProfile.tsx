import { useState, useEffect, useRef } from "react";
import { getMemberAvatarUrl, getMemberDisplayName, getMemberInitial } from "@/lib/memberUtils";

import ProBadge from "@/components/badges/ProBadge";
import { useParams, Link, useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAlmaCulturalFact } from "@/hooks/useAlmaCulturalFact";
import PageMeta from "@/components/PageMeta";
import PublicHeader from "@/components/layout/PublicHeader";
import BadgeRow from "@/components/badges/BadgeRow";
import MissionBadgesReceived from "@/components/missions/MissionBadgesReceived";
import SpecialBadgeHighlight from "@/components/badges/SpecialBadgeHighlight";
import { BadgeSceau } from "@/components/badges/BadgeSceau";
import StatutGardienBadge from "@/components/profile/StatutGardienBadge";
import ReplyTimeBadge from "@/components/sitters/ReplyTimeBadge";
import { useProfileReputation, useUserBadges } from "@/hooks/useProfileReputation";
// Tabs Radix supprimés (vague 38) : les onglets facettes sont des boutons.
import { format } from "date-fns";
import { fr } from "date-fns/locale";

import { Skeleton } from "@/components/ui/skeleton";
import { buildAbsoluteUrl } from "@/lib/seo";
import {
  MapPin, X,
  ChevronLeft, ChevronRight,
  Shield, Star, PawPrint,
  Home, KeyRound, Handshake, Heart,
  Image as ImageIcon,
  CalendarClock,
} from "lucide-react";
import { HeroPickerModal } from "@/components/profile/HeroPickerModal";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import PublicExperiences from "@/components/profile/PublicExperiences";
import TrustScore from "@/components/profile/TrustScore";
import FavoriteButton from "@/components/shared/FavoriteButton";
import OwnerToSitterAffinity from "@/components/matching/OwnerToSitterAffinity";
import AffinitySection from "@/components/matching/AffinitySection";
import AffinityTeaser from "@/components/matching/AffinityTeaser";
import { useViewerSitterForAffinity } from "@/hooks/useViewerSitterForAffinity";
import AlmaFitGardien from "@/components/ai/alma/AlmaFitGardien";
import { sanitizeBioForPublic } from "@/lib/sanitizeBio";
import { publishableMotivation } from "@/lib/motivation";
import {
  mobilityPublicLabel,
  MIN_STAY_DURATION_OPTIONS,
  FREQUENCY_OPTIONS,
  NOTICE_OPTIONS,
} from "@/lib/mobilityOptions";
import { WORK_DURING_SIT_OPTIONS } from "@/lib/profileMatchingOptions";
import { isSitterProfileIndexable } from "@/lib/sitterProfileIndexability";
import {
  buildProfileLightboxItems,
  isRealAvatarUrl,
  thumbnailLightboxIndex,
  wrapIndex,
} from "@/lib/profileLightbox";

import { AlmaReciprocityWhisper } from "@/components/ai/alma/wiring/AlmaReciprocityWhisper";
import { AlmaOwnerActiveSitterWhisper } from "@/components/ai/alma/wiring/AlmaOwnerActiveSitterWhisper";
import ProfileSchemaOrg from "@/components/seo/ProfileSchemaOrg";
import TrustTimeline from "@/components/profile/TrustTimeline";
import { buildTrustTimeline } from "@/lib/trustTimeline";
import { hydrateReviewers } from "@/lib/hydrateReviewers";
import { getSitterHeroImage, getSitterHeroAnchor, getSitterHeroSources } from "@/lib/heroBank";
import { useHeroWeights } from "@/hooks/useHeroWeights";
import ActivateRoleDialog, { type ContactIntentContext } from "@/components/premium/ActivateRoleDialog";
import ProfileHero, { type HeroCtaVariant } from "@/components/profile/ProfileHero";
import StoryTiles, { type StoryTileInput } from "@/components/profile/StoryTiles";
import TrustStory from "@/components/profile/TrustStory";
import ProfileRail from "@/components/profile/ProfileRail";
import AffinityTeaserCard from "@/components/profile/AffinityTeaserCard";
import AlmaWhisperCard from "@/components/profile/AlmaWhisperCard";
import CommunityPulseCard from "@/components/profile/CommunityPulseCard";
import { useCommunityPulse } from "@/hooks/useCommunityPulse";
import { avatarImageUrl, storageImageUrl } from "@/lib/storageImage";
import { petSpeciesLabel } from "@/lib/petLabels";
import { isRadiusDeclared } from "@/lib/searchRadius";

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


const ENV_LABELS: Record<string, string> = {
  city: "Ville", countryside: "Campagne", mountain: "Montagne",
  sea: "Bord de mer", suburb: "Banlieue",
};

type ProfileTab = 'gardien' | 'proprio' | 'entraide';

interface OwnerProfileData {
  id: string;
  user_id: string;
  welcome_notes: string | null;
  environments: string[];
  competences: string[] | null;
  competences_disponible: boolean | null;
}

export default function PublicSitterProfile() {
  const { id } = useParams<{ id: string }>();
  const auth = useAuth();
  const { sitter: viewerSitter } = useViewerSitterForAffinity();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const tabParam = searchParams.get('tab');

  const { data: reputation } = useProfileReputation(id);
  const { data: userBadges } = useUserBadges(id);
  const heroWeights = useHeroWeights();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [sitterProfile, setSitterProfile] = useState<any>(null);

  // Pass 5 — compagnon culturel : fait race si l'un des animaux du gardien matche.
  useAlmaCulturalFact({
    surface: "sitter_profile",
    enabled: !!auth.user?.id,
    context: {
      role: auth.activeRole,
      animal_species: (sitterProfile as any)?.animal_types?.[0] ?? undefined,
    },
  });
  const [ownerProfile, setOwnerProfile] = useState<OwnerProfileData | null>(null);
  const [targetOwnerAffinity, setTargetOwnerAffinity] = useState<any | null>(null);
  const [targetPets, setTargetPets] = useState<{ species: string | null; special_needs: string | null }[]>([]);
  const [missionCount, setMissionCount] = useState<number>(0);
  const [badges, setBadges] = useState<{ badge_key: string; count: number }[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewCount, setReviewCount] = useState(0);
  const [gallery, setGallery] = useState<any[]>([]);
  // Nombre de photos affiché aux visiteurs déconnectés (jamais les images).
  const [galleryCount, setGalleryCount] = useState(0);
  const [avgRating, setAvgRating] = useState(0);
  const [emergencyActive, setEmergencyActive] = useState(false);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const lightboxRef = useRef<HTMLDivElement>(null);
  // Jeu d'images de la visionneuse : l'avatar en tête (s'il existe), puis la
  // galerie. Chez un visiteur déconnecté la galerie n'est jamais chargée
  // (membres uniquement), donc le jeu se limite à l'avatar public.
  const hasAvatar = isRealAvatarUrl(profile?.avatar_url);
  const visibleGallery = gallery.slice(0, 9);
  const lightboxItems = buildProfileLightboxItems(profile?.avatar_url, visibleGallery);
  const [heroPickerOpen, setHeroPickerOpen] = useState(false);
  const [badgesBySitId, setBadgesBySitId] = useState<Record<string, string[]>>({});
  const [sitOwnerBySitId, setSitOwnerBySitId] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<ProfileTab>('gardien');
  const [pets, setPets] = useState<any[]>([]);
  const [ownerSits, setOwnerSits] = useState<any[]>([]);
  const [ownerSitsTotal, setOwnerSitsTotal] = useState<number>(0);
  const [ownerSitsLoadingMore, setOwnerSitsLoadingMore] = useState(false);
  const OWNER_SITS_PAGE_SIZE = 50;
  const [archivedSits, setArchivedSits] = useState<any[]>([]);
  const [missionFeedbacks, setMissionFeedbacks] = useState<any[]>([]);
  const [ownerDataLoading, setOwnerDataLoading] = useState(true);
  const [missionsPublished, setMissionsPublished] = useState<any[]>([]);
  const [missionsHelped, setMissionsHelped] = useState<any[]>([]);
  const [thanksReceived, setThanksReceived] = useState<number>(0);
  const [entraideLoading, setEntraideLoading] = useState(true);
  const [activateProprioIntent, setActivateProprioIntent] = useState<ContactIntentContext | null>(null);
  const [activateGardienOpen, setActivateGardienOpen] = useState(false);

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
  // Filtre chips pour l'onglet Avis, aplati (plus de sous-onglets Gardes/Missions imbriqués).
  const [reviewFilter, setReviewFilter] = useState<'all' | 'gardes' | 'missions'>('all');

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
        const authorName = capitalize(getMemberPublicFirstName(r.reviewer, "Membre"));
        const avatarUrl = getMemberAvatarUrl(r.reviewer);
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
    animalTypes: string[]; sitterProfile: any; radius: number | null; city: string | null;
    competences: string[]; specialSkills: string[]; lifestyle: string[]; lifePace: string;
    preferredEnvironments: string[]; languages: string[]; interests: string[];
    typeLine: string; durationLabel: string; frequencyLabel: string; noticeLabel: string;
    mobilityLabel: string; presenceLabel: string; experienceLabel: string;
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
      {(props.sitterProfile?.travels_with_own_animals || props.sitterProfile?.travels_with_children) && (
        <div>
          <h3 className="text-sm font-semibold text-foreground font-body mb-2.5">Accompagnants</h3>
          <ul className="text-sm text-foreground/80 font-body space-y-1">
            {props.sitterProfile?.travels_with_own_animals && (() => {
              const own: string[] = (props.sitterProfile?.own_animals || []).filter((s: string) => s && s.toLowerCase() !== "non");
              const detail = own.length > 0 ? own.map(s => s.replace(/^Oui[\s,\-—]*/i, "").trim()).filter(Boolean).join(", ") : "";
              return (
                <li>Voyage avec ses animaux{detail ? ` : ${detail}` : ""}</li>
              );
            })()}
            {props.sitterProfile?.travels_with_children && (
              <li>Voyage parfois avec ses enfants</li>
            )}
          </ul>
        </div>
      )}
      <div>
        <h3 className="text-sm font-semibold text-foreground font-body mb-2.5">Zone d'intervention</h3>
        <p className="text-sm text-foreground/70 font-body">
          {props.mobilityLabel
            ? `${props.mobilityLabel}${props.radius ? `, jusqu'à ${props.radius} km${props.city ? ` autour de ${props.city}` : ''}` : ''}`
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
      {props.specialSkills.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground font-body mb-2.5">Soins spécifiques</h3>
          <div className="flex flex-wrap gap-1.5">
            {props.specialSkills.map(c => (
              <span key={c} className="border border-border bg-card rounded-full text-xs px-2.5 py-1 text-foreground/80 font-body">{c}</span>
            ))}
          </div>
        </div>
      )}
      {(props.lifestyle.length > 0 || props.lifePace) && (
        <div>
          <h3 className="text-sm font-semibold text-foreground font-body mb-2.5">Style de vie</h3>
          <div className="flex flex-wrap gap-1.5">
            {props.lifestyle.map(l => (
              <span key={l} className="border border-border bg-card rounded-full text-xs px-2.5 py-1 text-foreground font-body">{l}</span>
            ))}
            {props.lifestyle.length === 0 && props.lifePace && (
              <span className="border border-border bg-card rounded-full text-xs px-2.5 py-1 text-foreground font-body">{props.lifePace}</span>
            )}
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
      {props.languages.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground font-body mb-2.5">Langues parlées</h3>
          <div className="flex flex-wrap gap-1.5">
            {props.languages.map(l => (
              <span key={l} className="border border-border bg-card rounded-full text-xs px-2.5 py-1 text-foreground font-body">{l}</span>
            ))}
          </div>
        </div>
      )}
      {props.interests.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground font-body mb-2.5">Centres d'intérêt</h3>
          <div className="flex flex-wrap gap-1.5">
            {props.interests.map(i => (
              <span key={i} className="border border-border bg-card rounded-full text-xs px-2.5 py-1 text-foreground font-body">{i}</span>
            ))}
          </div>
        </div>
      )}
      {(props.typeLine || props.presenceLabel || props.experienceLabel || props.durationLabel || props.frequencyLabel || props.noticeLabel) && (
        <div>
          <h3 className="text-sm font-semibold text-foreground font-body mb-2.5">Profil &amp; disponibilité</h3>
          <div className="text-sm text-foreground/70 font-body space-y-0.5">
            {props.typeLine && <p>{props.typeLine}</p>}
            {props.presenceLabel && <p>{props.presenceLabel}</p>}
            {props.experienceLabel && <p>Expérience : {props.experienceLabel}</p>}
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
          onClick={() => setLightboxIdx(thumbnailLightboxIndex(i, hasAvatar))}
          className={`overflow-hidden rounded-xl group relative ${
            i === 0
              ? "col-span-2 aspect-[2/1] md:col-span-2 md:row-span-2 md:aspect-auto"
              : "aspect-square"
          }`}
        >
          <img
            src={storageImageUrl(g.photo_url, i === 0 ? { width: 800, height: 800 } : { width: 386, height: 386 })}
            alt={g.caption || `Photo ${i + 1}`}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
            loading="lazy"
          />
          {g.source === "guardiens" && (
            <span className="absolute inset-x-0 bottom-0 px-2 py-1 text-[10px] leading-tight tracking-wide text-left bg-background/80 backdrop-blur-[2px] text-muted-foreground">
              Photo prise pendant une garde
            </span>
          )}
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
      // Pour l'ancre #confiance, la section existe en deux exemplaires
      // (desktop et mobile). On cible celui qui est réellement visible.
      const candidates =
        hash === "confiance"
          ? ["confiance", "confiance-mobile"]
          : [hash];
      const el = candidates
        .map((h) => document.getElementById(h))
        .find((n) => n && (n as HTMLElement).offsetParent !== null) as HTMLElement | undefined;
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 250);
    return () => clearTimeout(t);
  }, [loading, activeTab]);

  // Sticky CTA mobile : visible uniquement quand le CTA du hero est HORS viewport.
  const [heroCtaVisible, setHeroCtaVisible] = useState(true);
  useEffect(() => {
    if (loading) return;
    const target = document.querySelector<HTMLElement>("[data-hero-cta]");
    if (!target || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (e) setHeroCtaVisible(e.isIntersecting);
      },
      { rootMargin: "0px 0px -40% 0px", threshold: 0.01 },
    );
    io.observe(target);
    return () => io.disconnect();
  }, [loading, activeTab]);

  const { data: communityPulse } = useCommunityPulse();


  const [loadError, setLoadError] = useState<null | 'error'>(null);
  const [loadNonce, setLoadNonce] = useState(0);
  useEffect(() => {
    if (!id || id === "undefined" || id === "null") { setLoading(false); return; }
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      try {
      // Colonnes explicites : évite un select("*") qui exposerait/rapatrierait
      // des colonnes non utilisées côté client (privacy + payload).
      // Les champs pro_* viennent de la vue publique `public_profiles`, lisible
      // par tout visiteur ; `profiles` reste réservé au propriétaire du profil.
      const PUBLIC_PROFILE_COLS =
        "id, first_name, avatar_url, bio, city, postal_code, created_at, identity_verified, is_founder, completed_sits_count, last_seen_at, pro_status, pro_specialty, pro_tagline, pro_pricing_note, pro_business_name";
      // `last_name` retiré du select — jamais rendu publiquement.
      const BASE_PROFILE_COLS =
        "id, first_name, avatar_url, bio, city, postal_code, created_at, identity_verified, is_founder, profile_completion, completed_sits_count, cancellation_count, hero_image_index";

      // Vue publique : alignée sur les entrées scorées du moteur (symétrie
      // du 23/08/2026), sauf sensitivities (donnée de santé, jamais exposée).
      const PUBLIC_SITTER_COLS =
        "user_id, motivation, sitter_type, accompanied_by, lifestyle, animal_types, has_vehicle, has_license, geographic_radius, min_stay_duration, is_available, competences, special_animal_skills, preferred_frequency, min_notice, preferred_environments, farm_animals_ok, own_animals, reply_median_minutes, travels_with_children, travels_with_own_animals, work_during_sit, availability_during, experience_years, languages, interests, life_pace";
      const [profileRes, baseProfileRes, sitterRes, badgesRes, reviewsRes, galleryRes, emergencyRes, subRes, ownerRes, missionsRes, extExpRes] =
        await Promise.all([
          supabase.from("public_profiles").select(PUBLIC_PROFILE_COLS).eq("id", id).maybeSingle(),
          supabase.from("profiles").select(BASE_PROFILE_COLS).eq("id", id).maybeSingle(),
          (supabase as any).from("public_sitter_profiles").select(PUBLIC_SITTER_COLS).eq("user_id", id).maybeSingle(),
          supabase.from("badge_attributions").select("badge_id").eq("user_id", id),
          supabase
            .from("reviews")
            .select("*")
            .eq("reviewee_id", id)
            .eq("published", true)
            .eq("moderation_status", "valide")
            .neq("review_type", "annulation")
            .order("created_at", { ascending: false }),
          // Galerie réservée aux membres connectés (décision produit, août
          // 2026) : un visiteur anonyme ne reçoit jamais les URLs des photos.
          // La policy RLS anon a été supprimée, côté serveur comme côté client.
          auth?.hasSession
            ? supabase
                .from("sitter_gallery")
                .select("id, photo_url, caption, created_at, source")
                .eq("user_id", id)
                .order("created_at", { ascending: false })
            : Promise.resolve({ data: null as any[] | null }),
          (supabase as any).from("public_emergency_sitter_profiles").select("is_active").eq("user_id", id).maybeSingle(),
          // Chip Abonné : fonction booléenne (vague 39) pour ne jamais exposer subscriptions à anon.
          (supabase as any).rpc("has_active_subscription", { p_user_id: id }),
          (supabase as any)
            .from("public_owner_profiles")
            .select("user_id, welcome_notes, environments, competences, competences_disponible, preferred_sitter_types, home_ambiance, languages, interests, life_pace, presence_expected")
            .eq("user_id", id)
            .maybeSingle(),

          supabase
            .from(auth?.user ? "small_missions" : ("public_small_missions" as any))
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
      const publicData = (profileRes?.data as any) ?? null;
      const baseData = (baseProfileRes?.data as any) ?? null;
      const fetchedPublicProfile = publicData
        ? {
            ...publicData,
            hero_image_index: baseData?.hero_image_index ?? null,
            cancellation_count: baseData?.cancellation_count ?? 0,
          }
        : baseData;

      const fetchedSitterProfile = sitterRes?.data ?? null;
      const fetchedOwnerProfile = (ownerRes?.data as OwnerProfileData | null) ?? null;
      const fetchedEmergencyProfile = emergencyRes?.data ?? null;
      const fetchedMissionCount = missionsRes?.count ?? 0;

      if (fetchedPublicProfile) setProfile(fetchedPublicProfile);
      if (fetchedSitterProfile) setSitterProfile(fetchedSitterProfile);
      if (galleryRes.data) setGallery(galleryRes.data);
      // Visiteur anonyme : seul le NOMBRE de photos est exposé (fonction
      // security definer), pour l'encart « photos réservées aux membres ».
      if (!auth?.hasSession) {
        const { data: cnt } = await (supabase as any).rpc("gallery_photo_count", { p_user_id: id });
        setGalleryCount(typeof cnt === "number" ? cnt : 0);
      }
      if (fetchedEmergencyProfile) setEmergencyActive(fetchedEmergencyProfile.is_active);
      setHasActiveSubscription(Boolean((subRes as any)?.data));
      setOwnerProfile(fetchedOwnerProfile);
      // Entrée d'affinité (parité verrouillée par affinity-input-parity.test.ts).
      // Pas de contexte annonce sur un profil public : les politiques
      // accompagnants ne sont pas évaluables. null explicite, neutre dans le
      // moteur, jamais pénalisant.
      setTargetOwnerAffinity(
        fetchedOwnerProfile
          ? { ...fetchedOwnerProfile, accepts_sitter_pets: null, accepts_sitter_children: null }
          : null,
      );
      // Charge les animaux du propriétaire cible (via ses properties) pour permettre le calcul d'affinité côté gardien visitant l'onglet propriétaire.
      if (fetchedOwnerProfile && id) {
        try {
          const { data: propsData } = await supabase
            .from("properties")
            .select("car_required, pets:pets(species, special_needs, breed)")
            .eq("user_id", id);
          const flat = (propsData || []).flatMap((p: any) => p.pets || []);
          setTargetPets(flat);
          // Voiture requise : critère d'affinité (direction gardien → propriétaire).
          // Toujours écrite (true ou false), jamais laissée absente.
          setTargetOwnerAffinity((current: any) =>
            current?.user_id === id
              ? { ...current, car_required: (propsData || []).some((p: any) => p.car_required === true) }
              : current,
          );
        } catch {
          setTargetPets([]);
        }
      } else {
        setTargetPets([]);
      }
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
          const [{ data: badgeAttrData }, { data: sitOwnersData }] = await Promise.all([
            supabase
              .from("badge_attributions")
              .select("badge_id, sit_id")
              .in("sit_id", sitIdsFromReviews)
              .eq("user_id", id),
            supabase
              .from("sits")
              .select("id, user_id")
              .in("id", sitIdsFromReviews),
          ]);
          const grouped: Record<string, string[]> = {};
          (badgeAttrData || []).forEach((b: any) => {
            if (!grouped[b.sit_id]) grouped[b.sit_id] = [];
            grouped[b.sit_id].push(b.badge_id);
          });
          setBadgesBySitId(grouped);
          const ownerMap: Record<string, string> = {};
          (sitOwnersData || []).forEach((s: any) => {
            if (s?.id && s?.user_id) ownerMap[s.id] = s.user_id;
          });
          setSitOwnerBySitId(ownerMap);
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

      window.prerenderReady = true;
      } catch (e: any) {
        console.error('[PublicSitterProfile] load failed', e);
        setLoadError('error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, loadNonce, auth?.hasSession]);

  // Complément d'affinité réservé aux membres connectés (la vue publique
  // `public_sitter_profiles` ne porte pas les colonnes d'affinité). Le user_id
  // déclenche ce chargement lorsque le profil public est prêt, sans rejouer le
  // grand effet. La fusion fonctionnelle conserve toute la projection publique.
  useEffect(() => {
    if (!id || !auth?.user || sitterProfile?.user_id !== id) return;

    let cancelled = false;

    const loadAffinityProfile = async () => {
      const { data: affinityRow } = await (supabase as any)
        .from("sitter_profiles_affinity")
        // Projection complète des 16 champs d'AffinitySitterInput : parité
        // des entrées verrouillée par affinity-input-parity.test.ts.
        .select("user_id, experience_years, life_pace, lifestyle, availability_during, has_vehicle, has_license, languages, interests, work_during_sit, sensitivities, special_animal_skills, animal_types, sitter_type, travels_with_children, travels_with_own_animals, farm_animals_ok")
        .eq("user_id", id)
        .maybeSingle();

      if (cancelled || !affinityRow) return;
      setSitterProfile((current: any) =>
        current?.user_id === id ? { ...current, ...affinityRow } : current,
      );
    };

    void loadAffinityProfile();

    return () => {
      cancelled = true;
    };
  }, [id, auth?.user, sitterProfile?.user_id]);

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
        // Ne liste QUE les annonces réellement publiées (pas les gardes confirmées/terminées internes).
        const { data: sitsData, error: sitsErr, count: sitsCount } = await supabase
          .from('sits')
          .select('id, slug, title, city, cover_photo_url, start_date, end_date, status, created_at', { count: 'exact' })
          .eq('user_id', id)
          .in('status', ['published'])
          .order('created_at', { ascending: false })
          .range(0, OWNER_SITS_PAGE_SIZE - 1);
        if (sitsErr) console.error('[sits]', sitsErr);
        setOwnerSits(sitsData ?? []);
        setOwnerSitsTotal(sitsCount ?? (sitsData?.length ?? 0));

        // Query 3, Gardes passées (annonces archivées, hors annulées et modération).
        //   Les avis reçus en tant que propriétaire sont désormais dérivés du set principal
        //   `reviews` via `sitOwnerBySitId` (cf. useMemo `ownerReviewsDerived`) — plus de
        //   requête dédiée ici, pour garantir la cohérence des compteurs par rôle.
        // Lecture via la vue publique réduite : la table `sits` n'est plus lisible
        // en anonyme hors `published`. La vue n'expose ni date ni texte libre.
        const { data: archData, error: archErr } = await supabase
          .from('public_closed_sits')
          .select('id, slug, title, city, cover_photo_url, status')
          .eq('user_id', id)
          .eq('status', 'archived')
          .limit(50);

        if (archErr) console.error('[archivedSits]', archErr);
        setArchivedSits(archData ?? []);


        // Query 4, Feedbacks missions
        const { data: fbData, error: fbErr } = await supabase
          .from('public_mission_feedbacks' as any)
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
      setEntraideLoading(true);
      try {
        const [publishedRes, helpedResult, recognitionRes] = await Promise.all([
          supabase
            .from('small_missions')
            .select('id, title, category, status, created_at, exchange_offer')
            .eq('user_id', id)
            .order('created_at', { ascending: false })
            .limit(20),
          supabase
            .from('small_mission_responses')
            .select('id, status, created_at, small_missions(id, title, category, status, created_at)')
            .eq('responder_id', id)
            .eq('status', 'accepted')
            .order('created_at', { ascending: false })
            .limit(20),
          (supabase as any)
            .from('helper_recognition_stats')
            .select('useful_count')
            .eq('user_id', id)
            .maybeSingle(),
        ]);

        setMissionsPublished(publishedRes.data ?? []);
        setMissionsHelped(!helpedResult.error ? (helpedResult.data ?? []) : []);
        setThanksReceived(Number((recognitionRes as any)?.data?.useful_count ?? 0));
      } finally {
        setEntraideLoading(false);
      }
    };

    loadEntraideData();
  }, [activeTab, id]);

  // Navigation clavier de la visionneuse : Échap ferme, les flèches circulent
  // (boucle aux extrémités) et Tab reste piégé dans la modale.
  useEffect(() => {
    if (lightboxIdx === null) return;
    const total = lightboxItems.length;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxIdx(null);
        return;
      }
      if (e.key === 'ArrowLeft') {
        setLightboxIdx(wrapIndex(lightboxIdx - 1, total));
        return;
      }
      if (e.key === 'ArrowRight') {
        setLightboxIdx(wrapIndex(lightboxIdx + 1, total));
        return;
      }
      if (e.key === 'Tab') {
        const container = lightboxRef.current;
        if (!container) return;
        const focusables = Array.from(
          container.querySelectorAll<HTMLElement>('button:not([disabled])'),
        );
        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement;
        if (e.shiftKey && (active === first || !container.contains(active))) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && (active === last || !container.contains(active))) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxIdx, lightboxItems.length]);

  // À l'ouverture, le focus rejoint le bouton Fermer (amorce du piège à focus).
  const lightboxOpen = lightboxIdx !== null;
  useEffect(() => {
    if (!lightboxOpen) return;
    lightboxRef.current
      ?.querySelector<HTMLElement>('button[aria-label="Fermer la galerie"]')
      ?.focus();
  }, [lightboxOpen]);

  const loadMoreOwnerSits = async () => {
    if (!id || ownerSitsLoadingMore) return;
    if (ownerSits.length >= ownerSitsTotal) return;
    setOwnerSitsLoadingMore(true);
    const from = ownerSits.length;
    const to = from + OWNER_SITS_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from('sits')
      .select('id, slug, title, city, cover_photo_url, start_date, end_date, status, created_at')
      .eq('user_id', id)
      .in('status', ['published'])
      .order('created_at', { ascending: false })
      .range(from, to);
    if (error) console.error('[ownerSits loadMore]', error);
    if (data && data.length) setOwnerSits((prev) => [...prev, ...data]);
    setOwnerSitsLoadingMore(false);
  };

  if (loading) {
    // Squelette qui préfigure la vraie structure : hero pleine largeur à hauteur
    // réservée (responsive), rangée de tuiles, bouton. Objectif : éviter le CLS
    // à l'arrivée des données. Aucun changement visuel par ailleurs.
    return (
      <div className="min-h-screen bg-background" aria-busy="true" aria-live="polite">
        {/* Hero */}
        <Skeleton className="w-full h-[280px] sm:h-[380px] md:h-[520px] rounded-none" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          {/* Titre + sous-titre */}
          <div className="space-y-3">
            <Skeleton className="h-8 sm:h-10 w-2/3 max-w-sm" />
            <Skeleton className="h-4 w-40" />
          </div>
          {/* Rangée de tuiles */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
          {/* Bouton */}
          <Skeleton className="h-11 w-full sm:w-64 rounded-lg" />
        </div>
      </div>
    );
  }

  if (loadError === 'error') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="text-center space-y-3 max-w-md">
          <p className="text-lg font-semibold text-foreground">Impossible de charger ce profil</p>
          <p className="text-sm text-muted-foreground">Un problème réseau est peut-être en cause. Vous pouvez réessayer dans un instant.</p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setLoadNonce((n) => n + 1)}
              className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground text-sm font-medium px-4 py-2 hover:opacity-90"
            >
              Réessayer
            </button>
            <Link to="/" className="text-sm text-primary hover:underline">Retour à l'accueil</Link>
          </div>
        </div>
      </div>
    );
  }

  if (!profile && !ownerProfile) {
    // Profil inexistant ou compte effacé (anonymisé) : état vide propre, jamais indexable.
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <PageMeta
          title="Profil indisponible"
          description="Ce profil n'est plus disponible sur Guardiens."
          noindex
        />
        <div className="text-center">
          <p className="text-lg font-semibold text-foreground">Profil indisponible</p>
          <p className="text-sm text-muted-foreground mt-1">
            Ce membre n'a plus de fiche publique.
          </p>
          <Link to="/" className="text-sm text-primary hover:underline mt-2 block">
            Retour à l'accueil
          </Link>
        </div>
      </div>
    );
  }


  // Certains membres saisissent leur nom complet dans le champ prénom,
  // seul le premier mot est affiché publiquement.
  const firstName = capitalize(publicFirstName(profile?.first_name));
  const city = profile?.city || "";
  // RGPD : masquage présentationnel des coordonnées (jamais de modification en base).
  const bio = sanitizeBioForPublic(profile?.bio);
  // Une motivation sous le seuil (50 car.) reste un brouillon : jamais publiée.
  const motivation = sanitizeBioForPublic(publishableMotivation(sitterProfile?.motivation));
  const animalTypes: string[] = sitterProfile?.animal_types || [];
  const hasVehicle = sitterProfile?.has_vehicle || false;
  const rawRadius = sitterProfile?.geographic_radius;
  // Cohérence : la valeur DB est désormais maintenue par un trigger sur la table
  // reviews (recalc_completed_sits_count). Plus besoin de Math.max côté client.
  const completedSits = profile?.completed_sits_count ?? 0;
  const radius = isRadiusDeclared(rawRadius) ? rawRadius : null; // 30 = silence, jamais affiché
  const isOwn = auth?.user?.id === id;
  // Variante connectée gatée sur la présence réelle du profil, pour ne jamais
  // remplacer le teaser visiteur par des actions inopérantes.
  const isAuthenticated = !!auth?.user;
  const hasSession = !!auth?.hasSession;
  const isOwner = auth?.activeRole === "owner";
  const isSitter = auth?.activeRole === "sitter";
  const isAvailable = sitterProfile?.is_available || false;

  const sitterType = sitterProfile?.sitter_type || "";
  const accompaniedBy = sitterProfile?.accompanied_by || "";
  const lifestyle: string[] = sitterProfile?.lifestyle || [];
  const minStayDuration: string = sitterProfile?.min_stay_duration || "";
  const preferredEnvironments: string[] = sitterProfile?.preferred_environments || [];
  const competences: string[] = sitterProfile?.competences || [];
  const preferredFrequency: string = sitterProfile?.preferred_frequency || "";
  const minNotice: string = sitterProfile?.min_notice || "";
  // Signaux scorés par le moteur, exposés sur la fiche (symétrie du 23/08/2026).
  const specialSkills: string[] = (sitterProfile?.special_animal_skills || []).filter(Boolean);
  const sitterLanguages: string[] = (sitterProfile?.languages || []).filter(Boolean);
  const sitterInterests: string[] = (sitterProfile?.interests || []).filter(Boolean);
  // life_pace est le repli de lifestyle dans le moteur : affiché seulement si
  // lifestyle est vide, pour ne pas doubler l'information.
  const lifePace: string = lifestyle.length === 0 ? (sitterProfile?.life_pace || "") : "";
  const experienceLabel: string = sitterProfile?.experience_years || "";
  // Présence pendant la garde : critère le plus lourd du moteur (poids 2),
  // affiché avec le libellé exact du formulaire. Repli : availability_during.
  const presenceLabel: string =
    WORK_DURING_SIT_OPTIONS.find(o => o.value === sitterProfile?.work_during_sit)?.label
    || sitterProfile?.availability_during
    || "";

  const frequencyLabel = mobilityPublicLabel(FREQUENCY_OPTIONS, preferredFrequency);
  const noticeLabel = mobilityPublicLabel(NOTICE_OPTIONS, minNotice);

  const totalBadgeCount = badges.reduce((s: any, b: any) => s + b.count, 0);

  // Ségrégation par rôle : un avis avec sit_id compte comme "garde" (côté gardien)
  //   uniquement si le reviewer était le propriétaire de l'annonce (sit.user_id).
  //   Inversement, un avis avec sit_id compte comme "propriétaire" si le reviewer
  //   n'était PAS le propriétaire (donc le gardien laissant un avis au proprio).
  //   Les avis sans sit_id (missions d'entraide) restent côté gardien.
  const gardeReviews = reviews.filter((r: any) => {
    if (r.sit_id === null) return false;
    const ownerId = sitOwnerBySitId[r.sit_id];
    return ownerId !== undefined && ownerId !== r.reviewee_id;
  });
  const missionReviews = reviews.filter((r: any) => r.sit_id === null);
  const ownerReviews = reviews.filter((r: any) => {
    if (r.sit_id === null) return false;
    const ownerId = sitOwnerBySitId[r.sit_id];
    return ownerId !== undefined && ownerId === r.reviewee_id;
  });
  const sitterRoleReviews = [...gardeReviews, ...missionReviews];
  const sitterRoleCount = sitterRoleReviews.length;
  const sitterRoleAvg = sitterRoleCount > 0
    ? Math.round((sitterRoleReviews.reduce((s: number, r: any) => s + (Number(r.overall_rating) || 0), 0) / sitterRoleCount) * 10) / 10
    : 0;
  const ownerAvg = ownerReviews.length > 0
    ? Math.round((ownerReviews.reduce((s: number, r: any) => s + (Number(r.overall_rating) || 0), 0) / ownerReviews.length) * 10) / 10
    : 0;
  // Compteurs contextuels au hero selon la facette active (JSON-LD/SEO restent sur le total).
  const heroAvg = activeTab === 'proprio' ? ownerAvg : sitterRoleAvg;
  const heroCount = activeTab === 'proprio' ? ownerReviews.length : sitterRoleCount;

  // showCTA supprimé (vague 38) : le sticky mobile suit heroCta.kind.

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
  // Indexabilité des fiches gardien : politique posée le 20/07/2026, confirmée
  // le 12/08/2026. Objectif : rouvrir le canal SEO des profils sans exposer les
  // fiches vides. Une fiche est indexable si elle a une bio substantielle (au
  // moins 80 caractères) ET au moins un signal de confiance (identité vérifiée
  // ou au moins une photo de galerie). Motif de la confirmation : sur 972
  // profils, 832 ont une motivation vide et la longueur moyenne du texte libre
  // est de 49 caractères, donc seules les fiches substantielles méritent
  // l'index. La règle vit dans src/lib/sitterProfileIndexability.js, partagée
  // avec scripts/generate-sitemap.mjs pour que sitemap et meta robots ne
  // puissent pas diverger. Aucun `Disallow` ne doit être posé sur `/gardiens` :
  // il empêcherait Google de voir le noindex des fiches non éligibles.
  const isRichProfile = isSitterProfileIndexable({
    bio,
    motivation,
    identityVerified: profile?.identity_verified,
    galleryCount: gallery.length,
  });
  const shouldNoindex = !isRichProfile;



  const typeLabel = SITTER_TYPE_LABELS[sitterType] || sitterType;
  const accompLabel = accompaniedBy ? `avec ${accompaniedBy}` : "";
  const typeLineItems = [typeLabel, accompLabel].filter(Boolean);
  const typeLine = typeLineItems.length > 0 ? typeLineItems.join(" · ") : "";

  const durationLabel = mobilityPublicLabel(MIN_STAY_DURATION_OPTIONS, minStayDuration);
  // Mobilité : tri-état (doctrine règle 5), la nullité ne s'affiche pas.
  const mobilityLabel = hasVehicle
    ? "Se déplace avec son véhicule"
    : sitterProfile?.has_license
      ? "A le permis de conduire"
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

  // ── CTA du hero, contextuel à la facette active (vague 38, chantier 1) ──
  // gardien / entraide → contact du gardien (sitter_inquiry, "Contacter")
  // proprio            → pitch d'un gardien connecté ("Proposer une garde"),
  //                       redirect encodé, dialog activation gardien si proprio,
  //                       muted si sitter regardant un autre sitter sans proprio.
  const contactSitterHandler = async () => {
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
  };
  const pitchOwnerHandler = async () => {
    if (!auth?.user?.id || !id) return;
    const { startConversation } = await import("@/lib/conversation");
    const { conversationId, error } = await startConversation({
      otherUserId: id,
      context: "owner_pitch",
    });
    if (conversationId) {
      navigate(`/messages?c=${conversationId}`);
    } else if (error?.includes("propositions spontanées")) {
      const { toast } = await import("sonner");
      toast.error("Ce propriétaire ne reçoit pas de propositions spontanées.");
    } else {
      const { toast } = await import("sonner");
      toast.error("Impossible d'ouvrir la conversation.");
    }
  };

  const heroCtaFor = (tab: ProfileTab): { cta: HeroCtaVariant; reassurance?: string } => {
    if (isOwn) {
      return { cta: { kind: "own" } };
    }
    if (tab === "proprio") {
      const label = `Proposer une garde à ${firstName}`;
      if (!isAuthenticated) {
        return {
          cta: {
            kind: "unauthenticated",
            signupHref: `/inscription?redirect=${encodeURIComponent(`/gardiens/${id}?tab=proprio`)}`,
            label: `S'inscrire pour proposer une garde à ${firstName}`,
          },
        };
      }
      if (isSitter) {
        return { cta: { kind: "owner", onContact: pitchOwnerHandler, label } };
      }
      if (isOwner) {
        // proprio connecté sans facette gardien → dialog activation gardien
        return {
          cta: {
            kind: "sitter",
            onActivate: () => setActivateGardienOpen(true),
            label,
          },
          reassurance: "Activez votre rôle gardien pour lui proposer vos services.",
        };
      }
      return {
        cta: {
          kind: "muted",
          label: "Réservé aux gardiens",
          hint: "Seuls les gardiens peuvent proposer une garde.",
        },
      };
    }
    // gardien / entraide → contact du gardien
    if (!isAuthenticated) {
      return {
        cta: {
          kind: "unauthenticated",
          signupHref: `/inscription?redirect=${encodeURIComponent(`/gardiens/${id}?tab=${tab}`)}`,
        },
      };
    }
    if (isOwner) {
      return { cta: { kind: "owner", onContact: contactSitterHandler } };
    }
    // isSitter (viewer sans profil proprio) → activation proprio
    return {
      cta: {
        kind: "sitter",
        onActivate: () =>
          setActivateProprioIntent({
            recipientId: id!,
            recipientFirstName: firstName,
            conversationContext: "sitter_inquiry",
          }),
      },
    };
  };
  const { cta: heroCta, reassurance: heroCtaReassurance } = heroCtaFor(activeTab);


  return (
    <div id="main-content" className="min-h-screen bg-background">
      {/* Coquille connectée : en tête et pilule de navigation, pour ne pas
          enfermer l'utilisateur sur cette page. Visiteur : rendu inchangé. */}
      {hasSession && (
        <PublicHeader authedVariant />
      )}
      {/* JSON-LD */}
      {profile && (
        <ProfileSchemaOrg
          name={firstName}
          city={city || undefined}
          /* RGPD : on n'expose que les deux premiers chiffres (département), pas le code postal complet. */
          postalCode={profile.postal_code ? String(profile.postal_code).slice(0, 2) : undefined}
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
            lastActivity: profile?.last_seen_at ?? null,
          }).map((e) => ({ name: e.label, date: e.date }))}
        />
      )}
      {/* Bandes latérales décoratives, desktop ≥ lg uniquement (sinon traversent le contenu en mobile) */}
      <div className="hidden lg:block" style={{ position: 'fixed', left: 0, top: 0, bottom: 0, width: '56px', background: 'linear-gradient(to right, hsl(var(--primary) / 0.06), transparent)', pointerEvents: 'none', zIndex: 0 }} aria-hidden="true" />
      <div className="hidden lg:block" style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: '56px', background: 'linear-gradient(to left, hsl(var(--primary) / 0.06), transparent)', pointerEvents: 'none', zIndex: 0 }} aria-hidden="true" />
      {/* Texte vertical gauche, desktop ≥ lg uniquement */}
      <div className="hidden lg:block" style={{ position: 'fixed', left: '10px', top: '50%', transform: 'translateY(-50%) rotate(-90deg)', fontSize: '9px', letterSpacing: '4px', textTransform: 'uppercase' as const, color: 'hsl(var(--primary) / 0.28)', whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 0, fontFamily: 'sans-serif' }} aria-hidden="true">
        Guardiens · House-sitting de proximité
      </div>
      {/* Texte vertical droit, desktop ≥ lg uniquement */}
      <div className="hidden lg:block" style={{ position: 'fixed', right: '10px', top: '50%', transform: 'translateY(-50%) rotate(90deg)', fontSize: '9px', letterSpacing: '4px', textTransform: 'uppercase' as const, color: 'hsl(var(--primary) / 0.28)', whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 0, fontFamily: 'sans-serif' }} aria-hidden="true">
        Gardiens de confiance · Gens du coin
      </div>
      <PageMeta
        title={pageTitle}
        description={pageDesc}
        path={`/gardiens/${id}`}
        /* og:image :
           - profils riches → visuel dédié 1200×630 (PNG) généré par l'edge function `og-profile`
           - sinon → repli sur l'avatar (préserve un aperçu même sur profils pauvres). */
        image={
          isRichProfile && id
            ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/og-profile?id=${id}`
            : (profile?.avatar_url ? avatarImageUrl(profile.avatar_url, 512) : undefined)
        }
        type="website"
        noindex={shouldNoindex}
      />

      {/* ── Contenu principal z-1 ── */}
      <div className="relative z-[1]">
      {/* ── HERO RESSERRÉ (vague 37) ── */}
      {profile && id && (() => {
        const overrideIndex = profile?.hero_image_index ?? null;
        const anchor = getSitterHeroAnchor(id, heroWeights, overrideIndex);
        const { desktop: heroDesktop, mobile: heroMobile } = getSitterHeroSources(
          id,
          heroWeights,
          overrideIndex,
        );
        return (
          <ProfileHero
            id={id}
            firstName={firstName}
            city={city || null}
            avatarUrl={profile.avatar_url || null}
            heroDesktop={heroDesktop}
            heroMobile={heroMobile}
            heroAnchor={anchor}
            isOwnProfile={isOwn}
            onOpenHeroPicker={() => setHeroPickerOpen(true)}
            // Sans photo de profil, l'avatar n'est pas cliquable du tout :
            // mieux vaut rien qu'une visionneuse ouverte sur autre chose.
            onOpenAvatarLightbox={() => hasAvatar && setLightboxIdx(0)}
            hasAvatarLightbox={hasAvatar}
            proStatus={(profile as any)?.pro_status ?? null}
            proSpecialty={(profile as any)?.pro_specialty ?? null}
            proBusinessName={(profile as any)?.pro_business_name ?? null}
            proTagline={(profile as any)?.pro_tagline ?? null}
            proPricingNote={(profile as any)?.pro_pricing_note ?? null}
            isAvailable={isAvailable}
            avgRating={heroAvg}
            reviewCount={heroCount}
            replyMedianMinutes={sitterProfile?.reply_median_minutes ?? null}
            statutGardien={reputation?.statut_gardien ?? null}
            identityVerified={!!profile?.identity_verified}
            hasActiveSubscription={hasActiveSubscription}
            emergencyActive={emergencyActive}
            hasSitterProfile={hasSitterProfile}
            hasOwnerProfile={hasOwnerProfile}
            roleTabActive={activeTab}
            cta={heroCta}
            ctaReassurance={heroCtaReassurance}
          />
        );

      })()}

      {/* ── BARRE D'ONGLETS, visible si ≥ 2 onglets ── */}
      {availableTabs > 1 && (
        <div className="flex border-b border-border bg-card sticky z-40 max-w-5xl mx-auto" style={{ top: "var(--public-header-h, 0px)" }}>
          {hasSitterProfile && (
            <button
              type="button"
              onClick={() => handleTabChange('gardien')}
              className={[
                'flex items-center gap-2 px-5 py-3.5',
                'text-sm font-medium font-body',
                'border-b-2 transition-all',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
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
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
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
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
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
      {activeTab === 'gardien' && (() => {
        // ── Rail droit (vague 37 Lot 4) : Affinité, Alma, Pouls ─────────
        const redirectTo = `/gardiens/${id}?tab=gardien`;
        const affinityNode = !isAuthenticated
          ? <AffinityTeaserCard sitterFirstName={firstName} redirectTo={redirectTo} />
          : (isOwner && !isOwn && sitterProfile)
            ? (
                <OwnerToSitterAffinity
                  sitterProfile={sitterProfile}
                  context="public_sitter_profile_rail"
                  targetId={id}
                  size="md"
                  scope="single"
                  variant="numeric"
                />
              )
            : null;
        // Alma : UNE phrase pertinente, dérivée de données réelles uniquement.
        let almaPhrase: string | null = null;
        if (avgRating >= 4.5 && reviewCount >= 3) {
          almaPhrase = `${firstName} rassure : ${reviewCount} propriétaires lui donnent ${avgRating.toFixed(1)} sur 5.`;
        } else if (isAvailable) {
          almaPhrase = `${firstName} est disponible en ce moment, c'est le bon moment pour prendre contact.`;
        } else if (completedSits >= 3) {
          almaPhrase = `${firstName} a déjà mené ${completedSits} gardes à leur terme.`;
        } else if (profile?.identity_verified) {
          almaPhrase = `L'identité de ${firstName} a été vérifiée à partir d'une pièce officielle.`;
        }
        const almaNode = !isOwn ? <AlmaWhisperCard phrase={almaPhrase} /> : null;
        // Pouls : chiffres RÉELS. Local via useCityStats trop coûteux ici ; on
        // sert les chiffres globaux depuis useCommunityPulse (déjà en cache).
        const pulseGlobal = communityPulse
          ? [
              { value: communityPulse.maisonsGardees, label: "maisons gardées avec Guardiens" },
              { value: communityPulse.totalInscrits, label: "membres actifs" },
            ]
          : [];
        const pulseNode = <CommunityPulseCard city={city || null} global={pulseGlobal} />;
        const railChildren = (
          <>
            {affinityNode}
            {almaNode}
            {pulseNode}
          </>
        );

        return (
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-8 pb-[calc(10.5rem+env(safe-area-inset-bottom))] md:pb-8">
          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
          {/* ── FLUX NARRATIF UNIFIÉ (vague 37) ────────────────────────────
              Mobile et desktop partagent le même flux vertical. Les onglets
              Radix sont supprimés au profit de sections continues séparées de
              52 px. L'ancre `#confiance` sert désormais aux deux breakpoints. */}
          <div className="space-y-[52px] min-w-0">


            {/* 1. StoryTiles narratives (3 tuiles max, jamais « Non renseigné ») */}
            {(() => {
              const tiles: StoryTileInput[] = [];
              if (animalTypes.length > 0) {
                tiles.push({
                  key: 'animaux',
                  Icon: PawPrint,
                  title: animalTypes.map((a) => ANIMAL_LABELS[a] || a).join(', '),
                  detail: 'Animaux acceptés en garde',
                });
              }
              if (radius || city) {
                const zoneTitle = radius && city
                  ? `${city}, jusqu'à ${radius} km`
                  : radius
                    ? `Jusqu'à ${radius} km autour`
                    : (city as string);
                tiles.push({
                  key: 'zone',
                  Icon: MapPin,
                  title: zoneTitle,
                  detail: hasVehicle ? 'Se déplace avec véhicule' : null,
                });
              }
              const hasAvailabilityHint = Boolean(durationLabel || frequencyLabel || noticeLabel);
              if (isAvailable) {
                tiles.push({
                  key: 'dispo',
                  Icon: CalendarClock,
                  title: 'Disponible maintenant',
                  detail: durationLabel || frequencyLabel || null,
                });
              } else if (hasAvailabilityHint) {
                tiles.push({
                  key: 'dispo',
                  Icon: CalendarClock,
                  title: 'Sur demande',
                  detail: durationLabel || frequencyLabel || null,
                });
              }
              return <StoryTiles tiles={tiles} />;
            })()}

            {/* 2. Qui est {prénom} — bio + motivation + grille de faits */}
            <section aria-label={`À propos de ${firstName}`} className="scroll-mt-20">
              <div className="mb-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-secondary">
                  À propos
                </p>
                <h2 className="font-heading text-[22px] sm:text-[26px] font-semibold text-foreground mt-1 leading-tight">
                  Qui est {firstName}.
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Ses mots, ses habitudes, sa manière de faire.
                </p>
              </div>
              <div className="space-y-6">
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
                    {firstName} n'a pas encore rédigé sa présentation.
                  </p>
                )}
                <PracticalGrid
                  animalTypes={animalTypes}
                  sitterProfile={sitterProfile}
                  radius={radius}
                  city={city}
                  competences={competences}
                  specialSkills={specialSkills}
                  lifestyle={lifestyle}
                  lifePace={lifePace}
                  preferredEnvironments={preferredEnvironments}
                  languages={sitterLanguages}
                  interests={sitterInterests}
                  typeLine={typeLine}
                  durationLabel={durationLabel}
                  frequencyLabel={frequencyLabel}
                  noticeLabel={noticeLabel}
                  mobilityLabel={mobilityLabel}
                  presenceLabel={presenceLabel}
                  experienceLabel={experienceLabel}
                />
                <PublicExperiences experiences={externalExperiences} />
              </div>
            </section>

            {/* 3. Confiance : timeline + badges. Ancre unique #confiance,
                également ciblée par le fallback #confiance-mobile du hero. */}
            {((userBadges && userBadges.length > 0) || profile?.created_at) && (
              <TrustStory
                variant="desktop"
                title={`Ce qui rassure chez ${firstName}.`}
                eyebrow="Confiance"
              >
                <span id="confiance-mobile" aria-hidden="true" />
                <div className="space-y-6">
                  {userBadges && userBadges.length > 0 && (
                    <div id="badges" className="scroll-mt-24 space-y-6">
                      <SpecialBadgeHighlight userBadges={userBadges} />
                      <BadgeRow badges={userBadges} />
                    </div>
                  )}
                  {id && <MissionBadgesReceived profileId={id} />}
                  <TrustTimeline
                    memberSince={profile?.created_at}
                    reviews={reviews}
                    badges={(userBadges || []).map((b: any) => ({
                      badge_id: b.badge_id,
                      created_at: b.created_at,
                      count: b.count ?? 1,
                    }))}
                    completedSits={completedSits}
                    lastActivity={profile?.last_seen_at ?? null}
                    firstName={firstName}
                  />
                </div>
              </TrustStory>
            )}

            {/* 4. Avis — liste réelle ou empty raconté */}
            <section aria-label="Avis reçus" className="scroll-mt-20">
              <div className="mb-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-secondary">
                  Avis
                </p>
                <h2 className="font-heading text-[22px] sm:text-[26px] font-semibold text-foreground mt-1 leading-tight">
                  {sitterRoleCount > 0
                    ? 'Ce que les propriétaires racontent.'
                    : `${firstName} prépare sa première garde.`}
                </h2>
                {sitterRoleCount > 0 ? (
                  <p className="text-sm text-muted-foreground mt-1">
                    {sitterRoleCount} retour{sitterRoleCount > 1 ? 's' : ''} · moyenne {sitterRoleAvg.toFixed(1)}★
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground mt-1">
                    Les premiers retours des propriétaires apparaîtront ici, tels quels.
                  </p>
                )}
              </div>
              {sitterRoleCount > 0 && (() => {
                const filtered = reviewFilter === 'gardes'
                  ? gardeReviews
                  : reviewFilter === 'missions'
                    ? missionReviews
                    : [...sitterRoleReviews].sort((a: any, b: any) =>
                        new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                const chips: Array<{ id: 'all' | 'gardes' | 'missions'; label: string; count: number }> = [
                  { id: 'all', label: 'Tous', count: sitterRoleCount },
                  { id: 'gardes', label: 'Gardes', count: gardeReviews.length },
                  { id: 'missions', label: 'Missions', count: missionReviews.length },
                ];
                return (
                  <>
                    <div className="flex flex-wrap gap-2 mb-4" role="tablist" aria-label="Filtrer les avis">
                      {chips.map((c) => {
                        const active = reviewFilter === c.id;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            onClick={() => setReviewFilter(c.id)}
                            className={[
                              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-body transition-colors',
                              active
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-card text-foreground/70 border-border hover:border-primary/40 hover:text-foreground',
                            ].join(' ')}
                          >
                            {c.label}
                            {c.count > 0 && (
                              <span className={active ? 'opacity-90' : 'text-muted-foreground'}>({c.count})</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    {filtered.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic font-body">
                        Aucun avis dans cette catégorie.
                      </p>
                    ) : (
                      <ReviewGrid
                        reviews={filtered}
                        showAll={showAllGardeReviews}
                        setShowAll={setShowAllGardeReviews}
                        badgesBySitId={badgesBySitId}
                      />
                    )}
                  </>
                );
              })()}
            </section>

            {/* 5. Galerie. Réservée aux membres connectés (décision produit) :
                un visiteur déconnecté voit un encart sobre avec le nombre réel
                de photos et un lien vers l'inscription, jamais les images.
                Sur son propre profil sans photo, un encart invite à en ajouter. */}
            {!hasSession ? (
              galleryCount > 0 && (
                <section aria-label="Galerie" className="scroll-mt-20">
                  <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-secondary">
                      Galerie
                    </p>
                    <h2 className="font-heading text-[22px] sm:text-[26px] font-semibold text-foreground mt-1 leading-tight">
                      {galleryCount} photo{galleryCount > 1 ? "s" : ""} partagée{galleryCount > 1 ? "s" : ""} par {firstName}.
                    </h2>
                    <p className="text-sm text-muted-foreground mt-2 max-w-xl leading-relaxed">
                      Ces photos ne sont visibles que par les membres connectés de Guardiens.
                      C'est une protection pour {firstName} : elles n'apparaissent pas dans les moteurs de recherche.
                    </p>
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-4">
                      <Link
                        to={`/inscription?redirect=/gardiens/${id}`}
                        className="inline-flex items-center text-sm font-medium text-primary underline underline-offset-4 hover:text-primary/80 transition-colors"
                      >
                        Créer un compte pour les voir
                      </Link>
                      <Link
                        to={`/login?redirect=/gardiens/${id}`}
                        className="inline-flex items-center text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors"
                      >
                        Déjà membre ? Connectez-vous
                      </Link>
                    </div>
                  </div>
                </section>
              )
            ) : gallery.length > 0 ? (
              <section aria-label="Galerie" className="scroll-mt-20">
                <div className="mb-5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-secondary">
                    Galerie
                  </p>
                  <h2 className="font-heading text-[22px] sm:text-[26px] font-semibold text-foreground mt-1 leading-tight">
                    Quelques instants de {firstName}.
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Cliquez pour agrandir.
                  </p>
                </div>
                <GallerySimple visibleGallery={visibleGallery} setLightboxIdx={setLightboxIdx} />
              </section>
            ) : isOwn ? (
              <section aria-label="Galerie" className="scroll-mt-20">
                <div className="rounded-2xl border border-dashed border-border bg-card p-5 sm:p-6">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-secondary">
                    Galerie
                  </p>
                  <h2 className="font-heading text-[22px] sm:text-[26px] font-semibold text-foreground mt-1 leading-tight">
                    Montrez-vous, c'est ce qui rassure.
                  </h2>
                  <p className="text-sm text-muted-foreground mt-2 max-w-xl leading-relaxed">
                    Un gardien avec des photos est choisi, un gardien sans photo ne l'est presque jamais.
                    Ajoutez plusieurs instants : vous avec des animaux, votre quotidien, vos expériences de garde.
                  </p>
                  <p className="text-sm text-muted-foreground mt-2 max-w-xl leading-relaxed">
                    Vos photos ne sont visibles que par les membres connectés de Guardiens.
                    Elles n'apparaissent pas dans les moteurs de recherche.
                  </p>
                  <Link
                    to="/profile"
                    className="inline-flex items-center mt-4 text-sm font-medium text-primary underline underline-offset-4 hover:text-primary/80 transition-colors"
                  >
                    Ajouter des photos à mon profil
                  </Link>
                </div>
              </section>
            ) : null}
            {/* Rail INLINE (mobile) : les mêmes cartes que le rail sticky
                desktop, empilées en fin de flux. Masqué en desktop où le rail
                sticky à droite prend le relais. */}
            <div className="lg:hidden">
              <ProfileRail inline>{railChildren}</ProfileRail>
            </div>
          </div>

          {/* Rail STICKY (desktop ≥ lg) — 340 px, aligné haut, self-start. */}
          <ProfileRail>{railChildren}</ProfileRail>
          </div>
          {/* CTA sticky mobile : unifié en dehors des onglets (vague 38). */}

        </div>
        );
      })()}



      {/* ── ONGLET PROPRIO — flux narratif miroir vague 37 (vague 38) ── */}
      {activeTab === 'proprio' && (() => {
        // Rail droit contextuel : affinité miroir (sitter → owner) + Alma + Pouls.
        const redirectTo = `/gardiens/${id}?tab=proprio`;
        const proprioAffinityNode = !isAuthenticated
          ? <AffinityTeaserCard sitterFirstName={firstName} redirectTo={redirectTo} />
          : (isSitter && !isOwn && viewerSitter && targetOwnerAffinity)
            ? (
                <AffinitySection
                  sitterProfile={viewerSitter}
                  ownerProfile={targetOwnerAffinity as any}
                  pets={targetPets as any}
                  context="public_owner_profile_rail"
                  targetId={id}
                  showCtaForSitter={false}
                />
              )
            : null;
        // Alma proprio : une phrase dérivée de vraies données seulement.
        //   (ownerAvg est déjà calculé au niveau composant à partir des avis dérivés.)
        let proprioAlmaPhrase: string | null = null;
        if (ownerAvg >= 4.5 && ownerReviews.length >= 3) {
          proprioAlmaPhrase = `${firstName} rassure : ${ownerReviews.length} gardiens lui donnent ${ownerAvg.toFixed(1)} sur 5.`;
        } else if (pets.length > 0 && ownerSitsTotal > 0) {
          proprioAlmaPhrase = `${firstName} a déjà accueilli des gardiens pour ${pets.length > 1 ? 'ses animaux' : 'son animal'}.`;
        } else if (profile?.identity_verified) {
          proprioAlmaPhrase = `L'identité de ${firstName} a été vérifiée à partir d'une pièce officielle.`;
        }
        const proprioAlmaNode = !isOwn ? <AlmaWhisperCard phrase={proprioAlmaPhrase} /> : null;
        const pulseGlobal = communityPulse
          ? [
              { value: communityPulse.maisonsGardees, label: "maisons gardées avec Guardiens" },
              { value: communityPulse.totalInscrits, label: "membres actifs" },
            ]
          : [];
        const proprioRailChildren = (
          <>
            {proprioAffinityNode}
            {proprioAlmaNode}
            <CommunityPulseCard city={city || null} global={pulseGlobal} />
          </>
        );

        // Tuiles narratives, jamais « Non renseigné »
        const tiles: StoryTileInput[] = [];
        if (pets.length > 0) {
          const speciesSet = Array.from(new Set(pets.map((p: any) => p.species).filter(Boolean)));
          const speciesLabel = speciesSet
            .map((s: any) => ANIMAL_LABELS[s as string] || s)
            .join(', ');
          tiles.push({
            key: 'animaux',
            Icon: PawPrint,
            title: `${pets.length} animal${pets.length > 1 ? 'x' : ''} au foyer`,
            detail: speciesLabel || null,
          });
        }
        const envLabel = (ownerProfile?.environments ?? [])
          .map((e) => ENV_LABELS[e] || e)
          .join(', ');
        if (envLabel || city) {
          tiles.push({
            key: 'env',
            Icon: Home,
            title: envLabel && city ? `${envLabel} à ${city}` : (envLabel || (city as string)),
            detail: null,
          });
        }
        if (profile?.created_at) {
          tiles.push({
            key: 'anciennete',
            Icon: CalendarClock,
            title: `Membre depuis ${anciennete(profile.created_at)}`,
            detail: ownerSitsTotal > 0
              ? `${ownerSitsTotal} garde${ownerSitsTotal > 1 ? 's' : ''} publiée${ownerSitsTotal > 1 ? 's' : ''}`
              : null,
          });
        }

        return (
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-8 pb-[calc(10.5rem+env(safe-area-inset-bottom))] md:pb-8">
          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
            <div className="space-y-[52px] min-w-0">

              <StoryTiles tiles={tiles} />

              {/* Son mot d'accueil */}
              <section aria-label={`Mot d'accueil de ${firstName}`} className="scroll-mt-20">
                <div className="mb-5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-secondary">
                    Bienvenue
                  </p>
                  <h2 className="font-heading text-[22px] sm:text-[26px] font-semibold text-foreground mt-1 leading-tight">
                    Son mot d'accueil.
                  </h2>
                </div>
                {ownerProfile?.welcome_notes || bio ? (
                  <div className="space-y-4 max-w-2xl">
                    {ownerProfile?.welcome_notes && (
                      <p className="text-base text-foreground leading-relaxed font-body whitespace-pre-line">
                        {sanitizeBioForPublic(ownerProfile.welcome_notes)}
                      </p>
                    )}
                    {bio && bio !== ownerProfile?.welcome_notes && (
                      <p className="text-sm text-foreground/75 leading-relaxed font-body whitespace-pre-line">
                        {bio}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic font-body">
                    {firstName} n'a pas encore rédigé son mot d'accueil.
                  </p>
                )}
                {(ownerProfile?.competences?.length ?? 0) > 0 && (
                  <div className="mt-6 space-y-2">
                    <p className="text-xs uppercase tracking-widest text-foreground/50 font-body">Savoir-faire</p>
                    <div className="flex flex-wrap gap-1.5">
                      {ownerProfile?.competences?.map((c: string) => (
                        <span key={c} className="border border-border bg-card rounded-full text-xs px-2.5 py-1 text-foreground/80 font-body">{c}</span>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              {/* Ses animaux */}
              <section aria-label={`Animaux de ${firstName}`} className="scroll-mt-20">
                <div className="mb-5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-secondary">
                    Foyer
                  </p>
                  <h2 className="font-heading text-[22px] sm:text-[26px] font-semibold text-foreground mt-1 leading-tight">
                    Ses animaux.
                  </h2>
                </div>
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
                            <img src={avatarImageUrl(pet.photo_url, 96)} alt={pet.name} className="w-12 h-12 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center shrink-0">
                              <PawPrint className="w-5 h-5 text-foreground/30" aria-hidden="true" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-heading font-semibold text-foreground text-sm truncate">{pet.name}</p>
                            <p className="text-xs text-foreground/60 font-body truncate">
                              {[petSpeciesLabel(pet.species), pet.breed, ageLabel].filter(Boolean).join(' · ')}
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
                  <p className="text-sm text-muted-foreground italic font-body">
                    Les compagnons de {firstName} apparaîtront ici.
                  </p>
                )}
              </section>

              {/* Ses annonces */}
              <section aria-label={`Annonces de ${firstName}`} className="scroll-mt-20">
                <div className="mb-5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-secondary">
                    Annonces
                  </p>
                  <h2 className="font-heading text-[22px] sm:text-[26px] font-semibold text-foreground mt-1 leading-tight">
                    Ses annonces.
                  </h2>
                </div>
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
                      const sitHref = `/annonces/${sit.slug && String(sit.slug).trim().length > 0 ? sit.slug : sit.id}`;
                      return (
                        <Link
                          key={sit.id}
                          to={sitHref}
                          className={`flex items-center gap-3 bg-card border border-border rounded-xl px-3 py-2.5 hover:border-primary/40 hover:bg-muted/30 transition-colors ${isPast ? 'opacity-60' : ''}`}
                        >
                          {sit.cover_photo_url ? (
                            <img src={sit.cover_photo_url} alt="" loading="lazy" className="w-14 h-14 rounded-lg object-cover shrink-0" />
                          ) : (
                            <div className="w-14 h-14 rounded-lg bg-muted shrink-0 flex items-center justify-center text-foreground/30">
                              <Home className="h-5 w-5" aria-hidden="true" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground font-body truncate">{sit.title || 'Garde'}</p>
                            <p className="text-xs text-foreground/50 font-body mt-0.5 truncate">
                              {sit.city ? `${sit.city} · ` : ''}
                              {sit.start_date && fmt(sit.start_date)}{sit.end_date && ` → ${fmt(sit.end_date)}`}
                            </p>
                          </div>
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 font-body whitespace-nowrap ${s.style}`}>
                            {s.label}
                          </span>
                        </Link>
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
                ) : archivedSits.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic font-body">
                    {firstName} prépare sa première annonce.
                  </p>
                ) : null}
              </section>

              {/* Ses gardes passées (annonces archivées, non annulées) */}
              {archivedSits.length > 0 && (
                <section aria-label={`Gardes passées de ${firstName}`} className="scroll-mt-20">
                  <div className="mb-5">
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-secondary">
                      Historique
                    </p>
                    <h2 className="font-heading text-[22px] sm:text-[26px] font-semibold text-foreground mt-1 leading-tight">
                      Ses gardes passées.
                    </h2>
                  </div>
                  <div className="space-y-2">
                    {archivedSits.map((sit: any) => {
                      const slug = sit.slug && String(sit.slug).trim().length > 0 ? sit.slug : sit.id;

                      const href = `/annonces/${slug}`;
                      return (
                        <Link
                          key={sit.id}
                          to={href}
                          className="flex items-center gap-3 bg-card border border-border rounded-xl px-3 py-2.5 opacity-70 hover:opacity-100 hover:border-primary/40 hover:bg-muted/30 transition-all"
                        >
                          {sit.cover_photo_url ? (
                            <img src={sit.cover_photo_url} alt="" loading="lazy" className="w-14 h-14 rounded-lg object-cover shrink-0" />
                          ) : (
                            <div className="w-14 h-14 rounded-lg bg-muted shrink-0 flex items-center justify-center text-foreground/30">
                              <Home className="h-5 w-5" aria-hidden="true" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground font-body truncate">{sit.title || 'Garde'}</p>
                            {sit.city && (
                              <p className="text-xs text-foreground/50 font-body mt-0.5 truncate">
                                {sit.city}
                              </p>
                            )}

                          </div>
                          <span className="text-xs font-medium px-2.5 py-1 rounded-full shrink-0 font-body whitespace-nowrap bg-muted text-foreground/60">
                            Archivée
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Confiance (miroir) */}
              {((userBadges && userBadges.length > 0) || profile?.created_at) && (
                <TrustStory
                  variant="desktop"
                  title={`Ce qui rassure chez ${firstName}.`}
                  eyebrow="Confiance"
                >
                  <span id="confiance-mobile" aria-hidden="true" />
                  <div className="space-y-6">
                    {userBadges && userBadges.length > 0 && (
                      <div id="badges" className="scroll-mt-24 space-y-6">
                        <SpecialBadgeHighlight userBadges={userBadges} />
                        <BadgeRow badges={userBadges} />
                      </div>
                    )}
                    {id && <MissionBadgesReceived profileId={id} />}
                    <TrustTimeline
                      memberSince={profile?.created_at}
                      reviews={ownerReviews as any}
                      badges={(userBadges || []).map((b: any) => ({
                        badge_id: b.badge_id,
                        created_at: b.created_at,
                        count: b.count ?? 1,
                      }))}
                      completedSits={ownerSitsTotal}
                      lastActivity={null}
                      firstName={firstName}
                    />
                  </div>
                </TrustStory>
              )}

              {/* Les avis */}
              <section aria-label="Avis reçus" className="scroll-mt-20">
                <div className="mb-5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-secondary">
                    Avis
                  </p>
                  <h2 className="font-heading text-[22px] sm:text-[26px] font-semibold text-foreground mt-1 leading-tight">
                    {ownerReviews.length > 0
                      ? 'Ce que les gardiens racontent.'
                      : `${firstName} accueillera son premier gardien bientôt.`}
                  </h2>
                  {ownerReviews.length > 0 && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {ownerReviews.length} retour{ownerReviews.length > 1 ? 's' : ''} · moyenne {ownerAvg.toFixed(1)}★
                    </p>
                  )}
                </div>
                {ownerDataLoading ? (
                  <div className="space-y-3" aria-busy="true">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="bg-card border border-border rounded-xl p-4 space-y-2">
                        <div className="flex items-center gap-2.5">
                          <Skeleton className="h-8 w-8 rounded-full" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                        <Skeleton className="h-3 w-full" />
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
                            {getMemberAvatarUrl(review.reviewer) ? (
                              <img src={avatarImageUrl(getMemberAvatarUrl(review.reviewer), 64)} alt={getMemberPublicFirstName(review.reviewer, 'Gardien')} className="w-8 h-8 rounded-full object-cover shrink-0" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-muted shrink-0 flex items-center justify-center text-xs font-bold text-foreground/40">
                                {getMemberInitial(review.reviewer)}
                              </div>
                            )}
                            <span className="text-sm font-medium text-foreground font-body">{getMemberPublicFirstName(review.reviewer, 'Gardien')}</span>

                            {stars > 0 && (
                              <span className="text-xs text-primary font-body tracking-wider" aria-label={`${stars} étoiles sur 5`}>
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
                  <p className="text-sm text-muted-foreground italic font-body">
                    Les premiers retours des gardiens apparaîtront ici.
                  </p>
                )}
                {missionFeedbacks.length > 0 && (
                  <div className="mt-6 space-y-3 border-t border-border/50 pt-5">
                    <p className="text-xs uppercase tracking-widest text-foreground/50 font-body">
                      Avis d'entraide ({missionFeedbacks.length})
                    </p>
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
                  </div>
                )}
              </section>

              {/* Galerie propriétaire, uniquement si contenu */}
              {ownerGalleryPhotos.length > 0 && (
                <section aria-label="Galerie du foyer" className="scroll-mt-20">
                  <div className="mb-5">
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-secondary">
                      Galerie
                    </p>
                    <h2 className="font-heading text-[22px] sm:text-[26px] font-semibold text-foreground mt-1 leading-tight">
                      Quelques instants du foyer.
                    </h2>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {ownerGalleryPhotos.map((photo, i) => (
                      <div key={photo.id} className="group relative rounded-xl overflow-hidden aspect-square">
                        <img
                          src={storageImageUrl(photo.photo_url, { width: 386, height: 386 })}
                          alt={photo.caption || `Photo ${i + 1} du foyer de ${firstName}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Rail inline mobile */}
              <div className="lg:hidden">
                <ProfileRail inline>{proprioRailChildren}</ProfileRail>
              </div>
            </div>

            {/* Rail sticky desktop */}
            <ProfileRail>{proprioRailChildren}</ProfileRail>
          </div>
        </div>
        );
      })()}



      {/* ── ONGLET ENTRAIDE ── */}
      {activeTab === 'entraide' && (
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-10">

          {entraideLoading && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3" aria-busy="true">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))}
            </div>
          )}

          {!entraideLoading && (missionsPublished.length > 0 || missionsHelped.length > 0 || missionFeedbacks.length > 0 || thanksReceived > 0) && (
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
            {entraideLoading ? (
              <div className="space-y-2" aria-busy="true">
                {[0, 1, 2].map((i) => (<Skeleton key={i} className="h-12 rounded-xl" />))}
              </div>
            ) : missionsPublished.length > 0 ? (
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
            {entraideLoading ? (
              <div className="space-y-2" aria-busy="true">
                {[0, 1, 2].map((i) => (<Skeleton key={i} className="h-12 rounded-xl" />))}
              </div>
            ) : missionsHelped.length > 0 ? (
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
            {entraideLoading ? (
              <div className="space-y-3" aria-busy="true">
                {[0, 1].map((i) => (<Skeleton key={i} className="h-20 rounded-xl" />))}
              </div>
            ) : missionFeedbacks.length > 0 ? (
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

          {!entraideLoading && missionsPublished.length === 0 && missionsHelped.length === 0 && missionFeedbacks.length === 0 && (
            <div className="text-center py-12 space-y-2">
              <p className="text-base text-foreground/50 font-body">Pas encore de missions d'entraide.</p>
              <p className="text-sm text-foreground/40 font-body italic">Les échanges de services apparaîtront ici après la première mission.</p>
            </div>
          )}

        </div>
      )}

      {/* ── CTA sticky mobile UNIFIÉ (vague 38) ──
          Mirroir strict du CTA hero courant (facette active), gaté par
          IntersectionObserver : n'apparaît que si le hero est hors écran.
          Un seul bloc, jamais deux CTA concurrents. */}
      {!heroCtaVisible && (() => {
        const baseCls =
          "md:hidden fixed left-0 right-0 z-40 bg-background border-t border-border px-3 sm:px-4 pt-2.5 sm:pt-3 pb-[calc(env(safe-area-inset-bottom)+0.625rem)] shadow-lg bottom-[var(--bottom-nav-h,0px)]";
        const btnCls =
          "flex items-center justify-center bg-primary text-primary-foreground rounded-lg px-3 sm:px-4 py-3 text-[13px] sm:text-sm font-medium w-full leading-tight text-center break-words";
        const mutedCls =
          "flex items-center justify-center bg-muted text-muted-foreground rounded-lg px-4 py-3 text-sm font-medium w-full opacity-70 cursor-not-allowed";
        if (heroCta.kind === "own") return null;
        if (heroCta.kind === "muted") {
          return (
            <div className={baseCls}>
              <button type="button" disabled aria-disabled="true" className={mutedCls} title={heroCta.hint}>
                {heroCta.label}
              </button>
            </div>
          );
        }
        if (heroCta.kind === "unauthenticated") {
          return (
            <div className={baseCls}>
              <Link to={heroCta.signupHref} className={btnCls}>
                <span className="line-clamp-2">{heroCta.label ?? `S'inscrire pour contacter ${firstName}`}</span>
              </Link>
            </div>
          );
        }
        if (heroCta.kind === "owner") {
          return (
            <div className={baseCls}>
              <button type="button" onClick={heroCta.onContact} className={btnCls}>
                <span className="line-clamp-2">{heroCta.label ?? `Contacter ${firstName}`}</span>
              </button>
            </div>
          );
        }
        return (
          <div className={baseCls}>
            <button type="button" onClick={heroCta.onActivate} className={btnCls}>
              <span className="line-clamp-2">{heroCta.label ?? `Contacter ${firstName}`}</span>
            </button>
          </div>
        );
      })()}


      {/* ── Lightbox ── */}
      {lightboxIdx !== null && lightboxIdx < lightboxItems.length && (
        <div
          ref={lightboxRef}
          role="dialog"
          aria-modal="true"
          aria-label={`Photo ${lightboxIdx + 1} sur ${lightboxItems.length}`}
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center"
          onClick={() => setLightboxIdx(null)}
        >
          {/* Fermeture : pastille sombre semi-opaque, lisible sur toute photo. */}
          <button
            type="button"
            aria-label="Fermer la galerie"
            className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10 inline-flex items-center justify-center rounded-full bg-black/60 text-white ring-1 ring-white/40 backdrop-blur-sm p-2 hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            onClick={(e) => { e.stopPropagation(); setLightboxIdx(null); }}
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
          {lightboxItems.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Photo précédente"
                className="absolute left-4 z-10 inline-flex items-center justify-center rounded-full bg-black/60 text-white ring-1 ring-white/40 backdrop-blur-sm p-2 hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                onClick={(e) => { e.stopPropagation(); setLightboxIdx(wrapIndex(lightboxIdx - 1, lightboxItems.length)); }}
              >
                <ChevronLeft className="w-7 h-7" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="Photo suivante"
                className="absolute right-4 z-10 inline-flex items-center justify-center rounded-full bg-black/60 text-white ring-1 ring-white/40 backdrop-blur-sm p-2 hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                onClick={(e) => { e.stopPropagation(); setLightboxIdx(wrapIndex(lightboxIdx + 1, lightboxItems.length)); }}
              >
                <ChevronRight className="w-7 h-7" aria-hidden="true" />
              </button>
            </>
          )}
          <div className="flex flex-col items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <img
              src={storageImageUrl(
                lightboxItems[lightboxIdx]?.photo_url,
                // Plafond d'ingestion du bucket source : 1024 pour les avatars,
                // 1600 pour la galerie. Au-delà, l'endpoint n'a rien à servir.
                lightboxItems[lightboxIdx]?.kind === "avatar"
                  ? { width: 1024, height: 1024, resize: "contain" }
                  : { width: 1600, height: 1600, resize: "contain" },
              )}
              alt={
                lightboxItems[lightboxIdx]?.kind === "avatar"
                  ? `Photo de profil de ${profile?.first_name || "ce gardien"}`
                  : lightboxItems[lightboxIdx]?.caption || `Photo ${lightboxIdx + 1} du profil de ${profile?.first_name || "ce gardien"}`
              }
              className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg"
            />
            {lightboxItems[lightboxIdx]?.source === "guardiens" && (
              <span className="text-xs tracking-wide text-white/70">Photo prise pendant une garde</span>
            )}
          </div>
          {/* Compteur de position, discret mais toujours présent. */}
          <div
            aria-hidden="true"
            className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-sm text-white/90 ring-1 ring-white/20 backdrop-blur-sm"
          >
            {lightboxIdx + 1} / {lightboxItems.length}
          </div>
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

      <ActivateRoleDialog
        open={activateProprioIntent !== null}
        onClose={() => setActivateProprioIntent(null)}
        targetRole="proprio"
        contactContext={activateProprioIntent ?? undefined}
      />

      <ActivateRoleDialog
        open={activateGardienOpen}
        onClose={() => setActivateGardienOpen(false)}
        targetRole="gardien"
      />

      </div>
    </div>
  );
}
