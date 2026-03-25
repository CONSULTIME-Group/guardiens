import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase configuration");
    }

    // Authenticate the caller
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role client for admin operations
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get the user's profile to find the document path
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("identity_document_url, identity_verification_status")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const docPath = profile.identity_document_url;
    if (!docPath) {
      return new Response(JSON.stringify({ error: "No identity document uploaded" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Download the document from storage
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from("identity-documents")
      .download(docPath);

    if (downloadError || !fileData) {
      console.error("Download error:", downloadError);
      return new Response(JSON.stringify({ error: "Could not download document" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Convert to base64 for the AI
    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    const mimeType = fileData.type || "image/jpeg";

    // Call Lovable AI with the image for verification
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are an identity document verification assistant. You must analyze images submitted as identity documents.

Your task:
1. Determine if the image is a valid identity document (passport, national ID card, driver's license, residence permit).
2. Check that the document appears authentic (has security features visible, not obviously edited).
3. Check that text is legible.
4. Check that there is a photo visible on the document.

You must respond using the provided tool.

Rules:
- If the image is NOT an identity document (random photo, meme, blank page, etc.), reject it.
- If the document is too blurry or unreadable, reject it.
- If it looks like a valid ID document with a readable name and visible photo, approve it.
- Do NOT try to verify the actual identity of the person. Just verify it's a real ID document.`,
          },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64}`,
                },
              },
              {
                type: "text",
                text: "Please verify this identity document.",
              },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "verify_document",
              description: "Return the verification result for the identity document",
              parameters: {
                type: "object",
                properties: {
                  is_valid: {
                    type: "boolean",
                    description: "Whether the document is a valid, legible identity document",
                  },
                  document_type: {
                    type: "string",
                    enum: ["passport", "national_id", "drivers_license", "residence_permit", "other", "not_a_document"],
                    description: "The type of document detected",
                  },
                  rejection_reason: {
                    type: "string",
                    description: "If rejected, a brief reason in French explaining why (e.g. 'Document illisible', 'Ce n\\'est pas une pièce d\\'identité')",
                  },
                },
                required: ["is_valid", "document_type"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "verify_document" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Service temporairement surchargé, réessayez dans quelques instants." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Service indisponible, veuillez réessayer plus tard." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiResult = await aiResponse.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      console.error("No tool call in AI response:", JSON.stringify(aiResult));
      throw new Error("AI did not return a structured response");
    }

    const verification = JSON.parse(toolCall.function.arguments);
    console.log("Verification result:", JSON.stringify(verification));

    // Update the profile and create notification based on verification result
    if (verification.is_valid) {
      await supabaseAdmin
        .from("profiles")
        .update({
          identity_verified: true,
          identity_verification_status: "verified",
        })
        .eq("id", user.id);

      await supabaseAdmin.from("notifications").insert({
        user_id: user.id,
        type: "identity_verified",
        title: "Identité vérifiée ✓",
        body: "Votre pièce d'identité a été validée avec succès. Vous avez maintenant accès à toutes les fonctionnalités.",
        link: "/settings#verification",
      });
    } else {
      await supabaseAdmin
        .from("profiles")
        .update({
          identity_verified: false,
          identity_verification_status: "rejected",
        })
        .eq("id", user.id);

      const reason = verification.rejection_reason || "Document non conforme";
      await supabaseAdmin.from("notifications").insert({
        user_id: user.id,
        type: "identity_rejected",
        title: "Vérification refusée",
        body: `Votre document n'a pas pu être validé : ${reason}. Vous pouvez soumettre un nouveau document.`,
        link: "/settings#verification",
      });
    }

    return new Response(
      JSON.stringify({
        verified: verification.is_valid,
        document_type: verification.document_type,
        rejection_reason: verification.rejection_reason || null,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error("verify-identity error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
