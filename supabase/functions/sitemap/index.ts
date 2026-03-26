import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE_URL = "https://guardiens.fr";

const staticPages = [
  { loc: "/", priority: "1.0", changefreq: "weekly" },
  { loc: "/actualites", priority: "0.8", changefreq: "daily" },
  { loc: "/a-propos", priority: "0.5", changefreq: "monthly" },
  { loc: "/contact", priority: "0.5", changefreq: "monthly" },
  { loc: "/faq", priority: "0.7", changefreq: "weekly" },
  { loc: "/guides", priority: "0.7", changefreq: "weekly" },
  { loc: "/cgu", priority: "0.3", changefreq: "yearly" },
  { loc: "/confidentialite", priority: "0.3", changefreq: "yearly" },
  { loc: "/login", priority: "0.4", changefreq: "monthly" },
  { loc: "/register", priority: "0.6", changefreq: "monthly" },
];

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const [{ data: articles }, { data: cityPages }, { data: cityGuides }] = await Promise.all([
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
  ]);

  const today = new Date().toISOString().split("T")[0];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

  for (const page of staticPages) {
    xml += `  <url>
    <loc>${SITE_URL}${page.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`;
  }

  if (articles) {
    for (const article of articles) {
      const lastmod = (article.updated_at || article.published_at || today).split("T")[0];
      xml += `  <url>
    <loc>${SITE_URL}/actualites/${article.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
`;
    }
  }

  if (cityPages) {
    for (const cp of cityPages) {
      const lastmod = (cp.updated_at || today).split("T")[0];
      xml += `  <url>
    <loc>${SITE_URL}/house-sitting/${cp.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
    }
  }

  if (cityGuides) {
    for (const cg of cityGuides) {
      const lastmod = (cg.updated_at || today).split("T")[0];
      xml += `  <url>
    <loc>${SITE_URL}/guide/${cg.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
`;
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
