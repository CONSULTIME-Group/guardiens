import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE_URL = "https://guardiens.fr";

const staticPages = [
  { loc: "/", priority: "1.0", changefreq: "daily" },
  { loc: "/tarifs", priority: "0.8", changefreq: "weekly" },
  { loc: "/faq", priority: "0.8", changefreq: "weekly" },
  { loc: "/contact", priority: "0.8", changefreq: "weekly" },
  { loc: "/petites-missions", priority: "0.8", changefreq: "weekly" },
  { loc: "/gardien-urgence", priority: "0.8", changefreq: "weekly" },
  { loc: "/guides", priority: "0.8", changefreq: "weekly" },
];

const cityPages = [
  "annecy", "lyon", "grenoble", "caluire-et-cuire", "chambery", "aura",
];

const legalPages = [
  { loc: "/cgu", priority: "0.3", changefreq: "yearly" },
  { loc: "/confidentialite", priority: "0.3", changefreq: "yearly" },
  { loc: "/mentions-legales", priority: "0.3", changefreq: "yearly" },
];

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function urlEntry(loc: string, lastmod: string, changefreq: string, priority: string): string {
  return `  <url>
    <loc>${escapeXml(SITE_URL + loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>\n`;
}

const PRIORITY_MAP: Record<string, string> = {
  ville: "0.9",
  guide_race: "0.8",
  guide_local: "0.8",
  guide_lieu: "0.8",
  vie_locale: "0.7",
  guide_pratique: "0.6",
  conseil: "0.6",
  conseil_gardien: "0.6",
  conseil_proprio: "0.6",
  saisonnier: "0.5",
  temoignage: "0.6",
  actualite: "0.6",
  thematique: "0.6",
};

const CHANGEFREQ_MAP: Record<string, string> = {
  ville: "weekly",
  guide_race: "monthly",
  guide_local: "monthly",
  guide_lieu: "monthly",
  vie_locale: "monthly",
  guide_pratique: "monthly",
  conseil: "monthly",
  conseil_gardien: "monthly",
  conseil_proprio: "monthly",
  saisonnier: "yearly",
  temoignage: "monthly",
  actualite: "monthly",
  thematique: "monthly",
};

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const [
    { data: articles },
    { data: seoCityPages },
    { data: cityGuides },
    { data: departmentPages },
    { data: breedProfiles },
  ] = await Promise.all([
    supabase
      .from("articles")
      .select("slug, category, updated_at, published_at")
      .eq("published", true)
      .order("published_at", { ascending: false }),
    supabase
      .from("seo_city_pages")
      .select("slug, updated_at")
      .eq("published", true)
      .order("city"),
    supabase
      .from("city_guides")
      .select("slug, updated_at")
      .eq("published", true)
      .order("city"),
    supabase
      .from("seo_department_pages")
      .select("slug, updated_at")
      .eq("published", true)
      .order("department"),
    supabase
      .from("breed_profiles")
      .select("breed, species, generated_at")
      .order("breed"),
  ]);

  const today = new Date().toISOString().split("T")[0];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

  // Static pages
  for (const page of staticPages) {
    xml += urlEntry(page.loc, today, page.changefreq, page.priority);
  }

  // City landing pages
  for (const slug of cityPages) {
    xml += urlEntry(`/house-sitting/${slug}`, today, "weekly", "0.9");
  }

  // Articles → /actualites/{slug}
  if (articles) {
    for (const a of articles) {
      const priority = PRIORITY_MAP[a.category] || "0.7";
      const changefreq = CHANGEFREQ_MAP[a.category] || "monthly";
      xml += urlEntry(
        `/actualites/${a.slug}`,
        (a.updated_at || a.published_at || today).split("T")[0],
        changefreq,
        priority
      );
    }
  }

  // SEO city pages from DB
  if (seoCityPages) {
    for (const cp of seoCityPages) {
      xml += urlEntry(`/house-sitting/${cp.slug}`, (cp.updated_at || today).split("T")[0], "weekly", "0.8");
    }
  }

  // City guides
  if (cityGuides) {
    for (const cg of cityGuides) {
      xml += urlEntry(`/guides/${cg.slug}`, (cg.updated_at || today).split("T")[0], "weekly", "0.7");
    }
  }

  // Department pages
  if (departmentPages) {
    for (const dp of departmentPages) {
      xml += urlEntry(`/departement/${dp.slug}`, (dp.updated_at || today).split("T")[0], "weekly", "0.8");
    }
  }

  // Breed profiles
  if (breedProfiles) {
    for (const bp of breedProfiles) {
      const slug = `${bp.species.toLowerCase()}-${bp.breed.toLowerCase().replace(/\s+/g, "-")}`;
      xml += urlEntry(`/races/${slug}`, (bp.generated_at || today).split("T")[0], "monthly", "0.6");
    }
  }

  // Public profiles removed from sitemap — /profil/ is disallowed in robots.txt

  // Legal pages
  for (const page of legalPages) {
    xml += urlEntry(page.loc, today, page.changefreq, page.priority);
  }

  xml += `</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
});
