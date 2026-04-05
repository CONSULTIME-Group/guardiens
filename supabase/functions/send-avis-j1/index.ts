import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;

  const now = new Date();
  const h24ago = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const h48ago = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString().split("T")[0];

  // end_date between 48h ago and 24h ago (i.e. ended yesterday)
  const { data: sits } = await supabase
    .from("sits")
    .select("id, title, end_date, user_id, status")
    .in("status", ["confirmed", "completed"])
    .eq("review_j1_sent", false)
    .gte("end_date", h48ago)
    .lte("end_date", h24ago);

  let count = 0;

  for (const sit of sits || []) {
    const { data: apps } = await supabase
      .from("applications")
      .select("sitter_id")
      .eq("sit_id", sit.id)
      .eq("status", "accepted");

    const sitterId = apps?.[0]?.sitter_id;

    const { data: ownerProfile } = await supabase.from("profiles").select("first_name, email").eq("id", sit.user_id).single();
    const sitterProfile = sitterId ? (await supabase.from("profiles").select("first_name, email").eq("id", sitterId).single()).data : null;

    // Transition to completed if still confirmed
    if (sit.status === "confirmed") {
      await supabase.from("sits").update({ status: "completed" }).eq("id", sit.id);
    }

    // Email proprio
    if (ownerProfile?.email) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify({
          from: "Guardiens <noreply@guardiens.fr>",
          to: [ownerProfile.email],
          subject: "Comment s'est passée votre garde ?",
          html: `<p>Bonjour ${ownerProfile.first_name || ""},</p>
<p>Votre garde avec ${sitterProfile?.first_name || "votre gardien"} est terminée.</p>
<p>Laissez-lui un avis — cela l'aide à trouver de nouvelles gardes et renforce la confiance dans la communauté.</p>
<p><a href="https://guardiens.fr/review/${sit.id}">Laisser un avis →</a></p>
<p>L'équipe Guardiens</p>`,
        }),
      });
      count++;
    }

    // Email gardien
    if (sitterProfile?.email) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify({
          from: "Guardiens <noreply@guardiens.fr>",
          to: [sitterProfile.email],
          subject: "Comment s'est passée votre garde ?",
          html: `<p>Bonjour ${sitterProfile.first_name || ""},</p>
<p>Votre garde chez ${ownerProfile?.first_name || "votre propriétaire"} est terminée.</p>
<p>Laissez un avis — cela aide les propriétaires à choisir en confiance.</p>
<p><a href="https://guardiens.fr/review/${sit.id}">Laisser un avis →</a></p>
<p>L'équipe Guardiens</p>`,
        }),
      });
      count++;
    }

    await supabase.from("sits").update({ review_j1_sent: true }).eq("id", sit.id);
  }

  return new Response(JSON.stringify({ sent: count }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
