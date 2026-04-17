// Auto-link articles missing internal_links (≥2 contextual links)
// Admin-only. Selects 3-4 relevant published articles per target.
// Priority: same city > same category > shared tags > category fallback.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Article {
  id: string;
  slug: string;
  title: string;
  category: string | null;
  city: string | null;
  tags: string[] | null;
  internal_links: any;
  published: boolean;
}

interface InternalLink {
  url: string;
  text: string;
}

const TARGET_LINKS_PER_ARTICLE = 4;

function score(target: Article, candidate: Article): number {
  if (target.id === candidate.id) return -1;
  let s = 0;
  if (target.city && candidate.city && target.city === candidate.city) s += 10;
  if (
    target.category &&
    candidate.category &&
    target.category === candidate.category
  )
    s += 5;
  const tt = new Set((target.tags ?? []).map((t) => t.toLowerCase()));
  const ct = (candidate.tags ?? []).map((t) => t.toLowerCase());
  for (const t of ct) if (tt.has(t)) s += 2;
  return s;
}

function buildLinks(target: Article, pool: Article[]): InternalLink[] {
  const ranked = pool
    .map((c) => ({ c, s: score(target, c) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s);

  // Fallback: if not enough scored, fill with most recent published
  const picked: Article[] = [];
  for (const { c } of ranked) {
    if (picked.length >= TARGET_LINKS_PER_ARTICLE) break;
    picked.push(c);
  }
  if (picked.length < 2) {
    for (const c of pool) {
      if (c.id === target.id) continue;
      if (picked.find((p) => p.id === c.id)) continue;
      picked.push(c);
      if (picked.length >= TARGET_LINKS_PER_ARTICLE) break;
    }
  }

  return picked.slice(0, TARGET_LINKS_PER_ARTICLE).map((c) => ({
    url: `/actualites/${c.slug}`,
    text: c.title.length > 70 ? c.title.slice(0, 67) + "…" : c.title,
  }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Auth check — admin only
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdmin } = await userClient.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse body
    let dryRun = false;
    let onlyMissing = true;
    try {
      const body = await req.json();
      dryRun = !!body?.dryRun;
      if (typeof body?.onlyMissing === "boolean") onlyMissing = body.onlyMissing;
    } catch (_) { /* no body */ }

    const admin = createClient(supabaseUrl, serviceKey);

    // Pool = all published articles (used as link candidates)
    const { data: pool, error: poolErr } = await admin
      .from("articles")
      .select("id, slug, title, category, city, tags, internal_links, published")
      .eq("published", true);
    if (poolErr) throw poolErr;
    const candidates = (pool ?? []) as Article[];

    // Targets = articles missing links (or all if onlyMissing=false)
    const { data: all, error: allErr } = await admin
      .from("articles")
      .select("id, slug, title, category, city, tags, internal_links, published");
    if (allErr) throw allErr;

    const targets = (all ?? []).filter((a: Article) => {
      if (!onlyMissing) return true;
      const links = Array.isArray(a.internal_links) ? a.internal_links : [];
      return links.length < 2;
    }) as Article[];

    const updates: { slug: string; links: InternalLink[] }[] = [];
    for (const t of targets) {
      const links = buildLinks(t, candidates);
      updates.push({ slug: t.slug, links });
    }

    if (!dryRun) {
      // Sequential to avoid overwhelming the DB; small volume (~36)
      for (const u of updates) {
        const { error } = await admin
          .from("articles")
          .update({ internal_links: u.links as any })
          .eq("slug", u.slug);
        if (error) console.error(`Update failed for ${u.slug}:`, error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        dryRun,
        updated: dryRun ? 0 : updates.length,
        targets: updates.length,
        sample: updates.slice(0, 5),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e: any) {
    console.error("auto-internal-links error:", e);
    return new Response(
      JSON.stringify({ error: e?.message ?? "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
