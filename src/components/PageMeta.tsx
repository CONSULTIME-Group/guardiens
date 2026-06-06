import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { buildAbsoluteUrl, normalizeCanonical, normalizePathname } from "@/lib/seo";
import { logSeoSnapshot } from "@/lib/seoDebugLog";
import { DEFAULT_OG_IMAGE } from "@/data/siteRoutes";

const DEFAULT_IMAGE = DEFAULT_OG_IMAGE;
const SITE_NAME = "Guardiens";

const getListingOgImageFromPath = (pathname: string): string | null => {
  const match = pathname.match(/^\/annonces\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/?$/i);
  if (!match) return null;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://erhccyqevdyevpyctsjj.supabase.co";
  return `${supabaseUrl}/functions/v1/og-sit?id=${match[1]}&v=cover-only-20260522`;
};

interface PageMetaProps {
  title: string;
  description: string;
  path?: string;
  image?: string;
  type?: "website" | "article";
  publishedAt?: string;
  author?: string;
  noindex?: boolean;
  canonical?: string;
}

const PageMeta = ({
  title,
  description,
  path,
  image = DEFAULT_IMAGE,
  type = "website",
  publishedAt,
  author,
  noindex = false,
  canonical,
}: PageMetaProps) => {
  const location = useLocation();
  const currentPath = normalizePathname(path || location.pathname);
  const currentUrl = buildAbsoluteUrl(currentPath);
  const canonicalUrl = normalizeCanonical(canonical) ?? currentUrl;
  const metaDescription = description.trim();
  const resolvedImage = image === DEFAULT_IMAGE ? getListingOgImageFromPath(currentPath) ?? image : image;
  const titleWithoutSuffix = title.replace(/\s*\|\s*Guardiens\s*$/i, "").replace(/\s*,\s*Guardiens\s*$/i, "");
  const fullTitle = currentPath === "/" ? titleWithoutSuffix : `${titleWithoutSuffix} | ${SITE_NAME}`;

  useEffect(() => {
    const upsertMetaTag = ({ attr, key, content }: { attr: "name" | "property"; key: string; content: string }) => {
      document.head.querySelectorAll(`meta[${attr}="${key}"]`).forEach((node) => node.remove());

      const meta = document.createElement("meta");
      meta.setAttribute(attr, key);
      meta.setAttribute("content", content);
      meta.setAttribute("data-page-meta", "true");
      document.head.appendChild(meta);
    };

    const removeMetaTag = ({ attr, key }: { attr: "name" | "property"; key: string }) => {
      document.head.querySelectorAll(`meta[${attr}="${key}"]`).forEach((node) => node.remove());
    };

    const upsertCanonical = (href: string) => {
      document.head.querySelectorAll('link[rel="canonical"]').forEach((node) => node.remove());

      const link = document.createElement("link");
      link.setAttribute("rel", "canonical");
      link.setAttribute("href", href);
      link.setAttribute("data-page-meta", "true");
      document.head.appendChild(link);
    };

    upsertMetaTag({ attr: "name", key: "robots", content: noindex ? "noindex, follow" : "index, follow" });
    upsertCanonical(canonicalUrl);

    upsertMetaTag({ attr: "property", key: "og:title", content: fullTitle });
    upsertMetaTag({ attr: "property", key: "og:description", content: metaDescription });
    upsertMetaTag({ attr: "property", key: "og:url", content: currentUrl });
    upsertMetaTag({ attr: "property", key: "og:image", content: resolvedImage });
    upsertMetaTag({ attr: "property", key: "og:image:secure_url", content: resolvedImage });
    upsertMetaTag({ attr: "property", key: "og:type", content: type });
    upsertMetaTag({ attr: "property", key: "og:site_name", content: SITE_NAME });
    upsertMetaTag({ attr: "property", key: "og:locale", content: "fr_FR" });

    upsertMetaTag({ attr: "name", key: "twitter:card", content: "summary_large_image" });
    upsertMetaTag({ attr: "name", key: "twitter:title", content: fullTitle });
    upsertMetaTag({ attr: "name", key: "twitter:description", content: metaDescription });
    upsertMetaTag({ attr: "name", key: "twitter:image", content: resolvedImage });

    if (type === "article" && publishedAt) {
      upsertMetaTag({ attr: "property", key: "article:published_time", content: publishedAt });
    } else {
      removeMetaTag({ attr: "property", key: "article:published_time" });
    }

    if (type === "article" && author) {
      upsertMetaTag({ attr: "property", key: "article:author", content: author });
    } else {
      removeMetaTag({ attr: "property", key: "article:author" });
    }


    // Signal to Prerender.io that SEO-critical content is ready
    (window as any).prerenderReady = true;

    // Record snapshot for /admin/seo-debug
    logSeoSnapshot({
      path: currentPath,
      source: "PageMeta",
      input: {
        title: fullTitle,
        description: metaDescription,
        canonical: canonical ?? null,
        noindex,
        type,
      },
    });
  }, [author, canonical, canonicalUrl, currentPath, currentUrl, fullTitle, metaDescription, noindex, publishedAt, resolvedImage, type]);

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={metaDescription} />
      <meta name="robots" content={noindex ? "noindex, follow" : "index, follow"} />
      <link rel="canonical" href={canonicalUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:image" content={resolvedImage} />
      <meta property="og:image:secure_url" content={resolvedImage} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="fr_FR" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={metaDescription} />
      <meta name="twitter:image" content={resolvedImage} />
      {type === "article" && publishedAt && <meta property="article:published_time" content={publishedAt} />}
      {type === "article" && author && <meta property="article:author" content={author} />}
    </Helmet>
  );
};

export default PageMeta;
