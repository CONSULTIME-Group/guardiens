// Transcription de la dictée d'Alma (lot 1).
// Reçoit un fichier audio en multipart, renvoie { text }.
// Passe par le gateway Lovable (LOVABLE_API_KEY), jamais depuis le navigateur.
// Lot A4 (audit Alma du 14/10/2026, décision de Jérémie du 14/10/2026) :
// 20 dictées par membre et par jour de Paris, réservées avant l'appel
// (alma-turn-cap.ts, compteur « transcription »), 2 Mo au plus, types audio
// en liste fermée (alma-transcribe-rules.ts).

import { CORS_HEADERS } from "../_shared/ai-gateway.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { ALMA_TRANSCRIBE_DAILY_LIMIT, reserveAlmaTurn } from "../_shared/alma-turn-cap.ts";
import { ALMA_VERSION } from "../_shared/alma-version.ts";
import { audioExtension, closedRole, closedSurface, TRANSCRIBE_LIMIT_MESSAGE, TRANSCRIBE_MAX_BYTES } from "../_shared/alma-transcribe-rules.ts";

// Identifiants de transcription servis par le gateway Lovable.
// Source : GET https://ai.gateway.lovable.dev/v1/models (listing authentifié),
// vérifié le 10/09/2026, et documentation Lovable AI, section speech to text.
// Modèle principal, puis repli si le workspace ne sert que l'autre.
// 14/10/2026 : principal openai/gpt-transcribe (gpt-4o-mini-transcribe retiré
// le 26/02/2027) ; repli openai/gpt-4o-transcribe gardé jusqu'au 26/02/2027,
// à remplacer avant cette date (décision de Jérémie, option 3).
const PRIMARY_MODEL = "openai/gpt-transcribe";
const FALLBACK_MODEL = "openai/gpt-4o-transcribe";

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
    if (file.size > TRANSCRIBE_MAX_BYTES) {
      return json({ error: "Enregistrement trop long, faites plus court." }, 413);
    }
    const ext = audioExtension(file.type);
    if (!ext) return json({ error: "Format audio non pris en charge, enregistrez depuis le micro d'Alma." }, 415);

    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return json({ error: "Transcription indisponible." }, 500);

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const surface = closedSurface(form.get("surface"));
    const activeRole = closedRole(form.get("active_role"));
    // Plafond réservé avant l'appel ; un compteur illisible vaut refus.
    const reservation = await reserveAlmaTurn(service, {
      userId: u.user.id,
      kind: "transcription",
      limit: ALMA_TRANSCRIBE_DAILY_LIMIT,
      row: { surface, active_role: activeRole, input_mode: "voice", question: null, page_path: null },
      version: ALMA_VERSION,
    });
    if (!reservation.ok) {
      if (reservation.id) {
        await service.from("alma_conversations").update({ refusal_reason: reservation.reason === "daily_limit" ? "transcribe_daily_limit" : "transcribe_count_failed" }).eq("id", reservation.id);
      }
      return reservation.reason === "daily_limit"
        ? json({ error: TRANSCRIBE_LIMIT_MESSAGE, limited: true }, 429)
        : json({ error: "Dictée indisponible pour l'instant, le clavier reste ouvert." }, 503);
    }
    const reservedId = reservation.id;

    const callGateway = async (model: string) => {
      const upstream = new FormData();
      upstream.append("model", model);
      upstream.append("file", file, `dictee.${ext}`);
      return await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}` },
        body: upstream,
      });
    };

    let res = await callGateway(PRIMARY_MODEL);
    let detail = res.ok ? "" : await res.text().catch(() => "");
    // Repli unique : le workspace peut ne servir que le second modèle.
    if (!res.ok && (res.status === 400 || res.status === 404)) {
      res = await callGateway(FALLBACK_MODEL);
      detail = res.ok ? "" : await res.text().catch(() => "");
    }

    if (!res.ok) {
      console.error("alma-transcribe gateway error", res.status, detail);
      const reason = `transcribe_gateway_${res.status} ${detail.replace(/[\r\n]+/g, " ").trim()}`.slice(0, 180);
      // Journalisation du pilotage : la dictée en échec reste visible en admin.
      try {
        await service.from("alma_conversations").update({ refusal_reason: reason }).eq("id", reservedId);
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
    // La dictée réussie reste comptée (classification.kind = transcription).
    await service.from("alma_conversations").update({ refusal_reason: null }).eq("id", reservedId);
    return json({ text });
  } catch (e) {
    console.error("alma-transcribe error", e);
    return json({ error: "Erreur inattendue." }, 500);
  }
});
