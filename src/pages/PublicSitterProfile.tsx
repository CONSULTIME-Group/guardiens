import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import BadgeTimbre, { TIMBRES_ORDER } from "@/components/badges/BadgeTimbre";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Car, MapPin, X,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const SITE_URL = "https://guardiens.fr";

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

export default function PublicSitterProfile() {
  const { id } = useParams<{ id: string }>();
  const auth = useAuth();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [sitterProfile, setSitterProfile] = useState<any>(null);
  const [badges, setBadges] = useState<{ badge_key: string; count: number }[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewCount, setReviewCount] = useState(0);
  const [gallery, setGallery] = useState<any[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [emergencyActive, setEmergencyActive] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      const [profileRes, sitterRes, badgesRes, reviewsRes, galleryRes, emergencyRes] =
        await Promise.all([
          supabase.from("profiles").select("*").eq("id", id).single(),
          supabase.from("sitter_profiles").select("*").eq("user_id", id).single(),
          supabase.from("badge_attributions").select("badge_key").eq("receiver_id", id),
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
          supabase.from("emergency_sitter_profiles").select("is_active").eq("user_id", id).single(),
        ]);

      if (profileRes.data) setProfile(profileRes.data);
      if (sitterRes.data) setSitterProfile(sitterRes.data);
      if (galleryRes.data) setGallery(galleryRes.data);
      if (emergencyRes.data) setEmergencyActive(emergencyRes.data.is_active);

      if (badgesRes.data) {
        const map: Record<string, number> = {};
        badgesRes.data.forEach((b: any) => {
          map[b.badge_key] = (map[b.badge_key] || 0) + 1;
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
      }

      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">
          <Skeleton className="w-full h-[320px] rounded-none" />
          <Skeleton className="h-8 w-48 mx-auto" />
        </div>
      </div>
    );
  }

  if (!profile) {
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

  const firstName = capitalize(profile.first_name || "");
  const city = profile.city || "";
  const bio = profile.bio || "";
  const motivation = sitterProfile?.motivation || "";
  const animalTypes: string[] = sitterProfile?.animal_types || [];
  const hasVehicle = sitterProfile?.has_vehicle || false;
  const rawRadius = sitterProfile?.geographic_radius || 0;
  const completedSits = profile.completed_sits_count || 0;
  const cancellations = profile.cancellation_count || 0;
  const radius = (rawRadius === 100 && completedSits === 0) ? 15 : rawRadius;
  const isOwn = auth?.user?.id === id;
  const isAuthenticated = auth?.isAuthenticated;
  const isOwner = auth?.activeRole === "owner";
  const isSitter = auth?.activeRole === "sitter";
  const isAvailable = sitterProfile?.is_available || false;

  const sitterType = sitterProfile?.sitter_type || "";
  const accompaniedBy = sitterProfile?.accompanied_by || "";
  const lifestyle: string[] = sitterProfile?.lifestyle || [];
  const minDuration: number = sitterProfile?.min_duration || 0;
  const preferredEnvironments: string[] = sitterProfile?.preferred_environments || [];

  const badgeMap: Record<string, boolean> = {};
  badges.forEach(b => { badgeMap[b.badge_key] = true; });
  if (profile?.identity_verified) badgeMap["id_verifiee"] = true;
  if (profile?.is_founder) badgeMap["fondateur"] = true;
  if (emergencyActive) badgeMap["gardien_urgence"] = true;
  const unlockedCount = TIMBRES_ORDER.filter(k => badgeMap[k]).length;
  const totalBadgeCount = badges.reduce((s, b) => s + b.count, 0);

  const activeBadgeKeys = ["id_verifiee", "fondateur", "gardien_urgence"].filter(k => badgeMap[k]);

  const visibleReviews = reviews.slice(0, 5);
  const visibleGallery = gallery.slice(0, 9);

  const showCTA = !(isOwn || (isAuthenticated && isSitter));

  // SEO
  const animalLabels = animalTypes.map(a => ANIMAL_LABELS[a] || a).join(", ");
  const pageTitle = `${firstName} — Gardien à ${city || "France"} | Guardiens`;
  const pageDesc = `${firstName} garde des ${animalLabels || "animaux"} à ${city || "France"} dans un rayon de ${radius}km. Profil vérifié sur Guardiens.fr.`;
  const pageUrl = `${SITE_URL}/gardiens/${id}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: firstName,
    address: { "@type": "PostalAddress", addressLocality: city, addressCountry: "FR" },
    description: motivation || bio,
    url: pageUrl,
  };

  // Sitter type + accompanied label
  const typeLabel = SITTER_TYPE_LABELS[sitterType] || sitterType;
  const accompLabel = accompaniedBy ? `avec ${accompaniedBy}` : "";
  const typeLineItems = [typeLabel, accompLabel].filter(Boolean);
  const typeLine = typeLineItems.length > 0 ? typeLineItems.join(" · ") : "";

  const durationLabel = minDuration > 0
    ? (MIN_DURATION_LABELS[minDuration] || `À partir de ${minDuration} jours`)
    : "";

  // Stats line
  const statsItems: string[] = [];
  statsItems.push(`${completedSits} garde${completedSits !== 1 ? "s" : ""}`);
  statsItems.push(avgRating > 0 ? `${avgRating} ★` : "Pas encore");
  statsItems.push(`${totalBadgeCount} écusson${totalBadgeCount !== 1 ? "s" : ""}`);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDesc} />
        <link rel="canonical" href={pageUrl} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDesc} />
        {profile.avatar_url && <meta property="og:image" content={profile.avatar_url} />}
        <meta property="og:url" content={pageUrl} />
        <meta property="og:type" content="profile" />
        <meta property="og:site_name" content="Guardiens" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDesc} />
        {profile.avatar_url && <meta name="twitter:image" content={profile.avatar_url} />}
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      {/* ── HERO ── */}
      <div className="relative w-full h-[260px] md:h-[320px] overflow-hidden bg-muted">
        {profile.avatar_url && (
          <img
            src={profile.avatar_url}
            alt={firstName}
            className="absolute inset-0 w-full h-full object-cover object-top"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/20 to-black/70" />

        {/* Back link */}
        <Link
          to="/recherche-gardiens"
          className="absolute top-4 left-6 text-sm text-white/80 hover:text-white z-10"
        >
          ← Retour aux gardiens
        </Link>

        {/* Hero content */}
        <div className="absolute bottom-0 left-0 right-0 px-6 md:px-8 pb-6 md:pb-8 flex flex-col gap-1">
          {isAvailable && (
            <span className="self-start bg-primary text-white text-xs px-3 py-1 rounded-full mb-1">
              Disponible
            </span>
          )}

          {activeBadgeKeys.length > 0 && (
            <div className="flex gap-2 mb-1">
              {activeBadgeKeys.map(k => (
                <div key={k} style={{ filter: 'brightness(0) invert(1)' }}>
                  <BadgeTimbre id={k} unlocked size="compact" showTooltip={false} />
                </div>
              ))}
            </div>
          )}

          <h1 className="text-3xl md:text-4xl font-bold text-white">
            {firstName}
          </h1>

          {city && (
            <p className="text-sm text-white/70 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {city}
            </p>
          )}

          <p className="text-sm text-white/80">
            {statsItems.join(" · ")}
          </p>

          {completedSits > 0 && cancellations > 0 && (
            <p className="text-xs text-white/60">
              {cancellations} annulation{cancellations > 1 ? "s" : ""}
            </p>
          )}
        </div>
      </div>

      {/* ── BODY — TWO COLUMNS ── */}
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 md:py-10 flex flex-col md:flex-row gap-8 md:gap-10 items-start">

        {/* ── LEFT COLUMN ── */}
        <div className="w-full md:w-[300px] md:shrink-0 md:sticky md:top-8">
          <div className="bg-card rounded-2xl border border-border p-6 space-y-5">

            {/* Lifestyle */}
            {lifestyle.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Style de vie</p>
                <div className="flex flex-wrap gap-1.5">
                  {lifestyle.map(l => (
                    <span key={l} className="border border-border rounded-full text-xs px-2 py-0.5 text-foreground">
                      {l}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Type + accompanied */}
            {typeLine && (
              <p className="text-sm text-muted-foreground">{typeLine}</p>
            )}

            {/* Min duration */}
            {durationLabel && (
              <p className="text-sm text-muted-foreground">{durationLabel}</p>
            )}

            {/* Preferred environments */}
            {preferredEnvironments.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Environnements</p>
                <div className="flex flex-wrap gap-1.5">
                  {preferredEnvironments.map(e => (
                    <span key={e} className="border border-border rounded-full text-xs px-2 py-0.5 text-foreground">
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
                  <Link
                    to={`/inscription?redirect=/gardiens/${id}`}
                    className="block bg-primary text-white rounded-xl py-3 text-sm font-medium w-full text-center"
                  >
                    S'inscrire pour contacter
                  </Link>
                )}
                {isAuthenticated && isOwner && (
                  <Link
                    to={`/messagerie?gardien=${id}`}
                    className="block bg-primary text-white rounded-xl py-3 text-sm font-medium w-full text-center"
                  >
                    Contacter {firstName}
                  </Link>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="flex-1 space-y-10 min-w-0">

          {/* Motivation */}
          {motivation && (
            <p className="text-xl font-semibold leading-relaxed text-foreground/85">
              {motivation}
            </p>
          )}

          {/* Bio */}
          {bio && (
            <p className="text-sm italic text-muted-foreground">{bio}</p>
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
              {(hasVehicle || radius > 0) && (
                <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                  {hasVehicle ? (
                    <>
                      <Car className="w-4 h-4" />
                      <span>Avec véhicule — rayon {radius}km</span>
                    </>
                  ) : radius > 0 ? (
                    <>
                      <MapPin className="w-4 h-4" />
                      <span>Rayon {radius}km</span>
                    </>
                  ) : null}
                </div>
              )}
            </div>
          )}

          {/* Collection de timbres */}
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Sa collection</p>
            <div className="grid grid-cols-6 gap-2">
              {TIMBRES_ORDER.map(key => (
                <div key={key} className="flex justify-center">
                  <BadgeTimbre id={key} unlocked={!!badgeMap[key]} size="compact" showTooltip />
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {unlockedCount} timbre{unlockedCount > 1 ? "s" : ""} sur 12
            </p>
          </div>

          {/* Avis */}
          {reviewCount > 0 && (
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
                Avis ({reviewCount})
              </p>
              <div className="space-y-3">
                {visibleReviews.map((r: any) => (
                  <div key={r.id} className="bg-card border border-border rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Avatar className="w-8 h-8">
                        {r.reviewer?.avatar_url ? (
                          <AvatarImage src={r.reviewer.avatar_url} />
                        ) : null}
                        <AvatarFallback className="text-xs bg-muted">
                          {capitalize(r.reviewer?.first_name || "?").charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-foreground">
                        {capitalize(r.reviewer?.first_name || "")}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(r.created_at), "MMMM yyyy", { locale: fr })}
                      </span>
                      {r.overall_rating && (
                        <span className="text-xs text-amber-600 ml-auto">★ {r.overall_rating}/5</span>
                      )}
                    </div>
                    {r.comment && (
                      <p className="text-sm text-foreground/80 italic">{r.comment}</p>
                    )}
                  </div>
                ))}
              </div>
              {reviewCount > 5 && (
                <p className="text-xs text-primary hover:underline mt-3 cursor-pointer">
                  Voir tous les avis →
                </p>
              )}
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
  );
}
