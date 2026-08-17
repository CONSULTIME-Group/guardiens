import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { buildAbsoluteUrl, normalizeCanonical, normalizePathname } from "@/lib/seo";
import { logSeoSnapshot } from "@/lib/seoDebugLog";
import { DEFAULT_OG_IMAGE } from "@/data/siteRoutes";


const DEFAULT_IMAGE = DEFAULT_OG_IMAGE;
const SITE_NAME = "Guardiens";

// Guardiens est monolingue français depuis le 17/08/2026 : plus aucune
// alternate hreflang n'est émise, nulle part, et l'ancienne règle « variante
// de langue non traduite = noindex » a été supprimée avec les props
// translatedLangs / hreflangLangs. Une visite `?lang=xx` rend la page
// française indexable : le repli est assuré par LangUrlSync, et la canonique
// de bootstrap d'index.html ignore la query string.
const OG_LOCALE = "fr_FR";
const HTML_LANG = "fr";

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
  /**
   * Coupe aussi le suivi des liens (`noindex, nofollow`). Réservé aux pages
   * volontairement hors du web indexable, par exemple les fiches de
   * démonstration de l'annuaire pro.
   */
  nofollow?: boolean;
  canonical?: string;

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
  /**
   * Code HTTP à déclarer à Prerender.io (meta prerender-status-code).
   * Utilisé par la page introuvable pour éviter les soft 404.
   */
  statusCode?: number;
  /**
   * En-tête HTTP à déclarer à Prerender.io (meta prerender-header), par
   * exemple "Location: https://guardiens.fr/guides/vienne" pour une
   * redirection permanente côté crawler.
   */
  prerenderHeader?: string;
  /**
   * Supprime le canonical auto-généré. Une page introuvable ne doit pas se
   * déclarer canonique d'elle-même.
   */
  noCanonical?: boolean;
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
  nofollow = false,

  jsonLd,
  ready,
  extraMeta,
  statusCode,
  prerenderHeader,
  noCanonical = false,
}: PageMetaProps) => {
  const location = useLocation();
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
  const jsonLdKey = jsonLd ? JSON.stringify(jsonLd) : "";
  const extraMetaKey = extraMeta ? JSON.stringify(extraMeta) : "";


  useEffect(() => {
    // Bloque Prerender.io le temps que le canonical soit injecté.
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

    // Monolingue français : `html lang` est « fr » partout, tout le temps.
    document.documentElement.setAttribute("lang", HTML_LANG);

    upsertMetaTag({
      attr: "name",
      key: "robots",
      content: nofollow
        ? "noindex, nofollow"
        : noindex
          ? "noindex, follow"
          : "index, follow",
    });

    // Écrase la meta description statique (index.html) qui sinon reste en
    // premier dans le DOM et est lue par les crawlers avant la nôtre.
    upsertMetaTag({ attr: "name", key: "description", content: metaDescription });
    if (noCanonical) {
      document.head.querySelectorAll('link[rel="canonical"]').forEach((node) => node.remove());
    } else {
      upsertCanonical(canonicalUrl);
    }

    if (typeof statusCode === "number") {
      upsertMetaTag({ attr: "name", key: "prerender-status-code", content: String(statusCode) });
    } else {
      removeMetaTag({ attr: "name", key: "prerender-status-code" });
    }

    if (prerenderHeader) {
      upsertMetaTag({ attr: "name", key: "prerender-header", content: prerenderHeader });
    } else {
      removeMetaTag({ attr: "name", key: "prerender-header" });
    }

    upsertMetaTag({ attr: "property", key: "og:title", content: fullTitle });
    upsertMetaTag({ attr: "property", key: "og:description", content: metaDescription });
    upsertMetaTag({ attr: "property", key: "og:url", content: currentUrl });
    upsertMetaTag({ attr: "property", key: "og:image", content: resolvedImage });
    upsertMetaTag({ attr: "property", key: "og:image:secure_url", content: resolvedImage });
    upsertMetaTag({ attr: "property", key: "og:type", content: type });
    upsertMetaTag({ attr: "property", key: "og:site_name", content: SITE_NAME });
    upsertMetaTag({ attr: "property", key: "og:locale", content: OG_LOCALE });

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
        noindex: noindex || nofollow,
        type,
      },
    });

    // Signal à Prerender.io que le contenu SEO est prêt, une fois toutes les
    // balises effectivement écrites, et seulement si la page le permet.
    if (ready !== false) {
      (window as any).prerenderReady = true;
    }
  }, [author, canonical, canonicalUrl, currentPath, currentUrl, extraMetaKey, fullTitle, jsonLdKey, metaDescription, noindex, nofollow, noCanonical, statusCode, prerenderHeader, publishedAt, ready, resolvedImage, type]);

  // Toutes les balises sont écrites impérativement dans le useEffect ci-dessus,
  // react-helmet-async n'atteignant pas le DOM sur ce projet.
  return null;
};


export default PageMeta;
