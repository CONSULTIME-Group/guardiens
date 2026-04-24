import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { buildAbsoluteUrl, normalizePathname } from "@/lib/seo";
import { DEFAULT_OG_IMAGE } from "@/data/siteRoutes";

const DEFAULT_IMAGE = DEFAULT_OG_IMAGE;
const SITE_NAME = "Guardiens";

interface PageMetaProps {
  title: string;
  description: string;
  path?: string;
  image?: string;
  type?: "website" | "article";
  publishedAt?: string;
  author?: string;
  noindex?: boolean;
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
}: PageMetaProps) => {
  const location = useLocation();
  const currentPath = normalizePathname(path || location.pathname);
  const currentUrl = buildAbsoluteUrl(currentPath);
  const metaDescription = description.trim();
  const titleWithoutSuffix = title.replace(/\s*\|\s*Guardiens\s*$/i, "").replace(/\s*—\s*Guardiens\s*$/i, "");
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
    upsertCanonical(currentUrl);

    upsertMetaTag({ attr: "property", key: "og:title", content: fullTitle });
    upsertMetaTag({ attr: "property", key: "og:description", content: metaDescription });
    upsertMetaTag({ attr: "property", key: "og:url", content: currentUrl });
    upsertMetaTag({ attr: "property", key: "og:image", content: image });
    upsertMetaTag({ attr: "property", key: "og:type", content: type });
    upsertMetaTag({ attr: "property", key: "og:site_name", content: SITE_NAME });
    upsertMetaTag({ attr: "property", key: "og:locale", content: "fr_FR" });

    upsertMetaTag({ attr: "name", key: "twitter:card", content: "summary_large_image" });
    upsertMetaTag({ attr: "name", key: "twitter:title", content: fullTitle });
    upsertMetaTag({ attr: "name", key: "twitter:description", content: metaDescription });
    upsertMetaTag({ attr: "name", key: "twitter:image", content: image });

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
  }, [author, currentUrl, fullTitle, image, metaDescription, noindex, publishedAt, type]);

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={metaDescription} />
    </Helmet>
  );
};

export default PageMeta;
