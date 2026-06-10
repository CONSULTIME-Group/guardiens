import { useEffect, useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import PageMeta from "@/components/PageMeta";
import PageBreadcrumb from "@/components/seo/PageBreadcrumb";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import {
  getAuthorBySlug,
  buildAuthorNameFilter,
} from "@/data/authors";

interface ArticleRow {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  cover_image_url: string | null;
  published_at: string | null;
  author_name: string;
}


export default function AuthorPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useTranslation();
  const author = slug ? getAuthorBySlug(slug) : undefined;

  const [articles, setArticles] = useState<ArticleRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!author) {
      setLoading(false);
      return;
    }
    const fetchArticles = async () => {
      const variants = buildAuthorNameFilter(author);
      const orFilter = variants
        .map((v) => `author_name.eq.${v.replace(/,/g, "\\,")}`)
        .join(",");
      const { data } = await supabase
        .from("articles")
        .select("slug, title, excerpt, category, cover_image_url, published_at, author_name")
        .eq("published", true)
        .or("noindex.is.null,noindex.eq.false")
        .or(orFilter)
        .order("published_at", { ascending: false });
      setArticles((data as ArticleRow[]) || []);
      setLoading(false);
      window.prerenderReady = true;
    };
    fetchArticles();
  }, [author]);

  if (!slug || !author) {
    return <Navigate to="/actualites" replace />;
  }

  const personSchema = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: author.firstName,
    description: author.shortBio,
    url: `https://guardiens.fr/auteurs/${author.slug}`,
    image: `https://guardiens.fr${author.photo}`,
    worksFor: {
      "@type": "Organization",
      name: "Guardiens",
      url: "https://guardiens.fr",
    },
    ...(author.sameAs && author.sameAs.length > 0 && { sameAs: author.sameAs }),
  };

  return (
    <>
      <PageMeta
        title={t("author_page.meta_title", { name: author.firstName })}
        description={author.shortBio}
        path={`/auteurs/${author.slug}`}
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(personSchema)}</script>
      </Helmet>

      <main id="main-content">
        <PageBreadcrumb
          items={[
            { label: t("author_page.breadcrumb_authors"), href: "/actualites" },
            { label: author.firstName },
          ]}
        />

        <div className="max-w-4xl mx-auto px-4 py-10">
          <header className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-12">
            <img
              src={author.photo}
              alt={t("author_page.portrait_alt", { name: author.firstName })}
              width={144}
              height={144}
              loading="eager"
              decoding="async"
              className="w-36 h-36 rounded-full object-cover shrink-0"
            />
            <div className="text-center sm:text-left">
              <h1 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-3">
                {author.firstName}
              </h1>
              <p className="text-muted-foreground leading-relaxed max-w-2xl">
                {author.longBio}
              </p>
            </div>
          </header>

          <section aria-labelledby="author-articles-heading">
            <h2
              id="author-articles-heading"
              className="font-heading text-xl font-semibold text-foreground mb-5"
            >
              {t("author_page.articles_by", { name: author.firstName })}
            </h2>

            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-48 rounded-xl" />
                ))}
              </div>
            ) : articles.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  {t("author_page.no_articles")}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {articles.map((a) => (
                  <Link key={a.slug} to={`/actualites/${a.slug}`} className="group">
                    <Card className="h-full hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <Badge variant="secondary" className="mb-2 text-xs">
                          {t(`author_page.categories.${a.category}`, { defaultValue: a.category })}
                        </Badge>
                        <h3 className="font-heading font-semibold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-2 mb-1">
                          {a.title}
                        </h3>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {a.excerpt}
                        </p>
                        <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary">
                          {t("author_page.read")} <ArrowRight className="h-3 w-3" />
                        </span>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
