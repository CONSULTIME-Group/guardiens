// Edge function: og-sit
// Generates a dynamic Open Graph image (1200x630) for a published sit listing.
// Used in <meta property="og:image" /> on /annonces/:id for Facebook, X, WhatsApp, LinkedIn, etc.
//
// Two modes :
//   GET /og-sit?id=<sit_id>            → SVG avec photo réelle de la propriété en fond + overlay infos
//   GET /og-sit?id=<sit_id>&download=1 → même image servie avec Content-Disposition attachment (visuel HD à attacher manuellement sur Facebook)
//
// Le SVG embarque la 1re photo de la propriété en base64 pour garantir un rendu identique
// chez tous les scrapers (Facebook, LinkedIn, WhatsApp, X).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const speciesLabel: Record<string, string> = {
  dog: "chien", cat: "chat", horse: "cheval", bird: "oiseau", rodent: "rongeur",
  fish: "poisson", reptile: "reptile", farm_animal: "animal de ferme", nac: "NAC",
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

function pluralize(n: number, sg: string, pl?: string): string {
  return n > 1 ? (pl || sg + "s") : sg;
}

function formatDateRange(start: string | null, end: string | null): string {
  if (!start || !end) return "Dates flexibles";
  try {
    const s = new Date(start);
    const e = new Date(end);
    const months = ["janv.", "févr.", "mars", "avril", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
    const sameYear = s.getFullYear() === e.getFullYear();
    const left = `${s.getDate()} ${months[s.getMonth()]}${sameYear ? "" : " " + s.getFullYear()}`;
    const right = `${e.getDate()} ${months[e.getMonth()]} ${e.getFullYear()}`;
    return `${left} → ${right}`;
  } catch {
    return "Garde planifiée";
  }
}

/** Récupère une image distante et la convertit en data URI base64. */
async function fetchAsDataUri(url: string): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "image/jpeg";
    const buf = new Uint8Array(await res.arrayBuffer());
    // Limite raisonnable (3 Mo) pour éviter SVG trop gros
    if (buf.byteLength > 3_000_000) return null;
    let bin = "";
    const chunk = 0x8000;
    for (let i = 0; i < buf.length; i += chunk) {
      bin += String.fromCharCode(...buf.subarray(i, i + chunk));
    }
    const b64 = btoa(bin);
    return `data:${ct};base64,${b64}`;
  } catch {
    return null;
  }
}

function renderSvg(opts: {
  title: string;
  city: string;
  dates: string;
  petsLine: string;
  ownerFirstName: string;
  bgDataUri: string | null;
}): string {
  const { title, city, dates, petsLine, ownerFirstName, bgDataUri } = opts;

  const safeTitle = escapeXml(truncate(title, 64));
  const safeCity = escapeXml(city || "France");
  const safeDates = escapeXml(dates);
  const safePets = escapeXml(petsLine);
  const safeOwner = escapeXml(ownerFirstName || "Un membre");

  const bgLayer = bgDataUri
    ? `<image href="${escapeXml(bgDataUri)}" x="0" y="0" width="1200" height="630" preserveAspectRatio="xMidYMid slice"/>`
    : `<rect width="1200" height="630" fill="url(#bgGrad)"/>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0F2A3D"/>
      <stop offset="100%" stop-color="#1A365D"/>
    </linearGradient>
    <linearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0F2A3D" stop-opacity="0.25"/>
      <stop offset="55%" stop-color="#0F2A3D" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#0F2A3D" stop-opacity="0.92"/>
    </linearGradient>
    <linearGradient id="sideScrim" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#0F2A3D" stop-opacity="0.75"/>
      <stop offset="100%" stop-color="#0F2A3D" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <!-- Fond : photo réelle ou dégradé fallback -->
  ${bgLayer}

  <!-- Voile d'assombrissement bas (lisibilité) -->
  <rect width="1200" height="630" fill="url(#scrim)"/>
  <rect width="700" height="630" fill="url(#sideScrim)"/>

  <!-- Bandeau marque haut -->
  <rect x="0" y="0" width="1200" height="56" fill="#0F2A3D" fill-opacity="0.85"/>
  <text x="40" y="38" font-family="Georgia, serif" font-size="24" font-weight="700" fill="#F4D35E">Guardiens</text>
  <text x="1160" y="38" text-anchor="end" font-family="system-ui, -apple-system, sans-serif" font-size="18" fill="#FFFFFF" opacity="0.85">guardiens.fr</text>

  <!-- Pastille ville -->
  <g transform="translate(60, 360)">
    <rect x="0" y="0" width="${20 + safeCity.length * 13}" height="44" rx="22" fill="#F4D35E"/>
    <text x="20" y="30" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="700" fill="#0F2A3D">${safeCity}</text>
  </g>

  <!-- Titre principal -->
  <text x="60" y="460" font-family="Georgia, serif" font-size="52" font-weight="bold" fill="#FFFFFF">${safeTitle}</text>

  <!-- Dates -->
  <text x="60" y="510" font-family="system-ui, -apple-system, sans-serif" font-size="26" font-weight="600" fill="#F4D35E">${safeDates}</text>

  <!-- Animaux + propriétaire -->
  <text x="60" y="555" font-family="system-ui, -apple-system, sans-serif" font-size="22" fill="#FFFFFF" opacity="0.92">${safePets}</text>
  <text x="60" y="590" font-family="system-ui, -apple-system, sans-serif" font-size="18" fill="#FFFFFF" opacity="0.7">Publiée par ${safeOwner} — Garde 0€, entre gens du coin</text>
</svg>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const download = url.searchParams.get("download") === "1";

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
      return new Response("Not found", { status: 404, headers: corsHeaders });
    }

    const [ownerRes, propRes, petsRes] = await Promise.all([
      supabase.from("public_profiles").select("first_name, city").eq("id", sit.user_id).maybeSingle(),
      supabase.from("properties").select("photos").eq("id", sit.property_id).maybeSingle(),
      supabase.from("pets").select("species, name").eq("property_id", sit.property_id),
    ]);

    const owner = ownerRes.data;
    const property = propRes.data as { photos?: string[] } | null;
    const pets = petsRes.data || [];

    const counts: Record<string, number> = {};
    pets.forEach((p) => {
      counts[p.species] = (counts[p.species] || 0) + 1;
    });
    const petsParts = Object.entries(counts).map(([sp, n]) => {
      const lbl = speciesLabel[sp] || "animal";
      return `${n} ${pluralize(n, lbl)}`;
    });
    const petsLine = petsParts.length ? petsParts.join(" · ") : "Animaux à confier";

    // Fond : 1ère photo de la propriété en base64 pour garantir le rendu chez tous les scrapers
    const firstPhoto = property?.photos?.[0] ?? null;
    const bgDataUri = firstPhoto ? await fetchAsDataUri(firstPhoto) : null;

    const svg = renderSvg({
      title: sit.title || `Garde à ${owner?.city || "France"}`,
      city: owner?.city || "France",
      dates: formatDateRange(sit.start_date, sit.end_date),
      petsLine,
      ownerFirstName: owner?.first_name || "Un membre",
      bgDataUri,
    });

    const headers: Record<string, string> = {
      ...corsHeaders,
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
    };
    if (download) {
      headers["Content-Disposition"] = `attachment; filename="guardiens-annonce-${id.slice(0, 8)}.svg"`;
    }

    return new Response(svg, { status: 200, headers });
  } catch (err) {
    console.error("og-sit error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
