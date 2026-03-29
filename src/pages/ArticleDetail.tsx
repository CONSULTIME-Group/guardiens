import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
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
import ArticleRenderer from "@/components/articles/ArticleRenderer";

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

export default function ArticleDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { user, isAuthenticated } = useAuth();
  const [article, setArticle] = useState<ArticleFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [relatedArticles, setRelatedArticles] = useState<RelatedArticle[]>([]);
  const [cityGuideSlug, setCityGuideSlug] = useState<string | null>(null);
  const [cityPageSlug, setCityPageSlug] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
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
  const internalLinks = (article.internal_links as { text: string; url: string }[] | null) || [];

  // Schema.org Article — CORRECTION 1
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": article.meta_title || article.title,
    "description": article.meta_description || article.excerpt,
    "url": `https://guardiens.fr/actualites/${article.slug}`,
    "datePublished": article.created_at,
    "dateModified": article.updated_at,
    "author": {
      "@type": "Person",
      "name": "Jérémie Martinot"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Guardiens",
      "url": "https://guardiens.fr"
    },
    ...(article.cover_image_url && { "image": article.cover_image_url }),
    "mainEntityOfPage": `https://guardiens.fr/actualites/${article.slug}`,
  };

  // FAQ schema extraction
  const faqItems: { question: string; answer: string }[] = [];
  if (article.content.includes("### ") && article.content.includes("?")) {
    const lines = article.content.split("\n");
    let currentQ = "";
    let currentA = "";
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith("### ") && line.includes("?")) {
        if (currentQ && currentA.trim()) {
          faqItems.push({ question: currentQ, answer: currentA.trim() });
        }
        currentQ = line.replace("### ", "").trim();
        currentA = "";
      } else if (currentQ) {
        if (line.startsWith("## ") || line.startsWith("# ")) {
          if (currentA.trim()) {
            faqItems.push({ question: currentQ, answer: currentA.trim() });
          }
          currentQ = "";
          currentA = "";
        } else {
          currentA += line + " ";
        }
      }
    }
    if (currentQ && currentA.trim()) {
      faqItems.push({ question: currentQ, answer: currentA.trim() });
    }
  }

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
        canonicalUrl={article.canonical_url || `https://guardiens.fr/actualites/${article.slug}`}
      />

      {/* CORRECTION 1 — Schema.org Article */}
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(articleSchema)}</script>
        {faqItems.length > 0 && (
          <script type="application/ld+json">{JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": faqItems.map(faq => ({
              "@type": "Question",
              "name": faq.question,
              "acceptedAnswer": {
                "@type": "Answer",
                "text": faq.answer.replace(/\*\*/g, "").replace(/\[.*?\]\(.*?\)/g, "").trim()
              }
            }))
          })}</script>
        )}
      </Helmet>

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
              "addressRegion": article.region || "Auvergne-Rhône-Alpes",
              "addressCountry": "FR"
            },
            "priceRange": "Gratuit",
          })}</script>
        </Helmet>
      )}

    <article className="max-w-3xl mx-auto px-4 py-8 animate-fade-in">
      <Link
        to="/actualites"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux guides
      </Link>

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
            src={article.cover_image_url}
            alt={altText}
            className="w-full h-auto max-h-96 object-cover"
            loading="eager"
            fetchPriority="high"
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
                to={`/guide/${cityGuideSlug}`}
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
    </>
  );
}
