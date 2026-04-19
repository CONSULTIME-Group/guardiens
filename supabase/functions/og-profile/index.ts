// Edge function: og-profile
// Generates a dynamic Open Graph image (1200x630 SVG converted to PNG fallback via SVG)
// for sitter profiles. Used in <meta property="og:image" /> for social sharing.
//
// URL: https://<project>.functions.supabase.co/og-profile?id=<user_id>
//
// Returns: image/svg+xml (browsers + Twitter/Facebook crawlers handle SVG OG fine,
// and SVG keeps cold-start fast — no canvas/native deps).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function truncate(s: string, n: number): string {
  if (!s) return "";
  return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s;
}

function renderSvg(opts: {
  firstName: string;
  city: string;
  rating: string;
  reviewCount: number;
  completedSits: number;
  bio: string;
  role: string;
  verified: boolean;
}): string {
  const {
    firstName, city, rating, reviewCount, completedSits, bio, role, verified,
  } = opts;

  const initial = (firstName?.[0] || "?").toUpperCase();
  const safeBio = escapeXml(truncate(bio || "", 110));
  const safeName = escapeXml(firstName || "Membre");
  const safeCity = escapeXml(city || "France");
  const safeRole = escapeXml(role);

  const stats: string[] = [];
  if (Number(rating) > 0) stats.push(`★ ${rating} (${reviewCount} avis)`);
  if (completedSits > 0) stats.push(`${completedSits} garde${completedSits > 1 ? "s" : ""}`);
  if (verified) stats.push("Identité vérifiée");
  const statLine = escapeXml(stats.join("  ·  "));

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0F2A3D"/>
      <stop offset="100%" stop-color="#1A365D"/>
    </linearGradient>
    <linearGradient id="card" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.06"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.02"/>
    </linearGradient>
  </defs>

  <rect width="1200" height="630" fill="url(#bg)"/>

  <!-- Decorative paw -->
  <text x="1080" y="140" font-family="system-ui, sans-serif" font-size="120" opacity="0.06" fill="#FFFFFF">🐾</text>

  <!-- Card -->
  <rect x="60" y="60" width="1080" height="510" rx="32" fill="url(#card)" stroke="#FFFFFF" stroke-opacity="0.08" stroke-width="1"/>

  <!-- Avatar circle -->
  <circle cx="190" cy="250" r="90" fill="#F4D35E" stroke="#FFFFFF" stroke-opacity="0.2" stroke-width="3"/>
  <text x="190" y="285" font-family="Georgia, serif" font-size="90" font-weight="bold" text-anchor="middle" fill="#0F2A3D">${escapeXml(initial)}</text>

  <!-- Name -->
  <text x="320" y="220" font-family="Georgia, serif" font-size="64" font-weight="bold" fill="#FFFFFF">${safeName}</text>

  <!-- Role -->
  <text x="320" y="270" font-family="system-ui, sans-serif" font-size="28" fill="#F4D35E" font-weight="600">${safeRole} · ${safeCity}</text>

  <!-- Bio -->
  <text x="320" y="335" font-family="system-ui, sans-serif" font-size="26" fill="#FFFFFF" opacity="0.85">${safeBio}</text>

  <!-- Stats line -->
  <text x="320" y="395" font-family="system-ui, sans-serif" font-size="24" fill="#FFFFFF" opacity="0.75">${statLine}</text>

  <!-- Footer brand -->
  <line x1="100" y1="490" x2="1100" y2="490" stroke="#FFFFFF" stroke-opacity="0.1" stroke-width="1"/>
  <text x="100" y="540" font-family="Georgia, serif" font-size="36" font-weight="bold" fill="#FFFFFF">Guardiens</text>
  <text x="100" y="570" font-family="system-ui, sans-serif" font-size="20" fill="#FFFFFF" opacity="0.6">Quelqu'un du coin veille sur votre animal</text>
  <text x="1100" y="555" text-anchor="end" font-family="system-ui, sans-serif" font-size="22" fill="#F4D35E" font-weight="600">guardiens.fr</text>
</svg>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
      return new Response(JSON.stringify({ error: "Invalid id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const [profileRes, reviewsRes, sitsRes] = await Promise.all([
      supabase
        .from("public_profiles")
        .select("id, first_name, city, bio, role, identity_verified, completed_sits_count")
        .eq("id", id)
        .single(),
      supabase
        .from("reviews")
        .select("overall_rating")
        .eq("reviewee_id", id)
        .eq("published", true),
      supabase
        .from("applications")
        .select("id", { count: "exact", head: true })
        .eq("sitter_id", id)
        .eq("status", "accepted"),
    ]);

    const profile = profileRes.data;
    if (!profile) {
      return new Response("Not found", {
        status: 404,
        headers: corsHeaders,
      });
    }

    const reviews = reviewsRes.data || [];
    const avg =
      reviews.length > 0
        ? reviews.reduce((s, r: any) => s + (r.overall_rating || 0), 0) / reviews.length
        : 0;

    const completedSits = sitsRes.count ?? profile.completed_sits_count ?? 0;

    const roleLabel =
      profile.role === "both"
        ? "Gardien & Propriétaire"
        : profile.role === "sitter"
        ? "Gardien"
        : "Propriétaire";

    const svg = renderSvg({
      firstName: profile.first_name || "Membre",
      city: profile.city || "France",
      rating: avg.toFixed(1),
      reviewCount: reviews.length,
      completedSits,
      bio: profile.bio || "Membre de la communauté Guardiens.",
      role: roleLabel,
      verified: !!profile.identity_verified,
    });

    return new Response(svg, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch (err) {
    console.error("og-profile error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
