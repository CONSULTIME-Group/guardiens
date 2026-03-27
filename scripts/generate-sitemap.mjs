/**
 * Generates a static public/sitemap.xml at build time.
 * Run: node scripts/generate-sitemap.mjs
 *
 * Reads static routes from siteRoutes.ts and fetches dynamic content from Supabase.
 */
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE_URL = "https://guardiens.fr";

// Supabase connection — uses anon key (read-only public data)
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://erhccyqevdyevpyctsjj.supabase.co";
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyaGNjeXFldmR5ZXZweWN0c2pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MjMzMzQsImV4cCI6MjA4OTk5OTMzNH0.ltBQtcouoqd5tuv_wQXb92x5Q5YYa9mkEQvZUx0wLTY";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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
  { loc: "/login", priority: "0.4", changefreq: "monthly" },
  { loc: "/register", priority: "0.6", changefreq: "monthly" },
  { loc: "/cgu", priority: "0.3", changefreq: "yearly" },
  { loc: "/confidentialite", priority: "0.3", changefreq: "yearly" },
  { loc: "/mentions-legales", priority: "0.3", changefreq: "yearly" },
];

function escapeXml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function urlEntry(loc, lastmod, changefreq, priority) {
  return `  <url>
    <loc>${escapeXml(SITE_URL + loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

async function main() {
  const today = new Date().toISOString().split("T")[0];

  // Fetch dynamic content
  const [
    { data: articles },
    { data: cityPages },
    { data: cityGuides },
    { data: departmentPages },
    { data: breedProfiles },
    { data: publicProfiles },
  ] = await Promise.all([
    supabase.from("articles").select("slug, updated_at, published_at").eq("published", true),
    supabase.from("seo_city_pages").select("slug, updated_at").eq("published", true),
    supabase.from("city_guides").select("slug, updated_at").eq("published", true),
    supabase.from("seo_department_pages").select("slug, updated_at").eq("published", true),
    supabase.from("breed_profiles").select("breed, species, generated_at"),
    supabase.from("profiles").select("id, updated_at").eq("account_status", "active").gte("profile_completion", 60).limit(1000),
  ]);

  const entries = [];

  // Static pages
  for (const page of staticPages) {
    entries.push(urlEntry(page.loc, today, page.changefreq, page.priority));
  }

  // Articles
  if (articles) {
    for (const a of articles) {
      entries.push(urlEntry(`/actualites/${a.slug}`, (a.updated_at || a.published_at || today).split("T")[0], "monthly", "0.7"));
    }
  }

  // City SEO pages
  if (cityPages) {
    for (const cp of cityPages) {
      entries.push(urlEntry(`/house-sitting/${cp.slug}`, (cp.updated_at || today).split("T")[0], "weekly", "0.8"));
    }
  }

  // City guides
  if (cityGuides) {
    for (const cg of cityGuides) {
      entries.push(urlEntry(`/guide/${cg.slug}`, (cg.updated_at || today).split("T")[0], "weekly", "0.7"));
    }
  }

  // Department pages
  if (departmentPages) {
    for (const dp of departmentPages) {
      entries.push(urlEntry(`/departement/${dp.slug}`, (dp.updated_at || today).split("T")[0], "weekly", "0.8"));
    }
  }

  // Breed profiles
  if (breedProfiles) {
    for (const bp of breedProfiles) {
      const slug = `${bp.species.toLowerCase()}-${bp.breed.toLowerCase().replace(/\s+/g, "-")}`;
      entries.push(urlEntry(`/races/${slug}`, (bp.generated_at || today).split("T")[0], "monthly", "0.6"));
    }
  }

  // Public profiles
  if (publicProfiles) {
    for (const p of publicProfiles) {
      entries.push(urlEntry(`/profil/${p.id}`, (p.updated_at || today).split("T")[0], "monthly", "0.5"));
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>`;

  const outPath = path.resolve(__dirname, "../public/sitemap.xml");
  fs.writeFileSync(outPath, xml, "utf-8");
  console.log(`✅ Sitemap generated: ${entries.length} URLs → ${outPath}`);
}

main().catch((err) => {
  console.error("❌ Sitemap generation failed:", err);
  process.exit(1);
});
