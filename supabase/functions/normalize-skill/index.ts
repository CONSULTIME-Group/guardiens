import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    // Get existing approved skills for comparison
    const { data: approvedSkills } = await adminClient
      .from("skills_library")
      .select("id, label, normalized_label")
      .eq("status", "approved")
      .limit(200);

    const approvedLabels = (approvedSkills || []).map((s: any) => s.label).join(", ");

    // Call AI via Lovable proxy
    const aiResponse = await fetch("https://ai-gateway.lovable.dev/v1/chat/completions", {
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
            content: `Tu es modérateur pour Guardiens, plateforme de house-sitting et d'entraide de proximité en AURA. Les compétences d'entraide couvrent tout ce qu'un particulier peut échanger : jardinage, bricolage, plomberie légère, cuisine, cours, aide admin, etc. Seuls cas à refuser : contenu offensant ou illégal, services récurrents professionnels explicites (ex: 'femme de ménage 3h/semaine tous les lundis'), publicité commerciale. Réponds UNIQUEMENT en JSON valide.`,
          },
          {
            role: "user",
            content: `Compétence soumise : '${skill.label}'
Compétences approuvées existantes : ${approvedLabels || "aucune"}

Retourne :
{
  "normalized": "label corrigé en français, première lettre majuscule",
  "duplicate_of_label": "label existant identique en sens ou null",
  "category": "jardin|animaux|competences|coups_de_main|null",
  "inappropriate": true ou false,
  "inappropriate_reason": "raison courte si inappropriate sinon null"
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

    // Handle inappropriate content
    if (parsed.inappropriate) {
      await adminClient
        .from("skills_library")
        .update({ status: "rejected" })
        .eq("id", skill_id);

      // Remove from all profiles
      const { data: affectedProfiles } = await adminClient
        .from("profiles")
        .select("id, custom_skills")
        .filter("custom_skills", "cs", `[{"skill_id":"${skill_id}"}]`);

      if (affectedProfiles) {
        for (const p of affectedProfiles) {
          const skills = (p.custom_skills as any[]) || [];
          const filtered = skills.filter((s: any) => s.skill_id !== skill_id);
          await adminClient.from("profiles").update({ custom_skills: filtered }).eq("id", p.id);
        }
      }

      return new Response(JSON.stringify({ status: "rejected", reason: parsed.inappropriate_reason }), { headers: corsHeaders });
    }

    // Handle duplicates
    if (parsed.duplicate_of_label) {
      const existingMatch = (approvedSkills || []).find(
        (s: any) => s.label.toLowerCase() === parsed.duplicate_of_label.toLowerCase()
      );

      if (existingMatch) {
        // Mark as merged
        await adminClient
          .from("skills_library")
          .update({ status: "rejected", merged_into: existingMatch.id })
          .eq("id", skill_id);

        // Update profiles to point to existing skill
        const { data: affectedProfiles } = await adminClient
          .from("profiles")
          .select("id, custom_skills")
          .filter("custom_skills", "cs", `[{"skill_id":"${skill_id}"}]`);

        if (affectedProfiles) {
          for (const p of affectedProfiles) {
            const skills = (p.custom_skills as any[]) || [];
            const updated = skills.map((s: any) =>
              s.skill_id === skill_id
                ? { ...s, skill_id: existingMatch.id, status: existingMatch.status || "approved", label: existingMatch.label }
                : s
            );
            await adminClient.from("profiles").update({ custom_skills: updated }).eq("id", p.id);
          }
        }

        // Increment usage on target
        await adminClient
          .from("skills_library")
          .update({ usage_count: (existingMatch as any).usage_count ? (existingMatch as any).usage_count + 1 : 2 })
          .eq("id", existingMatch.id);

        return new Response(JSON.stringify({ status: "merged", target_id: existingMatch.id }), { headers: corsHeaders });
      }
    }

    // Update with normalized data and category
    const updates: any = {};
    if (parsed.normalized) {
      updates.label = parsed.normalized;
      updates.normalized_label = parsed.normalized
        .toLowerCase()
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ");
    }
    if (parsed.category) {
      updates.category = parsed.category;
    }

    if (Object.keys(updates).length > 0) {
      await adminClient
        .from("skills_library")
        .update(updates)
        .eq("id", skill_id);
    }

    return new Response(JSON.stringify({ status: "normalized", updates }), { headers: corsHeaders });
  } catch (err) {
    console.error("normalize-skill error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: corsHeaders });
  }
});
