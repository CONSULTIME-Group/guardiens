// Page publique partagée d'une annonce — accessible sans compte, indexable.
// Utilisée pour le partage externe (Facebook, LinkedIn, WhatsApp, lien direct).
// Les meta og:* sont injectées via Helmet ; les caches sociaux liront index.html
// après prerender (Prerender.io / Cloudflare Worker — TODO infra).
import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  MapPin,
  Star,
  PawPrint,
  Home,
  CheckCircle2,
  ArrowLeft,
  ExternalLink,
  ShieldCheck,
  Heart,
  Users,
  Sparkles,
  HandHeart,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import VerifiedBadge from "@/components/profile/VerifiedBadge";
import ShareButtons from "@/components/sits/ShareButtons";
import { trackEvent } from "@/lib/analytics";
import { sanitizeUserTitle } from "@/lib/sanitizeTitle";
import { getOgImageAbsoluteUrl } from "@/lib/ogImages";

import { TooltipProvider } from "@/components/ui/tooltip";
import ApplicationModal from "@/components/sits/ApplicationModal";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import SitHero from "@/components/sits/shared/SitHero";
import OwnerSitManagement from "@/components/sits/shared/OwnerSitManagement";
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";
import PublicSitPitch from "@/components/sits/public/PublicSitPitch";
import PublicSitFAQ from "@/components/sits/public/PublicSitFAQ";
import PublicSitTrustStrip from "@/components/sits/public/PublicSitTrustStrip";
import {
  ENV_LABELS as envLabels,
  TYPE_LABELS as typeLabels,
  SPECIES_EMOJI as speciesEmoji,
  SPECIES_LABEL as speciesLabel,
} from "@/components/sits/shared/sitConstants";

type ViewerType = "anonymous" | "gardien" | "proprio" | "owner_of_sit" | "admin";

const PublicSitDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { hasAccess } = useSubscriptionAccess();
  const [sit, setSit] = useState<any>(null);
  const [owner, setOwner] = useState<any>(null);
  const [property, setProperty] = useState<any>(null);
  const [pets, setPets] = useState<any[]>([]);
  const [badges, setBadges] = useState<{ badge_key: string; count: number }[]>([]);
  const [avgRating, setAvgRating] = useState<string | null>(null);
  const [reviewCount, setReviewCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [applyOpen, setApplyOpen] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [viewerType, setViewerType] = useState<ViewerType>("anonymous");
  const sitViewFired = useRef(false);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const { data: sitRows } = await supabase.from("sits").select("*").eq("id", id).limit(1);
      const sitData = sitRows?.[0];
      if (!sitData) { setLoading(false); return; }
      setSit(sitData);

      // public_profiles : vue publique (RLS de profiles bloque les autres users)
      const [ownerRes, propRes, reviewsRes, badgeRes] = await Promise.all([
        supabase.from("public_profiles").select("id, first_name, city, avatar_url, identity_verified, bio, completed_sits_count, is_founder").eq("id", sitData.user_id).limit(1),
        supabase.from("properties").select("*").eq("id", sitData.property_id).limit(1),
        supabase.from("reviews").select("overall_rating").eq("reviewee_id", sitData.user_id).eq("published", true),
        supabase.from("badge_attributions").select("badge_id").eq("user_id", sitData.user_id),
      ]);

      const ownerData = ownerRes.data?.[0] ?? null;
      const propertyData = propRes.data?.[0] ?? null;

      setOwner(ownerData);
      setProperty(propertyData);

      const reviews = reviewsRes.data || [];
      setReviewCount(reviews.length);
      if (reviews.length > 0) {
        setAvgRating((reviews.reduce((s: number, r: any) => s + r.overall_rating, 0) / reviews.length).toFixed(1));
      }

      const badgeMap = new Map<string, number>();
      (badgeRes.data || []).forEach((b: any) => badgeMap.set(b.badge_key, (badgeMap.get(b.badge_key) || 0) + 1));
      setBadges(Array.from(badgeMap.entries()).map(([badge_key, count]) => ({ badge_key, count })).sort((a, b) => b.count - a.count));

      if (propertyData) {
        const { data: petsData } = await supabase.from("pets").select("*").eq("property_id", propertyData.id);
        setPets(petsData || []);
      }

      if (user) {
        const { data: appRows } = await supabase.from("applications").select("id").eq("sit_id", id!).eq("sitter_id", user.id).limit(1);
        if (appRows?.[0]) setHasApplied(true);
      }

      // ── Résolution viewer_type ──
      let resolvedViewer: ViewerType = "anonymous";
      if (user) {
        if (sitData.user_id === user.id) {
          resolvedViewer = "owner_of_sit";
        } else {
          // Check admin role
          let isAdmin = false;
          try {
            const { data: roleRows } = await supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", user.id)
              .eq("role", "admin")
              .limit(1);
            isAdmin = !!roleRows?.[0];
          } catch {
            isAdmin = false;
          }
          if (isAdmin) {
            resolvedViewer = "admin";
          } else {
            const role = (user as any).role;
            if (role === "owner") resolvedViewer = "proprio";
            else resolvedViewer = "gardien"; // sitter, both, ou défaut
          }
        }
      }
      setViewerType(resolvedViewer);

      // Auto-redirect : un membre connecté qui arrive sur la page publique d'une
      // annonce qu'il PEUT consulter en mode complet doit voir la fiche riche.
      // On garde la version publique uniquement pour les anonymes et les
      // owners/admins (qui peuvent vouloir prévisualiser le partage).
      if (resolvedViewer === "gardien" || resolvedViewer === "proprio") {
        navigate(`/sits/${id}?from=share`, { replace: true });
        return;
      }

      setLoading(false);
      // analytics — un seul tir grâce au ref (anti double-fire StrictMode)
      if (!sitViewFired.current) {
        sitViewFired.current = true;
        try {
          trackEvent("sit_view", {
            source: "/annonces/:id",
            metadata: { sit_id: id, viewer_type: resolvedViewer },
          });
        } catch {}
      }
    };
    load();
  }, [id, user, navigate]);

  if (loading) return <div className="p-6 md:p-10 text-muted-foreground">Chargement...</div>;
  if (!sit) return <div className="p-6 md:p-10"><p>Annonce introuvable.</p></div>;
  if (sit.status !== "published") return <div className="p-6 md:p-10"><p>Cette annonce n'est plus disponible.</p></div>;

  const photos: string[] = property?.photos || [];
  const formatDate = (d: string | null) => d ? format(new Date(d), "d MMMM yyyy", { locale: fr }) : "";
  const environments = (sit.environments || []).length > 0
    ? sit.environments
    : (property?.environment ? [property.environment] : []);

  // Durée en jours (utilisée dans le pitch + label de date naturel)
  const durationDays = (() => {
    if (!sit.start_date || !sit.end_date) return null;
    const start = new Date(sit.start_date).getTime();
    const end = new Date(sit.end_date).getTime();
    if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null;
    return Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);
  })();

  // Label date naturel : « Du 5 au 15 août 2026 · 11 jours »
  const naturalDateLabel = (() => {
    if (!sit.start_date || !sit.end_date) return "Dates flexibles";
    const startDay = format(new Date(sit.start_date), "d MMMM", { locale: fr });
    const endDay = format(new Date(sit.end_date), "d MMMM yyyy", { locale: fr });
    const base = `Du ${startDay} au ${endDay}`;
    return durationDays ? `${base} · ${durationDays} jour${durationDays > 1 ? "s" : ""}` : base;
  })();

  // Résumé des animaux pour le pitch (« 2 chats », « un chien et un chat »)
  const petsPitchSummary = (() => {
    if (pets.length === 0) return "leurs animaux";
    if (pets.length === 1) {
      const p = pets[0];
      return `${p.name} (${speciesLabel[p.species] || p.species})`;
    }
    // Groupe par espèce
    const byKind: Record<string, number> = {};
    pets.forEach((p: any) => {
      const k = speciesLabel[p.species] || p.species;
      byKind[k] = (byKind[k] || 0) + 1;
    });
    return Object.entries(byKind)
      .map(([kind, n]) => `${n} ${kind}${n > 1 ? "s" : ""}`)
      .join(" et ");
  })();

  // ── SEO / OG ──
  const cityForTitle = owner?.city || "France";
  const startFmt = sit.start_date ? format(new Date(sit.start_date), "d MMMM", { locale: fr }) : "";
  const endFmt = sit.end_date ? format(new Date(sit.end_date), "d MMMM yyyy", { locale: fr }) : "";
  const datesShort = startFmt && endFmt ? `du ${startFmt} au ${endFmt}` : "dates flexibles";

  const petsSummary = pets.length > 0
    ? pets.map((p: any) => `${p.name} (${speciesLabel[p.species] || p.species})`).join(", ")
    : "animaux à confier";

  // og:title — titre de l'annonce + ville (si dispo) + suffixe Guardiens
  const ownerCity = owner?.city?.trim() || "";
  const baseTitle = sit.title || "Garde de maison et animaux";
  const ogTitle = ownerCity
    ? `${baseTitle} à ${ownerCity} — Guardiens`
    : `${baseTitle} — Guardiens`;
  const truncatedTitle = ogTitle.length > 60 ? ogTitle.slice(0, 57) + "…" : ogTitle;

  // og:description — ville (si dispo) + dates en français + description courte du logement
  const propertyDescShort = property?.description
    ? (property.description.length > 80 ? property.description.slice(0, 77) + "…" : property.description)
    : "";
  const datesPart = startFmt && endFmt ? `Du ${startFmt} au ${endFmt}.` : "Dates flexibles.";
  const cityPart = ownerCity ? `${ownerCity}. ` : "";
  const ogDescription = propertyDescShort
    ? `${cityPart}${datesPart} ${propertyDescShort} Partagez la confiance entre gens du coin avec Guardiens.`
    : "Partez l'esprit tranquille avec un gardien de votre région. Guardiens, c'est la confiance entre gens du coin.";
  const truncatedDesc = ogDescription.length > 200 ? ogDescription.slice(0, 197) + "…" : ogDescription;

  // SEO description (≤160 char) — distincte de og:description
  const seoDescription = `Garde gratuite à ${cityForTitle} ${datesShort}. ${petsSummary}. ${owner?.first_name || "Un membre"} cherche un gardien du coin sur Guardiens — inscription gratuite.`;
  const truncatedSeoDesc = seoDescription.length > 160 ? seoDescription.slice(0, 157) + "…" : seoDescription;

  const canonicalUrl = typeof window !== "undefined"
    ? `${window.location.origin}/annonces/${sit.id}`
    : `https://guardiens.fr/annonces/${sit.id}`;

  // og:image — rotation stable parmi 5 visuels Guardiens (1 par hash de l'ID).
  // Les photos réelles de l'annonce restent affichées dans le hero ; l'OG sert
  // l'identité de marque pour les partages externes.
  const ogImageUrl = getOgImageAbsoluteUrl(sit.id);
  const ogImageAlt = `Guardiens — ${sit.title || "Annonce de garde"}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: sit.title || `Garde d'animaux à ${cityForTitle}`,
    description: truncatedSeoDesc,
    provider: {
      "@type": "Person",
      name: owner?.first_name || "Membre Guardiens",
    },
    areaServed: cityForTitle,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
      validFrom: sit.start_date,
      validThrough: sit.end_date,
    },
  };

  return (
    <div className="pb-32 bg-background">
      <Helmet>
        <title>{truncatedTitle}</title>
        <meta name="description" content={truncatedSeoDesc} />
        <link rel="canonical" href={canonicalUrl} />
        {/* noindex, follow — thin content protection (V1). */}
        <meta name="robots" content="noindex, follow" />

        {/* Open Graph — Facebook, LinkedIn, Slack, WhatsApp */}
        <meta property="og:type" content="article" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:title" content={truncatedTitle} />
        <meta property="og:description" content={truncatedDesc} />
        <meta property="og:image" content={ogImageUrl} />
        <meta property="og:image:alt" content={ogImageAlt} />
        <meta property="og:image:width" content="1920" />
        <meta property="og:image:height" content="1080" />
        <meta property="og:site_name" content="Guardiens" />
        <meta property="og:locale" content="fr_FR" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={truncatedTitle} />
        <meta name="twitter:description" content={truncatedDesc} />
        <meta name="twitter:image" content={ogImageUrl} />
        <meta name="twitter:image:alt" content={ogImageAlt} />

        {/* JSON-LD : lu par Google après rendu JS, indépendant des OG. */}
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      {/* Header public — anonymes uniquement (identité de marque + nav minimale) */}
      {!isAuthenticated && <PublicHeader />}

      {/* Mini-barre sticky pour les membres connectés (la page publique n'a pas le header app) */}
      {isAuthenticated && (
        <div className="sticky top-0 z-30 bg-primary/10 backdrop-blur-sm border-b border-primary/20 px-4 py-2 flex flex-wrap items-center justify-between gap-2">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" /> Retour au dashboard
          </Link>
          <Button asChild size="sm" className="h-8">
            <Link to={`/sits/${sit.id}`} className="inline-flex items-center gap-1.5">
              {viewerType === "owner_of_sit" ? "Aller à mon annonce" : "Voir la fiche complète"}
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
      {/* ─── HERO ÉDITORIAL ─────────────────────────────────────────────── */}
      <div className="px-4 md:px-10 pt-4 md:pt-6">
        <SitHero photos={photos} city={owner?.city} priority />
      </div>

      <div className="px-5 md:px-10 pb-6 md:pb-10">
        {/* Pill contextuelle au-dessus du H1 — visible et orientée valeur */}
        <div className="mt-5 mb-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Garde entre voisins · Sans paiement entre membres
          </span>
          {owner?.city && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-foreground">
              <MapPin className="h-3.5 w-3.5 text-primary/70" />
              {owner.city}
            </span>
          )}
        </div>

        {/* Title — sanitize pour corriger les espaces manquants ("4chats" → "4 chats") */}
        <h1 className="font-heading text-3xl md:text-4xl font-bold leading-tight tracking-tight mb-3 text-foreground">
          {sit.title ? sanitizeUserTitle(sit.title) : `Une garde à confier à ${owner?.city || "vos voisins"}`}
        </h1>

        {/* Date naturelle */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground mb-6">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-primary/70" />
            <span className="font-medium text-foreground">{naturalDateLabel}</span>
            {sit.flexible_dates && (
              <span className="text-[11px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full ml-1">
                Dates flexibles
              </span>
            )}
          </span>
        </div>

        {/* ─── PITCH NARRATIF + TRUST — visiteurs anonymes uniquement ───── */}
        {!isAuthenticated && (
          <>
            <PublicSitPitch
              ownerFirstName={owner?.first_name}
              city={owner?.city}
              petsSummary={petsPitchSummary}
              durationDays={durationDays}
              datesLabel={naturalDateLabel}
              propertyTypeLabel={property ? typeLabels[property.type] || property.type : null}
            />
            <PublicSitTrustStrip />
          </>
        )}

        {/* ─── ANIMAUX ──────────────────────────────────────────────────── */}
        {pets.length > 0 && (
          <section className="mb-6">
            <h2 className="font-heading text-lg font-semibold mb-3 flex items-center gap-2">
              <PawPrint className="h-5 w-5 text-primary" />
              {pets.length === 1 ? "L'animal à garder" : `Les animaux à garder (${pets.length})`}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {pets.map((pet: any) => (
                <div
                  key={pet.id}
                  className="flex items-center gap-3 bg-card border border-border rounded-2xl px-4 py-3 hover:border-primary/30 transition-colors"
                >
                  {pet.photo_url ? (
                    <img
                      src={pet.photo_url}
                      alt={`Photo de ${pet.name}`}
                      loading="lazy"
                      className="w-12 h-12 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <span
                      className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-xl shrink-0"
                      aria-hidden="true"
                    >
                      {speciesEmoji[pet.species] || "🐾"}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{pet.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {speciesLabel[pet.species] || pet.species}
                      {pet.breed ? ` · ${pet.breed}` : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ─── LOGEMENT ─────────────────────────────────────────────────── */}
        {property && (
          <section className="mb-6 bg-card border border-border rounded-2xl p-5 md:p-6">
            <h2 className="font-heading text-lg font-semibold mb-2 flex items-center gap-2">
              <Home className="h-5 w-5 text-primary" />
              Le logement
            </h2>
            <p className="text-sm font-medium text-foreground">
              {typeLabels[property.type] || property.type}
              {property.environment && (
                <>
                  {" · "}
                  <span className="text-muted-foreground font-normal">
                    {envLabels[property.environment] || property.environment}
                  </span>
                </>
              )}
            </p>
            {property.description && (
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed whitespace-pre-line">
                {property.description}
              </p>
            )}
            {environments.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-border">
                <span className="text-xs text-muted-foreground self-center mr-1">
                  Environnement&nbsp;:
                </span>
                {environments.map((env: string) => (
                  <span
                    key={env}
                    className="px-2.5 py-1 rounded-full bg-accent/60 text-xs font-medium"
                  >
                    {envLabels[env] || env}
                  </span>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ─── PROFIL TYPE DE GARDIEN RECHERCHÉ ─────────────────────────── */}
        {sit.open_to && sit.open_to.length > 0 && (
          <section className="mb-6">
            <h2 className="font-heading text-base font-semibold mb-2.5 text-foreground">
              Le gardien idéal
            </h2>
            <div className="flex flex-wrap gap-2">
              {sit.open_to.map((t: string) => (
                <span
                  key={t}
                  className="px-3 py-1.5 rounded-full bg-secondary/15 text-secondary-foreground border border-secondary/20 text-xs font-medium"
                >
                  {t}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* ─── PROPRIÉTAIRE — carte humaine, mise en avant ──────────────── */}
        {owner && (
          <section className="mb-6 rounded-2xl border-2 border-primary/15 bg-primary/[0.03] p-5 md:p-6">
            <h2 className="font-heading text-base font-semibold mb-4 flex items-center gap-2">
              <Heart className="h-4 w-4 text-primary" />
              Faites connaissance avec {owner.first_name || "votre hôte"}
            </h2>
            <div className="flex items-start gap-4">
              {owner.avatar_url ? (
                <img
                  src={owner.avatar_url}
                  alt={`Photo de ${owner.first_name}`}
                  className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover shrink-0 ring-2 ring-primary/10"
                  loading="lazy"
                />
              ) : (
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-primary/10 flex items-center justify-center font-heading text-2xl font-bold text-primary shrink-0 ring-2 ring-primary/10">
                  {owner.first_name?.charAt(0) || "?"}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-base flex items-center flex-wrap gap-1.5">
                  {owner.first_name}
                  {owner.identity_verified && <VerifiedBadge />}
                  {owner.is_founder && (
                    <span
                      className="text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary"
                      title="Membre fondateur"
                    >
                      Fondateur
                    </span>
                  )}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                  {owner.city && <span>{owner.city}</span>}
                  {owner.city &&
                    typeof owner.completed_sits_count === "number" &&
                    owner.completed_sits_count > 0 && <span aria-hidden="true">·</span>}
                  {typeof owner.completed_sits_count === "number" &&
                    owner.completed_sits_count > 0 && (
                      <span>
                        {owner.completed_sits_count} garde
                        {owner.completed_sits_count > 1 ? "s" : ""} accomplie
                        {owner.completed_sits_count > 1 ? "s" : ""}
                      </span>
                    )}
                  {avgRating && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-secondary fill-secondary" />
                        {avgRating} ({reviewCount} avis)
                      </span>
                    </>
                  )}
                </div>
                <p className="text-sm text-foreground/80 mt-2.5 leading-relaxed line-clamp-4">
                  {owner.bio
                    ? owner.bio
                    : `${owner.first_name || "Ce membre"} n'a pas encore renseigné de présentation, mais sera ravi(e) d'échanger avec vous.`}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ─── PARTAGE — propriétaire de l'annonce uniquement ───────────── */}
        {viewerType === "owner_of_sit" && (
          <div className="mb-8">
            <ShareButtons
              sitId={sit.id}
              title={sit.title || `Garde à ${owner?.city || "France"}`}
              city={owner?.city}
              source="public_sit_detail"
              viewerType={viewerType}
            />
          </div>
        )}

        {/* ─── GESTION — propriétaire de l'annonce uniquement ───────────── */}
        {viewerType === "owner_of_sit" && property && (
          <OwnerSitManagement
            sitId={sit.id}
            propertyId={property.id}
            status={sit.status}
            canCancel={sit.status === "published" || sit.status === "confirmed"}
            onCancelClick={() => navigate(`/sits/${sit.id}?action=cancel`)}
          />
        )}

        {/* ─── BLOC DE RÉASSURANCE FINAL ────────────────────────────────── */}
        {!isAuthenticated && (
          <section className="mt-10 rounded-2xl bg-card border border-border p-6 text-center">
            <p className="font-heading text-base md:text-lg font-semibold mb-2">
              Vous partez l'esprit léger — et si un imprévu survient, votre
              réseau local de gardiens prend le relais.
            </p>
            <p className="text-xs text-muted-foreground">
              Profils vérifiés · Avis croisés · Gardiens d'urgence mobilisables
            </p>
          </section>
        )}

        {/* ─── CTA STICKY ───────────────────────────────────────────────── */}
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 z-40 pb-20 md:pb-4">
          <div className="max-w-4xl mx-auto">
            {/* Réassurance pré-CTA — visible uniquement pour les anonymes (audience d'acquisition) */}
            {!isAuthenticated && (sit as any).accepting_applications && (
              <div className="hidden sm:flex items-center justify-center gap-x-4 text-xs text-muted-foreground mb-2">
                <span className="flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5 text-primary" /> Identités vérifiées</span>
                <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5 text-primary" /> 100&nbsp;% gratuit</span>
                <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5 text-primary" /> Entre voisins</span>
              </div>
            )}
            {!(sit as any).accepting_applications ? (
              <Button className="w-full h-12 text-base font-semibold" disabled>
                Candidatures en cours d'analyse
              </Button>
            ) : !isAuthenticated ? (
              <Link
                to="/inscription?role=sitter"
                onClick={() => {
                  try {
                    trackEvent("sit_apply_blocked", {
                      source: "public_sit_detail",
                      metadata: { sit_id: sit.id, reason: "not_authenticated", viewer_type: viewerType },
                    });
                  } catch {}
                }}
              >
                <Button className="w-full h-12 text-base font-semibold">
                  {owner?.first_name
                    ? `Devenir gardien — aider ${owner.first_name}`
                    : "Devenir gardien — c'est gratuit"}
                </Button>
              </Link>
            ) : !hasAccess ? (
              <Link
                to="/mon-abonnement"
                onClick={() => {
                  try {
                    trackEvent("sit_apply_blocked", {
                      source: "public_sit_detail",
                      metadata: { sit_id: sit.id, reason: "no_subscription", viewer_type: viewerType },
                    });
                  } catch {}
                }}
              >
                <Button className="w-full h-12 text-base font-semibold">
                  S'abonner pour postuler
                </Button>
              </Link>
            ) : hasApplied ? (
              <Button className="w-full h-12 text-base font-semibold" disabled>
                <CheckCircle2 className="h-5 w-5 mr-2" /> Candidature envoyée ✓
              </Button>
            ) : (
              <Button
                className="w-full h-12 text-base font-semibold"
                onClick={() => {
                  try {
                    trackEvent("sit_apply_clicked", {
                      source: "public_sit_detail",
                      metadata: { sit_id: sit.id, viewer_type: viewerType },
                    });
                  } catch {}
                  setApplyOpen(true);
                }}
              >
                Postuler à cette garde
              </Button>
            )}
          </div>
        </div>
      </div>

      {isAuthenticated && sit && (
        <ApplicationModal
          open={applyOpen}
          onOpenChange={setApplyOpen}
          sitId={sit.id}
          ownerId={sit.user_id}
          ownerFirstName={owner?.first_name || ""}
          petNames={pets.map((p: any) => p.name)}
          city={owner?.city || ""}
          startDate={formatDate(sit.start_date)}
          endDate={formatDate(sit.end_date)}
          onSuccess={() => setHasApplied(true)}
        />
      )}
    </div>
  );
};

export default PublicSitDetail;
