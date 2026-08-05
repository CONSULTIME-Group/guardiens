import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
  /**
   * Langues pour lesquelles une traduction réelle de CETTE page existe
   * (hors fr, toujours inclus). Règle unique du site :
   *   - le canonical ne porte jamais de paramètre de langue ;
   *   - une variante `?lang=xx` réellement traduite est indexable, porte
   *     `html lang="xx"` et un title/description traduits ;
   *   - une variante `?lang=xx` sans traduction réelle passe en
   *     `noindex, follow` et conserve `html lang="fr"`.
   * Par défaut : aucune traduction déclarée (fr uniquement).
   */
  translatedLangs?: readonly string[];
  /**
   * Alias historique de `translatedLangs` (pages d'article).
   */
  hreflangLangs?: readonly string[];

  /**
   * JSON-LD injecté impérativement dans le head (un script par objet).
   */
  jsonLd?: object | object[];
  /**
   * Si fourni et faux, empêche le passage de window.prerenderReady à true.
   * Utile quand le JSON-LD dépend de données asynchrones.
   */
  ready?: boolean;
  /**
   * Metas additionnelles injectées impérativement (og:image:alt, etc.).
   */
  extraMeta?: Array<{ attr: "name" | "property"; key: string; content: string }>;
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
  translatedLangs,
  hreflangLangs,

  jsonLd,
  ready,
  extraMeta,
}: PageMetaProps) => {
  const location = useLocation();
  const { i18n } = useTranslation();
  const currentLang = ((SUPPORTED_LANGS as readonly string[]).includes(i18n.language) ? i18n.language : "fr") as SupportedLang;
  const currentPath = normalizePathname(path || location.pathname);
  const currentUrl = buildAbsoluteUrl(currentPath);
  const explicitCanonical = normalizeCanonical(canonical);
  // Règle unique : le canonical ne porte jamais de paramètre de langue.
  const canonicalUrl = explicitCanonical ?? currentUrl;
  const metaDescription = description.trim();
  const resolvedImage = image === DEFAULT_IMAGE ? getListingOgImageFromPath(currentPath) ?? image : image;
  const titleWithoutSuffix = title
    .replace(/\s*\|\s*Guardiens\s*$/i, "")
    .replace(/\s*,\s*Guardiens\s*$/i, "")
    .replace(/\s*·\s*Guardiens\s*$/i, "");
  const fullTitle = currentPath === "/" ? titleWithoutSuffix : `${titleWithoutSuffix} | ${SITE_NAME}`;
  // Langues réellement traduites pour cette page (fr toujours inclus).
  const declaredLangs = translatedLangs ?? hreflangLangs ?? [];
  const allowedLangs = SUPPORTED_LANGS.filter(
    (lng) => lng === "fr" || declaredLangs.includes(lng),
  );
  const isTranslatedVariant = (allowedLangs as readonly string[]).includes(currentLang);
  // Variante de langue sans traduction réelle : non indexable, html lang = fr.
  const effectiveNoindex = noindex || !isTranslatedVariant;
  const htmlLang = isTranslatedVariant ? currentLang : "fr";
  const hreflangKey = allowedLangs.join(",");
  const jsonLdKey = jsonLd ? JSON.stringify(jsonLd) : "";
  const extraMetaKey = extraMeta ? JSON.stringify(extraMeta) : "";
  // Alternates uniquement pour les langues réellement traduites : déclarer une
  // variante non indexable serait un signal contradictoire.
  const hreflangAlternates =
    allowedLangs.length > 1
      ? allowedLangs.map((lng) => ({
          lang: lng,
          href: addLangParam(canonicalUrl, lng),
        }))
      : [];


  useEffect(() => {
    // Bloque Prerender.io le temps que le canonical (par langue) soit injecté.
    // Sera flippé à true en fin d'effect (voir plus bas).
    (window as any).prerenderReady = false;

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

    const upsertJsonLd = (blocks: object[]) => {
      document.head
        .querySelectorAll('script[type="application/ld+json"][data-page-meta="true"]')
        .forEach((node) => node.remove());
      blocks.forEach((block) => {
        const script = document.createElement("script");
        script.setAttribute("type", "application/ld+json");
        script.setAttribute("data-page-meta", "true");
        // textContent, jamais innerHTML : préserve accents et apostrophes.
        script.textContent = JSON.stringify(block);
        document.head.appendChild(script);
      });
    };

    // Le titre est écrit impérativement, Helmet n'atteint pas le DOM.
    document.title = fullTitle;

    upsertMetaTag({ attr: "name", key: "robots", content: noindex ? "noindex, follow" : "index, follow" });
    // Écrase la meta description statique (index.html) qui sinon reste en
    // premier dans le DOM et est lue par les crawlers avant la nôtre.
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

    (extraMeta ?? []).forEach((m) => upsertMetaTag(m));

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

    if (jsonLd) {
      upsertJsonLd(Array.isArray(jsonLd) ? jsonLd : [jsonLd]);
    }

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

    // Signal à Prerender.io que le contenu SEO est prêt, une fois toutes les
    // balises effectivement écrites, et seulement si la page le permet.
    if (ready !== false) {
      (window as any).prerenderReady = true;
    }
  }, [author, canonical, canonicalUrl, currentPath, currentUrl, currentLang, extraMetaKey, fullTitle, hreflangKey, jsonLdKey, metaDescription, noindex, publishedAt, ready, resolvedImage, type]);

  // Toutes les balises sont écrites impérativement dans le useEffect ci-dessus,
  // react-helmet-async n'atteignant pas le DOM sur ce projet.
  return null;
};


export default PageMeta;
