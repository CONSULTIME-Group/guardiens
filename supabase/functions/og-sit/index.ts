// Edge function: og-sit
// Generates a dynamic Open Graph image (1200x630 SVG) for a published sit listing.
// Used in <meta property="og:image" /> on /annonces/:id for Facebook, X, WhatsApp, LinkedIn, etc.
//
// URL: https://<project>.functions.supabase.co/og-sit?id=<sit_id>

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const speciesEmoji: Record<string, string> = {
  dog: "🐕", cat: "🐈", horse: "🐴", bird: "🐦", rodent: "🐹",
  fish: "🐠", reptile: "🦎", farm_animal: "🐄", nac: "🐾",
};

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

function formatDateRange(start: string | null, end: string | null): string {
  if (!start || !end) return "Dates flexibles";
  try {
    const s = new Date(start);
    const e = new Date(end);
    const months = ["janv.", "févr.", "mars", "avril", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
    return `${s.getDate()} ${months[s.getMonth()]} → ${e.getDate()} ${months[e.getMonth()]} ${e.getFullYear()}`;
  } catch {
    return "Garde planifiée";
  }
}

function renderSvg(opts: {
  title: string;
  city: string;
  dates: string;
  petsLine: string;
  ownerFirstName: string;
  photoUrl: string | null;
}): string {
  const { title, city, dates, petsLine, ownerFirstName, photoUrl } = opts;

  const safeTitle = escapeXml(truncate(title, 60));
  const safeCity = escapeXml(city || "France");
  const safeDates = escapeXml(dates);
  const safePets = escapeXml(petsLine);
  const safeOwner = escapeXml(ownerFirstName || "Un membre");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0F2A3D"/>
      <stop offset="100%" stop-color="#1A365D"/>
    </linearGradient>
    <linearGradient id="overlay" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0F2A3D" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="#0F2A3D" stop-opacity="0.85"/>
    </linearGradient>
  </defs>

  <rect width="1200" height="630" fill="url(#bg)"/>

  <!-- Decorative paw -->
  <text x="1080" y="140" font-family="system-ui, sans-serif" font-size="120" opacity="0.06" fill="#FFFFFF">🐾</text>

  <!-- Yellow accent ribbon top-left -->
  <rect x="0" y="0" width="380" height="56" fill="#F4D35E"/>
  <text x="40" y="38" font-family="system-ui, sans-serif" font-size="22" font-weight="700" fill="#0F2A3D">Garde gratuite — Guardiens</text>

  <!-- Card -->
  <rect x="60" y="100" width="1080" height="470" rx="32" fill="#FFFFFF" fill-opacity="0.04" stroke="#FFFFFF" stroke-opacity="0.10" stroke-width="1"/>

  <!-- City badge -->
  <rect x="100" y="140" width="auto" height="44" rx="22" fill="#F4D35E"/>
  <text x="124" y="172" font-family="system-ui, sans-serif" font-size="22" font-weight="700" fill="#0F2A3D">📍 ${safeCity}</text>

  <!-- Title -->
  <text x="100" y="270" font-family="Georgia, serif" font-size="56" font-weight="bold" fill="#FFFFFF">${safeTitle}</text>

  <!-- Dates -->
  <text x="100" y="330" font-family="system-ui, sans-serif" font-size="28" fill="#F4D35E" font-weight="600">📅 ${safeDates}</text>

  <!-- Pets -->
  <text x="100" y="380" font-family="system-ui, sans-serif" font-size="26" fill="#FFFFFF" opacity="0.9">${safePets}</text>

  <!-- Owner -->
  <text x="100" y="430" font-family="system-ui, sans-serif" font-size="22" fill="#FFFFFF" opacity="0.7">Publiée par ${safeOwner}</text>

  <!-- Footer -->
  <line x1="100" y1="490" x2="1100" y2="490" stroke="#FFFFFF" stroke-opacity="0.10" stroke-width="1"/>
  <text x="100" y="540" font-family="Georgia, serif" font-size="36" font-weight="bold" fill="#FFFFFF">Guardiens</text>
  <text x="100" y="570" font-family="system-ui, sans-serif" font-size="20" fill="#FFFFFF" opacity="0.6">Quelqu'un du coin veille sur votre maison</text>
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

    const { data: sit } = await supabase
      .from("sits")
      .select("id, title, start_date, end_date, status, user_id, property_id")
      .eq("id", id)
      .maybeSingle();

    if (!sit || sit.status !== "published") {
      return new Response("Not found", {
        status: 404,
        headers: corsHeaders,
      });
    }

    const [ownerRes, propRes, petsRes] = await Promise.all([
      supabase.from("public_profiles").select("first_name, city").eq("id", sit.user_id).maybeSingle(),
      supabase.from("properties").select("photos").eq("id", sit.property_id).maybeSingle(),
      supabase.from("pets").select("species, name").eq("property_id", sit.property_id),
    ]);

    const owner = ownerRes.data;
    const property = propRes.data as { photos?: string[] } | null;
    const pets = petsRes.data || [];

    const petCounts: Record<string, number> = {};
    pets.forEach((p) => {
      petCounts[p.species] = (petCounts[p.species] || 0) + 1;
    });
    const petsLine = Object.entries(petCounts)
      .map(([species, n]) => `${speciesEmoji[species] || "🐾"} ${n}`)
      .join("  ");

    const svg = renderSvg({
      title: sit.title || `Garde à ${owner?.city || "France"}`,
      city: owner?.city || "France",
      dates: formatDateRange(sit.start_date, sit.end_date),
      petsLine: petsLine || "Animaux à confier",
      ownerFirstName: owner?.first_name || "Un membre",
      photoUrl: property?.photos?.[0] ?? null,
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
    console.error("og-sit error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
