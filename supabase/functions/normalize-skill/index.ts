import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * normalize-skill
 *
 * Rôle STRICT : suggérer une normalisation orthographique + une catégorie pour
 * une compétence soumise. Cette fonction NE CHANGE JAMAIS le statut.
 * Seul un admin peut passer une compétence en `approved` / `rejected` / merger
 * via la page /admin/skills (RPC `admin_update_skill_status`).
 *
 * Comportements supprimés (anciens) :
 *  - auto-rejet sur "inappropriate"
 *  - auto-merge sur duplicate_of_label
 *  - réécriture du status
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      console.error("LOVABLE_API_KEY not set");
      return new Response(JSON.stringify({ error: "AI not configured" }), { status: 500, headers: corsHeaders });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);

    const { skill_id } = await req.json();
    if (!skill_id) {
      return new Response(JSON.stringify({ error: "skill_id required" }), { status: 400, headers: corsHeaders });
    }

    // Get the skill
    const { data: skill, error: skillError } = await adminClient
      .from("skills_library")
      .select("*")
      .eq("id", skill_id)
      .single();

    if (skillError || !skill) {
      return new Response(JSON.stringify({ error: "Skill not found" }), { status: 404, headers: corsHeaders });
    }

    // On ne touche jamais à une compétence déjà tranchée par un admin
    if (skill.status !== "pending") {
      return new Response(
        JSON.stringify({ status: "skipped", reason: `skill already in status ${skill.status}` }),
        { headers: corsHeaders },
      );
    }

    // Get existing approved skills (juste pour aider l'IA à proposer une normalisation cohérente)
    const { data: approvedSkills } = await adminClient
      .from("skills_library")
      .select("id, label, normalized_label")
      .eq("status", "approved")
      .limit(200);

    const approvedLabels = (approvedSkills || []).map((s: any) => s.label).join(", ");

    // Call AI via Lovable proxy — uniquement pour SUGGÉRER
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Tu es assistant de pré-traitement pour Guardiens, plateforme de house-sitting et d'entraide de proximité (couverture France entière). Les compétences d'entraide couvrent tout ce qu'un particulier peut échanger : jardinage, bricolage, plomberie légère, cuisine, cours, aide admin, etc. Tu ne décides RIEN, tu ne fais que SUGGÉRER. Réponds UNIQUEMENT en JSON valide.`,
          },
          {
            role: "user",
            content: `Compétence soumise : '${skill.label}'
Compétences déjà approuvées : ${approvedLabels || "aucune"}

Retourne uniquement des suggestions destinées à un modérateur humain :
{
  "normalized": "label corrigé en français, première lettre majuscule, sinon null si déjà bon",
  "duplicate_of_label": "label existant identique en sens si évident, sinon null",
  "category": "jardin|animaux|competences|coups_de_main|null",
  "flag_inappropriate": true ou false,
  "flag_reason": "raison courte si flag_inappropriate ou doublon, sinon null"
}`,
          },
        ],
        temperature: 0.1,
        max_tokens: 300,
      }),
    });

    if (!aiResponse.ok) {
      console.error("AI call failed:", await aiResponse.text());
      return new Response(JSON.stringify({ status: "ai_failed" }), { headers: corsHeaders });
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // Parse JSON from response (handle markdown code blocks)
    let parsed: any;
    try {
      const jsonStr = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI response:", content);
      return new Response(JSON.stringify({ status: "parse_failed" }), { headers: corsHeaders });
    }

    // Verdict de l'IA (uniquement consultatif — l'admin tranche)
    const verdict: "inappropriate" | "duplicate" | "to_review" =
      parsed.flag_inappropriate
        ? "inappropriate"
        : parsed.duplicate_of_label
          ? "duplicate"
          : "to_review";

    // Update : suggestions IA + journal de décision (jamais le status)
    const updates: Record<string, unknown> = {
      ai_verdict: verdict,
      ai_reason: parsed.flag_reason || null,
      ai_duplicate_of_label: parsed.duplicate_of_label || null,
      ai_suggested_label: parsed.normalized || null,
      ai_checked_at: new Date().toISOString(),
    };
    if (parsed.category && typeof parsed.category === "string") {
      updates.category = parsed.category;
    }

    await adminClient.from("skills_library").update(updates).eq("id", skill_id);

    // Trace dans les logs serveur (visibles côté Lovable Cloud) pour aider l'admin
    if (parsed.flag_inappropriate || parsed.duplicate_of_label) {
      console.log("normalize-skill suggestion", {
        skill_id,
        original_label: skill.label,
        normalized: parsed.normalized,
        duplicate_of_label: parsed.duplicate_of_label,
        flag_inappropriate: parsed.flag_inappropriate,
        flag_reason: parsed.flag_reason,
      });
    }

    return new Response(
      JSON.stringify({
        status: "suggested",
        updates,
        suggestions: {
          duplicate_of_label: parsed.duplicate_of_label || null,
          flag_inappropriate: !!parsed.flag_inappropriate,
          flag_reason: parsed.flag_reason || null,
        },
      }),
      { headers: corsHeaders },
    );
  } catch (err) {
    console.error("normalize-skill error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: corsHeaders });
  }
});
