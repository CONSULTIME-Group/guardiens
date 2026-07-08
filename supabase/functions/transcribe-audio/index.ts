// Speech-to-text via Lovable AI Gateway (openai/gpt-4o-mini-transcribe).
// Reçoit un multipart/form-data avec le champ "file" (audio enregistré côté navigateur).
// Retourne { text: string }.
//
// Rate limit léger : 20 requêtes / heure / user via analytics_events (best effort).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

const MAX_BYTES = 15 * 1024 * 1024; // 15 MiB
const RATE_LIMIT_PER_HOUR = 20;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data: u, error: ue } = await supabase.auth.getUser();
    if (ue || !u?.user) return json({ error: "Unauthorized" }, 401);
    const userId = u.user.id;

    // Rate limit horaire
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("analytics_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("event_type", "voice_transcription")
      .gte("created_at", oneHourAgo);
    if ((count ?? 0) >= RATE_LIMIT_PER_HOUR) {
      return json({ error: "Limite horaire de transcription atteinte, réessayez plus tard." }, 429);
    }

    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return json({ error: "multipart/form-data attendu." }, 400);
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return json({ error: "Fichier audio manquant." }, 400);
    }
    if (file.size > MAX_BYTES) {
      return json({ error: "Enregistrement trop long (15 Mo max)." }, 413);
    }
    if (file.size < 2048) {
      return json({ error: "Enregistrement trop court, réessayez." }, 400);
    }

    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return json({ error: "LOVABLE_API_KEY manquant" }, 500);

    // Nom de fichier avec extension cohérente pour l'inférence de format côté provider.
    const mime = (file.type || "audio/webm").split(";")[0];
    const extMap: Record<string, string> = {
      "audio/webm": "webm",
      "audio/mp4": "mp4",
      "audio/mpeg": "mp3",
      "audio/wav": "wav",
      "audio/ogg": "ogg",
    };
    const ext = extMap[mime] ?? "webm";

    const upstream = new FormData();
    upstream.append("model", "openai/gpt-4o-mini-transcribe");
    upstream.append("language", "fr");
    upstream.append("file", file, `voice.${ext}`);

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: upstream,
    });

    if (resp.status === 429) return json({ error: "Trop de requêtes IA, réessayez dans un instant." }, 429);
    if (resp.status === 402) return json({ error: "Crédits IA épuisés." }, 402);
    if (!resp.ok) {
      const t = await resp.text().catch(() => "");
      console.error("STT gateway error", resp.status, t);
      return json({ error: "Transcription impossible." }, 502);
    }

    const data = await resp.json();
    const text = String(data?.text ?? "").trim();
    if (!text) return json({ error: "Aucun texte détecté." }, 422);

    // Log analytics (best effort)
    try {
      await supabase.from("analytics_events").insert({
        user_id: userId,
        event_type: "voice_transcription",
        metadata: { chars: text.length, bytes: file.size, mime },
      });
    } catch (_) { /* noop */ }

    return json({ text });
  } catch (e) {
    console.error("transcribe-audio error:", e);
    return json({ error: e instanceof Error ? e.message : "Erreur" }, 500);
  }
});
