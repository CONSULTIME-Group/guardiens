import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";
import { buildAbsoluteUrl, normalizePathname } from "@/lib/seo";

const SITE_URL = "https://guardiens.fr";
const DEFAULT_IMAGE = "https://guardiens.fr/og-default.jpg";
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
  const metaTitle = title.trim();
  const metaDescription = description.trim();
  const titleWithoutSuffix = title.replace(/\s*\|\s*Guardiens\s*$/i, "").replace(/\s*—\s*Guardiens\s*$/i, "");
  const fullTitle = currentPath === "/" ? titleWithoutSuffix : `${titleWithoutSuffix} | ${SITE_NAME}`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={metaDescription} />
      <meta name="robots" content={noindex ? "noindex, nofollow" : "index, follow"} />
      <link rel="canonical" href={currentUrl} />

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle || metaTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:image" content={image} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="fr_FR" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle || metaTitle} />
      <meta name="twitter:description" content={metaDescription} />
      <meta name="twitter:image" content={image} />

      {/* Article-specific */}
      {type === "article" && publishedAt && (
        <meta property="article:published_time" content={publishedAt} />
      )}
      {type === "article" && author && (
        <meta property="article:author" content={author} />
      )}
    </Helmet>
  );
};

export default PageMeta;
