// Alma conversationnelle (lot 1).
// Entrée : { message, history: [{role, content}], active_role, surface, input_mode }
// Sortie : { answer, action?, chips? } ou { limited: true, message } ou { error }
// Lot J2-A : action et chips sont optionnels, le front antérieur les ignore.
//
// Modèle : Gemini 2.5 Flash via le gateway Lovable (LOVABLE_API_KEY).
// Contexte dossier chargé côté serveur en service_role, jamais depuis le client.
// Journalisation dans public.alma_conversations (lecture admin uniquement).

import { callLovableAI, CORS_HEADERS } from "../_shared/ai-gateway.ts";
import {
  ALMA_CHAT_DAILY_LIMIT,
  ALMA_CHAT_LIMIT_MESSAGE,
  almaRegisterReminder,
  buildAlmaSystemPrompt,
  detectRegister,
  isSmallTalk,
  normalizeAlmaOutput,
} from "../_shared/alma-system-prompt.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { almaDirectAnswer, almaHelpDirective, detectAlmaIntent, shouldAnswerDirectly } from "../_shared/alma-intent.ts";
import { recordAlmaSignal } from "../_shared/alma-signals.ts";
import {
  CLASSIFICATION_DIRECTIVE,
  classificationFromPatterns,
  extractClassification,
  mergeClassification,
  needsHumanContact,
  signalsFor,
  type AlmaClassification,
} from "../_shared/alma-classify.ts";
import { normalizeContactMessage } from "../_shared/normalize-contact-message.ts";
import { formatKnowledge, selectKnowledge } from "../_shared/alma-site-knowledge.ts";
import { isMoodLineTruthful, loadVerifiedFacts, moodTruthFromFacts } from "../_shared/alma-facts.ts";
import { formatInventory, loadAlmaInventory } from "../_shared/alma-inventory.ts";
import { applyDraftToAction, computeNextAction, formatActionDirective } from "../_shared/alma-next-action.ts";
import { almaProfileVisibleToModel, polishAlmaAnswer } from "../_shared/alma-output.ts";

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
    const isContact = body?.kind === "contact_humans";
    if (!isContact && (!message || message.length > 2000)) {
      return json({ error: "Message invalide (1 à 2000 caractères)." }, 400);
    }
    const register = detectRegister(message);
    const activeRole = body?.active_role === "owner" ? "owner" : "sitter";
    // Voix ou clavier, renseigne la répartition suivie dans /admin/alma.
    const inputMode = body?.input_mode === "voice" ? "voice" : "keyboard";
    const surface = typeof body?.surface === "string" ? body.surface.slice(0, 60) : "unknown";
    // Le contexte du navigateur est une référence à vérifier, jamais une consigne.
    const mood = typeof body?.mood === "string" && body.mood.length <= 40 ? body.mood : "";
    const moodLine = typeof body?.mood_line === "string" && body.mood_line.length <= 300 ? body.mood_line : "";
    const pagePath = typeof body?.page_path === "string" && body.page_path.startsWith("/") ? body.page_path.slice(0, 200) : null;
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

    // Lot J2-B : « Écrire à Jérémie et Elisa » depuis Alma.
    if (isContact) {
      const name = normalizeContactMessage(String(body?.name ?? "")).slice(0, 120);
      const email = String(body?.email ?? u.user.email ?? "").trim().slice(0, 200);
      const text = normalizeContactMessage(String(body?.text ?? ""));
      const transcript = Array.isArray(body?.transcript)
        ? body.transcript
            .filter((m: any) => m && (m.role === "user" || m.role === "alma") && typeof m.content === "string")
            .slice(-6)
            .map((m: any) => `${m.role === "alma" ? "Alma" : "Membre"} : ${normalizeContactMessage(String(m.content)).slice(0, 600)}`)
        : [];
      if (!text || text.length > 3000 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        return json({ error: "Message ou email invalide." }, 400);
      }
      const full = [
        text,
        "",
        `Écran : ${pagePath ?? surface}`,
        ...(transcript.length ? ["", "Derniers échanges avec Alma :", ...transcript] : []),
      ].join("\n").slice(0, 5000);
      const { data: cm, error: cmErr } = await adminClient
        .from("contact_messages")
        .insert({ name: name || "Membre", email, subject: "Depuis Alma : un membre écrit à Jérémie et Elisa", message: full, source: "alma" })
        .select("id")
        .single();
      if (cmErr) {
        console.error("contact_messages insert failed", cmErr);
        return json({ error: "Message non enregistré, réessayez." }, 500);
      }
      try {
        await recordAlmaSignal(adminClient, "alma_contact_request", userId, text, { pagePath, contactMessageId: cm.id });
      } catch (e) {
        console.error("alma_contact_request signal failed", e);
      }
      return json({ ok: true });
    }

    // Lot J2-B : rejeu admin du jeu de non-régression, sans écriture ni signal.
    let isReplay = false;
    if (body?.replay === true) {
      const { data: isAdmin } = await adminClient.rpc("has_role", { _user_id: userId, _role: "admin" });
      if (!isAdmin) return json({ error: "Forbidden" }, 403);
      isReplay = true;
    }
    const logConversation = async (row: Record<string, unknown>): Promise<string | null> => {
      if (isReplay) return null;
      const { data } = await adminClient
        .from("alma_conversations")
        .insert({ ...row, page_path: pagePath })
        .select("id")
        .single();
      return (data as any)?.id ?? null;
    };
    const raiseSignals = async (c: AlmaClassification, conversationId: string | null) => {
      if (isReplay) return;
      if (signalsFor(c).length === 0) return;
      // Lot J3 : les comptes admins (tests fondateurs) ne lèvent aucun signal Alma.
      try {
        const { data: isAdmin } = await adminClient.rpc("has_role", { _user_id: userId, _role: "admin" });
        if (isAdmin === true) return;
      } catch (e) {
        console.error("has_role check failed", e);
      }
      for (const type of signalsFor(c)) {
        try {
          await recordAlmaSignal(adminClient, type, userId, message, { pagePath, bugItem: c.bug_item, conversationId });
        } catch (e) {
          console.error(`${type} signal failed`, e);
        }
      }
    };

    // Plafond anti-boucle : ALMA_CHAT_DAILY_LIMIT échanges par personne et par jour.
    const dayStart = new Date();
    dayStart.setUTCHours(0, 0, 0, 0);
    const { count } = await adminClient
      .from("alma_conversations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", dayStart.toISOString());

    if (!isReplay && (count ?? 0) >= ALMA_CHAT_DAILY_LIMIT) {
      await adminClient.from("alma_conversations").insert({
        user_id: userId,
        surface,
        active_role: activeRole,
        input_mode: inputMode,
        question: message,
        answer: ALMA_CHAT_LIMIT_MESSAGE,
        register,
        refusal_reason: "daily_limit",
        latency_ms: Date.now() - startedAt,

      });
      return json({ limited: true, message: ALMA_CHAT_LIMIT_MESSAGE });
    }

    // Lot J1 : intention d'aide, frustration, départ.
    const intent = detectAlmaIntent(
      message,
      history.filter((m: any) => m.role === "user").map((m: any) => m.content),
    );
    // Lot J2-B : la réponse fixe ne sert qu'en secours (départ poli, ou
    // frustration maximale sans question). Sinon le modèle répond d'abord.
    if (shouldAnswerDirectly(intent)) {
      const direct = almaDirectAnswer(intent)!;
      const classification = classificationFromPatterns(intent);
      const conversationId = await logConversation({
        user_id: userId,
        surface,
        active_role: activeRole,
        input_mode: inputMode,
        question: message,
        answer: direct,
        register,
        refusal_reason: null,
        latency_ms: Date.now() - startedAt,
        sources_count: 0,
        classification,
      });
      await raiseSignals(classification, conversationId);
      const human = needsHumanContact(classification);
      return json({
        answer: direct,
        remaining: Math.max(0, ALMA_CHAT_DAILY_LIMIT - ((count ?? 0) + 1)),
        ...(human ? { human_contact: true } : {}),
        ...(conversationId ? { conversation_id: conversationId } : {}),
        ...(isReplay ? { replay_meta: { register, classification, confirmed_sit: false } } : {}),
      });
    }
    const helpDirective = almaHelpDirective(intent);

    // Contexte dossier, chargé côté serveur.
    const [profileRes, sitterRes, ownerRes] = await Promise.all([
      adminClient
        .from("profiles")
        .select("first_name, city, profile_completion, identity_verified, role, postal_code, departement_code, country, latitude, longitude")
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

    // Lot J2-A : faits vérifiés (les deux côtés pour un membre both) et inventaire autour.
    const todayIso = new Date().toISOString().slice(0, 10);
    const prof = (profileRes.data ?? {}) as any;
    const accountRole = prof.role === "owner" || prof.role === "sitter" || prof.role === "both" ? prof.role : null;
    const [facts, inventory] = await Promise.all([
      loadVerifiedFacts(adminClient, userId, accountRole, todayIso).catch(() => null),
      loadAlmaInventory(adminClient, prof, todayIso).catch(() => null),
    ]);

    // Seul le texte actif du catalogue serveur peut devenir une consigne d'humeur.
    const moodMessages: Array<{ role: "system"; content: string }> = [];
    // Lot J2-A : l'humeur reste un décor (petite conversation ou registre perso)
    // et ne raconte jamais une garde ou un départ que la base ne confirme pas.
    const moodAllowed = (register === "perso" || isSmallTalk(message)) &&
      Boolean(facts) && isMoodLineTruthful(moodLine, moodTruthFromFacts(facts!, todayIso));
    if (mood && moodLine && !helpDirective && moodAllowed) {
      try {
        const { data: verifiedMood, error: moodError } = await adminClient
          .from("alma_moods")
          .select("mood, content")
          .eq("active", true)
          .eq("mood", mood)
          .eq("content", moodLine)
          .limit(1)
          .maybeSingle();
        if (!moodError && verifiedMood) {
          moodMessages.push({
            role: "system",
            content: `Ton humeur en ce moment : ${verifiedMood.mood}. Ce que tu vis aujourd'hui : ${verifiedMood.content}`,
          });
        }
      } catch {
        // L'humeur est facultative : une erreur de catalogue ne bloque pas le chat.
      }
    }

    // Ce qui manque au profil, selon le barème officiel de complétion.
    // Sans lui, l'amorce « Qu'est-ce qui manque à mon profil ? » reste sans réponse.
    let baremeProfil: string | null = null;
    let profilACompleter: Array<{ champ: string; libelle: string; points: number }> = [];
    let profilACompleterCharge = false;
    try {
      const { data, error } = await adminClient.rpc("profile_completion_missing", {
        p_user_id: userId,
        p_role: activeRole,
      });
      if (error) throw error;
      const rows = Array.isArray(data) ? data : [];
      profilACompleterCharge = true;
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

    const completion = helpDirective ? null : profilACompleterCharge
      ? 100 - profilACompleter.reduce((total, item) => total + item.points, 0)
      : prof.profile_completion ?? null;
    const next = facts && inventory
      ? computeNextAction({
          facts,
          inventory,
          accountRole,
          activeRole,
          question: message,
          register,
          helpIntent: Boolean(helpDirective),
          largeAnimals: Boolean((intent as any).largeAnimals),
          completion,
          profileAlreadySuggested: history.some((m: any) => m.role === "assistant" && /\/(owner-)?profile\b/.test(m.content)),
          pagePath,
        })
      : null;
    const knowledge = selectKnowledge({ question: message, role: activeRole, both: accountRole === "both" });

    // Lot J4 : au dessus de 40 %, le score n'est transmis au modèle que si la
    // question porte sur le profil. Sinon il le citait sans qu'on le demande.
    const showProfile = !helpDirective && almaProfileVisibleToModel(completion, message);
    const dossier = {
      prenom: (profileRes.data as any)?.first_name ?? null,
      ville: (profileRes.data as any)?.city ?? null,
      completion_profil: showProfile ? completion : null,
      identite_verifiee: (profileRes.data as any)?.identity_verified ?? null,
      // Lot J1 : qui cherche de l'aide n'entend pas parler de points de profil.
      bareme_profil: showProfile ? baremeProfil : null,
      profil_a_completer: showProfile ? profilACompleter : [],
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
    // Sur le registre perso, aucune recherche : la biographie d'Alma n'est pas
    // dans le corpus, la recherche ne rendrait que du hors sujet.
    let sources: any[] = [];
    if (register !== "perso") {
      try {
        const { data } = await adminClient.rpc("search_alma_knowledge", {
          p_query: message,
          p_limit: 3,
        });
        sources = Array.isArray(data) ? data : [];
      } catch (_e) {
        sources = [];
      }
    }

    const sourcesMessages =
      register === "perso"
        ? []
        : [
            {
              role: "system" as const,
              content:
                sources.length > 0
                  ? `Ces sources viennent d'une recherche automatique, elles ne répondent pas toujours à la question posée. Cite celle qui répond, ignore les autres, et n'en cite aucune si aucune ne répond.\nSources Guardiens trouvées pour cette question. Tu peux les citer et donner leur lien. Tu ne cites aucun autre lien que ceux de cette liste.\n${sources
                      .map((s: any) => `[${s.source}] ${s.title}, ${s.url}, ${s.snippet ?? ""}`)
                      .join("\n")}`
                  : "Aucune source Guardiens trouvée pour cette question. Réponds de ta voix, sans citer de lien d'article.",
            },
          ];

    const r = await callLovableAI({
      model: "google/gemini-2.5-flash",
      // 0.85 : à 0.6 le modèle retombe sur les mêmes ouvertures.
      temperature: 0.85,
      messages: [
        { role: "system", content: buildAlmaSystemPrompt(register) },
        ...moodMessages,
        ...sourcesMessages,
        {
          role: "system",
          content: `Dossier de la personne qui te parle, ce sont ses données, tu peux les citer. Les champs null sont simplement absents :\n${JSON.stringify(dossier, null, 2)}`,
        },
        { role: "system", content: formatKnowledge(knowledge) },
        ...(facts ? [{ role: "system" as const, content: `FAITS VÉRIFIÉS, seule base de toute phrase qui affirme un fait sur la personne :\n${JSON.stringify(facts, null, 2)}` }] : []),
        ...(inventory ? [{ role: "system" as const, content: formatInventory(inventory) }] : []),
        ...history,
        { role: "system", content: almaRegisterReminder(register) },
        ...(next ? [{ role: "system" as const, content: formatActionDirective(next) }] : []),
        ...(helpDirective ? [{ role: "system" as const, content: helpDirective }] : []),
        { role: "system", content: CLASSIFICATION_DIRECTIVE },
        { role: "user", content: message },
      ],
    });

    if (!r.ok) {
      // Secours : frustration ou départ, la réponse fixe prend le relais.
      const fallback = intent.frustration || intent.leaving ? almaDirectAnswer(intent) : null;
      const classification = classificationFromPatterns(intent);
      const conversationId = await logConversation({
        user_id: userId,
        surface,
        active_role: activeRole,
        input_mode: inputMode,
        question: message,
        answer: fallback,
        register,
        refusal_reason: fallback ? "model_fallback" : r.code ?? `gateway_${r.status}`,
        latency_ms: Date.now() - startedAt,
        sources_count: sources.length,
        classification,
      });
      await raiseSignals(classification, conversationId);
      if (fallback) {
        return json({
          answer: fallback,
          remaining: Math.max(0, ALMA_CHAT_DAILY_LIMIT - ((count ?? 0) + 1)),
          human_contact: true,
          ...(conversationId ? { conversation_id: conversationId } : {}),
        });
      }
      return json({ error: r.error, code: r.code }, r.status === 402 || r.status === 429 ? r.status : 502);
    }

    const rawOutput: string = r.data?.choices?.[0]?.message?.content ?? "";
    const extracted = extractClassification(rawOutput);
    if (!extracted.classification) {
      // Lot J3 : la ligne CLASSEMENT manque ou est illisible, on le journalise.
      console.error("alma-chat classement absent", JSON.stringify({
        finish_reason: r.data?.choices?.[0]?.finish_reason ?? null,
        length: rawOutput.length,
        has_marker: /CLASSEMENT/i.test(rawOutput),
        tail: rawOutput.slice(-160),
      }));
    }
    const classification = mergeClassification(extracted.classification, intent);
    const drafted = applyDraftToAction(normalizeAlmaOutput(extracted.answer), next?.action ?? null, next?.chips ?? []);
    // Lot J4 : mots proscrits reformulés, anecdote déplacée après l'information.
    const quiet = Boolean(helpDirective) || intent.frustration || classification.frustration >= 2 ||
      classification.bug_suspected || classification.intent === "aide_recherchee";
    const answer = polishAlmaAnswer(drafted.answer, {
      moodAllowed: !quiet && (register === "perso" || isSmallTalk(message)),
      quiet,
    });
    if (!answer) {
      await logConversation({
        user_id: userId,
        surface,
        active_role: activeRole,
        input_mode: inputMode,
        question: message,
        answer: null,
        register,
        refusal_reason: "empty_answer",
        latency_ms: Date.now() - startedAt,
        sources_count: sources.length,
        classification,
      });
      return json({ error: "Réponse indisponible pour l'instant." }, 502);
    }

    const human = needsHumanContact(classification);
    // Lot J3 : l'action principale reste toujours celle du moteur. En
    // frustration, bug ou départ, « Écrire à Jérémie et Elisa » s'affiche en
    // lien secondaire (human_contact), jamais à la place de l'action.
    const action = drafted.action;
    const chips = drafted.chips;
    const conversationId = await logConversation({
      user_id: userId,
      surface,
      active_role: activeRole,
      input_mode: inputMode,
      question: message,
      answer,
      register,
      refusal_reason: null,
      latency_ms: Date.now() - startedAt,
      sources_count: sources.length,
      classification,
      proposed_action: action ?? null,
      chips: chips.length ? chips : null,
    });
    await raiseSignals(classification, conversationId);

    return json({
      answer,
      remaining: Math.max(0, ALMA_CHAT_DAILY_LIMIT - ((count ?? 0) + 1)),
      ...(action ? { action: { label: action.label, path: action.path } } : {}),
      ...(chips.length ? { chips } : {}),
      ...(human ? { human_contact: true } : {}),
      ...(conversationId ? { conversation_id: conversationId } : {}),
      ...(isReplay
        ? { replay_meta: { register, classification, confirmed_sit: Boolean(facts && facts.gardes_confirmees.length > 0) } }
        : {}),
    });
  } catch (e) {
    console.error("alma-chat error", e);
    return json({ error: "Erreur inattendue." }, 500);
  }
});
