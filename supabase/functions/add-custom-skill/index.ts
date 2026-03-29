import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalize(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // User client for auth
    const userClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: corsHeaders });
    }

    // Service client for admin operations
    const adminClient = createClient(supabaseUrl, serviceKey);

    const { label } = await req.json();
    if (!label || typeof label !== "string") {
      return new Response(JSON.stringify({ error: "Label required" }), { status: 400, headers: corsHeaders });
    }

    const trimmed = label.trim();
    if (trimmed.length < 3 || trimmed.length > 40) {
      return new Response(JSON.stringify({ error: "Label must be 3-40 characters" }), { status: 400, headers: corsHeaders });
    }

    // Check predefined categories
    const predefined = ["jardin", "animaux", "competences", "coups de main", "coups_de_main"];
    const normalizedLabel = normalize(trimmed);
    if (predefined.includes(normalizedLabel) || predefined.includes(normalizedLabel.replace(/ /g, "_"))) {
      return new Response(JSON.stringify({ 
        error: "predefined_category", 
        category: normalizedLabel.replace(/ /g, "_"),
        message: `Active directement la catégorie !`
      }), { status: 409, headers: corsHeaders });
    }

    // Check current custom_skills count
    const { data: profile } = await adminClient
      .from("profiles")
      .select("custom_skills")
      .eq("id", user.id)
      .single();

    const currentSkills = (profile?.custom_skills as any[]) || [];
    if (currentSkills.length >= 10) {
      return new Response(JSON.stringify({ error: "Maximum 10 compétences libres" }), { status: 400, headers: corsHeaders });
    }

    // Check if already in user's custom_skills
    if (currentSkills.some((s: any) => normalize(s.label) === normalizedLabel)) {
      return new Response(JSON.stringify({ error: "Compétence déjà ajoutée" }), { status: 409, headers: corsHeaders });
    }

    // Look up in skills_library
    const { data: existing } = await adminClient
      .from("skills_library")
      .select("*")
      .eq("normalized_label", normalizedLabel)
      .maybeSingle();

    let skillId: string;
    let skillStatus: string;

    if (existing) {
      // Handle merged skills
      if (existing.merged_into) {
        const { data: target } = await adminClient
          .from("skills_library")
          .select("*")
          .eq("id", existing.merged_into)
          .single();
        
        if (target) {
          skillId = target.id;
          skillStatus = target.status;
        } else {
          skillId = existing.id;
          skillStatus = existing.status;
        }
      } else {
        skillId = existing.id;
        skillStatus = existing.status;
      }

      if (skillStatus === "rejected") {
        return new Response(JSON.stringify({ 
          error: "rejected",
          message: "Cette compétence ne correspond pas à l'univers Guardiens." 
        }), { status: 403, headers: corsHeaders });
      }

      // Increment usage_count
      await adminClient
        .from("skills_library")
        .update({ usage_count: (existing.usage_count || 1) + 1 })
        .eq("id", skillId);
    } else {
      // Create new entry
      const { data: created, error: createError } = await adminClient
        .from("skills_library")
        .insert({
          label: trimmed,
          normalized_label: normalizedLabel,
          status: "pending",
          first_submitted_by: user.id,
        })
        .select("id, status")
        .single();

      if (createError) {
        // Unique constraint violation = concurrent insert
        if (createError.code === "23505") {
          const { data: retry } = await adminClient
            .from("skills_library")
            .select("*")
            .eq("normalized_label", normalizedLabel)
            .single();
          if (retry) {
            skillId = retry.id;
            skillStatus = retry.status;
          } else {
            throw createError;
          }
        } else {
          throw createError;
        }
      } else {
        skillId = created!.id;
        skillStatus = created!.status;
      }

      // Trigger normalize-skill for new entries
      try {
        await fetch(`${supabaseUrl}/functions/v1/normalize-skill`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({ skill_id: skillId! }),
        });
      } catch {
        // Non-blocking
      }
    }

    // Add to user's custom_skills
    const updatedSkills = [...currentSkills, {
      label: trimmed,
      skill_id: skillId!,
      status: skillStatus!,
    }];

    await adminClient
      .from("profiles")
      .update({ custom_skills: updatedSkills })
      .eq("id", user.id);

    return new Response(JSON.stringify({ 
      skill_id: skillId!, 
      status: skillStatus!,
      label: trimmed,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    console.error("add-custom-skill error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: corsHeaders });
  }
});
