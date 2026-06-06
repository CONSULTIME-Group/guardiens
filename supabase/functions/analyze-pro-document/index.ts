import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AUTO_APPROVE_THRESHOLD = 0.85;

const SYSTEM_PROMPT = `Vous êtes un assistant de vérification de documents professionnels pour Guardiens (plateforme française de garde d'animaux).

Le gardien déclare être un professionnel animalier (éducateur canin, comportementaliste, vétérinaire, ASV, toiletteur, pension agréée, pet-sitter déclaré, etc.) et soumet un document pour le prouver.

Votre tâche :
1. Identifier le type exact de document (ACACED, diplôme école vétérinaire, certificat éducateur, extrait Kbis, attestation SIRET, attestation RC pro, autre).
2. Vérifier que le document semble authentique, lisible, non manifestement altéré.
3. Extraire le nom du titulaire ou de l'entreprise + numéro de SIRET si présent + organisme émetteur + date.
4. Comparer ces éléments aux informations déclarées par le gardien (passées dans le message utilisateur).
5. Lister les signaux suspects (photo recadrée, métadonnées étranges, incohérence de nom, document expiré, mention erronée).
6. Donner une note de confiance de 0 à 1 sur la validité globale.

Règles strictes :
- Si ce n'est pas un document professionnel animalier, statut = "invalid_document".
- Si le nom déclaré ne correspond pas du tout au document, statut = "name_mismatch".
- Si le SIRET déclaré ne correspond pas à celui imprimé, statut = "siret_mismatch".
- Si tout est cohérent et lisible, statut = "valid".
- Si vous hésitez, statut = "uncertain".
- Toujours répondre via l'outil fourni, jamais en texte libre.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
      throw new Error("Missing Supabase configuration");
    }

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json().catch(() => ({}));
    const verificationId = (body?.verification_id ?? "").toString().trim();
    if (!verificationId) {
      return new Response(JSON.stringify({ error: "verification_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Charger la vérification
    const { data: verification, error: vErr } = await supabaseAdmin
      .from("pro_verifications")
      .select("*")
      .eq("id", verificationId)
      .single();

    if (vErr || !verification) {
      return new Response(JSON.stringify({ error: "Verification not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Vérifier ownership (owner ou admin)
    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (verification.user_id !== user.id && !isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit: max 10 analyses/jour/utilisateur
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: recentCount } = await supabaseAdmin
      .from("pro_verifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", verification.user_id)
      .gte("ai_analyzed_at", oneDayAgo);
    if ((recentCount ?? 0) >= 10) {
      return new Response(
        JSON.stringify({ error: "Limite quotidienne atteinte (10 analyses/jour)." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Télécharger le fichier
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from("pro-documents")
      .download(verification.file_path);

    if (downloadError || !fileData) {
      console.error("Download error:", downloadError);
      return new Response(JSON.stringify({ error: "Impossible de télécharger le document" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    const base64 = btoa(binary);
    const mimeType = fileData.type || verification.mime_type || "image/jpeg";

    // Informations déclarées par le gardien
    const declared = {
      doc_type: verification.doc_type,
      business_name: verification.declared_business_name,
      siret: verification.declared_siret,
      specialty: verification.declared_specialty,
    };

    const userInstruction = `Contexte déclaré par le gardien :
- Type de document annoncé : ${declared.doc_type}
- Nom ou entreprise : ${declared.business_name || "non renseigné"}
- SIRET : ${declared.siret || "non renseigné"}
- Spécialité : ${declared.specialty || "non renseignée"}

Analysez le document ci-joint et remplissez l'outil avec votre jugement.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } },
              { type: "text", text: userInstruction },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "report_pro_document_analysis",
              description: "Renvoie l'analyse structurée du document professionnel",
              parameters: {
                type: "object",
                properties: {
                  status: {
                    type: "string",
                    enum: ["valid", "uncertain", "invalid_document", "name_mismatch", "siret_mismatch", "expired", "unreadable"],
                  },
                  document_type_detected: {
                    type: "string",
                    enum: ["acaced", "veterinary_diploma", "groomer_certificate", "educator_certificate", "kbis", "siret_attestation", "rc_pro_insurance", "other_professional", "not_professional"],
                  },
                  holder_name: { type: "string", description: "Nom du titulaire si lisible" },
                  business_name: { type: "string", description: "Nom de l'entreprise si lisible" },
                  siret_detected: { type: "string", description: "SIRET imprimé sur le document si présent" },
                  issuer: { type: "string", description: "Organisme émetteur (ex: Ministère de l'Agriculture, École vétérinaire d'Alfort, INSEE, etc.)" },
                  issue_date: { type: "string", description: "Date d'émission ou de validité au format YYYY-MM-DD si lisible" },
                  confidence: { type: "number", description: "Confiance globale 0 à 1" },
                  name_match: { type: "boolean", description: "Le nom déclaré correspond-il à celui du document ?" },
                  siret_match: { type: "boolean", description: "Le SIRET déclaré correspond-il à celui du document ?" },
                  red_flags: { type: "array", items: { type: "string" }, description: "Liste des signaux suspects en français" },
                  human_summary: { type: "string", description: "Résumé court en français pour un admin (2-3 phrases)" },
                },
                required: ["status", "document_type_detected", "confidence", "human_summary"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "report_pro_document_analysis" } },
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Service IA temporairement surchargé." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits IA épuisés." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiResult = await aiResponse.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error("No tool call:", JSON.stringify(aiResult).slice(0, 500));
      throw new Error("AI did not return a structured response");
    }

    const analysis = JSON.parse(toolCall.function.arguments);
    const confidence = Number(analysis.confidence) || 0;

    // Décision auto
    let nextStatus: string;
    if (
      analysis.status === "valid" &&
      confidence >= AUTO_APPROVE_THRESHOLD &&
      analysis.name_match !== false &&
      analysis.siret_match !== false
    ) {
      nextStatus = "auto_approved";
    } else if (analysis.status === "invalid_document" || analysis.status === "unreadable") {
      nextStatus = "needs_review";
    } else {
      nextStatus = "needs_review";
    }

    const updatePayload: Record<string, unknown> = {
      ai_status: analysis.status,
      ai_confidence: confidence,
      ai_analysis: analysis,
      ai_red_flags: analysis.red_flags ?? [],
      ai_analyzed_at: new Date().toISOString(),
      status: nextStatus,
    };
    if (nextStatus === "auto_approved") {
      updatePayload.decided_at = new Date().toISOString();
      updatePayload.admin_decision = "auto";
    }

    const { error: updErr } = await supabaseAdmin
      .from("pro_verifications")
      .update(updatePayload)
      .eq("id", verificationId);

    if (updErr) {
      console.error("Update error:", updErr);
      throw new Error("Could not update verification");
    }

    // Notif gardien
    if (nextStatus === "auto_approved") {
      await supabaseAdmin.from("notifications").insert({
        user_id: verification.user_id,
        type: "pro_verified",
        title: "Badge Pro validé",
        body: "Votre document a été validé automatiquement. Votre pastille « Pro vérifié » est désormais visible sur votre profil.",
        link: "/profil#pro",
      });
    } else {
      await supabaseAdmin.from("notifications").insert({
        user_id: verification.user_id,
        type: "pro_review",
        title: "Document en cours d'examen",
        body: "Votre document professionnel demande une vérification humaine. Notre équipe revient vers vous sous 48 h.",
        link: "/profil#pro",
      });
    }

    return new Response(
      JSON.stringify({ status: nextStatus, confidence, analysis }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("analyze-pro-document error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
