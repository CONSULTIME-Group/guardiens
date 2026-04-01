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
  Shield, Star,
} from "lucide-react";
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
  const minDuration: string = sitterProfile?.min_duration || "";
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
            <div className="shrink-0">
              <img
                src={profile.avatar_url || "/placeholder.svg"}
                alt={firstName}
                className="w-28 h-28 md:w-40 md:h-40 rounded-full object-cover object-center border-4 border-white shadow-md ring-2 ring-primary ring-offset-2"
              />
            </div>

            {/* Infos */}
            <div className="flex flex-col gap-1.5 pb-1">
              {isAvailable && (
                <span className="inline-flex w-fit items-center text-xs bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-medium">
                  Disponible
                </span>
              )}

              <h1 className="text-4xl md:text-5xl font-heading font-bold text-foreground leading-tight capitalize">
                {firstName}
              </h1>

              {city && (
                <p className="text-base text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> Gardien à {city}
                </p>
              )}

              {activeBadgeKeys.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  {badgeMap["id_verifiee"] && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground border border-border rounded-full px-2 py-0.5 bg-white/80">
                      <Shield size={11} className="text-primary" /> ID vérifiée
                    </span>
                  )}
                  {badgeMap["fondateur"] && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground border border-border rounded-full px-2 py-0.5 bg-white/80">
                      <Star size={11} className="text-primary" /> Fondateur
                    </span>
                  )}
                  {badgeMap["gardien_urgence"] && (
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

      {/* ── SÉPARATEUR ── */}
      <hr className="border-border max-w-5xl mx-auto" />

      {/* ── BODY — TWO COLUMNS ── */}
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
                <Link
                  to={`/messagerie?gardien=${id}`}
                  className="block bg-primary text-primary-foreground rounded-xl py-3 text-sm font-medium w-full text-center"
                >
                  Contacter {firstName}
                </Link>
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

          <hr className="border-border" />

          {/* Avis */}
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
              Avis{reviewCount > 0 ? ` (${reviewCount})` : ""}
            </p>
            {reviewCount > 0 ? (
              <>
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
                          {relativeDate(r.created_at)}
                        </span>
                        {r.overall_rating && (
                          <span className="text-xs text-primary ml-auto">★ {r.overall_rating}/5</span>
                        )}
                      </div>
                      {r.comment && (
                        <p className="text-sm text-foreground/80">{r.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
                {reviewCount > 5 && (
                  <p className="text-xs text-primary hover:underline mt-3 cursor-pointer">
                    Voir tous les avis →
                  </p>
                )}
              </>
            ) : (
              <div className="border border-border rounded-xl p-5 bg-card text-sm text-muted-foreground italic">
                Les avis apparaîtront ici après la première garde.
                Chaque propriétaire évalue le gardien et peut attribuer
                jusqu'à 3 écussons.
              </div>
            )}
          </div>

          <hr className="border-border" />

          {/* Collection de timbres */}
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Sa collection</p>
            <div className="grid grid-cols-6 gap-3">
              {TIMBRES_ORDER.map(key => (
                <div key={key} className="flex justify-center">
                  <BadgeTimbre id={key} unlocked={!!badgeMap[key]} size="compact" showTooltip />
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {unlockedCount} timbre{unlockedCount > 1 ? "s" : ""} sur 12
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Les écussons sont attribués par les propriétaires après chaque garde.
            </p>
          </div>

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
