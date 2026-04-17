// SSR pre-render for SEO bots (Googlebot, Bingbot, social shares, AI crawlers).
// Returns a static HTML document with proper <title>, meta description,
// canonical, Open Graph, Twitter Card and JSON-LD for indexable routes.
//
// Routes covered:
//   /actualites/:slug          → articles
//   /guides/:slug              → city_guides
//   /house-sitting/:slug       → CityPage (data: city_guides + cities.ts)
//   /departement/:slug         → DepartmentPage
//   /gardiens/:id              → public sitter profile
//   /annonces/:id              → public sit listing
// Everything else → generic homepage HTML.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SITE_URL = "https://guardiens.fr";
const DEFAULT_OG = `${SITE_URL}/og-default.jpg`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

// ---- HTML helpers --------------------------------------------------------

const esc = (s: string | null | undefined) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const truncate = (s: string, n: number) =>
  s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…";

interface PageMeta {
  title: string;
  description: string;
  canonical: string;
  ogImage?: string;
  noindex?: boolean;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  bodyHtml?: string; // visible content for crawlers
}

function renderHtml(meta: PageMeta): string {
  const robots = meta.noindex ? "noindex, nofollow" : "index, follow";
  const ld = meta.jsonLd
    ? (Array.isArray(meta.jsonLd) ? meta.jsonLd : [meta.jsonLd])
        .map(
          (obj) =>
            `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, "\\u003c")}</script>`,
        )
        .join("\n  ")
    : "";

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(meta.title)}</title>
  <meta name="description" content="${esc(meta.description)}" />
  <meta name="robots" content="${robots}" />
  <link rel="canonical" href="${esc(meta.canonical)}" />
  <meta property="og:title" content="${esc(meta.title)}" />
  <meta property="og:description" content="${esc(meta.description)}" />
  <meta property="og:url" content="${esc(meta.canonical)}" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="Guardiens" />
  <meta property="og:image" content="${esc(meta.ogImage || DEFAULT_OG)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(meta.title)}" />
  <meta name="twitter:description" content="${esc(meta.description)}" />
  <meta name="twitter:image" content="${esc(meta.ogImage || DEFAULT_OG)}" />
  ${ld}
</head>
<body>
${meta.bodyHtml || `<h1>${esc(meta.title)}</h1><p>${esc(meta.description)}</p>`}
<p><a href="${SITE_URL}">Guardiens — accueil</a></p>
</body>
</html>`;
}

// ---- Route resolvers -----------------------------------------------------

async function resolveArticle(slug: string): Promise<PageMeta | null> {
  const { data } = await supabase
    .from("articles")
    .select("title, meta_title, meta_description, excerpt, content, cover_image_url, hero_image_alt, slug, noindex, published, published_at, updated_at, author_name, canonical_url, category, tags")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();

  if (!data) return null;

  const canonical = data.canonical_url?.trim() || `${SITE_URL}/actualites/${data.slug}`;
  const title = data.meta_title?.trim() || data.title;
  const description =
    data.meta_description?.trim() ||
    truncate(data.excerpt || data.content?.replace(/[#*_`>\[\]]/g, "").trim() || "", 155);

  const bodyText = (data.content || "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/[#*_`>]/g, "")
    .slice(0, 8000);

  return {
    title,
    description,
    canonical,
    ogImage: data.cover_image_url || undefined,
    noindex: data.noindex === true,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: data.title,
      description,
      image: data.cover_image_url || DEFAULT_OG,
      datePublished: data.published_at,
      dateModified: data.updated_at,
      author: { "@type": "Organization", name: data.author_name || "Guardiens" },
      publisher: {
        "@type": "Organization",
        name: "Guardiens",
        logo: { "@type": "ImageObject", url: `${SITE_URL}/icons/icon-192.png` },
      },
      mainEntityOfPage: canonical,
      articleSection: data.category,
      keywords: (data.tags || []).join(", "),
    },
    bodyHtml: `
<article>
  <h1>${esc(data.title)}</h1>
  ${data.cover_image_url ? `<img src="${esc(data.cover_image_url)}" alt="${esc(data.hero_image_alt || data.title)}" />` : ""}
  <p><em>${esc(data.excerpt || "")}</em></p>
  <div>${esc(bodyText)}</div>
</article>`,
  };
}

async function resolveCityGuide(slug: string): Promise<PageMeta | null> {
  const { data } = await supabase
    .from("city_guides")
    .select("city, department, postal_code, intro, ideal_for, slug, published, generated_at, updated_at")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();

  if (!data) return null;

  const title = `Guide ${data.city} (${data.postal_code}) — Sortir avec son chien`;
  const description = truncate(
    data.intro || `Guide local pour propriétaires d'animaux à ${data.city} : parcs, vétérinaires, conseils.`,
    155,
  );
  const canonical = `${SITE_URL}/guides/${data.slug}`;

  return {
    title,
    description,
    canonical,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: title,
      description,
      datePublished: data.generated_at,
      dateModified: data.updated_at,
      mainEntityOfPage: canonical,
      publisher: { "@type": "Organization", name: "Guardiens" },
    },
    bodyHtml: `
<article>
  <h1>${esc(title)}</h1>
  <p>${esc(data.intro || "")}</p>
  <h2>Idéal pour</h2>
  <p>${esc(data.ideal_for || "")}</p>
</article>`,
  };
}

async function resolveCityPage(slug: string): Promise<PageMeta | null> {
  // CityPage uses /house-sitting/:slug. We treat the slug as the city slug.
  const { data } = await supabase
    .from("city_guides")
    .select("city, department, postal_code, intro, slug")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();

  const cityName = data?.city || slug.replace(/-/g, " ");
  const title = `House-sitting à ${cityName} — Garde d'animaux à domicile | Guardiens`;
  const description = truncate(
    data?.intro || `Trouvez un gardien de confiance à ${cityName}. Inscription gratuite pour les propriétaires.`,
    155,
  );
  const canonical = `${SITE_URL}/house-sitting/${slug}`;

  return {
    title,
    description,
    canonical,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: title,
      description,
      url: canonical,
    },
    bodyHtml: `
<article>
  <h1>House-sitting à ${esc(cityName)}</h1>
  <p>${esc(description)}</p>
</article>`,
  };
}

async function resolveDepartment(slug: string): Promise<PageMeta> {
  const name = slug.replace(/-/g, " ");
  const title = `Garde d'animaux ${name} — Trouvez un gardien | Guardiens`;
  const description = `Trouvez un house-sitter de confiance dans le département ${name}. Inscription gratuite pour les propriétaires.`;
  const canonical = `${SITE_URL}/departement/${slug}`;

  return {
    title,
    description,
    canonical,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: title,
      description,
      url: canonical,
    },
    bodyHtml: `<article><h1>Garde d'animaux dans le ${esc(name)}</h1><p>${esc(description)}</p></article>`,
  };
}

async function resolveSitter(id: string): Promise<PageMeta | null> {
  // Use the public_profiles view (anon-readable) to avoid RLS leaks.
  const { data } = await supabase
    .from("public_profiles")
    .select("id, first_name, city, postal_code, role, bio, avatar_url")
    .eq("id", id)
    .in("role", ["sitter", "both"])
    .maybeSingle();

  if (!data) return null;

  const cityLabel = data.city ? ` à ${data.city}` : "";
  const title = `${data.first_name || "Gardien"} — Gardien d'animaux${cityLabel} | Guardiens`;
  const description = truncate(
    data.bio || `Profil vérifié sur Guardiens. Garde de chiens, chats et autres animaux${cityLabel}.`,
    155,
  );
  const canonical = `${SITE_URL}/gardiens/${id}`;

  return {
    title,
    description,
    canonical,
    ogImage: data.avatar_url || undefined,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Person",
      name: data.first_name,
      description,
      image: data.avatar_url || DEFAULT_OG,
      address: data.city
        ? { "@type": "PostalAddress", addressLocality: data.city, postalCode: data.postal_code, addressCountry: "FR" }
        : undefined,
      url: canonical,
    },
    bodyHtml: `
<article>
  <h1>${esc(data.first_name || "Gardien")}${esc(cityLabel)}</h1>
  ${data.avatar_url ? `<img src="${esc(data.avatar_url)}" alt="${esc(data.first_name || "Gardien")}" />` : ""}
  <p>${esc(data.bio || "")}</p>
</article>`,
  };
}

async function resolveSit(id: string): Promise<PageMeta | null> {
  const { data } = await supabase
    .from("sits")
    .select("id, title, start_date, end_date, status, specific_expectations, properties(city, zip_code, country)")
    .eq("id", id)
    .in("status", ["published", "confirmed"])
    .maybeSingle();

  if (!data) return null;

  const prop: any = data.properties;
  const cityLabel = prop?.city ? ` à ${prop.city}` : "";
  const title = `${data.title}${cityLabel} — Annonce de garde | Guardiens`;
  const description = truncate(
    data.specific_expectations ||
      `Mission de garde d'animaux${cityLabel} du ${data.start_date} au ${data.end_date}.`,
    155,
  );
  const canonical = `${SITE_URL}/annonces/${id}`;

  return {
    title,
    description,
    canonical,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "JobPosting",
      title: data.title,
      description,
      datePosted: data.start_date,
      validThrough: data.end_date,
      employmentType: "VOLUNTEER",
      hiringOrganization: { "@type": "Organization", name: "Guardiens", sameAs: SITE_URL },
      jobLocation: prop?.city
        ? {
            "@type": "Place",
            address: { "@type": "PostalAddress", addressLocality: prop.city, postalCode: prop.zip_code, addressCountry: prop.country || "FR" },
          }
        : undefined,
    },
    bodyHtml: `
<article>
  <h1>${esc(data.title)}${esc(cityLabel)}</h1>
  <p>Du ${esc(data.start_date)} au ${esc(data.end_date)}</p>
  <p>${esc(data.specific_expectations || "")}</p>
</article>`,
  };
}

function defaultMeta(path: string): PageMeta {
  return {
    title: "Guardiens — House-sitting de confiance en Auvergne-Rhône-Alpes",
    description:
      "Comme confier ses clés à une personne de confiance. Vos animaux restent chez eux, votre maison vit, et vous partez l'esprit léger.",
    canonical: `${SITE_URL}${path === "/" ? "" : path}`,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Guardiens",
      url: SITE_URL,
      logo: `${SITE_URL}/icons/icon-192.png`,
    },
  };
}

// ---- Router --------------------------------------------------------------

async function resolve(path: string): Promise<PageMeta> {
  const m = (re: RegExp) => path.match(re);

  let r: PageMeta | null = null;

  let mm = m(/^\/actualites\/([^/?#]+)\/?$/);
  if (mm) r = await resolveArticle(decodeURIComponent(mm[1]));

  if (!r) {
    mm = m(/^\/guides\/([^/?#]+)\/?$/);
    if (mm) r = await resolveCityGuide(decodeURIComponent(mm[1]));
  }

  if (!r) {
    mm = m(/^\/house-sitting\/([^/?#]+)\/?$/);
    if (mm) r = await resolveCityPage(decodeURIComponent(mm[1]));
  }

  if (!r) {
    mm = m(/^\/departement\/([^/?#]+)\/?$/);
    if (mm) r = await resolveDepartment(decodeURIComponent(mm[1]));
  }

  if (!r) {
    mm = m(/^\/gardiens\/([^/?#]+)\/?$/);
    if (mm) r = await resolveSitter(decodeURIComponent(mm[1]));
  }

  if (!r) {
    mm = m(/^\/annonces\/([^/?#]+)\/?$/);
    if (mm) r = await resolveSit(decodeURIComponent(mm[1]));
  }

  return r || defaultMeta(path);
}

// ---- Edge handler --------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    // Path can come either via ?path=/foo (Vercel rewrite) or directly.
    const path = url.searchParams.get("path") || url.pathname || "/";
    const meta = await resolve(path);
    const html = renderHtml(meta);

    return new Response(html, {
      status: meta.title ? 200 : 404,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=300, s-maxage=600",
        "X-Robots-Tag": meta.noindex ? "noindex, nofollow" : "index, follow",
        "X-SSR-Source": "lovable-edge",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[ssr-prerender] error", msg);
    return new Response(renderHtml(defaultMeta("/")), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
    });
  }
});
