// Alma conversationnelle (lot 1).
// Entrée : { message, history: [{role, content}], active_role, surface }
// Sortie : { answer } ou { limited: true, message } ou { error }
//
// Modèle : Gemini 2.5 Flash via le gateway Lovable (LOVABLE_API_KEY).
// Contexte dossier chargé côté serveur en service_role, jamais depuis le client.
// Journalisation dans public.alma_conversations (lecture admin uniquement).

import { callLovableAI, CORS_HEADERS } from "../_shared/ai-gateway.ts";
import {
  ALMA_CHAT_DAILY_LIMIT,
  ALMA_CHAT_LIMIT_MESSAGE,
  ALMA_SYSTEM_PROMPT,
  detectRegister,
  normalizeAlmaOutput,
} from "../_shared/alma-system-prompt.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const MAX_HISTORY = 12;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  const startedAt = Date.now();
  try {
    const body = await req.json().catch(() => ({}));
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    if (!message || message.length > 2000) {
      return json({ error: "Message invalide (1 à 2000 caractères)." }, 400);
    }
    const activeRole = body?.active_role === "owner" ? "owner" : "sitter";
    const surface = typeof body?.surface === "string" ? body.surface.slice(0, 60) : "unknown";
    const history = Array.isArray(body?.history)
      ? body.history
          .filter(
            (m: any) =>
              m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string",
          )
          .slice(-MAX_HISTORY)
          .map((m: any) => ({ role: m.role, content: String(m.content).slice(0, 2000) }))
      : [];

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
    const userId = u.user.id;

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    // Plafond anti-boucle : 10 échanges par personne et par jour.
    const dayStart = new Date();
    dayStart.setUTCHours(0, 0, 0, 0);
    const { count } = await adminClient
      .from("alma_conversations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", dayStart.toISOString());

    if ((count ?? 0) >= ALMA_CHAT_DAILY_LIMIT) {
      await adminClient.from("alma_conversations").insert({
        user_id: userId,
        surface,
        active_role: activeRole,
        question: message,
        answer: ALMA_CHAT_LIMIT_MESSAGE,
        register: detectRegister(message),
        refusal_reason: "daily_limit",
        latency_ms: Date.now() - startedAt,
      });
      return json({ limited: true, message: ALMA_CHAT_LIMIT_MESSAGE });
    }

    // Contexte dossier, chargé côté serveur.
    const [profileRes, sitterRes, ownerRes] = await Promise.all([
      adminClient
        .from("profiles")
        .select("first_name, city, profile_completion, identity_verified")
        .eq("id", userId)
        .maybeSingle(),
      adminClient
        .from("sitter_profiles")
        .select("animal_types, experience_years, competences")
        .eq("user_id", userId)
        .maybeSingle(),
      adminClient
        .from("owner_profiles")
        .select("owner_competences, presence_expected")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

    let sits: unknown[] = [];
    let applications: unknown[] = [];
    let pets: unknown[] = [];
    if (activeRole === "owner") {
      const [sitsRes, petsRes] = await Promise.all([
        adminClient
          .from("sits")
          .select("id, title, status, city, start_date, end_date")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(3),
        adminClient.from("pets").select("name, type, age").eq("user_id", userId).limit(8),
      ]);
      sits = sitsRes.data ?? [];
      pets = petsRes.data ?? [];
      const sitIds = (sits as any[]).map((s) => s.id);
      if (sitIds.length > 0) {
        const { data } = await adminClient
          .from("applications")
          .select("sit_id, status, affinity_score")
          .in("sit_id", sitIds)
          .limit(20);
        applications = data ?? [];
      }
    } else {
      const { data } = await adminClient
        .from("applications")
        .select("sit_id, status, affinity_score, created_at")
        .eq("sitter_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);
      applications = data ?? [];
    }

    const dossier = {
      prenom: (profileRes.data as any)?.first_name ?? null,
      ville: (profileRes.data as any)?.city ?? null,
      completion_profil: (profileRes.data as any)?.profile_completion ?? null,
      identite_verifiee: (profileRes.data as any)?.identity_verified ?? null,
      role_actif: activeRole,
      ecran_courant: surface,
      profil_gardien: sitterRes.data ?? null,
      profil_proprietaire: ownerRes.data ?? null,
      annonces: sits,
      animaux: pets,
      candidatures: applications,
    };

    const r = await callLovableAI({
      model: "google/gemini-2.5-flash",
      temperature: 0.6,
      messages: [
        { role: "system", content: ALMA_SYSTEM_PROMPT },
        {
          role: "system",
          content: `Dossier de la personne qui vous parle (ses données, vous pouvez les citer). Les champs null sont simplement absents :\n${JSON.stringify(dossier, null, 2)}`,
        },
        ...history,
        { role: "user", content: message },
      ],
    });

    if (!r.ok) {
      await adminClient.from("alma_conversations").insert({
        user_id: userId,
        surface,
        active_role: activeRole,
        question: message,
        answer: null,
        register: detectRegister(message),
        refusal_reason: r.code ?? `gateway_${r.status}`,
        latency_ms: Date.now() - startedAt,
      });
      return json({ error: r.error, code: r.code }, r.status === 402 || r.status === 429 ? r.status : 502);
    }

    const answer = normalizeAlmaOutput(r.data?.choices?.[0]?.message?.content ?? "");
    if (!answer) {
      await adminClient.from("alma_conversations").insert({
        user_id: userId,
        surface,
        active_role: activeRole,
        question: message,
        answer: null,
        register: detectRegister(message),
        refusal_reason: "empty_answer",
        latency_ms: Date.now() - startedAt,
      });
      return json({ error: "Réponse indisponible pour l'instant." }, 502);
    }

    await adminClient.from("alma_conversations").insert({
      user_id: userId,
      surface,
      active_role: activeRole,
      question: message,
      answer,
      register: detectRegister(message),
      refusal_reason: null,
      latency_ms: Date.now() - startedAt,
    });

    return json({ answer, remaining: Math.max(0, ALMA_CHAT_DAILY_LIMIT - ((count ?? 0) + 1)) });
  } catch (e) {
    console.error("alma-chat error", e);
    return json({ error: "Erreur inattendue." }, 500);
  }
});
