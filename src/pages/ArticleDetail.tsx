import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Calendar, MapPin, User, Compass, Building2 } from "lucide-react";
import PageMeta from "@/components/PageMeta";
import { Helmet } from "react-helmet-async";
import { logSeoSnapshot } from "@/lib/seoDebugLog";
import { format } from "date-fns";
import { fr, enUS, es, it as itLocale, de as deLocale } from "date-fns/locale";
import ArticleRenderer, { resolveImagePath } from "@/components/articles/ArticleRenderer";
import ArticleAuthorBio from "@/components/articles/ArticleAuthorBio";
import PageBreadcrumb from "@/components/seo/PageBreadcrumb";
import { parseFaqFromMarkdown, buildFaqSchema } from "@/lib/parseFaq";
import { parseHowToFromMarkdown, buildHowToSchema } from "@/lib/parseHowTo";
import { getOptimizedImageUrl } from "@/lib/imageOptim";
import { resolveAuthors } from "@/data/authors";
import { trackEvent } from "@/lib/analytics";
import { SITTER_PRICE_NUMERIC, SITTER_PRICE_CURRENCY, SITTER_PRICE_START_ISO } from "@/lib/pricing";

interface ArticleFull {
 id: string;
 title: string;
 slug: string;
 excerpt: string;
 content: string;
 cover_image_url: string | null;
 canonical_url: string | null;
 category: string;
 tags: string[];
 city: string | null;
 region: string | null;
 author_name: string;
 published_at: string | null;
 updated_at: string;
 created_at: string;
 related_city: string | null;
 meta_title: string | null;
 meta_description: string | null;
 hero_image_alt: string | null;
 internal_links: any;
 noindex: boolean | null;
}

interface RelatedArticle {
 slug: string;
 title: string;
 excerpt: string;
 category: string;
}

const CATEGORY_LABELS: Record<string, string> = {
 conseil: "Conseil",
 guide_ville: "Guide ville",
 race: "Races & espèces",
 temoignage: "Témoignage",
 astuce: "Astuce",
 conseil_gardien: "Conseil gardien",
 conseil_proprio: "Conseil proprio",
 guide_race: "Guide race",
 guide_lieu: "Guide lieu",
 actualite: "Actualité",
 ville: "Ville",
 vie_locale: "Vie locale",
 guide_local: "Guide local",
 guide_pratique: "Guide pratique",
  saisonnier: "Saisonnier",
  guide_central: "Guide central",
};

/** Generate alt text from article data when hero_image_alt is empty */
function generateAltText(article: ArticleFull): string {
 const cat = article.category;
 const city = article.city || "";
 const title = article.title;
 
 if (cat === "guide_race" || cat === "race") {
 return `${title}, guide garde d'animaux Guardiens`;
 }
 if (cat === "ville" || cat === "guide_ville") {
 return `House-sitting à ${city || title}, gardiens de confiance`;
 }
 if (cat === "vie_locale") {
 return `${title}, entraide Guardiens`;
 }
 if (cat === "guide_lieu" || cat === "guide_local") {
 return city ? `${title} à ${city}, guide Guardiens` : `${title}, guide Guardiens`;
 }
 return `${title}, Guardiens`;
}


// Les redirections d'articles (301) sont désormais gérées en base via la table
// public.redirects (cf. migration). La résolution se fait au montage du
// composant via un SELECT direct, ce qui évite tout flash de 404 et garde une
// source de vérité unique partagée avec l'edge function `redirect-lookup` (qui
// sert le worker Cloudflare prerender pour émettre un vrai 301 aux crawlers).

/**
 * Tiny child component: re-runs after PageMeta has flushed Helmet so we can
 * record both the DB-level article context and the resulting <head>.
 */
function ArticleSeoLogger({ article }: { article: ArticleFull }) {
  useEffect(() => {
    logSeoSnapshot({
      path: `/actualites/${article.slug}`,
      source: "ArticleDetail",
      input: {
        title: article.meta_title || article.title,
        description: article.meta_description || article.excerpt,
        canonical: article.canonical_url ?? null,
        noindex: article.noindex === true,
        type: "article",
      },
      article: {
        id: article.id,
        slug: article.slug,
        canonical_url: article.canonical_url,
        noindex: article.noindex,
        meta_title: article.meta_title,
        meta_description: article.meta_description,
      },
    });
  }, [article]);
  return null;
}

export default function ArticleDetail() {
 const { slug } = useParams<{ slug: string }>();
 const navigate = useNavigate();
 const { t, i18n } = useTranslation();
 const { user, isAuthenticated } = useAuth();
 const [article, setArticle] = useState<ArticleFull | null>(null);
 const [loading, setLoading] = useState(true);
 const [relatedArticles, setRelatedArticles] = useState<RelatedArticle[]>([]);
 const [cityGuideSlug, setCityGuideSlug] = useState<string | null>(null);
 const [cityPageSlug, setCityPageSlug] = useState<string | null>(null);

  useEffect(() => {
  if (!slug) return;
  let cancelled = false;
  const fetchAll = async () => {
    // 1) Vérifier la table redirects (source de vérité unique).
    //    Boucle de résolution courte (≤ 5 sauts) pour gérer les chaînes.
    let current = slug;
    const visited = new Set<string>([current]);
    for (let i = 0; i < 5; i++) {
      const { data: red } = await supabase
        .from("redirects")
        .select("slug_to")
        .eq("slug_from", current)
        .maybeSingle();
      if (!red?.slug_to || visited.has(red.slug_to)) break;
      current = red.slug_to;
      visited.add(current);
    }
    if (current !== slug) {
      if (!cancelled) navigate(`/actualites/${current}`, { replace: true });
      return;
    }
 const { data } = await supabase
.from("articles")
.select("*")
.eq("slug", slug)
.eq("published", true)
.maybeSingle();
 let art = data as ArticleFull | null;
 // Overlay traduction si langue ≠ fr
 const currentLang = (i18n.language || "fr").split("-")[0].toLowerCase();
 if (art && ["en", "es", "it", "de"].includes(currentLang)) {
   const { data: tr, error: trErr } = await supabase
     .from("article_translations")
     .select("title, excerpt, content, meta_title, meta_description, hero_image_alt")
     .eq("article_id", art.id)
     .eq("lang", currentLang)
     .maybeSingle();
   if (trErr) console.warn("[i18n] translation fetch error", trErr);
   if (tr) {
     art = {
       ...art,
       title: tr.title || art.title,
       excerpt: tr.excerpt || art.excerpt,
       content: tr.content || art.content,
       meta_title: tr.meta_title ?? art.meta_title,
       meta_description: tr.meta_description ?? art.meta_description,
       hero_image_alt: tr.hero_image_alt ?? art.hero_image_alt,
     };
   } else {
     console.info(`[i18n] no ${currentLang} translation for ${art.slug}`);
   }
 }
 setArticle(art);
 setLoading(false);
 window.prerenderReady = true;

 if (!art) return;

      // Hub & spoke maillage interne :
      // 1) liens sortants déclarés dans internal_links pointant vers /actualites/*
      // 2) liens entrants (autres articles dont internal_links pointe vers le slug courant)
      // 3) fallback : même catégorie
      const outgoingSlugs = Array.isArray(art.internal_links)
        ? (art.internal_links as Array<{ url?: string }>)
            .map((l) => {
              const m = String(l?.url ?? "").match(/^\/actualites\/([^/?#]+)/);
              return m ? m[1] : null;
            })
            .filter((s): s is string => !!s && s !== slug)
        : [];

      const [outgoingRes, incomingRes, sameCatRes] = await Promise.all([
        outgoingSlugs.length > 0
          ? supabase
              .from("articles")
              .select("slug, title, excerpt, category")
              .eq("published", true)
              .in("slug", outgoingSlugs)
          : Promise.resolve({ data: [] as RelatedArticle[] }),
        supabase
          .from("articles")
          .select("slug, title, excerpt, category")
          .eq("published", true)
          .neq("slug", slug)
          .contains("internal_links", [{ url: `/actualites/${slug}` }])
          .limit(6),
        supabase
          .from("articles")
          .select("slug, title, excerpt, category")
          .eq("published", true)
          .eq("category", art.category)
          .neq("slug", slug)
          .limit(6),
      ]);

      const seen = new Set<string>();
      const merged: RelatedArticle[] = [];
      for (const list of [outgoingRes.data, incomingRes.data, sameCatRes.data]) {
        for (const a of (list as RelatedArticle[] | null) ?? []) {
          if (!seen.has(a.slug)) {
            seen.add(a.slug);
            merged.push(a);
          }
        }
      }
      setRelatedArticles(merged.slice(0, 4));

 // Cross-link: city guide
 if (art.city) {
 const { data: guide } = await supabase
.from("city_guides")
.select("slug")
.eq("published", true)
.ilike("city", `%${art.city}%`)
.maybeSingle();
 if (guide) setCityGuideSlug((guide as any).slug);

 const { data: cp } = await supabase
.from("seo_city_pages")
.select("slug")
.eq("published", true)
.ilike("city", `%${art.city}%`)
.maybeSingle();
 if (cp) setCityPageSlug((cp as any).slug);
 }
 };
  fetchAll();
  return () => { cancelled = true; };
  }, [slug, i18n.language]);

 // CTA tracking, listen for clicks on data-article-cta links inside the rendered article
 useEffect(() => {
   if (!article) return;
   const handler = (e: Event) => {
     const target = (e.target as HTMLElement | null)?.closest?.(
       "a[data-article-cta='true']"
     ) as HTMLAnchorElement | null;
     if (!target) return;
     const ctaPosition = target.getAttribute("data-cta-position") || undefined;
     const ctaRole = target.getAttribute("data-cta-role") || undefined;
     const articleSlug =
       target.getAttribute("data-article-slug") || article.slug;
     trackEvent("cta_click", {
       source: `article:${articleSlug}`,
       metadata: {
         article_slug: articleSlug,
         cta_position: ctaPosition,
         cta_role: ctaRole,
         href: target.getAttribute("href"),
       },
     });
   };
   document.addEventListener("click", handler, { capture: true });
   return () => document.removeEventListener("click", handler, { capture: true } as any);
 }, [article]);

 if (loading) {
 return (
 <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
 <Skeleton className="h-8 w-48" />
 <Skeleton className="h-64 w-full rounded-lg" />
 <Skeleton className="h-6 w-3/4" />
 <Skeleton className="h-4 w-full" />
 <Skeleton className="h-4 w-full" />
 <Skeleton className="h-4 w-2/3" />
 </div>
 );
 }

 if (!article) {
 return (
 <div className="max-w-3xl mx-auto px-4 py-16 text-center">
 <h1 className="text-2xl font-heading font-bold text-foreground mb-4">Article introuvable</h1>
 <Link to="/actualites" className="text-primary hover:underline">
 ← Retour aux guides
 </Link>
 </div>
 );
 }

 const altText = article.hero_image_alt || generateAltText(article);
 // Normalize internal_links: support both { text, url } and legacy { anchor, slug } formats
 const rawLinks = (article.internal_links as any[] | null) || [];
 const internalLinks = rawLinks.map((link: any) => ({
 text: link.text || link.anchor || "",
 url: link.url || (link.slug ? `/actualites/${link.slug}` : "#"),
 })).filter((l: any) => l.text);

 // Schema.org Article, CORRECTION 1
 const articleSchema = {
 "@context": "https://schema.org",
 "@type": "Article",
 "headline": article.meta_title || article.title,
 "description": article.meta_description || article.excerpt,
 "url": `https://guardiens.fr/actualites/${article.slug}`,
 "datePublished": article.created_at,
 "dateModified": article.updated_at,
 ...(article.cover_image_url && { "image": article.cover_image_url }),
 "author": (() => {
   const matched = resolveAuthors(article.author_name);
   if (matched.length === 0) {
     return { "@type": "Organization", "name": "Guardiens", "url": "https://guardiens.fr" };
   }
   const persons = matched.map((a) => ({
     "@type": "Person",
     "name": a.firstName,
     "url": `https://guardiens.fr/auteurs/${a.slug}`,
   }));
   return persons.length === 1 ? persons[0] : persons;
 })(),
 "publisher": {
 "@type": "Organization",
 "name": "Guardiens",
 "url": "https://guardiens.fr",
 "logo": {
 "@type": "ImageObject",
 "url": "https://guardiens.fr/logo.png"
 }
 },
 "mainEntityOfPage": {
 "@type": "WebPage",
 "@id": `https://guardiens.fr/actualites/${article.slug}`
 },
 };

  // FAQ schema, parsed from :::faq blocks
  const faqItems = parseFaqFromMarkdown(article.content);
  const faqSchema = buildFaqSchema(faqItems);

  // HowTo schema, parsed from a "## … étapes …" section (e.g. pilier 01)
  const howToSteps = parseHowToFromMarkdown(article.content);
  const howToSchema = buildHowToSchema(howToSteps, {
    name: article.meta_title || article.title,
    description: article.meta_description || article.excerpt || undefined,
  });

  return (
    <>
    <PageMeta
    title={article.meta_title || article.title}
    description={article.meta_description || article.excerpt}
    path={`/actualites/${article.slug}`}
    image={article.cover_image_url || undefined}
    type="article"
    publishedAt={article.published_at || undefined}
    author={article.author_name}
    noindex={article.noindex === true}
    canonical={article.canonical_url || undefined}
    />
    <ArticleSeoLogger article={article} />

    {/* Schema.org, Article + (optionnel) FAQPage + (optionnel) HowTo. */}
    {/* On émet 3 <script> séparés pour rester lisible côté Search Console. */}
    <Helmet>
    <script type="application/ld+json">{JSON.stringify(articleSchema)}</script>
    {faqSchema && (
    <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
    )}
    {howToSchema && (
    <script type="application/ld+json">{JSON.stringify(howToSchema)}</script>
    )}
    </Helmet>

 {/* Product/Offer Schema for pricing articles */}
 {article.slug === "nouveaux-tarifs-2026" && (
 <Helmet>
 <script type="application/ld+json">{JSON.stringify({
  "@context": "https://schema.org",
  "@type": "Service",
  "serviceType": "Abonnement plateforme de gardiennage entre particuliers",
  "name": "Abonnement Gardien Guardiens",
  "description": "Abonnement pour devenir gardien de maison et d'animaux sur Guardiens. Sans engagement, résiliable à tout moment.",
  "provider": { "@type": "Organization", "name": "Guardiens", "url": "https://guardiens.fr" },
  "areaServed": { "@type": "Country", "name": "France" },
 "offers": {
 "@type": "Offer",
 "name": "Abonnement gardien mensuel",
 "price": String(SITTER_PRICE_NUMERIC),
 "priceCurrency": SITTER_PRICE_CURRENCY,
 "eligibleCustomerType": "Sitter",
 "availabilityStarts": SITTER_PRICE_START_ISO,
 "description": "Abonnement gardien à 6,99 €/mois à partir du 14 juillet 2026.",
 "priceSpecification": {
 "@type": "UnitPriceSpecification",
 "price": "6.99",
 "priceCurrency": "EUR",
 "referenceQuantity": {
 "@type": "QuantitativeValue",
 "value": "1",
 "unitCode": "MON"
 }
 },
 "availability": "https://schema.org/InStock"
 }
 })}</script>
 </Helmet>
 )}

 {/* LocalBusiness Schema for geo-targeted guide articles */}
 {article.category === "guide_lieu" && article.city && (
 <Helmet>
 <script type="application/ld+json">{JSON.stringify({
 "@context": "https://schema.org",
 "@type": "LocalBusiness",
 "name": `Guardiens, Pet-sitting & House-sitting ${article.city}`,
 "description": article.excerpt,
 "url": `https://guardiens.fr/actualites/${article.slug}`,
 "address": {
 "@type": "PostalAddress",
 "addressLocality": article.city,
...(article.region ? { "addressRegion": article.region } : {}),
 "addressCountry": "FR"
 },
 "priceRange": "Gratuit pour les propriétaires",
 })}</script>
 </Helmet>
 )}

 <main id="main-content">
  <PageBreadcrumb items={[
 { label: t("article.news", "Actualités"), href: "/actualites" },
 { label: article.title },
 ]} />

 <article className="max-w-3xl mx-auto px-4 py-8 animate-fade-in">

 <header className="mb-8">
 <div className="flex items-center gap-2 mb-3 flex-wrap">
 <Badge variant="secondary">
 {t(`article.categories.${article.category}`, CATEGORY_LABELS[article.category] || article.category)}
 </Badge>
 {article.city && (
 <span className="flex items-center gap-1 text-sm text-muted-foreground">
 <MapPin className="h-3.5 w-3.5" />
 {article.city}{article.region ? `, ${article.region}` : ""}
 </span>
 )}
 </div>

 <h1 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-3 leading-tight">
 {article.title}
 </h1>

 {/* CORRECTION 6, Date de mise à jour ou publication */}
 <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
 <Calendar className="h-3.5 w-3.5" />
 {(() => {
   const dfLocale = ({ fr, en: enUS, es, it: itLocale, de: deLocale } as any)[i18n.language] || fr;
   const isUpdated = article.updated_at && article.created_at && new Date(article.updated_at).getTime() - new Date(article.created_at).getTime() > 86400000;
   const d = isUpdated ? article.updated_at : (article.published_at || article.created_at);
   const formatted = format(new Date(d), "d MMMM yyyy", { locale: dfLocale });
   return <span>{t(isUpdated ? "article.updatedOn" : "article.publishedOn", { date: formatted, defaultValue: `${isUpdated ? "Mis à jour le" : "Publié le"} ${formatted}` })}</span>;
 })()}
 </div>

 <div className="flex items-center gap-4 text-sm text-muted-foreground">
 <span className="flex items-center gap-1">
 <User className="h-3.5 w-3.5" />
 {article.author_name}
 </span>
 {article.published_at && (
 <span className="flex items-center gap-1">
 <Calendar className="h-3.5 w-3.5" />
 {format(new Date(article.published_at), "d MMMM yyyy", { locale: fr })}
 </span>
 )}
 </div>
 </header>

  {/* CORRECTION 2, Alt text systématique. Les couvertures PNG (illustrations
      à fond transparent / coups de pinceau) sont rendues sans cadre ni crop,
      pour donner l'impression que l'illustration est peinte directement sur la
      page. Les couvertures JPG/WebP (photos) gardent le rendu encadré. */}
  {article.cover_image_url && (() => {
    const isTransparentArtwork = /\.png(\?|$)/i.test(article.cover_image_url);
    return isTransparentArtwork ? (
      <div className="mb-8 -mx-2 sm:-mx-4">
        <img
          src={resolveImagePath(article.cover_image_url)}
          alt={altText}
          className="block w-full h-auto"
          loading="eager"
          decoding="async"
          width={1600}
          height={896}
        />
      </div>
    ) : (
      <div className="rounded-xl overflow-hidden mb-8">
        <img
          src={getOptimizedImageUrl(resolveImagePath(article.cover_image_url), 800, 75)}
          alt={altText}
          className="w-full h-auto max-h-96 object-cover"
          loading="eager"
          decoding="async"
          width={800}
          height={427}
        />
      </div>
    );
  })()}

 <ArticleRenderer content={article.content} userRole={isAuthenticated ? user?.role : undefined} slug={article.slug} />

 {/* Bloc « À propos de l'auteur », affiché si l'auteur est identifié (Jérémie / Elisa) */}
 <ArticleAuthorBio authorName={article.author_name} />

 {/* CORRECTION 3, À lire aussi (internal links) */}
 {internalLinks.length > 0 && (
 <div className="mt-10 p-5 rounded-xl bg-muted/50 border border-border">
 <h3 className="font-heading text-lg font-semibold text-foreground mb-3">À lire aussi</h3>
 <div className="grid gap-3 sm:grid-cols-2">
 {internalLinks.slice(0, 4).map((link, i) => (
 <Link
 key={i}
 to={link.url}
 className="group flex items-center gap-2 p-3 rounded-lg bg-background border border-border hover:border-primary/30 hover:shadow-sm transition-all"
 >
 <ArrowRight className="h-4 w-4 text-primary shrink-0" />
 <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">
 {link.text}
 </span>
 </Link>
 ))}
 </div>
 </div>
 )}

 {/* Cross-links to city pages */}
 {(cityGuideSlug || cityPageSlug) && (
 <div className="mt-8 p-4 rounded-lg bg-muted/50 border border-border space-y-2">
 <p className="text-sm font-medium text-foreground">En savoir plus sur {article.city} :</p>
 <div className="flex flex-wrap gap-3">
 {cityPageSlug && (
 <Link
 to={`/house-sitting/${cityPageSlug}`}
 className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
 >
 <Building2 className="h-3.5 w-3.5" />
 Pet sitting à {article.city}
 </Link>
 )}
 {cityGuideSlug && (
 <Link
 to={`/guides/${cityGuideSlug}`}
 className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
 >
 <Compass className="h-3.5 w-3.5" />
 Guide local {article.city}
 </Link>
 )}
 </div>
 </div>
 )}

 {article.tags.length > 0 && (
 <div className="flex flex-wrap gap-2 mt-10 pt-6 border-t border-border">
 {article.tags.map((tag) => (
 <Badge key={tag} variant="outline" className="text-xs">
 #{tag}
 </Badge>
 ))}
 </div>
 )}

 {/* Related articles */}
 {relatedArticles.length > 0 && (
 <div className="mt-10 pt-8 border-t border-border">
            <h2 className="font-heading text-xl font-semibold text-foreground mb-4">
              Articles liés
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
 {relatedArticles.map((a) => (
 <Link key={a.slug} to={`/actualites/${a.slug}`} className="group">
 <Card className="h-full hover:shadow-md transition-shadow">
 <CardContent className="p-4">
 <Badge variant="secondary" className="mb-2 text-xs">
 {CATEGORY_LABELS[a.category] || a.category}
 </Badge>
 <h3 className="font-heading font-semibold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-2 mb-1">
 {a.title}
 </h3>
 <p className="text-xs text-muted-foreground line-clamp-2">{a.excerpt}</p>
 <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary">
 Lire <ArrowRight className="h-3 w-3" />
 </span>
 </CardContent>
 </Card>
 </Link>
 ))}
 </div>
 </div>
 )}
 </article>
 </main>
 </>
 );
}
