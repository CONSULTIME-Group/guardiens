// Edge function: og-sit
// Génère une image Open Graph PNG (1200x630) pour une annonce publiée.
// Utilisée dans <meta property="og:image" /> sur /annonces/:id pour Facebook, X, WhatsApp, LinkedIn, etc.
//
// Deux modes :
//   GET /og-sit?id=<sit_id>            → PNG inline (servi aux scrapers)
//   GET /og-sit?id=<sit_id>&download=1 → même PNG en pièce jointe (visuel HD à attacher manuellement sur Facebook)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import satori from "https://esm.sh/satori@0.10.13";
import { Resvg, initWasm } from "https://esm.sh/@resvg/resvg-wasm@2.6.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const speciesLabel: Record<string, string> = {
  dog: "chien", cat: "chat", horse: "cheval", bird: "oiseau", rodent: "rongeur",
  fish: "poisson", reptile: "reptile", farm_animal: "animal de ferme", nac: "NAC",
};

function pluralize(n: number, sg: string, pl?: string): string {
  return n > 1 ? (pl || sg + "s") : sg;
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
    const sameYear = s.getFullYear() === e.getFullYear();
    const left = `${s.getDate()} ${months[s.getMonth()]}${sameYear ? "" : " " + s.getFullYear()}`;
    const right = `${e.getDate()} ${months[e.getMonth()]} ${e.getFullYear()}`;
    return `${left} → ${right}`;
  } catch {
    return "Garde planifiée";
  }
}

/** Récupère une image distante en ArrayBuffer + mime. */
async function fetchAsArrayBuffer(url: string): Promise<{ buf: ArrayBuffer; mime: string } | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const mime = res.headers.get("content-type") || "image/jpeg";
    const buf = await res.arrayBuffer();
    if (buf.byteLength > 5_000_000) return null;
    return { buf, mime };
  } catch {
    return null;
  }
}

/** Convertit en data URI base64 (pour <img src> Satori). */
function toDataUri({ buf, mime }: { buf: ArrayBuffer; mime: string }): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return `data:${mime};base64,${btoa(bin)}`;
}

// --- Fonts (chargées 1x, mises en cache module-scope) ---
let fontDataCache: { regular: ArrayBuffer; bold: ArrayBuffer } | null = null;
async function loadFonts(): Promise<{ regular: ArrayBuffer; bold: ArrayBuffer }> {
  if (fontDataCache) return fontDataCache;
  const [reg, bold] = await Promise.all([
    fetch("https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf").then(r => r.arrayBuffer()),
    fetch("https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYMZhrib2Bg-4.ttf").then(r => r.arrayBuffer()),
  ]);
  fontDataCache = { regular: reg, bold };
  return fontDataCache;
}

// --- WASM resvg (init 1x) ---
let resvgInitialized = false;
async function ensureResvg() {
  if (resvgInitialized) return;
  const wasm = await fetch("https://esm.sh/@resvg/resvg-wasm@2.6.2/index_bg.wasm").then(r => r.arrayBuffer());
  await initWasm(wasm);
  resvgInitialized = true;
}

function buildLayout(opts: {
  title: string;
  city: string;
  dates: string;
  petsLine: string;
  ownerFirstName: string;
  bgDataUri: string | null;
}) {
  const { title, city, dates, petsLine, ownerFirstName, bgDataUri } = opts;

  return {
    type: "div",
    props: {
      style: {
        width: 1200,
        height: 630,
        display: "flex",
        flexDirection: "column",
        position: "relative",
        background: "linear-gradient(135deg, #0F2A3D, #1A365D)",
        fontFamily: "Inter",
        color: "#FFFFFF",
      },
      children: [
        // Image de fond
        bgDataUri && {
          type: "img",
          props: {
            src: bgDataUri,
            style: {
              position: "absolute",
              top: 0, left: 0, width: 1200, height: 630,
              objectFit: "cover",
            },
          },
        },
        // Voile assombrissant
        {
          type: "div",
          props: {
            style: {
              position: "absolute", top: 0, left: 0, width: 1200, height: 630,
              background: "linear-gradient(to bottom, rgba(15,42,61,0.25) 0%, rgba(15,42,61,0.55) 55%, rgba(15,42,61,0.92) 100%)",
              display: "flex",
            },
          },
        },
        // Bandeau marque haut
        {
          type: "div",
          props: {
            style: {
              position: "absolute", top: 0, left: 0, width: 1200, height: 56,
              background: "rgba(15,42,61,0.85)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 40px",
            },
            children: [
              { type: "div", props: { style: { fontSize: 24, fontWeight: 700, color: "#F4D35E" }, children: "Guardiens" } },
              { type: "div", props: { style: { fontSize: 18, color: "#FFFFFF", opacity: 0.85 }, children: "guardiens.fr" } },
            ],
          },
        },
        // Bloc texte bas
        {
          type: "div",
          props: {
            style: {
              position: "absolute",
              bottom: 40, left: 60, right: 60,
              display: "flex",
              flexDirection: "column",
              gap: 14,
            },
            children: [
              // Pastille ville
              {
                type: "div",
                props: {
                  style: {
                    alignSelf: "flex-start",
                    background: "#F4D35E",
                    color: "#0F2A3D",
                    fontSize: 20, fontWeight: 700,
                    padding: "10px 20px",
                    borderRadius: 999,
                    display: "flex",
                  },
                  children: city,
                },
              },
              // Titre
              {
                type: "div",
                props: {
                  style: {
                    fontSize: 52, fontWeight: 700,
                    color: "#FFFFFF",
                    lineHeight: 1.15,
                    display: "flex",
                  },
                  children: title,
                },
              },
              // Dates
              {
                type: "div",
                props: {
                  style: { fontSize: 26, fontWeight: 600, color: "#F4D35E", display: "flex" },
                  children: dates,
                },
              },
              // Animaux
              {
                type: "div",
                props: {
                  style: { fontSize: 22, color: "#FFFFFF", opacity: 0.92, display: "flex" },
                  children: petsLine,
                },
              },
              // Auteur
              {
                type: "div",
                props: {
                  style: { fontSize: 18, color: "#FFFFFF", opacity: 0.7, display: "flex" },
                  children: `Publiée par ${ownerFirstName} — Garde 0€, entre gens du coin`,
                },
              },
            ],
          },
        },
      ].filter(Boolean),
    },
  };
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

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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
    pets.forEach((p) => { counts[p.species] = (counts[p.species] || 0) + 1; });
    const petsParts = Object.entries(counts).map(([sp, n]) => {
      const lbl = speciesLabel[sp] || "animal";
      return `${n} ${pluralize(n, lbl)}`;
    });
    const petsLine = petsParts.length ? petsParts.join(" · ") : "Animaux à confier";

    const firstPhoto = property?.photos?.[0] ?? null;
    const photo = firstPhoto ? await fetchAsArrayBuffer(firstPhoto) : null;
    const bgDataUri = photo ? toDataUri(photo) : null;

    const layout = buildLayout({
      title: truncate(sit.title || `Garde à ${owner?.city || "France"}`, 70),
      city: owner?.city || "France",
      dates: formatDateRange(sit.start_date, sit.end_date),
      petsLine,
      ownerFirstName: owner?.first_name || "Un membre",
      bgDataUri,
    });

    const fonts = await loadFonts();
    const svg = await satori(layout as any, {
      width: 1200,
      height: 630,
      fonts: [
        { name: "Inter", data: fonts.regular, weight: 400, style: "normal" },
        { name: "Inter", data: fonts.bold, weight: 700, style: "normal" },
      ],
    });

    await ensureResvg();
    const resvg = new Resvg(svg, { fitTo: { mode: "width", value: 1200 } });
    const png = resvg.render().asPng();

    const headers: Record<string, string> = {
      ...corsHeaders,
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
    };
    if (download) {
      headers["Content-Disposition"] = `attachment; filename="guardiens-annonce-${id.slice(0, 8)}.png"`;
    }

    return new Response(png, { status: 200, headers });
  } catch (err) {
    console.error("og-sit error:", err);
    return new Response(JSON.stringify({ error: "Internal error", detail: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
