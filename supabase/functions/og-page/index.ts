// Edge function: og-page
// Génère une image Open Graph PNG (1200x630) à la volée pour n'importe quelle page éditoriale
// (ville, département, race, article, guide, FAQ…).
//
// GET /og-page?title=...&subtitle=...&kind=ville|departement|race|article|guide|generic
// Tous les paramètres sont optionnels (valeurs par défaut neutres).

import satori from "https://esm.sh/satori@0.10.13";
import { Resvg, initWasm } from "https://esm.sh/@resvg/resvg-wasm@2.6.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const KIND_LABELS: Record<string, string> = {
  ville: "Garde d'animaux",
  departement: "Garde d'animaux",
  race: "Fiche de race",
  article: "Guide pratique",
  guide: "Bons plans",
  faq: "Questions fréquentes",
  generic: "Guardiens",
};

const KIND_GRADIENTS: Record<string, string> = {
  ville: "linear-gradient(135deg, #0F2A3D 0%, #1A365D 100%)",
  departement: "linear-gradient(135deg, #1A365D 0%, #2C5282 100%)",
  race: "linear-gradient(135deg, #5B3A29 0%, #8A5A3B 100%)",
  article: "linear-gradient(135deg, #2F4F2F 0%, #5C7A29 100%)",
  guide: "linear-gradient(135deg, #6B2C5F 0%, #9B3D7F 100%)",
  faq: "linear-gradient(135deg, #3D3D5B 0%, #5B5B82 100%)",
  generic: "linear-gradient(135deg, #0F2A3D 0%, #1A365D 100%)",
};

function truncate(s: string, n: number): string {
  if (!s) return "";
  return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s;
}

let fontDataCache: { regular: ArrayBuffer; bold: ArrayBuffer } | null = null;
async function loadFonts() {
  if (fontDataCache) return fontDataCache;
  const [regular, bold] = await Promise.all([
    fetch("https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf").then(r => r.arrayBuffer()),
    fetch("https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYMZhrib2Bg-4.ttf").then(r => r.arrayBuffer()),
  ]);
  fontDataCache = { regular, bold };
  return fontDataCache;
}

let resvgInitialized = false;
async function ensureResvg() {
  if (resvgInitialized) return;
  const wasm = await fetch("https://esm.sh/@resvg/resvg-wasm@2.6.2/index_bg.wasm").then(r => r.arrayBuffer());
  await initWasm(wasm);
  resvgInitialized = true;
}

function buildLayout(opts: { title: string; subtitle: string; kind: string }) {
  const { title, subtitle, kind } = opts;
  const kindLabel = KIND_LABELS[kind] || KIND_LABELS.generic;
  const gradient = KIND_GRADIENTS[kind] || KIND_GRADIENTS.generic;

  return {
    type: "div",
    props: {
      style: {
        width: 1200, height: 630, display: "flex", flexDirection: "column",
        background: gradient, fontFamily: "Inter", color: "#FFFFFF", position: "relative",
      },
      children: [
        // Bandeau marque haut
        {
          type: "div",
          props: {
            style: {
              width: 1200, height: 64, display: "flex", alignItems: "center",
              padding: "0 48px", background: "rgba(0,0,0,0.25)",
              fontSize: 22, fontWeight: 700, letterSpacing: 1.5,
            },
            children: "GUARDIENS.FR",
          },
        },
        // Bloc principal
        {
          type: "div",
          props: {
            style: {
              display: "flex", flexDirection: "column", padding: "60px 64px",
              flex: 1, justifyContent: "center", gap: 22,
            },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    fontSize: 22, fontWeight: 600, letterSpacing: 2,
                    textTransform: "uppercase", color: "#F4D35E", display: "flex",
                  },
                  children: kindLabel,
                },
              },
              {
                type: "div",
                props: {
                  style: {
                    fontSize: 64, fontWeight: 700, lineHeight: 1.1,
                    color: "#FFFFFF", display: "flex",
                  },
                  children: title,
                },
              },
              subtitle && {
                type: "div",
                props: {
                  style: {
                    fontSize: 28, fontWeight: 400, lineHeight: 1.3,
                    color: "rgba(255,255,255,0.88)", display: "flex",
                  },
                  children: subtitle,
                },
              },
            ].filter(Boolean),
          },
        },
        // Pied
        {
          type: "div",
          props: {
            style: {
              width: 1200, height: 56, display: "flex", alignItems: "center",
              padding: "0 48px", background: "rgba(0,0,0,0.35)",
              fontSize: 20, color: "rgba(255,255,255,0.85)",
            },
            children: "Garde d'animaux entre particuliers, partout en France",
          },
        },
      ],
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const title = truncate((url.searchParams.get("title") || "Guardiens").trim(), 90);
    const subtitle = truncate((url.searchParams.get("subtitle") || "").trim(), 140);
    const kind = (url.searchParams.get("kind") || "generic").toLowerCase();

    const layout = buildLayout({ title, subtitle, kind });
    const fonts = await loadFonts();
    const svg = await satori(layout as any, {
      width: 1200, height: 630,
      fonts: [
        { name: "Inter", data: fonts.regular, weight: 400, style: "normal" },
        { name: "Inter", data: fonts.bold, weight: 700, style: "normal" },
      ],
    });
    await ensureResvg();
    const png = new Resvg(svg, { fitTo: { mode: "width", value: 1200 } }).render().asPng();

    return new Response(png, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=2592000, s-maxage=2592000, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    console.error("og-page error:", err);
    return new Response(JSON.stringify({ error: "Internal error", detail: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
