// Page publique partagée d'une annonce, accessible sans compte, indexable.
// Utilisée pour le partage externe (Facebook, LinkedIn, WhatsApp, lien direct).
// Les meta og:* sont injectées via Helmet ; les caches sociaux liront index.html
// après prerender (Prerender.io / Cloudflare Worker, TODO infra).
import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import PageMeta from "@/components/PageMeta";
import {
  ArrowLeft,
  ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { trackEvent } from "@/lib/analytics";
import { sanitizeUserTitle } from "@/lib/sanitizeTitle";
import { logger } from "@/lib/logger";

import ApplicationModal from "@/components/sits/ApplicationModal";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";
import PublicSitView from "@/components/sits/PublicSitView";
import {
  ENV_LABELS as envLabels,
  TYPE_LABELS as typeLabels,
  SPECIES_LABEL as speciesLabel,
} from "@/components/sits/shared/sitConstants";

type ViewerType = "anonymous" | "gardien" | "proprio" | "owner_of_sit" | "admin";

const PublicSitDetail = () => {
 const { id: rawParam } = useParams<{ id: string }>();
 const param = rawParam?.replace(/[\s\u00A0\u200B-\u200D\uFEFF]+/g, "") || undefined;
 const navigate = useNavigate();
 const { user, isAuthenticated } = useAuth();
 const { hasAccess } = useSubscriptionAccess();
 const [sit, setSit] = useState<any>(null);
 const [owner, setOwner] = useState<any>(null);
 const [property, setProperty] = useState<any>(null);
 const [pets, setPets] = useState<any[]>([]);
 const [ownerProfile, setOwnerProfile] = useState<any>(null);
 const [hasHouseGuide, setHasHouseGuide] = useState(false);
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
    if (!loading && (loadError || !sit)) {
      window.prerenderReady = true;
    }
  }, [loading, loadError, sit]);

  useEffect(() => {
    if (!param) return;
    const load = async () => {
      try {
        // Param peut être un UUID (URL legacy) ou un slug SEO.
        const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const isUuid = UUID_RE.test(param);
        const query = supabase.from("sits").select("*").limit(1);
        const { data: sitRows, error: sitErr } = await (isUuid ? query.eq("id", param) : query.eq("slug", param));
        if (sitErr) throw sitErr;
        const sitData = sitRows?.[0];
        if (!sitData) {
          setLoadError("not_found");
          return;
        }
        setSit(sitData);

        // 301-like : si on est arrivés via UUID mais qu'un slug existe, on
        // remplace l'URL par la version slug (mieux pour SEO, partages, CTR).
        if (isUuid && sitData.slug && sitData.slug !== param) {
          navigate(`/annonces/${sitData.slug}${window.location.search}${window.location.hash}`, { replace: true });
        }
        const id = sitData.id;


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

        // Override : si l'annonce porte une ville/pays spécifiques (résidence secondaire,
        // garde à l'étranger), ils priment sur la ville du profil propriétaire.
        const sitCity = (sitData as any).city?.trim();
        const sitCountry = (sitData as any).country?.trim();
        if (enrichedOwner && (sitCity || (sitCountry && sitCountry !== "FR"))) {
          enrichedOwner = {
            ...enrichedOwner,
            city: sitCity || enrichedOwner.city,
            country: sitCountry || (enrichedOwner as any).country || "FR",
          } as any;
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
            const { data: petsData } = await supabase.from("public_pets" as any).select("*").eq("property_id", propertyData.id);
            setPets(petsData || []);
          } catch (e) { logger.warn("[PublicSitDetail] pets load failed", { error: (e as any)?.message }); }
          try {
            const { data: opRow } = await supabase
              .from("owner_profiles")
              .select("presence_expected, visits_allowed, overnight_guest, space_usage, smoker_accepted, rules_notes, meeting_preference, handover_preference, welcome_notes, news_frequency, news_format, communication_notes, competences, competences_disponible, specific_expectations, experience_required, environments")
              .eq("user_id", sitData.user_id)
              .maybeSingle();
            setOwnerProfile(opRow || null);
          } catch (e) { logger.warn("[PublicSitDetail] owner_profile load failed", { error: (e as any)?.message }); }
          try {
            const { data: hgRow } = await supabase
              .from("house_guides")
              .select("id")
              .eq("property_id", propertyData.id)
              .maybeSingle();
            setHasHouseGuide(!!hgRow);
          } catch (e) { logger.warn("[PublicSitDetail] house_guide load failed", { error: (e as any)?.message }); }
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
              else if (role === "both") resolvedViewer = "proprio"; // par défaut : aperçu public, toggle dispo
              else resolvedViewer = "gardien";
            }
          }
        }
        setViewerType(resolvedViewer);

        // Rôle simple "gardien" : redirection auto vers la vue gardien.
        // "proprio" (incluant "both" par défaut) : on reste sur l'aperçu public ;
        // les "both" voient un toggle pour basculer en vue gardien.
        if (resolvedViewer === "gardien") {
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
        logger.warn("[PublicSitDetail] load failed", { sit_param: param, error: e?.message });
        setLoadError("error");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [param, user, navigate]);


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
  const ownerCountry = ((owner as any)?.country as string | undefined)?.trim() || (sit as any)?.country?.trim() || "FR";
  const cityForTitle = (owner?.city && ownerCountry && ownerCountry !== "FR")
    ? `${owner.city} (${ownerCountry})`
    : (owner?.city || "France");
 const startFmt = sit.start_date ? format(new Date(sit.start_date), "d MMMM", { locale: fr }) : "";
 const endFmt = sit.end_date ? format(new Date(sit.end_date), "d MMMM yyyy", { locale: fr }) : "";
 const datesShort = startFmt && endFmt ? `du ${startFmt} au ${endFmt}` : "dates flexibles";

 const petsSummary = pets.length > 0
 ? pets.map((p: any) => `${p.name} (${speciesLabel[p.species] || p.species})`).join(", ")
 : "animaux à confier";

 // og:title, titre de l'annonce + ville (si dispo) + suffixe Guardiens
 const ownerCity = owner?.city?.trim() || "";
 const baseTitle = sit.title || "Garde de maison et animaux";
 const ogTitle = ownerCity
 ? `${baseTitle} à ${ownerCity}, Guardiens`
 : `${baseTitle}, Guardiens`;
 const truncatedTitle = ogTitle.length > 60 ? ogTitle.slice(0, 57) + "…" : ogTitle;

 // og:description, ville (si dispo) + dates en français + description courte du logement
 const propertyDescShort = property?.description
 ? (property.description.length > 80 ? property.description.slice(0, 77) + "…" : property.description)
 : "";
 const datesPart = startFmt && endFmt ? `Du ${startFmt} au ${endFmt}.` : "Dates flexibles.";
 const cityPart = ownerCity ? `${ownerCity}. ` : "";
 const ogDescription = propertyDescShort
 ? `${cityPart}${datesPart} ${propertyDescShort} Partagez la confiance entre gens du coin avec Guardiens.`
 : "Partez l'esprit tranquille avec un gardien près de chez vous. Guardiens, c'est la confiance entre gens du coin.";
 const truncatedDesc = ogDescription.length > 200 ? ogDescription.slice(0, 197) + "…" : ogDescription;

 // SEO description (≤160 char), distincte de og:description
  const seoDescription = `Garde à ${cityForTitle} ${datesShort}. ${petsSummary}. ${owner?.first_name || "Un membre"} cherche un gardien du coin sur Guardiens, inscription gratuite pour les propriétaires.`;
 const truncatedSeoDesc = seoDescription.length > 160 ? seoDescription.slice(0, 157) + "…" : seoDescription;

  // Canonical TOUJOURS sur le domaine de prod : sur preview/lovableproject,
  // le partage social (FB/LinkedIn/WhatsApp) doit pointer vers guardiens.fr
  // où le prerender sert les meta OG. Sinon, aperçu vide / URL moche.
  const sitSeg = (sit.slug && sit.slug.trim().length > 0) ? sit.slug : sit.id;
  const canonicalUrl = `https://guardiens.fr/annonces/${sitSeg}`;

 // og:image, visuel personnalisé généré à la volée (photo de couverture réelle
 // de l'annonce + titre + ville + dates + animaux + propriétaire). Servi par
 // l'edge function `og-sit` (1200×630, optimisé Facebook/LinkedIn/WhatsApp/X).
 const ogImageUrl = `https://erhccyqevdyevpyctsjj.supabase.co/functions/v1/og-sit?id=${sit.id}&v=cover-only-20260522`;
 const ogImageAlt = `${sit.title || "Annonce de garde"}, ${cityForTitle}, ${datesShort}`;

  const MetaReady = () => {
    useEffect(() => {
      window.prerenderReady = true;
    }, []);
    return null;
  };

 const jsonLd: Record<string, any> = {
 "@context": "https://schema.org",
 "@type": "Service",
 name: sit.title || `Garde d'animaux à ${cityForTitle}`,
 description: truncatedSeoDesc,
 serviceType: ["House Sitting", "Pet Sitting"],
 provider: {
 "@type": "Person",
 name: owner?.first_name || "Membre Guardiens",
 ...(owner?.identity_verified && {
   hasCredential: {
     "@type": "EducationalOccupationalCredential",
     credentialCategory: "Identity Verified",
     recognizedBy: { "@type": "Organization", name: "Guardiens" },
   },
 }),
 },
 ...(ogImageUrl && { image: ogImageUrl }),
 areaServed: {
   "@type": "City",
   name: cityForTitle,
   address: { "@type": "PostalAddress", addressLocality: cityForTitle, addressCountry: "FR" },
 },
 offers: {
 "@type": "Offer",
 price: "0",
 priceCurrency: "EUR",
 eligibleCustomerType: "Owner",
  description: "Gratuit pour les propriétaires, sans abonnement requis.",
 availability: "https://schema.org/InStock",
 ...(sit.start_date && { validFrom: sit.start_date }),
 ...(sit.end_date && { validThrough: sit.end_date }),
 },
 ...(owner?.completed_sits_count && owner.completed_sits_count > 0 && {
   interactionStatistic: {
     "@type": "InteractionCounter",
     interactionType: "https://schema.org/PerformAction",
     userInteractionCount: owner.completed_sits_count,
     name: "Gardes déjà accueillies par ce membre",
   },
 }),
 };


  // Critère d'indexation (qualité minimum pour éviter le thin content) :
   // - ≥3 photos dont au moins 2 en haute résolution (≥800×600px)
   // - ≥200 caractères de texte substantiel (description + routine)
   // - titre personnalisé (≥10 caractères)
   // - au moins 1 animal renseigné
   // - bio propriétaire ≥50 caractères (signal de profil complet)
   // Tolérance : si aucune photo n'a ses dimensions stockées (anciennes annonces),
   // on garde le filtre simple par nombre de photos.
   const galleryCount = property?.photos?.length || 0;
   const hiQualityCount: number = (property as any)?._hiQualityCount ?? 0;
   const photosOk = galleryCount >= 3 && (hiQualityCount === 0 || hiQualityCount >= 2);
   const richTextLength = (property?.description || "").length + (sit.daily_routine || "").length;
   const hasCustomTitle = typeof sit.title === "string" && sit.title.trim().length >= 10;
   const hasPets = pets.length > 0;
   const hasOwnerBio = (owner?.bio || "").trim().length >= 50;
   const isIndexable = photosOk && richTextLength >= 200 && hasCustomTitle && hasPets && hasOwnerBio;

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
       // Le 2e niveau de breadcrumb pointe vers une page silo /house-sitting/<ville>
       // qui n'existe que pour les villes FR (silos SEO Lyon/Annecy/Grenoble + autres CityPages).
       // On l'omet pour les annonces internationales pour éviter une URL en 404.
       ...(citySlug && (!ownerCountry || ownerCountry === "FR") ? [{ "@type": "ListItem", position: 2, name: cityForTitle, item: `${origin}/house-sitting/${citySlug}` }] : []),
       { "@type": "ListItem", position: (citySlug && (!ownerCountry || ownerCountry === "FR")) ? 3 : 2, name: sit.title || "Annonce de garde", item: canonicalUrl },
 ],
 };

  // Handler de partage unifié.
  const handleShare = async () => {
    const canNativeShare =
      typeof navigator !== "undefined" &&
      typeof navigator.share === "function" &&
      window.top === window.self; // navigator.share bloqué dans les iframes (preview)
    if (canNativeShare) {
      try {
        await navigator.share({ title: truncatedTitle, url: canonicalUrl });
        return;
      } catch (err: any) {
        if (err?.name === "AbortError") return; // l'utilisateur a annulé
        // sinon, on retombe sur le presse-papiers
      }
    }
    try {
      await navigator.clipboard.writeText(canonicalUrl);
      toast.success("Lien copié dans le presse-papiers");
      return;
    } catch {
      // fallback ultime : textarea + execCommand
      try {
        const ta = document.createElement("textarea");
        ta.value = canonicalUrl;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        toast.success("Lien copié");
      } catch {
        toast.error("Impossible de copier le lien");
      }
    }
  };

  const handleApply = () => {
    try {
      trackEvent("sit_apply_clicked", {
        source: "public_sit_detail",
        metadata: { sit_id: sit.id, viewer_type: viewerType },
      });
    } catch {}
    setApplyOpen(true);
  };

  return (
    <div className="bg-background">
      <PageMeta
        title={truncatedTitle}
        description={truncatedDesc}
        path={`/annonces/${sitSeg}`}
        image={ogImageUrl}
        type="article"
        canonical={canonicalUrl}
        noindex={!isIndexable}
      />
      <MetaReady />
      <Helmet>
        <meta property="og:image:alt" content={ogImageAlt} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:type" content="image/png" />
        <meta name="twitter:image:alt" content={ogImageAlt} />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbLd)}</script>
      </Helmet>

      {!isAuthenticated && <PublicHeader />}

      {/* Bandeau "aperçu public", propriétaire de l'annonce */}
      {viewerType === "owner_of_sit" && (
        <div className="bg-primary/5 border-b border-primary/15">
          <div className="max-w-6xl mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-2">
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

      {/* Bandeau toggle pour les comptes "both" (propriétaire + gardien) */}
      {viewerType === "proprio" && user && (user as any).role === "both" && (
        <div className="bg-secondary/30 border-b border-border">
          <div className="max-w-6xl mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs md:text-sm text-foreground/80">
              Vous consultez cette annonce <span className="font-medium text-foreground">comme propriétaire</span>.
            </p>
            <Button asChild size="sm" variant="outline" className="h-8 text-xs">
              <Link to={`/sits/${sit.id}?from=share&view=sitter`} className="inline-flex items-center gap-1.5">
                Voir comme gardien <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      )}

      <PublicSitView
        sit={sit}
        owner={owner}
        property={property}
        pets={pets}
        ownerProfile={ownerProfile}
        hasHouseGuide={hasHouseGuide}
        avgRating={avgRating}
        reviewCount={reviewCount}
        latestReviews={latestReviews}
        naturalDateLabel={naturalDateLabel}
        urgencyLabel={urgencyLabel}
        petsPitchSummary={petsPitchSummary}
        typeLabel={property ? (typeLabels[property.type] || property.type) : null}
        envLabel={property?.environment ? (envLabels[property.environment] || property.environment) : null}
        speciesLabel={speciesLabel}
        onShare={handleShare}
        isAuthenticated={isAuthenticated}
        hasAccess={hasAccess}
        hasApplied={hasApplied}
        onApply={handleApply}
      />

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
