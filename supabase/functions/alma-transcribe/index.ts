// Transcription de la dictée d'Alma (lot 1).
// Reçoit un fichier audio en multipart, renvoie { text }.
// Passe par le gateway Lovable (LOVABLE_API_KEY), jamais depuis le navigateur.

import { CORS_HEADERS } from "../_shared/ai-gateway.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const MAX_BYTES = 10 * 1024 * 1024;
const MODEL = "google/gemini-3.5-transcribe";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
    const { data: u, error: ue } = await userClient.auth.getUser();
    if (ue || !u?.user) return json({ error: "Unauthorized" }, 401);

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return json({ error: "Fichier audio requis." }, 400);
    }
    if (file.size > MAX_BYTES) {
      return json({ error: "Enregistrement trop long, faites plus court." }, 413);
    }

    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return json({ error: "Transcription indisponible." }, 500);

    const ext =
      ({
        "audio/webm": "webm",
        "audio/mp4": "mp4",
        "audio/mpeg": "mp3",
        "audio/wav": "wav",
        "audio/x-wav": "wav",
      } as Record<string, string>)[(file.type || "").split(";")[0]] ?? "webm";

    const upstream = new FormData();
    upstream.append("model", MODEL);
    upstream.append("file", file, `dictee.${ext}`);

    const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: upstream,
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("alma-transcribe gateway error", res.status, detail);
      // Journalisation du pilotage : la dictée en échec reste visible en admin.
      try {
        const service = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
          { auth: { persistSession: false, autoRefreshToken: false } },
        );
        await service.from("alma_conversations").insert({
          user_id: u.user.id,
          input_mode: "voice",
          question: null,
          answer: null,
          refusal_reason: `transcribe_gateway_${res.status}`,
        });
      } catch (logError) {
        console.error("alma-transcribe log error", logError);
      }
      if (res.status === 429 || res.status === 402) {
        return json({ error: "Dictée indisponible pour l'instant, réessayez plus tard." }, res.status);
      }
      return json({ error: "Dictée indisponible pour l'instant." }, 502);
    }


    const data = await res.json().catch(() => null);
    const text = typeof data?.text === "string" ? data.text.trim() : "";
    return json({ text });
  } catch (e) {
    console.error("alma-transcribe error", e);
    return json({ error: "Erreur inattendue." }, 500);
  }
});
