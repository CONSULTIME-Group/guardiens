import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import BadgeTimbre, { TIMBRES_ORDER } from "@/components/badges/BadgeTimbre";
import BadgeShield from "@/components/badges/BadgeShield";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Car, MapPin, Quote, ExternalLink, X,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const SITE_URL = "https://guardiens.fr";

const capitalize = (name: string) =>
  name ? name.charAt(0).toUpperCase() + name.slice(1).toLowerCase() : "";

/* ── Animal labels ── */
const ANIMAL_LABELS: Record<string, string> = {
  dog: "Chiens", cat: "Chats", bird: "Oiseaux", fish: "Poissons",
  reptile: "Reptiles", rabbit: "Lapins", horse: "Chevaux",
  rodent: "Rongeurs", nac: "NAC", farm: "Animaux de ferme",
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

      // Aggregate badges
      if (badgesRes.data) {
        const map: Record<string, number> = {};
        badgesRes.data.forEach((b: any) => {
          map[b.badge_key] = (map[b.badge_key] || 0) + 1;
        });
        setBadges(Object.entries(map).map(([badge_key, count]) => ({ badge_key, count })));
      }

      // Reviews
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
          <Skeleton className="w-32 h-32 rounded-full mx-auto" />
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
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
  const bio = sitterProfile?.motivation || profile.bio || "";
  const whySitter = sitterProfile?.motivation && profile.bio ? profile.bio : "";
  const animalTypes: string[] = sitterProfile?.animal_types || [];
  const hasVehicle = sitterProfile?.has_vehicle || false;
  const radius = sitterProfile?.geographic_radius || 0;
  const competences: string[] = sitterProfile?.competences || [];
  const isAvailable = sitterProfile?.is_available || false;
  const completedSits = profile.completed_sits_count || 0;
  const cancellations = profile.cancellation_count || 0;
  const isOwn = auth?.user?.id === id;
  const isOwner = auth?.activeRole === "owner";
  const isAuthenticated = auth?.isAuthenticated;

  const visibleReviews = reviews.slice(0, 5);
  const visibleGallery = gallery.slice(0, 9);

  /* ── SEO ── */
  const pageTitle = `${firstName}, gardien de maison à ${city || "France"} — Guardiens`;
  const pageDesc = `Découvrez le profil de ${firstName}, gardien de maison et pet-sitter à ${city || "France"}. ${completedSits} garde${completedSits > 1 ? "s" : ""} réalisée${completedSits > 1 ? "s" : ""} sur Guardiens.`;
  const pageUrl = `${SITE_URL}/gardiens/${id}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: firstName,
    address: {
      "@type": "PostalAddress",
      addressLocality: city,
      addressCountry: "FR",
    },
    description: bio,
    knowsAbout: competences,
    url: pageUrl,
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDesc} />
        <link rel="canonical" href={pageUrl} />
        <meta property="og:title" content={`${firstName} — Gardien Guardiens`} />
        <meta property="og:description" content={`${firstName} garde des maisons et des animaux à ${city || "France"}.`} />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:type" content="profile" />
        <meta property="og:site_name" content="Guardiens" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={`${firstName} — Gardien Guardiens`} />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      {/* ── Header ── */}
      <header className="border-b border-border bg-background">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link to="/" className="text-lg font-bold text-primary">Guardiens</Link>
          {isAuthenticated ? (
            <Link to="/dashboard" className="text-sm text-primary hover:underline">
              {capitalize(auth.user?.firstName || "")} — Dashboard
            </Link>
          ) : (
            <div className="flex items-center gap-3">
              <Link to="/login" className="text-sm text-foreground hover:underline">Se connecter</Link>
              <Link to="/register" className="text-sm bg-primary text-primary-foreground rounded-full px-4 py-1.5">
                S'inscrire
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* ── SECTION 1: Hero ── */}
      <section className="px-6 py-10 max-w-3xl mx-auto">
        <div className="flex flex-col items-center">
          <Avatar className="w-32 h-32 border-2 border-border mb-4">
            {profile.avatar_url ? (
              <AvatarImage src={profile.avatar_url} alt={firstName} className="object-cover" />
            ) : null}
            <AvatarFallback className="bg-primary/10 text-primary text-4xl">
              {firstName.charAt(0)}
            </AvatarFallback>
          </Avatar>

          {/* Status badges */}
          <div className="flex justify-center gap-2 mb-4">
            {profile.identity_verified && <BadgeShield badgeKey="identity_verified" size="sm" showLabel={false} />}
            {profile.is_founder && <BadgeShield badgeKey="founder" size="sm" showLabel={false} />}
            {emergencyActive && <BadgeShield badgeKey="emergency_sitter" size="sm" showLabel={false} />}
          </div>

          <h1 className="text-2xl font-semibold text-foreground text-center">{firstName}</h1>
          {city && (
            <p className="text-base text-muted-foreground text-center mb-2">📍 {city}</p>
          )}

          {/* Metrics */}
          <div className="flex justify-center gap-6 mt-4 flex-wrap">
            <div className="text-center">
              <p className="text-xl font-semibold text-foreground">{completedSits}</p>
              <p className="text-xs text-muted-foreground">Gardes</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-semibold text-foreground">{avgRating > 0 ? `${avgRating}` : "—"}</p>
              <p className="text-xs text-muted-foreground">Note ★</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-semibold text-foreground">{badges.reduce((s, b) => s + b.count, 0)}</p>
              <p className="text-xs text-muted-foreground">Écussons</p>
            </div>
          </div>

          {cancellations > 0 && (
            <p className="text-xs text-muted-foreground mt-2">{cancellations} annulation{cancellations > 1 ? "s" : ""}</p>
          )}
        </div>
      </section>

      {/* ── SECTION 2: Bio ── */}
      {(bio || whySitter) && (
        <section className="max-w-3xl mx-auto px-6 py-6 border-t border-border">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">À propos</h2>
          {bio && <p className="text-base text-foreground/80 leading-relaxed">{bio}</p>}
          {whySitter && (
            <div className="mt-4 bg-muted/30 rounded-xl p-4 border-l-4 border-primary">
              <Quote className="w-4 h-4 text-primary mb-2" />
              <p className="italic text-foreground/80 text-sm">{whySitter}</p>
            </div>
          )}
        </section>
      )}

      {/* ── SECTION 3: Ce qu'il/elle garde ── */}
      {animalTypes.length > 0 && (
        <section className="max-w-3xl mx-auto px-6 py-6 border-t border-border">
          <h2 className="text-sm font-semibold uppercase tracking-wide mb-4">Ce que je garde</h2>
          <div className="flex flex-wrap gap-2">
            {animalTypes.map((a) => (
              <span key={a} className="bg-primary/10 text-primary rounded-full px-3 py-1 text-sm">
                {ANIMAL_LABELS[a] || a}
              </span>
            ))}
          </div>
          {sitterProfile?.farm_animals_ok && (
            <span className="inline-block mt-2 bg-amber-50 text-amber-700 rounded-full px-3 py-1 text-xs">
              Races exigeantes ✓
            </span>
          )}
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            {hasVehicle ? (
              <>
                <Car className="w-4 h-4" />
                <span>Véhiculé(e) — rayon {radius}km</span>
              </>
            ) : radius > 0 ? (
              <>
                <MapPin className="w-4 h-4" />
                <span>Rayon {radius}km</span>
              </>
            ) : null}
          </div>
        </section>
      )}

      {/* ── SECTION 4: Sa collection ── */}
      <section className="max-w-3xl mx-auto px-6 py-6 border-t border-border">
        <h2 className="text-sm font-semibold uppercase tracking-wide mb-4">Sa collection</h2>
        {(() => {
          const badgeMap: Record<string, boolean> = {};
          badges.forEach(b => { badgeMap[b.badge_key] = true; });
          if (profile?.identity_verified) badgeMap["id_verifiee"] = true;
          if (profile?.is_founder) badgeMap["fondateur"] = true;
          if (emergencyActive) badgeMap["gardien_urgence"] = true;
          const unlockedCount = TIMBRES_ORDER.filter(k => badgeMap[k]).length;
          return (
            <>
              <div className="grid grid-cols-4 md:grid-cols-6 gap-4">
                {TIMBRES_ORDER.map((key) => (
                  <div key={key} className="flex justify-center">
                    <BadgeTimbre id={key} unlocked={!!badgeMap[key]} size="normal" showTooltip />
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground text-center mt-3">
                {unlockedCount} timbre{unlockedCount > 1 ? "s" : ""} sur 12
              </p>
            </>
          );
        })()}
      </section>

      {/* ── SECTION 5: Avis ── */}
      {reviewCount > 0 && (
        <section className="max-w-3xl mx-auto px-6 py-6 border-t border-border">
          <h2 className="text-sm font-semibold uppercase tracking-wide mb-4">
            Avis ({reviewCount})
          </h2>
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
        </section>
      )}

      {/* ── SECTION 6: Galerie ── */}
      {gallery.length > 0 && (
        <section className="max-w-3xl mx-auto px-6 py-6 border-t border-border">
          <h2 className="text-sm font-semibold uppercase tracking-wide mb-4">Galerie</h2>
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
        </section>
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

      {/* ── CTA Sticky ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border px-6 py-4 flex items-center justify-between z-50">
        <div className="text-sm text-foreground">
          {firstName}
          {isAvailable && <span className="text-muted-foreground"> est disponible</span>}
        </div>
        <div>
          {!isAuthenticated && (
            <Link
              to="/register?role=owner"
              className="bg-primary text-primary-foreground rounded-full px-6 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
            >
              S'inscrire pour contacter
            </Link>
          )}
          {isAuthenticated && isOwner && (
            <Link
              to={`/messages?sitter=${id}`}
              className="bg-primary text-primary-foreground rounded-full px-6 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Contacter {firstName}
            </Link>
          )}
          {isAuthenticated && isOwn && (
            <Link
              to="/profile"
              className="border border-border text-foreground rounded-full px-6 py-2.5 text-sm font-medium hover:border-primary transition-colors"
            >
              Modifier mon profil
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
