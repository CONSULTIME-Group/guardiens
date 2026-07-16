// Owner Pass 3 — Concierge IA : génère un brouillon d'annonce depuis une phrase libre.
// Entrée : { prompt: string }
// Sortie : { draftId: string, warnings: string[], confidence: number }
//
// Comportement :
//  1. Auth JWT obligatoire.
//  2. Rate limit : 3 appels / heure / user (via analytics_events).
//  3. Appel Gemini (Lovable AI Gateway) avec tool-calling structuré.
//  4. Post-validation : strip tiret cadratin, détection mots proscrits.
//  5. Assure une property par défaut si absente (draft ne peut exister sans).
//  6. Insert sits status='draft' et renvoie l'id.

import { callLovableAI, extractToolArgs, STYLE_GUARDRAILS, CORS_HEADERS } from "../_shared/ai-gateway.ts";
import { isLlmRefusal } from "../_shared/refusal-guard.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const RATE_LIMIT_PER_HOUR = 3;
const PROSCRIBED = /(voisin(e|s|age)?|gratuit à vie|pour toujours|période d'essai|programme fondateur|auvergne-rhône-alpes|\bAURA\b)/i;
const ALLOWED_ENVIRONMENTS = ["ville", "campagne", "montagne", "lac", "vignes", "foret"] as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  try {
    const { prompt } = await req.json().catch(() => ({}));
    if (typeof prompt !== "string" || prompt.trim().length < 10) {
      return json({ error: "Décrivez votre absence en au moins 10 caractères." }, 400);
    }
    if (prompt.length > 1500) {
      return json({ error: "Votre description est trop longue (1500 caractères max)." }, 400);
    }

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

    // Rate limit : 3 générations / heure
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentCount } = await supabase
      .from("analytics_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("event_type", "owner_draft_from_prompt_generated")
      .gte("created_at", oneHourAgo);
    if ((recentCount ?? 0) >= RATE_LIMIT_PER_HOUR) {
      return json({ error: "Vous avez atteint la limite de 3 générations par heure. Réessayez plus tard." }, 429);
    }

    // Contexte owner enrichi : profil, notes d'accueil, propriété, animaux
    const [profileRes, ownerProfileRes, propertyRes] = await Promise.all([
      supabase.from("profiles").select("city, first_name, bio").eq("id", userId).maybeSingle(),
      supabase.from("owner_profiles").select("welcome_notes, rules_notes, presence_expected").eq("user_id", userId).maybeSingle(),
      supabase.from("properties").select("id, type, environment").eq("user_id", userId).limit(1).maybeSingle(),
    ]);
    const profile = profileRes.data;
    const ownerProfile = ownerProfileRes.data;
    const propertyRow = propertyRes.data;

    let pets: any[] = [];
    if (propertyRow?.id) {
      const { data: petsData } = await supabase
        .from("pets")
        .select("name, species, character, activity_level, walk_duration, alone_duration, food, special_needs")
        .eq("property_id", propertyRow.id);
      pets = petsData || [];
    }

    const petsCtx = pets.length > 0
      ? pets.map((p) => {
          const bits: string[] = [`${p.name} (${p.species})`];
          if (p.character) bits.push(`caractère : ${p.character}`);
          if (p.activity_level) bits.push(`activité : ${p.activity_level}`);
          if (p.walk_duration) bits.push(`promenades : ${p.walk_duration}`);
          if (p.alone_duration) bits.push(`solitude tolérée : ${p.alone_duration}`);
          if (p.food) bits.push(`alimentation : ${p.food}`);
          if (p.special_needs) bits.push(`besoins particuliers : ${p.special_needs}`);
          return "- " + bits.join(", ");
        }).join("\n")
      : "(aucun animal renseigné dans le profil)";

    const propertyCtx = propertyRow
      ? `Type : ${propertyRow.type ?? "non renseigné"}${propertyRow.environment ? `, environnement : ${propertyRow.environment}` : ""}`
      : "(logement non renseigné)";

    const todayIso = new Date().toISOString().slice(0, 10);
    const currentYear = new Date().getUTCFullYear();

    const system = `Vous êtes rédacteur pour Guardiens.fr, plateforme française de garde d'animaux à domicile entre particuliers de confiance. Un propriétaire vous décrit son besoin en une phrase. Générez un brouillon d'annonce complet, prêt à être relu et publié.

${STYLE_GUARDRAILS}

Règle absolue sur les dates (aujourd'hui = ${todayIso}, année en cours = ${currentYear}) :
- N'INVENTEZ JAMAIS de date. Si la phrase ne contient AUCUNE indication temporelle (mois, saison, dates précises, durée), laissez start_date et end_date VIDES (chaîne vide) et mettez flexible_dates=true.
- Si un mois/jour est cité SANS année : utilisez l'année ${currentYear} par défaut. Si la date obtenue est déjà passée par rapport à ${todayIso}, utilisez ${currentYear + 1}.
- Toute date retournée DOIT être >= ${todayIso}. Interdiction stricte de renvoyer une année < ${currentYear}. En cas de doute, laissez vide et mettez flexible_dates=true.
- Format YYYY-MM-DD uniquement.

Contexte propriétaire (à réutiliser, ne jamais inventer ce qui n'y est pas) :
- Prénom : ${profile?.first_name ?? "non renseigné"}
- Ville par défaut : ${profile?.city ?? "non renseignée"}
- Bio du propriétaire : ${profile?.bio ? `« ${profile.bio.slice(0, 400)} »` : "(vide)"}
- Notes d'accueil : ${ownerProfile?.welcome_notes ? `« ${ownerProfile.welcome_notes.slice(0, 400)} »` : "(vide)"}
- Règles maison : ${ownerProfile?.rules_notes ? `« ${ownerProfile.rules_notes.slice(0, 300)} »` : "(vide)"}
- Présence prévue : ${ownerProfile?.presence_expected ?? "(non renseignée)"}
- Logement : ${propertyCtx}
- Animaux à garder :
${petsCtx}

Extraction attendue depuis la phrase du propriétaire :
- Ville : extraite du prompt, sinon utilisez « ${profile?.city ?? ""} » (peut rester vide).
- Animaux : privilégiez ceux du contexte ci-dessus s'ils existent, sinon ceux du prompt.
- Environnement : choisir 0 à 3 valeurs STRICTEMENT parmi cette liste (aucune autre valeur autorisée) : ville, campagne, montagne, lac, vignes, foret. N'inventez pas « maison », « appartement », « jardin » : ces mots vont dans la description, pas dans environments.
- Préférences gardien : télétravail, présence continue, calme, sportif (choisir 1 à 3 dans open_to).

Génération (personnalisée à partir du contexte, sans inventer de données absentes) :
- title : 40 à 70 caractères. Format « Garde de [animaux] à [ville], du [début] au [fin] » si dates connues, sinon « Garde de [animaux] à [ville] ».
- specific_expectations : 60 à 120 mots, attentes ciblées, cohérentes avec les règles maison et la présence prévue si renseignées.
- daily_routine : 100 à 150 mots, routine quotidienne DÉDUITE des routines réelles des animaux ci-dessus (promenades, solitude, alimentation, besoins particuliers). Ne pas inventer d'animaux ni de durées.
- owner_message : 60 à 120 mots, ton cohérent avec la bio et les notes d'accueil du propriétaire, vouvoiement, invitation à la rencontre.

Si le prompt mentionne un prix ou une transaction financière, ignorez-le : Guardiens est un échange sans transaction financière entre membres.`;

    const r = await callLovableAI({
      model: "google/gemini-2.5-flash",
      temperature: 0.3,
      messages: [
        { role: "system", content: system },
        { role: "user", content: `Phrase du propriétaire : ${prompt.trim()}` },
      ],
      tools: [{
        type: "function",
        function: {
          name: "return_sit_draft",
          description: "Renvoie un brouillon d'annonce de garde structuré.",
          parameters: {
            type: "object",
            properties: {
              title: { type: "string", minLength: 20, maxLength: 90 },
              start_date: { type: "string", description: "YYYY-MM-DD, vide si inconnue" },
              end_date: { type: "string", description: "YYYY-MM-DD, vide si inconnue" },
              flexible_dates: { type: "boolean" },
              city: { type: "string" },
              environments: { type: "array", items: { type: "string", enum: ["ville", "campagne", "montagne", "lac", "vignes", "foret"] }, minItems: 0, maxItems: 3 },
              open_to: { type: "array", items: { type: "string" }, minItems: 0, maxItems: 4 },
              specific_expectations: { type: "string", minLength: 60, maxLength: 900 },
              daily_routine: { type: "string", minLength: 60, maxLength: 900 },
              owner_message: { type: "string", minLength: 60, maxLength: 700 },
              confidence: { type: "number", minimum: 0, maximum: 1 },
            },
            required: ["title", "flexible_dates", "specific_expectations", "daily_routine", "owner_message", "confidence"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "return_sit_draft" } },
    });

    if (!r.ok) {
      return json({ error: r.error, code: r.code }, r.status);
    }

    const parsed = extractToolArgs(r.data);
    if (!parsed) return json({ error: "Nous n'avons pas pu générer votre brouillon automatiquement, vous pouvez le remplir manuellement." }, 502);

    // Nettoyage : tiret cadratin résiduel
    const clean = (s: unknown) => String(s ?? "").replaceAll("—", ",").replaceAll("–", ",");
    const draft = {
      title: clean(parsed.title),
      start_date: parsed.start_date && /^\d{4}-\d{2}-\d{2}$/.test(parsed.start_date) ? parsed.start_date : null,
      end_date: parsed.end_date && /^\d{4}-\d{2}-\d{2}$/.test(parsed.end_date) ? parsed.end_date : null,
      flexible_dates: !!parsed.flexible_dates,
      city: clean(parsed.city) || profile?.city || null,
      environments: Array.isArray(parsed.environments)
        ? parsed.environments.map((v: unknown) => String(v ?? "").toLowerCase().trim()).filter((v: string) => (ALLOWED_ENVIRONMENTS as readonly string[]).includes(v)).slice(0, 3)
        : [],
      open_to: Array.isArray(parsed.open_to) ? parsed.open_to.map(clean).filter(Boolean).slice(0, 4) : [],
      specific_expectations: clean(parsed.specific_expectations),
      daily_routine: clean(parsed.daily_routine),
      owner_message: clean(parsed.owner_message),
    };

    // Garde serveur : aucune date passée ne doit être écrite en base.
    // Toute date < aujourd'hui est purgée ; end_date < start_date également.
    // Si l'une des deux manque après purge, on force flexible_dates=true.
    if (draft.start_date && draft.start_date < todayIso) draft.start_date = null;
    if (draft.end_date && draft.end_date < todayIso) draft.end_date = null;
    if (draft.start_date && draft.end_date && draft.end_date < draft.start_date) draft.end_date = null;
    if (!draft.start_date || !draft.end_date) draft.flexible_dates = true;

    // Validation post-génération : détection mots proscrits
    const warnings: string[] = [];
    const scanBlob = [draft.title, draft.specific_expectations, draft.daily_routine, draft.owner_message].join(" ");
    if (PROSCRIBED.test(scanBlob)) {
      warnings.push("Quelques éléments à vérifier manuellement : le brouillon contient des termes à reformuler.");
    }

    // Assure une property par défaut
    const { data: existingProp } = await supabase
      .from("properties")
      .select("id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    let propertyId = existingProp?.id;
    if (!propertyId) {
      const { data: newProp, error: propErr } = await supabase
        .from("properties")
        .insert({ user_id: userId })
        .select("id")
        .single();
      if (propErr || !newProp) {
        console.error("draft-sit-from-prompt: property insert failed", propErr);
        return json({ error: "Impossible de préparer votre brouillon (logement)." }, 500);
      }
      propertyId = newProp.id;
    }

    // Insert draft
    const { data: sit, error: sitErr } = await supabase
      .from("sits")
      .insert({
        user_id: userId,
        property_id: propertyId,
        title: draft.title,
        start_date: draft.start_date,
        end_date: draft.end_date,
        flexible_dates: draft.flexible_dates,
        environments: draft.environments,
        open_to: draft.open_to,
        specific_expectations: draft.specific_expectations,
        daily_routine: draft.daily_routine,
        owner_message: draft.owner_message,
        city: draft.city,
        country: "FR",
        status: "draft",
      })
      .select("id")
      .single();

    if (sitErr || !sit) {
      console.error("draft-sit-from-prompt: sit insert failed", sitErr);
      return json({ error: "Impossible de créer votre brouillon." }, 500);
    }

    return json({
      draftId: sit.id,
      warnings,
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.7,
      generated_length: scanBlob.length,
    }, 200);
  } catch (e) {
    console.error("draft-sit-from-prompt error:", e);
    return json({ error: e instanceof Error ? e.message : "Erreur" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
