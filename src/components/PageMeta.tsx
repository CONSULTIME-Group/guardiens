import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import { buildAbsoluteUrl, normalizeCanonical, normalizePathname } from "@/lib/seo";
import { logSeoSnapshot } from "@/lib/seoDebugLog";
import { DEFAULT_OG_IMAGE } from "@/data/siteRoutes";
import { SUPPORTED_LANGS, type SupportedLang } from "@/i18n";

const DEFAULT_IMAGE = DEFAULT_OG_IMAGE;
const SITE_NAME = "Guardiens";

const OG_LOCALES: Record<SupportedLang, string> = {
  fr: "fr_FR",
  en: "en_GB",
  es: "es_ES",
  it: "it_IT",
  de: "de_DE",
};

// Adds ?lang=xx to a URL while preserving any existing query params.
const addLangParam = (url: string, lang: string): string => {
  try {
    const u = new URL(url);
    if (lang === "fr") {
      u.searchParams.delete("lang");
    } else {
      u.searchParams.set("lang", lang);
    }
    return u.toString();
  } catch {
    return url;
  }
};

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
  const { i18n } = useTranslation();
  const currentLang = ((SUPPORTED_LANGS as readonly string[]).includes(i18n.language) ? i18n.language : "fr") as SupportedLang;
  const currentPath = normalizePathname(path || location.pathname);
  const currentUrl = buildAbsoluteUrl(currentPath);
  const canonicalUrl = normalizeCanonical(canonical) ?? currentUrl;
  const metaDescription = description.trim();
  const resolvedImage = image === DEFAULT_IMAGE ? getListingOgImageFromPath(currentPath) ?? image : image;
  const titleWithoutSuffix = title.replace(/\s*\|\s*Guardiens\s*$/i, "").replace(/\s*,\s*Guardiens\s*$/i, "");
  const fullTitle = currentPath === "/" ? titleWithoutSuffix : `${titleWithoutSuffix} | ${SITE_NAME}`;
  // hreflang alternates : same URL with ?lang=xx (fr = no param, also serves as x-default)
  const hreflangAlternates = SUPPORTED_LANGS.map((lng) => ({
    lang: lng,
    href: addLangParam(canonicalUrl, lng),
  }));

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

    const upsertHreflangAlternates = () => {
      document.head.querySelectorAll('link[rel="alternate"][data-page-meta="true"]').forEach((node) => node.remove());
      hreflangAlternates.forEach(({ lang, href }) => {
        const link = document.createElement("link");
        link.setAttribute("rel", "alternate");
        link.setAttribute("hreflang", lang);
        link.setAttribute("href", href);
        link.setAttribute("data-page-meta", "true");
        document.head.appendChild(link);
      });
      // x-default = FR (canonical)
      const xdef = document.createElement("link");
      xdef.setAttribute("rel", "alternate");
      xdef.setAttribute("hreflang", "x-default");
      xdef.setAttribute("href", addLangParam(canonicalUrl, "fr"));
      xdef.setAttribute("data-page-meta", "true");
      document.head.appendChild(xdef);
    };

    upsertMetaTag({ attr: "name", key: "robots", content: noindex ? "noindex, follow" : "index, follow" });
    // Écrase la meta description statique (index.html) qui sinon reste en
    // premier dans le DOM et est lue par les crawlers avant celle de Helmet.
    upsertMetaTag({ attr: "name", key: "description", content: metaDescription });
    upsertCanonical(canonicalUrl);
    upsertHreflangAlternates();

    upsertMetaTag({ attr: "property", key: "og:title", content: fullTitle });
    upsertMetaTag({ attr: "property", key: "og:description", content: metaDescription });
    upsertMetaTag({ attr: "property", key: "og:url", content: currentUrl });
    upsertMetaTag({ attr: "property", key: "og:image", content: resolvedImage });
    upsertMetaTag({ attr: "property", key: "og:image:secure_url", content: resolvedImage });
    upsertMetaTag({ attr: "property", key: "og:type", content: type });
    upsertMetaTag({ attr: "property", key: "og:site_name", content: SITE_NAME });
    upsertMetaTag({ attr: "property", key: "og:locale", content: OG_LOCALES[currentLang] });

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
  }, [author, canonical, canonicalUrl, currentPath, currentUrl, currentLang, fullTitle, metaDescription, noindex, publishedAt, resolvedImage, type]);

  // NB : on n'émet PAS via Helmet les tags déjà gérés impérativement dans le
  // useEffect ci-dessus (robots, canonical, hreflang, og:*, twitter:*,
  // article:*), sinon ils sont dupliqués (Helmet ajoute par-dessus le DOM
  // déjà mutée). Helmet ne sert plus qu'au <title> et à la <meta description>,
  // que React Helmet déduplique correctement par `name`.
  // NB : la <meta name="description"> est gérée impérativement dans le
  // useEffect ci-dessus pour écraser la meta statique d'index.html.
  // Helmet ne sert plus qu'au <title> (dédupliqué nativement par le navigateur).
  return (
    <Helmet>
      <title>{fullTitle}</title>
    </Helmet>
  );
};

export default PageMeta;
