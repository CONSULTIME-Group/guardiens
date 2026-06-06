// Pousse une ou plusieurs URLs vers IndexNow (Bing, Yandex, Seznam, Naver).
// Doc : https://www.indexnow.org/documentation
//
// POST body : { urls?: string[], slugs?: string[], all?: boolean }
//   - urls   : URLs absolues ou chemins
//   - slugs  : slugs d'articles publiés (prefixés /actualites/)
//   - all    : pousse tous les articles publiés + pages SEO de villes/guides
//
// Réponse IndexNow :
//   200 OK     URL submitted successfully
//   202        URL received. IndexNow key validation pending.
//   400        Bad request (format)
//   403        Forbidden (clé invalide)
//   422        Unprocessable Entity (clé/host mismatch)
//   429        Too many requests

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const HOST = "guardiens.fr";
const KEY = "a932ae5a07bd450db43be9ad2fdb7440";
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;
const ENDPOINT = "https://api.indexnow.org/IndexNow";

function toAbsolute(input: string): string | null {
  if (!input) return null;
  const v = input.trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) {
    try {
      const u = new URL(v);
      if (u.hostname.replace(/^www\./, "") !== HOST) return null;
      return `https://${HOST}${u.pathname}${u.search}`;
    } catch {
      return null;
    }
  }
  const path = v.startsWith("/") ? v : `/${v}`;
  return `https://${HOST}${path}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const { urls = [], slugs = [], all = false } = body as {
      urls?: string[];
      slugs?: string[];
      all?: boolean;
    };

    const set = new Set<string>();
    for (const u of urls) {
      const abs = toAbsolute(u);
      if (abs) set.add(abs);
    }
    for (const s of slugs) {
      if (s) set.add(`https://${HOST}/actualites/${s}`);
    }

    if (all) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supa = createClient(supabaseUrl, serviceKey);
      const [a, c, g] = await Promise.all([
        supa.from("articles").select("slug").eq("published", true),
        supa.from("seo_city_pages").select("slug"),
        supa.from("city_guides").select("slug"),
      ]);
      for (const r of a.data ?? []) if (r.slug) set.add(`https://${HOST}/actualites/${r.slug}`);
      for (const r of c.data ?? []) if (r.slug) set.add(`https://${HOST}/house-sitting/${r.slug}`);
      for (const r of g.data ?? []) if (r.slug) set.add(`https://${HOST}/guides/${r.slug}`);
    }

    const urlList = Array.from(set).slice(0, 10000);
    if (urlList.length === 0) {
      return new Response(JSON.stringify({ error: "no urls" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = {
      host: HOST,
      key: KEY,
      keyLocation: KEY_LOCATION,
      urlList,
    };

    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    return new Response(
      JSON.stringify({
        ok: res.status >= 200 && res.status < 300,
        status: res.status,
        submitted: urlList.length,
        sample: urlList.slice(0, 5),
        response: text.slice(0, 500),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
