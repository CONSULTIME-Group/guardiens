import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE_URL = "https://guardiens.fr";

const staticPages = [
  { loc: "/", priority: "1.0", changefreq: "weekly" },
  { loc: "/tarifs", priority: "0.8", changefreq: "monthly" },
  { loc: "/faq", priority: "0.7", changefreq: "weekly" },
  { loc: "/actualites", priority: "0.8", changefreq: "daily" },
  { loc: "/petites-missions", priority: "0.7", changefreq: "daily" },
  { loc: "/gardien-urgence", priority: "0.7", changefreq: "weekly" },
  { loc: "/guides", priority: "0.8", changefreq: "weekly" },
  { loc: "/recherche", priority: "0.7", changefreq: "daily" },
  { loc: "/contact", priority: "0.5", changefreq: "monthly" },
  { loc: "/a-propos", priority: "0.5", changefreq: "monthly" },
  { loc: "/cgu", priority: "0.3", changefreq: "yearly" },
  { loc: "/confidentialite", priority: "0.3", changefreq: "yearly" },
  { loc: "/mentions-legales", priority: "0.3", changefreq: "yearly" },
  { loc: "/login", priority: "0.4", changefreq: "monthly" },
  { loc: "/register", priority: "0.6", changefreq: "monthly" },
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

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const [
    { data: articles },
    { data: cityPages },
    { data: cityGuides },
    { data: departmentPages },
    { data: breedProfiles },
    { data: publicProfiles },
  ] = await Promise.all([
    supabase
      .from("articles")
      .select("slug, updated_at, published_at")
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
    supabase
      .from("profiles")
      .select("id, updated_at")
      .eq("account_status", "active")
      .gte("profile_completion", 60)
      .order("updated_at", { ascending: false })
      .limit(1000),
  ]);

  const today = new Date().toISOString().split("T")[0];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

  for (const page of staticPages) {
    xml += urlEntry(page.loc, today, page.changefreq, page.priority);
  }

  if (articles) {
    for (const a of articles) {
      xml += urlEntry(`/actualites/${a.slug}`, (a.updated_at || a.published_at || today).split("T")[0], "monthly", "0.7");
    }
  }

  if (cityPages) {
    for (const cp of cityPages) {
      xml += urlEntry(`/house-sitting/${cp.slug}`, (cp.updated_at || today).split("T")[0], "weekly", "0.8");
    }
  }

  if (cityGuides) {
    for (const cg of cityGuides) {
      xml += urlEntry(`/guide/${cg.slug}`, (cg.updated_at || today).split("T")[0], "weekly", "0.7");
    }
  }

  if (departmentPages) {
    for (const dp of departmentPages) {
      xml += urlEntry(`/departement/${dp.slug}`, (dp.updated_at || today).split("T")[0], "weekly", "0.8");
    }
  }

  if (breedProfiles) {
    for (const bp of breedProfiles) {
      const slug = `${bp.species.toLowerCase()}-${bp.breed.toLowerCase().replace(/\s+/g, "-")}`;
      xml += urlEntry(`/races/${slug}`, (bp.generated_at || today).split("T")[0], "monthly", "0.6");
    }
  }

  if (publicProfiles) {
    for (const p of publicProfiles) {
      xml += urlEntry(`/profil/${p.id}`, (p.updated_at || today).split("T")[0], "monthly", "0.5");
    }
  }

  xml += `</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
});
