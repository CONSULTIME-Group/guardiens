import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Calendar, MapPin, User, Compass, Building2 } from "lucide-react";
import PageMeta from "@/components/PageMeta";
import { Helmet } from "react-helmet-async";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import ArticleRenderer, { resolveImagePath } from "@/components/articles/ArticleRenderer";
import PageBreadcrumb from "@/components/seo/PageBreadcrumb";
import { parseFaqFromMarkdown, buildFaqSchema } from "@/lib/parseFaq";
import { getOptimizedImageUrl } from "@/lib/imageOptim";

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
};

/** Generate alt text from article data when hero_image_alt is empty */
function generateAltText(article: ArticleFull): string {
  const cat = article.category;
  const city = article.city || "";
  const title = article.title;
  
  if (cat === "guide_race" || cat === "race") {
    return `${title} — guide garde d'animaux Guardiens`;
  }
  if (cat === "ville" || cat === "guide_ville") {
    return `House-sitting à ${city || title} — gardiens de confiance`;
  }
  if (cat === "vie_locale") {
    return `${title} — entraide Guardiens`;
  }
  if (cat === "guide_lieu" || cat === "guide_local") {
    return city ? `${title} à ${city} — guide Guardiens` : `${title} — guide Guardiens`;
  }
  return `${title} — Guardiens`;
}


const ARTICLE_REDIRECTS: Record<string, string> = {
  "golden-retriever-lyon-guide-race": "golden-retriever-guide-race-complet",
  "berger-australien-guide": "berger-australien-guide-race",
  "preparer-maison-avant-vacances": "preparer-maison-avant-garde",
  "guide-lieu-meilleurs-parcs-chiens-lyon": "parcs-chiens-lyon-guide-complet",
  "guide-house-sitting-lyon": "house-sitting-lyon",
  "gardiennage-maison-vacances-aura": "house-sitting-aura-guide-complet",
  "house-sitting-auvergne-rhone-alpes": "house-sitting-aura-guide-complet",
  "pet-sitting-grenoble-chartreuse": "house-sitting-grenoble",
  "pet-sitting-grenoble-guide": "house-sitting-grenoble",
  "pet-sitting-annecy-guide": "house-sitting-annecy",
  "pet-sitting-lyon-guide-complet": "house-sitting-lyon",
  "pet-sitting-chambery-savoie": "house-sitting-chambery",
  "garde-chien-lyon-solutions": "house-sitting-lyon",
  "devenir-pet-sitter-guide-debutant": "creer-profil-gardien-attractif",
  "devenir-gardien-guide-complet": "creer-profil-gardien-attractif",
  "conseil-gardien-creer-profil-attractif-lyon": "creer-profil-gardien-attractif",
  "proprietaire-preparer-garde-maison": "preparer-maison-avant-garde",
  "pet-sitting-clermont-ferrand-guide": "pet-sitting-clermont-ferrand",
  "conseils-garder-chien": "reussir-premiere-garde-house-sitting",
  "erreurs-premiere-garde": "reussir-premiere-garde-house-sitting",
  "house-sitting-saint-etienne-guide": "pet-sitting-saint-etienne-loire",
  "jardinage-echange-service-voisin-grenoble": "jardinage-entraide-quartier-grenoble",
  "jardinage-echange-service-voisin-annecy": "jardinage-entraide-quartier-annecy",
  "jardinage-echange-service-voisin-lyon": "jardinage-entraide-quartier-lyon",
  "demenagement-coup-main-voisin-aura": "demenagement-entraide-locale-aura",
  "bricolage-montage-meubles-voisin-grenoble-lyon": "bricolage-montage-meubles-entraide-grenoble-lyon",
  "courses-aide-domicile-voisin-senior-lyon": "courses-aide-domicile-entraide-senior-lyon",
  "reseau-voisinage-quartier-lyon-aura": "reseau-entraide-quartier-lyon-aura",
  // Slugs fantômes crawlés par Google (canonical fausses corrigées)
  "rediger-annonce-garde": "rediger-bonne-annonce-house-sitting",
  "gardien-urgence-presentation": "devenir-gardien-urgence-guardiens",
  "house-sitting-noel": "house-sitting-noel-fetes-fin-annee",
  "10-conseils-garder-chien": "reussir-premiere-garde-house-sitting",
  "devenir-pet-sitter": "creer-profil-gardien-attractif",
  "5-erreurs-premiere-garde": "reussir-premiere-garde-house-sitting",
};

export default function ArticleDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [article, setArticle] = useState<ArticleFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [relatedArticles, setRelatedArticles] = useState<RelatedArticle[]>([]);
  const [cityGuideSlug, setCityGuideSlug] = useState<string | null>(null);
  const [cityPageSlug, setCityPageSlug] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    const target = ARTICLE_REDIRECTS[slug];
    if (target) {
      navigate(`/actualites/${target}`, { replace: true });
      return;
    }
    const fetchAll = async () => {
      const { data } = await supabase
        .from("articles")
        .select("*")
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();
      const art = data as ArticleFull | null;
      setArticle(art);
      setLoading(false);
      window.prerenderReady = true;

      if (!art) return;

      // Fetch related articles (same category, excluding current)
      const { data: related } = await supabase
        .from("articles")
        .select("slug, title, excerpt, category")
        .eq("published", true)
        .eq("category", art.category)
        .neq("slug", slug)
        .limit(3);
      setRelatedArticles((related as RelatedArticle[]) || []);

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
  }, [slug]);

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

  // Schema.org Article — CORRECTION 1
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": article.meta_title || article.title,
    "description": article.meta_description || article.excerpt,
    "url": `https://guardiens.fr/actualites/${article.slug}`,
    "datePublished": article.created_at,
    "dateModified": article.updated_at,
    ...(article.cover_image_url && { "image": article.cover_image_url }),
    "author": {
      "@type": "Person",
      "name": "Jérémie Martinot"
    },
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

  // FAQ schema — parsed from :::faq blocks
  const faqItems = parseFaqFromMarkdown(article.content);
  const faqSchema = buildFaqSchema(faqItems);

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
      />

      {/* CORRECTION 1 — Schema.org Article */}
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(articleSchema)}</script>
        {faqSchema && (
          <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
        )}
      </Helmet>

      {/* Product/Offer Schema for pricing articles */}
      {article.slug === "nouveaux-tarifs-2026" && (
        <Helmet>
          <script type="application/ld+json">{JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            "name": "Abonnement Gardien Guardiens",
            "description": "Abonnement pour devenir gardien de maison et d'animaux sur Guardiens",
            "brand": { "@type": "Brand", "name": "Guardiens" },
            "offers": [
              { "@type": "Offer", "name": "Mensuel sans engagement", "price": "9.00", "priceCurrency": "EUR", "priceSpecification": { "@type": "UnitPriceSpecification", "price": "9.00", "priceCurrency": "EUR", "referenceQuantity": { "@type": "QuantitativeValue", "value": "1", "unitCode": "MON" } }, "availability": "https://schema.org/InStock" },
              { "@type": "Offer", "name": "One-shot 1 mois", "price": "12.00", "priceCurrency": "EUR", "availability": "https://schema.org/InStock" },
              { "@type": "Offer", "name": "Annuel -20%", "price": "86.40", "priceCurrency": "EUR", "availability": "https://schema.org/InStock" }
            ]
          })}</script>
        </Helmet>
      )}

      {/* LocalBusiness Schema for geo-targeted guide articles */}
      {article.category === "guide_lieu" && article.city && (
        <Helmet>
          <script type="application/ld+json">{JSON.stringify({
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            "name": `Guardiens — Pet-sitting & House-sitting ${article.city}`,
            "description": article.excerpt,
            "url": `https://guardiens.fr/actualites/${article.slug}`,
            "address": {
              "@type": "PostalAddress",
              "addressLocality": article.city,
              ...(article.region ? { "addressRegion": article.region } : {}),
              "addressCountry": "FR"
            },
            "priceRange": "Gratuit",
          })}</script>
        </Helmet>
      )}

    <main id="main-content">
    <PageBreadcrumb items={[
      { label: "Actualités", href: "/actualites" },
      { label: article.title },
    ]} />

    <article className="max-w-3xl mx-auto px-4 py-8 animate-fade-in">

      <header className="mb-8">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <Badge variant="secondary">
            {CATEGORY_LABELS[article.category] || article.category}
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

        {/* CORRECTION 6 — Date de mise à jour ou publication */}
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
          <Calendar className="h-3.5 w-3.5" />
          {article.updated_at && article.created_at && new Date(article.updated_at).getTime() - new Date(article.created_at).getTime() > 86400000
            ? <span>Mis à jour le {format(new Date(article.updated_at), "d MMMM yyyy", { locale: fr })}</span>
            : <span>Publié le {format(new Date(article.published_at || article.created_at), "d MMMM yyyy", { locale: fr })}</span>
          }
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

      {/* CORRECTION 2 — Alt text systématique */}
      {article.cover_image_url && (
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
      )}

      <ArticleRenderer content={article.content} userRole={isAuthenticated ? user?.role : undefined} />

      {/* CORRECTION 3 — À lire aussi (internal links) */}
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
            Articles similaires
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
