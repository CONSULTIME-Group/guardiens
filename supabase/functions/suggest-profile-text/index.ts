import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const fieldPrompts: Record<string, string> = {
  bio: `Écris une courte bio chaleureuse (~80 mots) pour un propriétaire d'animaux sur une plateforme de garde.
Ton naturel, authentique, pas marketing. Mentionne le lien avec les animaux, un trait de personnalité, et ce qui rend l'accueil agréable.`,

  description: `Écris une description de logement (~60 mots) pour une annonce de garde d'animaux.
Focus sur l'ambiance intérieure, le confort, la luminosité, les espaces. Pas de mention du quartier (c'est géré automatiquement).
Ton chaleureux et honnête.`,

  specific_expectations: `Écris un court texte (~50 mots) d'attentes spécifiques pour un propriétaire qui confie ses animaux.
Exemples : horaires de promenade, habitudes alimentaires, consignes particulières. Ton bienveillant et concret.`,

  rules_notes: `Écris un court texte (~40 mots) de règles de maison, bienveillant mais clair.
Exemples : chaussures à l'entrée, pas de fumée, heures de calme. Ton amical.`,

  welcome_notes: `Écris un court message d'accueil (~40 mots) qu'un propriétaire laisserait au gardien.
Ton chaleureux et accueillant, avec un petit détail pratique.`,

  communication_notes: `Écris un court texte (~40 mots) sur les préférences de communication d'un propriétaire.
Comment il souhaite avoir des nouvelles, à quelle fréquence, et sous quelle forme.`,

  motivation: `Écris une courte motivation (~60 mots) pour un gardien d'animaux.
Pourquoi il aime garder des animaux, ce qui le motive. Ton sincère et passionné.`,

  references_text: `Écris un court texte (~50 mots) de références d'un gardien d'animaux.
Exemples d'expériences passées avec des animaux, types d'animaux gardés. Ton professionnel mais chaleureux.`,

  preferences_notes: `Écris un court texte (~40 mots) sur les préférences d'un gardien.
Ce qu'il recherche comme type de garde, environnement, animaux. Ton positif.`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { field, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const fieldPrompt = fieldPrompts[field];
    if (!fieldPrompt) {
      return new Response(JSON.stringify({ error: "Unknown field" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contextInfo = context
      ? `\nContexte du profil : ${JSON.stringify(context)}\nAdapte la suggestion à ces informations.`
      : "";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `Tu es un assistant pour Guardiens.fr, plateforme française de garde d'animaux entre particuliers.
Tu génères des textes courts, naturels, sans clichés marketing. Écris en français.
Ne mets jamais de guillemets autour du texte. Réponds uniquement avec le texte demandé, rien d'autre.`,
          },
          {
            role: "user",
            content: fieldPrompt + contextInfo,
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Trop de requêtes, réessayez dans quelques secondes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits IA épuisés." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content?.trim() || "";

    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("suggest-profile-text error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
