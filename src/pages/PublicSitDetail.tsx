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
import { logger } from "@/lib/logger";

import { TooltipProvider } from "@/components/ui/tooltip";
import ApplicationModal from "@/components/sits/ApplicationModal";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import SitHero from "@/components/sits/shared/SitHero";
import OwnerSitManagement from "@/components/sits/shared/OwnerSitManagement";
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";
import PublicSitPitch from "@/components/sits/public/PublicSitPitch";
import PublicSitGallery from "@/components/sits/public/PublicSitGallery";
import PublicSitFAQ from "@/components/sits/public/PublicSitFAQ";
import PublicSitTrustStrip from "@/components/sits/public/PublicSitTrustStrip";
import {
 ENV_LABELS as envLabels,
 TYPE_LABELS as typeLabels,
 
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
 const [latestReviews, setLatestReviews] = useState<{ overall_rating: number; comment: string; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
 const [applyOpen, setApplyOpen] = useState(false);
 const [hasApplied, setHasApplied] = useState(false);
 const [viewerType, setViewerType] = useState<ViewerType>("anonymous");
 const sitViewFired = useRef(false);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        const { data: sitRows, error: sitErr } = await supabase.from("sits").select("*").eq("id", id).limit(1);
        if (sitErr) throw sitErr;
        const sitData = sitRows?.[0];
        if (!sitData) {
          setLoadError("not_found");
          return;
        }
        setSit(sitData);

        const [ownerRes, propRes, reviewsRes, badgeRes, galleryRes] = await Promise.all([
          supabase.from("public_profiles").select("id, first_name, city, postal_code, avatar_url, identity_verified, bio, completed_sits_count, is_founder").eq("id", sitData.user_id).limit(1),
          supabase.from("properties").select("*").eq("id", sitData.property_id).limit(1),
          supabase.from("reviews").select("id, overall_rating, comment, created_at").eq("reviewee_id", sitData.user_id).eq("published", true).order("created_at", { ascending: false }),
          supabase.from("badge_attributions").select("badge_id").eq("user_id", sitData.user_id),
          supabase.from("owner_gallery").select("photo_url, position, width, height").eq("user_id", sitData.user_id).order("position", { ascending: true }),
        ]);

        const ownerData = ownerRes.data?.[0] ?? null;
        const propertyData = propRes.data?.[0] ?? null;
        const galleryRows = (galleryRes.data || []) as any[];
        const galleryUrls = galleryRows.map((g) => g.photo_url).filter(Boolean);
        // Photos « qualité indexation » : largeur connue ≥ 800px
        const galleryHiQualityCount = galleryRows.filter((g) => (g.width || 0) >= 800 && (g.height || 0) >= 600).length;
        const enrichedProperty = propertyData
          ? { ...propertyData, photos: galleryUrls.length > 0 ? galleryUrls : (propertyData as any).photos, _hiQualityCount: galleryHiQualityCount }
          : propertyData;

        if (!ownerData) {
          logger.warn("[PublicSitDetail] public_profiles vide", { sit_id: sitData.id, user_id: sitData.user_id, error: ownerRes.error?.message });
        }
        if (galleryUrls.length === 0) {
          logger.warn("[PublicSitDetail] owner_gallery vide", {
            sit_id: sitData.id,
            user_id: sitData.user_id,
            property_id: sitData.property_id,
            property_photos_count: Array.isArray((propertyData as any)?.photos) ? (propertyData as any).photos.length : 0,
            error: galleryRes.error?.message,
          });
        }

        let enrichedOwner = ownerData;
        if (ownerData && !ownerData.city && /^\d{5}$/.test(String((ownerData as any).postal_code || ""))) {
          try {
            const res = await fetch(`https://geo.api.gouv.fr/communes?codePostal=${(ownerData as any).postal_code}&fields=nom&limit=1`);
            if (res.ok) {
              const arr: { nom?: string }[] = await res.json();
              const resolvedCity = arr?.[0]?.nom?.trim();
              if (resolvedCity) enrichedOwner = { ...ownerData, city: resolvedCity };
            }
          } catch { /* silencieux */ }
        }

        setOwner(enrichedOwner);
        setProperty(enrichedProperty);

        const reviewsRaw = reviewsRes.data || [];
        const seenIds = new Set<string>();
        const reviews = reviewsRaw.filter((r: any) => {
          if (!r?.id || seenIds.has(r.id)) return false;
          seenIds.add(r.id);
          return true;
        });
        setReviewCount(reviews.length);
        if (reviews.length > 0) {
          setAvgRating((reviews.reduce((s: number, r: any) => s + r.overall_rating, 0) / reviews.length).toFixed(1));
        }
        const withComment = reviews
          .filter((r: any) => typeof r.comment === "string" && r.comment.trim().length > 0)
          .slice(0, 2);
        setLatestReviews(withComment as any);

        const badgeMap = new Map<string, number>();
        (badgeRes.data || []).forEach((b: any) => badgeMap.set(b.badge_key, (badgeMap.get(b.badge_key) || 0) + 1));
        setBadges(Array.from(badgeMap.entries()).map(([badge_key, count]) => ({ badge_key, count })).sort((a, b) => b.count - a.count));

        if (propertyData) {
          try {
            const { data: petsData } = await supabase.from("pets").select("*").eq("property_id", propertyData.id);
            setPets(petsData || []);
          } catch (e) { logger.warn("[PublicSitDetail] pets load failed", { error: (e as any)?.message }); }
        }

        if (user) {
          try {
            const { data: appRows } = await supabase.from("applications").select("id").eq("sit_id", id!).eq("sitter_id", user.id).limit(1);
            if (appRows?.[0]) setHasApplied(true);
          } catch (e) { logger.warn("[PublicSitDetail] applications check failed", { error: (e as any)?.message }); }
        }

        let resolvedViewer: ViewerType = "anonymous";
        if (user) {
          if (sitData.user_id === user.id) {
            resolvedViewer = "owner_of_sit";
          } else {
            let isAdmin = false;
            try {
              const { data: roleRows } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").limit(1);
              isAdmin = !!roleRows?.[0];
            } catch { isAdmin = false; }
            if (isAdmin) {
              resolvedViewer = "admin";
            } else {
              const role = (user as any).role;
              if (role === "owner") resolvedViewer = "proprio";
              else resolvedViewer = "gardien";
            }
          }
        }
        setViewerType(resolvedViewer);

        if (resolvedViewer === "gardien" || resolvedViewer === "proprio") {
          navigate(`/sits/${id}?from=share`, { replace: true });
          return;
        }

        if (!sitViewFired.current) {
          sitViewFired.current = true;
          try {
            trackEvent("sit_view", {
              source: "/annonces/:id",
              metadata: { sit_id: id, viewer_type: resolvedViewer },
            });
          } catch {}
        }
      } catch (e: any) {
        logger.warn("[PublicSitDetail] load failed", { sit_id: id, error: e?.message });
        setLoadError("error");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, user, navigate]);

 if (loading) {
 return (
 <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-10 space-y-6 animate-pulse">
 <div className="h-[280px] md:h-[420px] rounded-3xl bg-muted" />
 <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
 {Array.from({ length: 4 }).map((_, i) => (
 <div key={i} className="h-24 rounded-2xl bg-muted" />
 ))}
 </div>
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 <div className="lg:col-span-2 space-y-4">
 <div className="h-10 rounded-xl bg-muted" />
 <div className="h-40 rounded-2xl bg-muted" />
 <div className="h-64 rounded-2xl bg-muted" />
 </div>
 <div className="space-y-4">
 <div className="h-48 rounded-2xl bg-muted" />
 <div className="h-32 rounded-2xl bg-muted" />
 </div>
 </div>
 <span className="sr-only">Chargement de l'annonce…</span>
 </div>
 );
 }
  if (loadError === "not_found" || (!loading && !sit)) {
    return (
      <div className="max-w-2xl mx-auto p-6 md:p-10 text-center space-y-3">
        <h1 className="font-heading text-2xl font-semibold">Annonce introuvable</h1>
        <p className="text-muted-foreground text-sm">Cette annonce a peut-être été retirée par son auteur, ou le lien est incorrect.</p>
        <Link to="/" className="inline-flex text-primary text-sm font-medium hover:underline">Retour à l'accueil</Link>
      </div>
    );
  }
  if (loadError === "error") {
    return (
      <div className="max-w-2xl mx-auto p-6 md:p-10 text-center space-y-3">
        <h1 className="font-heading text-2xl font-semibold">Une erreur est survenue</h1>
        <p className="text-muted-foreground text-sm">Impossible de charger cette annonce pour le moment. Veuillez réessayer dans un instant.</p>
        <button onClick={() => window.location.reload()} className="inline-flex text-primary text-sm font-medium hover:underline">Recharger la page</button>
      </div>
    );
  }
  if (!sit) return null;
  if (sit.status !== "published") return <div className="max-w-2xl mx-auto p-6 md:p-10 text-center"><p className="text-muted-foreground">Cette annonce n'est plus disponible.</p></div>;

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

 // Jours avant le début (pour le badge d'urgence)
 const daysUntilStart = (() => {
 if (!sit.start_date) return null;
 const diff = Math.ceil((new Date(sit.start_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
 return diff;
 })();
 const urgencyLabel = (() => {
 if (daysUntilStart == null || daysUntilStart < 0) return null;
 if (daysUntilStart === 0) return "Commence aujourd'hui";
 if (daysUntilStart === 1) return "Commence demain";
 if (daysUntilStart <= 14) return `Dans ${daysUntilStart} jours`;
 return null;
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
 const capitalize = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
 const petsPitchSummary = (() => {
 if (pets.length === 0) return "leurs animaux";
 if (pets.length === 1) {
 const p = pets[0];
 return `${capitalize(p.name)} (${speciesLabel[p.species] || p.species})`;
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
 : "Partez l'esprit tranquille avec un gardien près de chez vous. Guardiens, c'est la confiance entre gens du coin.";
 const truncatedDesc = ogDescription.length > 200 ? ogDescription.slice(0, 197) + "…" : ogDescription;

 // SEO description (≤160 char) — distincte de og:description
 const seoDescription = `Garde à ${cityForTitle} ${datesShort}. ${petsSummary}. ${owner?.first_name || "Un membre"} cherche un gardien du coin sur Guardiens — inscription gratuit pour les propriétaires.`;
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

  // Critère d'indexation (qualité minimum pour éviter le thin content) :
  // - ≥3 photos dont au moins 2 en haute résolution (≥800×600px)
  // - ≥200 caractères de texte substantiel (description + routine)
  // - titre personnalisé (≥10 caractères)
  // - au moins 1 animal renseigné
  // Tolérance : si aucune photo n'a ses dimensions stockées (anciennes annonces),
  // on garde le filtre simple par nombre de photos.
  const galleryCount = property?.photos?.length || 0;
  const hiQualityCount: number = (property as any)?._hiQualityCount ?? 0;
  const photosOk = galleryCount >= 3 && (hiQualityCount === 0 || hiQualityCount >= 2);
  const richTextLength = (property?.description || "").length + (sit.daily_routine || "").length;
  const hasCustomTitle = typeof sit.title === "string" && sit.title.trim().length >= 10;
  const hasPets = pets.length > 0;
  const isIndexable = photosOk && richTextLength >= 200 && hasCustomTitle && hasPets;

 const citySlug = (cityForTitle || "")
 .toLowerCase()
 .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
 .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
 const origin = canonicalUrl.replace(/\/annonces\/.*$/, "");
 const breadcrumbLd = {
 "@context": "https://schema.org",
 "@type": "BreadcrumbList",
 itemListElement: [
 { "@type": "ListItem", position: 1, name: "Accueil", item: `${origin}/` },
 ...(citySlug ? [{ "@type": "ListItem", position: 2, name: cityForTitle, item: `${origin}/house-sitting/${citySlug}` }] : []),
 { "@type": "ListItem", position: citySlug ? 3 : 2, name: sit.title || "Annonce de garde", item: canonicalUrl },
 ],
 };

 return (
 <div className="pb-32 bg-background">
 <Helmet>
 <title>{truncatedTitle}</title>
 <meta name="description" content={truncatedSeoDesc} />
 <link rel="canonical" href={canonicalUrl} />
 <meta name="robots" content={isIndexable ? "index, follow" : "noindex, follow"} />

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
 <script type="application/ld+json">{JSON.stringify(breadcrumbLd)}</script>
 </Helmet>

 {/* Header public — anonymes uniquement (identité de marque + nav minimale) */}
 {!isAuthenticated && <PublicHeader />}

      {/* Bandeau preview pour le propriétaire de l'annonce — clair, non-intrusif */}
      {viewerType === "owner_of_sit" && (
        <div className="bg-primary/5 border-b border-primary/15">
          <div className="max-w-4xl mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs md:text-sm text-foreground/80">
              <span className="font-medium text-foreground">Aperçu public</span> · ce que voient les visiteurs partageant le lien.
            </p>
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm" className="h-8 text-xs">
                <Link to="/dashboard" className="inline-flex items-center gap-1.5">
                  <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
                </Link>
              </Button>
              <Button asChild size="sm" className="h-8 text-xs">
                <Link to={`/sits/${sit.id}`} className="inline-flex items-center gap-1.5">
                  Gérer mon annonce <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}

 <div className="max-w-4xl mx-auto">
 {/* ─── HERO ÉDITORIAL ─────────────────────────────────────────────── */}
 <div className="px-4 md:px-10 pt-4 md:pt-6">
 <SitHero photos={photos} city={owner?.city} priority />
 {viewerType === "owner_of_sit" && photos.length === 0 && (
   <div
     role="status"
     className="mt-3 rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
   >
     <div>
       <p className="text-sm font-semibold text-foreground">Votre annonce n'a aucune photo</p>
       <p className="text-xs text-muted-foreground mt-0.5">
         Les annonces avec photos reçoivent davantage de candidatures. Ajoutez quelques images de votre logement et de vos animaux.
       </p>
     </div>
     <Button asChild size="sm" className="shrink-0">
       <Link to={`/sits/${sit.id}/edit`} className="inline-flex items-center gap-1.5">
         Ajouter des photos
         <ExternalLink className="h-3.5 w-3.5" />
       </Link>
     </Button>
   </div>
 )}
 </div>

 <div className="px-5 md:px-10 pb-6 md:pb-10">
 {/* Pill contextuelle au-dessus du H1 — visible et orientée valeur */}
 <div className="mt-5 mb-3 flex flex-wrap items-center gap-2">
 <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
 <Sparkles className="h-3.5 w-3.5" />
 Mission de gardien · Hébergement inclus
 </span>
 {urgencyLabel && (
 <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-secondary/20 text-secondary-foreground border border-secondary/30">
 {urgencyLabel}
 </span>
 )}
 {owner?.city && (
 <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-foreground">
 <MapPin className="h-3.5 w-3.5 text-primary/70" />
 {owner.city}
 </span>
 )}
 </div>

 {/* Title — sanitize pour corriger les espaces manquants ("4chats" → "4 chats") */}
 <h1 className="font-heading text-3xl md:text-4xl font-bold leading-tight tracking-tight mb-3 text-foreground">
 {sit.title ? sanitizeUserTitle(sit.title) : `Une mission de garde à ${owner?.city || "découvrir"}`}
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

 {/* ─── GALERIE PHOTOS ─────────────────────────────────────────────── */}
 <PublicSitGallery
   photos={photos}
   city={owner?.city}
   ownerFirstName={owner?.first_name}
 />

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
 alt={`Photo de ${capitalize(pet.name)}`}
 loading="lazy"
 className="w-12 h-12 rounded-full object-cover shrink-0"
 />
 ) : (
 <span
 className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center font-heading text-base font-bold text-primary shrink-0"
 aria-hidden="true"
 >
 {capitalize(pet.name).charAt(0) || "?"}
 </span>
 )}
 <div className="min-w-0">
 <p className="font-semibold text-sm truncate">{capitalize(pet.name)}</p>
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

 {/* ─── ROUTINE QUOTIDIENNE ──────────────────────────────────────── */}
 {sit.daily_routine && (
 <section className="mb-6 bg-card border border-border rounded-2xl p-5 md:p-6">
 <h2 className="font-heading text-xl font-semibold mb-3 flex items-center gap-2">
 <Calendar className="h-5 w-5 text-primary" />
 La routine quotidienne
 </h2>
 <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-line">
 {sit.daily_routine}
 </p>
 </section>
 )}

 {/* ─── PROFIL TYPE DE GARDIEN RECHERCHÉ ─────────────────────────── */}
 {sit.open_to && sit.open_to.length > 0 && !sit.open_to.every((t: string) => ["any", "no_preference", "Sans préférence"].includes(t)) && (
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

 {/* ─── DERNIERS AVIS REÇUS ───────────────────────────────────────── */}
 {latestReviews.length > 0 && (
 <section className="mb-6">
 <h2 className="font-heading text-xl font-semibold mb-3 flex items-center gap-2">
 <Star className="h-5 w-5 text-secondary fill-secondary" />
 Ce que disent les gardiens précédents
 </h2>
 <div className="space-y-3">
 {latestReviews.map((r, i) => (
 <article key={i} className="bg-card border border-border rounded-2xl p-4 md:p-5">
 <div className="flex items-center gap-1.5 mb-1.5">
 {Array.from({ length: 5 }).map((_, k) => (
 <Star
 key={k}
 className={`h-4 w-4 ${k < Math.round(r.overall_rating) ? "text-secondary fill-secondary" : "text-muted-foreground/30"}`}
 />
 ))}
 <span className="text-xs text-muted-foreground ml-1">
 {format(new Date(r.created_at), "MMMM yyyy", { locale: fr })}
 </span>
 </div>
 <p className="text-sm text-foreground/85 leading-relaxed line-clamp-4">
 « {r.comment} »
 </p>
 </article>
 ))}
 </div>
 </section>
 )}

      {/* ─── PARTAGE — propriétaire de l'annonce uniquement, replié par défaut ── */}
      {viewerType === "owner_of_sit" && (
        <details className="mb-6 rounded-2xl border border-border bg-card group">
          <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between text-sm font-medium">
            <span>Partager cette annonce</span>
            <span className="text-xs text-muted-foreground group-open:hidden">Ouvrir</span>
            <span className="text-xs text-muted-foreground hidden group-open:inline">Fermer</span>
          </summary>
          <div className="px-4 pb-4">
            <ShareButtons
              sitId={sit.id}
              title={sit.title || `Garde à ${owner?.city || "France"}`}
              city={owner?.city}
              source="public_sit_detail"
              viewerType={viewerType}
            />
          </div>
        </details>
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

 {/* ─── MINI-FAQ — visiteurs anonymes uniquement ─────────────────── */}
 {!isAuthenticated && <PublicSitFAQ />}

 {/* ─── BLOC DE RÉASSURANCE FINAL ────────────────────────────────── */}
 {!isAuthenticated && (
 <section className="mt-2 rounded-2xl bg-card border border-border p-6 text-center">
 <p className="font-heading text-base md:text-lg font-semibold mb-2">
 Vous gardez l'esprit léger&nbsp;: en cas d'imprévu, le réseau de
 gardiens d'urgence Guardiens prend le relais.
 </p>
 <p className="text-xs text-muted-foreground mb-4">
 Profils vérifiés · Avis croisés · Gardiens d'urgence mobilisables
 </p>
 <Link
 to="/"
 className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
 >
 Découvrir Guardiens en 1 minute →
 </Link>
 </section>
 )}

      {/* ─── CTA STICKY ─── (masqué pour le propriétaire de l'annonce) */}
      {viewerType !== "owner_of_sit" && (
      <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] z-40 shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.08)]">
        <div className="max-w-md mx-auto">
 {/* Réassurance pré-CTA supprimée — déjà couverte par PublicSitTrustStrip et le bloc final */}
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
 ? `S'inscrire et postuler — aider ${owner.first_name}`
 : "S'inscrire gratuitement et postuler"}
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
 {/* Note honnêteté : abonnement gardien à venir */}
 {!isAuthenticated && (sit as any).accepting_applications && (
 <p className="text-[11px] text-muted-foreground text-center mt-2 leading-snug">
 Inscription et candidature gratuites aujourd'hui. Un abonnement gardien sera introduit à terme — vous serez prévenu(e) avant tout changement.
 </p>
 )}
        </div>
      </div>
      )}
      </div>
 {/* Fin wrapper max-w-4xl */}
 </div>

 {/* Footer public — anonymes uniquement */}
 {!isAuthenticated && <PublicFooter />}

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
