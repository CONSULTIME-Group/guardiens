/**
 * Generates a static public/sitemap.xml at build time.
 * INCREMENTAL: caches per-source updated_at in .sitemap-cache.json
 * Re-fetches only sources whose head changed since last build.
 * Force full rebuild: SITEMAP_FORCE=1 node scripts/generate-sitemap.mjs
 *
 * Source unique de vérité pour les routes statiques : src/data/siteRoutes.ts
 * (staticRoutes + SITE_URL). Ne PAS redéclarer ces valeurs ici.
 */
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { sitRichnessRejectionReason } from "../src/lib/sitIndexability.js";
import { isDemoPro } from "../src/lib/proIndexability.js";
import { isSitterProfileIndexable } from "../src/lib/sitterProfileIndexability.js";



const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_PATH = path.resolve(__dirname, "../.sitemap-cache.json");
const FORCE = process.env.SITEMAP_FORCE === "1";

// ─── Source de vérité : src/data/siteRoutes.ts ───────────────────────
// Parser le fichier TS pour extraire SITE_URL + staticRoutes sans
// dépendance TS runtime. Toute modif des routes doit se faire là-bas.
function loadStaticRoutes() {
  const filePath = path.resolve(__dirname, "../src/data/siteRoutes.ts");
  const source = fs.readFileSync(filePath, "utf-8");

  const siteUrlMatch = source.match(/export\s+const\s+SITE_URL\s*=\s*["']([^"']+)["']/);
  if (!siteUrlMatch) throw new Error("SITE_URL introuvable dans siteRoutes.ts");
  const siteUrl = siteUrlMatch[1];

  const routes = [];
  const blockRe = /\{\s*path:\s*(["'])([^"']+)\1[\s\S]*?changeFreq:\s*(["'])(daily|weekly|monthly|yearly)\3[\s\S]*?\}/g;
  let m;
  while ((m = blockRe.exec(source)) !== null) {
    const block = m[0];
    const path_ = m[2];
    const changefreq = m[4];
    const priorityMatch = block.match(/sitemapPriority:\s*(["'])([^"']+)\1/);
    if (!priorityMatch) continue;
    // `index: false` → page non indexable, exclue du sitemap (cohérent avec
    // robots.txt et <meta robots>). Source de vérité : siteRoutes.ts.
    const indexMatch = block.match(/index:\s*(true|false)/);
    const indexable = indexMatch ? indexMatch[1] === "true" : true;
    routes.push({ loc: path_, priority: priorityMatch[2], changefreq, indexable });
  }
  if (routes.length === 0) throw new Error("Aucune route extraite de staticRoutes");
  return { siteUrl, routes };
}

const { siteUrl: SITE_URL, routes: STATIC_ROUTES } = loadStaticRoutes();

// Filtrage automatique : on ne garde que les routes marquées indexables.
// Pas de SITEMAP_EXCLUDE en doublon — la décision est prise dans siteRoutes.ts
// via le flag `index`. Toute incohérence est impossible par construction.
const staticPages = STATIC_ROUTES.filter((r) => r.indexable);

const cityLandingPages = [
  "annecy", "lyon", "grenoble", "caluire-et-cuire", "chambery", "aura",
];

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://erhccyqevdyevpyctsjj.supabase.co";
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyaGNjeXFldmR5ZXZweWN0c2pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MjMzMzQsImV4cCI6MjA4OTk5OTMzNH0.ltBQtcouoqd5tuv_wQXb92x5Q5YYa9mkEQvZUx0wLTY";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const PRIORITY_MAP = {
  guide_central: "0.9",
  ville: "0.9",
  guide_race: "0.8",
  guide_local: "0.8",
  guide_lieu: "0.8",
  vie_locale: "0.7",
  guide_pratique: "0.6",
  conseil: "0.6",
  conseil_gardien: "0.6",
  conseil_proprio: "0.6",
  saisonnier: "0.6",
  temoignage: "0.6",
  actualite: "0.6",
  thematique: "0.6",
};

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

// Routes UI traduites en EN/ES/IT/DE via i18next (header, footer, landing, pricing, faq).
// Signale les alternates linguistiques à Google via xhtml:link.
const I18N_LANGS = ["fr", "en", "es", "it", "de"];
function urlEntryWithLangAlternates(loc, lastmod, changefreq, priority) {
  const base = escapeXml(SITE_URL + loc);
  const alt = I18N_LANGS.map((lng) => {
    const href = lng === "fr" ? base : `${base}${loc.includes("?") ? "&" : "?"}lang=${lng}`;
    return `    <xhtml:link rel="alternate" hreflang="${lng}" href="${escapeXml(href)}"/>`;
  }).join("\n");
  const xDefault = `    <xhtml:link rel="alternate" hreflang="x-default" href="${base}"/>`;
  return `  <url>
    <loc>${base}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
${alt}
${xDefault}
  </url>`;
}

// Variante pour articles : alternates linguistiques selon les traductions
// effectivement présentes en base (article_translations). FR = canonique.
function articleUrlEntry(loc, lastmod, changefreq, priority, availableLangs) {
  const base = escapeXml(SITE_URL + loc);
  const langs = ["fr", ...availableLangs.filter((l) => l !== "fr")];
  if (langs.length <= 1) {
    return `  <url>
    <loc>${base}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
  }
  const alt = langs.map((lng) => {
    const href = lng === "fr" ? base : `${base}?lang=${lng}`;
    return `    <xhtml:link rel="alternate" hreflang="${lng}" href="${escapeXml(href)}"/>`;
  }).join("\n");
  const xDefault = `    <xhtml:link rel="alternate" hreflang="x-default" href="${base}"/>`;
  return `  <url>
    <loc>${base}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
${alt}
${xDefault}
  </url>`;
}

function loadCache() {
  if (FORCE) return { sources: {}, entries: {} };
  try {
    return JSON.parse(fs.readFileSync(CACHE_PATH, "utf-8"));
  } catch {
    return { sources: {}, entries: {} };
  }
}

function saveCache(cache) {
  try {
    fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), "utf-8");
  } catch (e) {
    console.warn("⚠️ Failed to write sitemap cache:", e.message);
  }
}

/**
 * Returns the most recent updated_at for a table (head-only, fast).
 * Returns null on error so we fall back to refetching.
 */
async function maxUpdatedAt(table, column = "updated_at", filter = null) {
  let q = supabase.from(table).select(column).order(column, { ascending: false }).limit(1);
  if (filter) q = filter(q);
  const { data, error } = await q;
  if (error || !data?.[0]) return null;
  return data[0][column] || null;
}

/**
 * Clé d'invalidation composite : date la plus récente et nombre de lignes.
 * Utilisée quand la colonne temporelle seule n'est pas fiable (valeur nulle sur
 * une vue publique, par exemple `public_profiles.last_seen_at` qui n'est pas
 * exposée en anonyme). Sans cette variante, la clé restait nulle et le cache
 * n'était jamais invalidé.
 */
async function maxUpdatedAtWithCount(table, column, filter = null) {
  const [date, countRes] = await Promise.all([
    maxUpdatedAt(table, column, filter),
    (async () => {
      let q = supabase.from(table).select("id", { count: "exact" }).limit(1);
      if (filter) q = filter(q);
      const { count, error } = await q;
      return error ? null : count;
    })(),
  ]);
  if (!date && countRes == null) return null;
  return `${date ?? "no-date"}|${countRes ?? "no-count"}`;
}

async function fetchOrCache(key, cache, headProbe, fetcher, builder) {
  const head = await headProbe();
  const cached = cache.sources[key];
  // Une clé d'invalidation nulle ne prouve rien : elle signifie « je ne sais
  // pas si les données ont bougé ». La traiter comme « rien n'a changé » a figé
  // le sitemap de production sur un état intermédiaire (12/08/2026). Dans ce
  // cas on recharge toujours, et on le dit à haute voix dans le log de build.
  if (head == null) {
    console.warn(`  ⚠️ ${key}: clé d'invalidation absente, rechargement forcé`);
  }
  if (!FORCE && head != null && cached && cached.head === head && cache.entries[key]) {
    console.log(`  ↳ ${key}: cached (${cache.entries[key].length} URLs)`);
    return cache.entries[key];
  }
  const rows = await fetcher();
  const entries = builder(rows || []);
  cache.sources[key] = { head, fetchedAt: new Date().toISOString() };
  cache.entries[key] = entries;
  console.log(`  ↳ ${key}: refreshed (${entries.length} URLs)`);
  return entries;
}


async function main() {
  const today = new Date().toISOString().split("T")[0];
  const cache = loadCache();

  // Slugs volontairement exclus du sitemap (doublons/anciennes URLs).
  // NE PAS confondre avec `noindex` en base : cette liste ne concerne que des
  // contenus redondants dont l'exclusion ne peut pas se déduire d'un champ DB.
  // Toute décision d'indexation par article passe par la colonne `noindex`.
  const excludedSlugs = new Set([
    "guide-house-sitting-lyon", "guide-lieu-meilleurs-parcs-chiens-lyon",
    "pet-sitting-chambery-savoie",
    "pet-sitting-annecy-guide",
    "pet-sitting-grenoble-guide", "pet-sitting-clermont-ferrand-guide",
    "house-sitting-saint-etienne-guide", "border-collie-lyon-guide-race",
    "bouledogue-francais-lyon-guide-race", "malinois-lyon-guide-race",
    "golden-retriever-lyon-guide-race", "berger-australien-guide",
    "conseil-gardien-creer-profil-attractif-lyon", "preparer-maison-avant-vacances",
    "garde-chien-lyon-solutions",
  ]);


  console.log("🗺️  Sitemap incremental build…");

  const [articles, seoCity, guides, depts, breeds, profiles, sits, profiles_pros] = await Promise.all([
    fetchOrCache(
      "articles", cache,
      () => maxUpdatedAt("articles", "updated_at", q => q.eq("published", true)),
      async () => (await supabase.from("articles").select("slug, category, updated_at, published_at").eq("published", true).or("noindex.is.null,noindex.eq.false")).data,
      rows => rows.filter(a => !excludedSlugs.has(a.slug)).map(a => ({
        loc: `/actualites/${a.slug}`,
        lastmod: (a.updated_at || a.published_at || today).split("T")[0],
        changefreq: "monthly",
        priority: PRIORITY_MAP[a.category] || "0.7",
      }))
    ),
    fetchOrCache(
      "seo_city_pages", cache,
      () => maxUpdatedAt("seo_city_pages", "updated_at", q => q.eq("published", true).or("noindex.is.null,noindex.eq.false")),
      async () => (await supabase.from("seo_city_pages").select("slug, updated_at").eq("published", true).or("noindex.is.null,noindex.eq.false")).data,
      rows => rows.map(cp => ({
        loc: `/house-sitting/${cp.slug}`,
        lastmod: (cp.updated_at || today).split("T")[0],
        changefreq: "weekly",
        priority: "0.8",
      }))
    ),
    fetchOrCache(
      "city_guides", cache,
      () => maxUpdatedAt("city_guides", "updated_at", q => q.eq("published", true)),
      async () => (await supabase.from("city_guides").select("slug, updated_at").eq("published", true)).data,
      rows => rows.map(cg => ({
        loc: `/guides/${cg.slug}`,
        lastmod: (cg.updated_at || today).split("T")[0],
        changefreq: "weekly",
        priority: "0.7",
      }))
    ),
    fetchOrCache(
      "seo_department_pages", cache,
      () => maxUpdatedAt("seo_department_pages", "updated_at", q => q.eq("published", true)),
      async () => (await supabase.from("seo_department_pages").select("slug, updated_at").eq("published", true)).data,
      rows => rows.map(dp => ({
        loc: `/departement/${dp.slug}`,
        lastmod: (dp.updated_at || today).split("T")[0],
        changefreq: "weekly",
        priority: "0.8",
      }))
    ),
    fetchOrCache(
      "breed_profiles", cache,
      () => maxUpdatedAt("breed_profiles", "generated_at"),
      async () => (await supabase.from("breed_profiles").select("breed, species, generated_at")).data,
      rows => {
        // Slug aligné avec src/lib/normalize.ts → slugify() (sinon soft-404 sur accents)
        const slugifyBreed = (s) =>
          s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/œ/g, "oe").replace(/æ/g, "ae")
            .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
        return rows.map(bp => ({
          loc: `/races/${bp.species.toLowerCase()}-${slugifyBreed(bp.breed)}`,
          lastmod: (bp.generated_at || today).split("T")[0],
          changefreq: "monthly",
          priority: "0.6",
        }));
      }
    ),
    // Fiches gardien `/gardiens/:id` : listées si et seulement si elles passent
    // la règle de substance partagée src/lib/sitterProfileIndexability.js
    // (bio ≥ 80 caractères ET signal de confiance), exactement la même règle
    // que celle appliquée par src/pages/PublicSitterProfile.tsx pour décider du
    // `noindex`. Toute fiche non éligible reste crawlable et rend
    // `noindex, follow` : ne pas poser de `Disallow` sur `/gardiens`, il
    // empêcherait Google de voir ce noindex, donc bloquerait la désindexation.
    // Le générateur tourne avec la clé anonyme : `profiles` est fermée par RLS,
    // on lit la vue publique `public_profiles` (exposition anonyme validée).
    fetchOrCache(
      "public_profiles", cache,
      () => maxUpdatedAt("public_profiles", "last_seen_at", q => q.in("role", ["sitter", "both"])),
      async () => {
        const [{ data: profiles }, { data: sitters }, { data: galleryRows }] = await Promise.all([
          supabase.from("public_profiles").select("id, last_seen_at, created_at, bio, identity_verified, role").in("role", ["sitter", "both"]).limit(5000),
          supabase.from("public_sitter_profiles").select("user_id, motivation").limit(5000),
          supabase.from("sitter_gallery").select("user_id").limit(20000),
        ]);
        const motivationById = new Map((sitters || []).map(s => [s.user_id, s.motivation]));
        const galleryCountById = new Map();
        for (const g of galleryRows || []) {
          galleryCountById.set(g.user_id, (galleryCountById.get(g.user_id) || 0) + 1);
        }
        return (profiles || []).map(p => ({
          ...p,
          motivation: motivationById.get(p.id) || null,
          galleryCount: galleryCountById.get(p.id) || 0,
        }));
      },
      rows => {
        const kept = rows.filter(p => isSitterProfileIndexable({
          bio: p.bio,
          motivation: p.motivation,
          identityVerified: p.identity_verified,
          galleryCount: p.galleryCount,
        }));
        console.log(`[sitemap] fiches gardien : ${kept.length} retenues sur ${rows.length}`);
        return kept.map(p => ({
          loc: `/gardiens/${p.id}`,
          lastmod: (p.last_seen_at || p.created_at || today).split("T")[0],
          changefreq: "monthly",
          priority: "0.5",
        }));
      }
    ),

    // Annonces individuelles `/annonces/:id` — filtre qualité aligné avec
    // l'indexabilité côté client (PublicSitDetail) via la règle partagée
    // src/lib/sitIndexability.js : statut publié, candidatures ouvertes,
    // titre ≥10 caractères, cumul de contenu rédigé ≥200 caractères.
    fetchOrCache(
      "public_sits", cache,
      () => maxUpdatedAt("sits", "updated_at", q => q.eq("status", "published").eq("accepting_applications", true)),
      async () => (await supabase.from("sits").select("id, slug, title, updated_at, created_at, owner_message, daily_routine, specific_expectations").eq("status", "published").eq("accepting_applications", true).limit(2000)).data,
      rows => {
        const rejected = { titre_trop_court: 0, contenu_insuffisant: 0 };
        const kept = rows.filter(s => {
          const reason = sitRichnessRejectionReason(s);
          if (reason) { rejected[reason] += 1; return false; }
          return true;
        });
        console.log(
          `[sitemap] annonces : ${kept.length} retenues sur ${rows.length} · recalées : ` +
          `titre trop court ${rejected.titre_trop_court}, contenu insuffisant ${rejected.contenu_insuffisant}`
        );
        if (kept.length === 0 && rows.length > 0) {
          console.warn("[sitemap] ATTENTION : aucune annonce retenue alors que des annonces publiées existent.");
        }
        return kept.map(s => ({
          loc: `/annonces/${s.slug || s.id}`,
          lastmod: (s.updated_at || s.created_at || today).split("T")[0],
          changefreq: "weekly",
          priority: "0.7",
        }));
      }
    ),

    // Fiches pros animaliers approuvées : /pros/:slug
    fetchOrCache(
      "pro_profiles", cache,
      () => maxUpdatedAt("pro_profiles", "updated_at", q => q.eq("status", "approved").eq("is_paused", false)),
      async () => (await supabase.from("pro_profiles").select("slug, raison_sociale, category, city, updated_at").eq("status", "approved").eq("is_paused", false)).data,
      // Les fiches de démonstration de l'annuaire (slug `demo-`) ne sont
      // jamais soumises au crawl : règle partagée avec ProDetail.tsx via
      // src/lib/proIndexability.js.
      rows => rows.filter(p => !isDemoPro(p)).map(p => ({
        loc: `/pros/${p.slug}`,
        lastmod: (p.updated_at || today).split("T")[0],
        changefreq: "monthly",
        priority: "0.7",
        _category: p.category,
        _city: p.city,
      }))
    ),
  ]);

  // Slugs des catégories pros (alignés sur src/lib/proCategories.ts)
  const PRO_CATEGORY_SLUGS = {
    veterinaire: "veterinaires",
    pet_sitter_pro: "pet-sitters-pro",
    educateur: "educateurs-canins",
    toiletteur: "toiletteurs",
    osteopathe: "osteopathes",
    dresseur_sportif: "dresseurs-sportifs",
    transporteur: "transporteurs",
    photographe: "photographes",
  };
  const slugifyCity = (s) =>
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

  // Pages silos catégorie + (catégorie, ville) dérivées des fiches pros existantes
  const proSiloEntries = [];
  // Index par catégorie (toujours, même si vide)
  for (const catSlug of Object.values(PRO_CATEGORY_SLUGS)) {
    proSiloEntries.push({
      loc: `/pros/categorie/${catSlug}`,
      lastmod: today,
      changefreq: "weekly",
      priority: "0.7",
    });
  }
  // Combinaisons (catégorie, ville) effectivement peuplées
  const siloSeen = new Set();
  for (const p of profiles_pros || []) {
    const catSlug = PRO_CATEGORY_SLUGS[p._category];
    if (!catSlug || !p._city) continue;
    const key = `${catSlug}/${slugifyCity(p._city)}`;
    if (siloSeen.has(key)) continue;
    siloSeen.add(key);
    proSiloEntries.push({
      loc: `/pros/categorie/${key}`,
      lastmod: p.lastmod,
      changefreq: "weekly",
      priority: "0.7",
    });
  }


  // Map slug → langs disponibles (article_translations join articles)
  // Filtre d'indexation : une traduction n'est déclarée que si
  //   article_translations.noindex = false
  //   ET l'article FR parent est indexable (published = true, noindex faux/null).
  const articleLangs = new Map();
  try {
    const { data: trRows } = await supabase
      .from("article_translations")
      .select("lang, noindex, articles!inner(slug, published, noindex)");
    let kept = 0;
    for (const r of trRows || []) {
      const slug = r.articles?.slug;
      if (!slug) continue;
      if (r.noindex !== false) continue;
      if (r.articles?.published !== true) continue;
      if (r.articles?.noindex === true) continue;
      if (!articleLangs.has(slug)) articleLangs.set(slug, new Set());
      articleLangs.get(slug).add(r.lang);
      kept++;
    }
    console.log(
      `  ↳ article_translations: ${kept} alternates indexables sur ${trRows?.length || 0} (${articleLangs.size} articles)`,
    );
  } catch (e) {
    console.warn("  ⚠️  Failed to fetch article_translations:", e.message);
  }

  const entries = [];

  for (const page of staticPages) {
    entries.push(urlEntryWithLangAlternates(page.loc, today, page.changefreq, page.priority));
  }
  for (const slug of cityLandingPages) {
    entries.push(urlEntryWithLangAlternates(`/house-sitting/${slug}`, today, "weekly", "0.9"));
  }
  for (const e of articles) {
    const slug = e.loc.replace(/^\/actualites\//, "");
    const langs = Array.from(articleLangs.get(slug) || []);
    entries.push(articleUrlEntry(e.loc, e.lastmod, e.changefreq, e.priority, langs));
  }
  for (const e of seoCity) entries.push(urlEntry(e.loc, e.lastmod, e.changefreq, e.priority));
  for (const e of guides) entries.push(urlEntry(e.loc, e.lastmod, e.changefreq, e.priority));
  for (const e of depts) entries.push(urlEntry(e.loc, e.lastmod, e.changefreq, e.priority));
  for (const e of breeds) entries.push(urlEntry(e.loc, e.lastmod, e.changefreq, e.priority));
  for (const e of profiles) entries.push(urlEntry(e.loc, e.lastmod, e.changefreq, e.priority));
  for (const e of sits) entries.push(urlEntry(e.loc, e.lastmod, e.changefreq, e.priority));
  for (const e of profiles_pros || []) entries.push(urlEntry(e.loc, e.lastmod, e.changefreq, e.priority));
  for (const e of proSiloEntries) entries.push(urlEntry(e.loc, e.lastmod, e.changefreq, e.priority));
  // Pages légales (/cgu, /confidentialite, /mentions-legales) déjà incluses
  // dans staticPages via staticRoutes — ne pas les ré-ajouter ici.

  // Déduplication finale : un même <loc> ne doit jamais apparaître 2 fois
  // (cityLandingPages hardcodées vs seo_city_pages DB notamment).
  // On garde la PREMIÈRE occurrence (priorité au hardcode + ordre staticPages).
  const seen = new Set();
  const dedupedEntries = [];
  let dupeCount = 0;
  for (const entry of entries) {
    const locMatch = entry.match(/<loc>([^<]+)<\/loc>/);
    const loc = locMatch?.[1];
    if (loc && seen.has(loc)) { dupeCount++; continue; }
    if (loc) seen.add(loc);
    dedupedEntries.push(entry);
  }
  if (dupeCount > 0) console.log(`  ⚠️  ${dupeCount} doublon(s) <loc> filtré(s)`);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${dedupedEntries.join("\n")}
</urlset>`;

  const outPath = path.resolve(__dirname, "../public/sitemap.xml");
  fs.writeFileSync(outPath, xml, "utf-8");
  saveCache(cache);

  // Synchronisation des compteurs géographiques annoncés dans public/llms.txt.
  // Les valeurs sont calculées depuis le sitemap qui vient d'être écrit, jamais
  // saisies en dur : elles suivent automatiquement l'ajout de villes ou de
  // départements.
  const locs = Array.from(seen);
  const cityCount = locs.filter((l) => /\/house-sitting\/[^/]+$/.test(l)).length;
  const deptCount = locs.filter((l) => /\/departement\/[^/]+$/.test(l)).length;
  const llmsPath = path.resolve(__dirname, "../public/llms.txt");
  if (fs.existsSync(llmsPath)) {
    let llms = fs.readFileSync(llmsPath, "utf-8");
    llms = llms
      .replace(
        /^(- \[House-sitting par ville\]\(\/house-sitting\): .*?)\d+ villes couvertes\.$/m,
        `$1${cityCount} villes couvertes.`,
      )
      .replace(
        /^(- \[House-sitting par département\]\(\/departement\): .*?)\d+ départements couverts\.$/m,
        `$1${deptCount} départements couverts.`,
      );
    fs.writeFileSync(llmsPath, llms, "utf-8");
    console.log(`   llms.txt: ${cityCount} villes, ${deptCount} départements`);
  }

  console.log(`\n✅ Sitemap generated: ${entries.length} URLs → ${outPath}`);
  console.log(`   Cache: ${CACHE_PATH}${FORCE ? " (forced)" : ""}`);
}

main().catch((err) => {
  console.error("❌ Sitemap generation failed:", err);
  process.exit(1);
});
