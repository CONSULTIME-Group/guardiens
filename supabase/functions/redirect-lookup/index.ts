// Edge function: redirect-lookup
//
// Résout un slug source vers son slug cible (et son code 301/302/308) via la
// table public.redirects. Utilisée :
//   1) côté SPA pour produire un Navigate replace AVANT le fetch d'article
//   2) côté worker Cloudflare prerender pour émettre un vrai 301 aux crawlers
//
// Sécurité : lecture publique (alignée avec la RLS), pas de JWT requis.
// Le service_role est utilisé uniquement pour bumper hit_count (best-effort).

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const SLUG_RE = /^[a-z0-9-]{1,200}$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const slug = (url.searchParams.get("slug") || "").trim().toLowerCase();

  if (!slug || !SLUG_RE.test(slug)) {
    return new Response(
      JSON.stringify({ error: "INVALID_SLUG" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  // Lookup avec la clé anon (lecture publique via RLS)
  const supabase = createClient(SUPABASE_URL, ANON);

  // Boucle de résolution (max 5 sauts) — gère les chaînes de redirections
  let current = slug;
  const visited = new Set<string>([current]);
  let finalType = 301;
  let hops = 0;

  for (let i = 0; i < 5; i++) {
    const { data, error } = await supabase
      .from("redirects")
      .select("slug_to, redirect_type")
      .eq("slug_from", current)
      .maybeSingle();

    if (error) {
      return new Response(
        JSON.stringify({ error: "LOOKUP_FAILED", detail: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!data) break; // pas de redirection : current est la cible finale
    if (visited.has(data.slug_to)) {
      return new Response(
        JSON.stringify({ error: "REDIRECT_LOOP", chain: [...visited, data.slug_to] }),
        { status: 508, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    current = data.slug_to;
    finalType = data.redirect_type;
    visited.add(current);
    hops++;
  }

  if (hops === 0) {
    // Pas de redirection : le slug est canonique
    return new Response(
      JSON.stringify({ slug_from: slug, slug_to: null, redirect_type: null }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=300, s-maxage=3600",
        },
      },
    );
  }

  // Best-effort : incrémente le compteur via service_role (non bloquant)
  if (SERVICE) {
    const admin = createClient(SUPABASE_URL, SERVICE);
    admin.rpc("increment_redirect_hit", { p_slug_from: slug }).then(() => {});
  }

  return new Response(
    JSON.stringify({
      slug_from: slug,
      slug_to: current,
      redirect_type: finalType,
      hops,
    }),
    {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300, s-maxage=3600",
      },
    },
  );
});
