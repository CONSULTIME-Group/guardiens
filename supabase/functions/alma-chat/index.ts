// Alma conversationnelle (lot 1).
// Entrée : { message, history: [{role, content}], active_role, surface, input_mode }
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
    // Voix ou clavier, renseigne la répartition suivie dans /admin/alma.
    const inputMode = body?.input_mode === "voice" ? "voice" : "keyboard";
    const surface = typeof body?.surface === "string" ? body.surface.slice(0, 60) : "unknown";
    // Humeur du moment, exactement celle affichée à l'écran. Facultative :
    // sans elle, la fonction répond normalement.
    const mood = typeof body?.mood === "string" ? body.mood.slice(0, 40) : "";
    const moodLine = typeof body?.mood_line === "string" ? body.mood_line.slice(0, 300) : "";
    const moodMessages = mood
      ? [
          {
            role: "system" as const,
            content: `Votre humeur en ce moment : ${mood}. Ce que vous vivez aujourd'hui : ${moodLine}`,
          },
        ]
      : [];
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

    // Plafond anti-boucle : ALMA_CHAT_DAILY_LIMIT échanges par personne et par jour.
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
        input_mode: inputMode,
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
        .select("competences, competences_disponible, presence_expected")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

    // Ce qui manque au profil, selon le barème officiel de complétion.
    // Sans lui, l'amorce « Qu'est-ce qui manque à mon profil ? » reste sans réponse.
    let baremeProfil: string | null = null;
    let profilACompleter: Array<{ champ: string; libelle: string; points: number }> = [];
    try {
      const { data } = await adminClient.rpc("profile_completion_missing", {
        p_user_id: userId,
      });
      const rows = Array.isArray(data) ? data : [];
      baremeProfil = rows.length > 0 ? (rows[0] as any).bareme ?? null : null;
      profilACompleter = rows.map((r: any) => ({
        champ: r.champ,
        libelle: r.libelle,
        points: r.points,
      }));
    } catch (_e) {
      profilACompleter = [];
    }

    /** Les textes longs saturent le contexte, six cents caractères suffisent à relire une annonce. */
    const cut = (v: unknown): string | null =>
      typeof v === "string" && v.length > 0 ? v.slice(0, 600) : null;

    let sits: unknown[] = [];
    let applications: unknown[] = [];
    let pets: unknown[] = [];
    if (activeRole === "owner") {
      const [sitsRes, propsRes] = await Promise.all([
        adminClient
          .from("sits")
          .select(
            "id, title, status, city, start_date, end_date, owner_message, daily_routine, sitter_expectations, specific_expectations, flexibility_notes, is_urgent, accepting_applications, cover_photo_url, published_at, property_id",
          )
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(3),
        adminClient.from("properties").select("id, description").eq("user_id", userId).limit(5),
      ]);
      const rawSits = (sitsRes.data ?? []) as any[];
      const properties = (propsRes.data ?? []) as any[];
      const propertyIds = properties.map((p) => p.id);
      if (propertyIds.length > 0) {
        const { data } = await adminClient
          .from("pets")
          .select("name, species, age")
          .in("property_id", propertyIds)
          .limit(10);
        pets = data ?? [];
      }

      const sitIds = rawSits.map((s) => s.id);
      let rawApplications: any[] = [];
      if (sitIds.length > 0) {
        const { data } = await adminClient
          .from("applications")
          .select("sit_id, status, created_at, viewed_at")
          .in("sit_id", sitIds)
          .limit(50);
        rawApplications = (data ?? []) as any[];
      }
      applications = rawApplications;

      sits = rawSits.map((s) => {
        const mine = rawApplications.filter((a) => a.sit_id === s.id);
        return {
          id: s.id,
          title: s.title,
          status: s.status,
          city: s.city,
          start_date: s.start_date,
          end_date: s.end_date,
          owner_message: cut(s.owner_message),
          daily_routine: cut(s.daily_routine),
          sitter_expectations: cut(s.sitter_expectations),
          specific_expectations: cut(s.specific_expectations),
          flexibility_notes: cut(s.flexibility_notes),
          is_urgent: s.is_urgent,
          accepting_applications: s.accepting_applications,
          a_une_photo: Boolean(s.cover_photo_url),
          published_at: s.published_at,
          logement_description: cut(
            properties.find((p) => p.id === s.property_id)?.description,
          ),
          candidatures_recues: mine.length,
          candidatures_non_lues: mine.filter((a) => a.viewed_at === null).length,
          candidatures_en_attente: mine.filter((a) => a.status === "pending").length,
        };
      });
    } else {
      const { data } = await adminClient
        .from("applications")
        .select("sit_id, status, created_at, sits(title, city, start_date, end_date)")
        .eq("sitter_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);
      applications = ((data ?? []) as any[]).map((a) => ({
        sit_id: a.sit_id,
        status: a.status,
        created_at: a.created_at,
        annonce_titre: a.sits?.title ?? null,
        annonce_ville: a.sits?.city ?? null,
        annonce_debut: a.sits?.start_date ?? null,
        annonce_fin: a.sits?.end_date ?? null,
      }));
    }

    const dossier = {
      prenom: (profileRes.data as any)?.first_name ?? null,
      ville: (profileRes.data as any)?.city ?? null,
      completion_profil: (profileRes.data as any)?.profile_completion ?? null,
      identite_verifiee: (profileRes.data as any)?.identity_verified ?? null,
      bareme_profil: baremeProfil,
      profil_a_completer: profilACompleter,
      role_actif: activeRole,
      ecran_courant: surface,
      profil_gardien: sitterRes.data ?? null,
      profil_proprietaire: ownerRes.data ?? null,
      annonces: sits,
      animaux: pets,
      candidatures: applications,
    };

    // Sources Guardiens : articles, FAQ, conseils et pages de ville.
    // Sans elles, le prompt ordonne de citer des sources invisibles.
    let sources: any[] = [];
    try {
      const { data } = await adminClient.rpc("search_alma_knowledge", {
        p_query: message,
        p_limit: 3,
      });
      sources = Array.isArray(data) ? data : [];
    } catch (_e) {
      sources = [];
    }

    const sourcesMessage = {
      role: "system" as const,
      content:
        sources.length > 0
          ? `Sources Guardiens trouvées pour cette question. Vous pouvez les citer et donner leur lien. Vous ne citez aucun autre lien que ceux de cette liste.\n${sources
              .map((s: any) => `[${s.source}] ${s.title}, ${s.url}, ${s.snippet ?? ""}`)
              .join("\n")}`
          : "Aucune source Guardiens trouvée pour cette question. Répondez de votre voix, sans citer de lien d'article.",
    };

    const r = await callLovableAI({
      model: "google/gemini-2.5-flash",
      // 0.85 : à 0.6 le modèle retombe sur les mêmes ouvertures.
      temperature: 0.85,
      messages: [
        { role: "system", content: ALMA_SYSTEM_PROMPT },
        ...moodMessages,
        sourcesMessage,
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
        input_mode: inputMode,
        question: message,
        answer: null,
        register: detectRegister(message),
        refusal_reason: r.code ?? `gateway_${r.status}`,
        latency_ms: Date.now() - startedAt,
        sources_count: sources.length,
      });
      return json({ error: r.error, code: r.code }, r.status === 402 || r.status === 429 ? r.status : 502);
    }

    const answer = normalizeAlmaOutput(r.data?.choices?.[0]?.message?.content ?? "");
    if (!answer) {
      await adminClient.from("alma_conversations").insert({
        user_id: userId,
        surface,
        active_role: activeRole,
        input_mode: inputMode,
        question: message,
        answer: null,
        register: detectRegister(message),
        refusal_reason: "empty_answer",
        latency_ms: Date.now() - startedAt,
        sources_count: sources.length,
      });
      return json({ error: "Réponse indisponible pour l'instant." }, 502);
    }

    await adminClient.from("alma_conversations").insert({
      user_id: userId,
      surface,
      active_role: activeRole,
      input_mode: inputMode,
      question: message,
      answer,
      register: detectRegister(message),
      refusal_reason: null,
      latency_ms: Date.now() - startedAt,
      sources_count: sources.length,
    });

    return json({ answer, remaining: Math.max(0, ALMA_CHAT_DAILY_LIMIT - ((count ?? 0) + 1)) });
  } catch (e) {
    console.error("alma-chat error", e);
    return json({ error: "Erreur inattendue." }, 500);
  }
});
