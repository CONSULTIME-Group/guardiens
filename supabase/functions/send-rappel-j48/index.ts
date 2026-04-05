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
  const in2 = new Date(now);
  in2.setDate(in2.getDate() + 2);
  const targetDate = in2.toISOString().split("T")[0];

  const { data: sits } = await supabase
    .from("sits")
    .select("id, title, start_date, user_id")
    .eq("status", "confirmed")
    .eq("reminder_j48_sent", false)
    .eq("start_date", targetDate);

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

    // Email proprio
    if (ownerProfile?.email) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify({
          from: "Guardiens <noreply@guardiens.fr>",
          to: [ownerProfile.email],
          subject: "Votre garde commence dans 48h",
          html: `<p>Bonjour ${ownerProfile.first_name || ""},</p>
<p>Plus que 48h avant l'arrivée de ${sitterProfile?.first_name || "votre gardien"}.</p>
<p>Assurez-vous que le guide de la maison est complet et accessible.</p>
<p><a href="https://guardiens.fr/sits/${sit.id}">Voir ma garde →</a></p>
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
          subject: "Votre garde commence dans 48h",
          html: `<p>Bonjour ${sitterProfile.first_name || ""},</p>
<p>Plus que 48h avant votre garde chez ${ownerProfile?.first_name || "votre propriétaire"}.</p>
<p>Vérifiez les dernières consignes dans le guide de la maison.</p>
<p><a href="https://guardiens.fr/sits/${sit.id}">Voir la garde →</a></p>
<p>L'équipe Guardiens</p>`,
        }),
      });
      count++;
    }

    await supabase.from("sits").update({ reminder_j48_sent: true }).eq("id", sit.id);
  }

  return new Response(JSON.stringify({ sent: count }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
