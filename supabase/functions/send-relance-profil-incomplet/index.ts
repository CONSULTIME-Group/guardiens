// Edge function : envoi en masse de la relance "profil incomplet J+2"
// - Cible : profils créés depuis +2 jours, profile_completion = 0, non suppressed, pas déjà relancés
// - Idempotence : check email_send_log avant chaque envoi
// - Throttling : appel séquentiel à send-transactional-email (qui enqueue dans pgmq)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Auth : soit service-role direct, soit user admin
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const service = createClient(SUPABASE_URL, SERVICE_KEY);

    if (token !== SERVICE_KEY) {
      // Mode user : doit être admin
      const userClient = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: roleData } = await service
        .from("user_roles").select("role")
        .eq("user_id", user.id).eq("role", "admin").maybeSingle();
      if (!roleData) {
        return new Response(JSON.stringify({ error: "Admin only" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { dryRun = false, limit = 1000 } = await req.json().catch(() => ({}));

    // Récupération des cibles
    const cutoff = new Date(Date.now() - 2 * 86400000).toISOString();
    const { data: profiles, error: pErr } = await service
      .from("profiles")
      .select("id, email, first_name, profile_completion, created_at")
      .lte("created_at", cutoff)
      .or("profile_completion.is.null,profile_completion.eq.0")
      .not("email", "is", null)
      .limit(limit);

    if (pErr) throw pErr;
    const candidates = (profiles || []).filter(p => p.email);

    // Filtre suppression list
    const emails = candidates.map(p => p.email);
    const { data: suppressed } = await service
      .from("suppressed_emails").select("email").in("email", emails);
    const suppressedSet = new Set((suppressed || []).map(s => s.email));

    // Filtre déjà envoyés
    const { data: alreadySent } = await service
      .from("email_send_log")
      .select("recipient_email")
      .eq("template_name", "relance-profil-incomplet")
      .in("recipient_email", emails)
      .in("status", ["sent", "pending"]);
    const sentSet = new Set((alreadySent || []).map(s => s.recipient_email));

    const targets = candidates.filter(p =>
      !suppressedSet.has(p.email) && !sentSet.has(p.email)
    );

    if (dryRun) {
      return new Response(JSON.stringify({
        dryRun: true,
        totalCandidates: candidates.length,
        suppressed: suppressedSet.size,
        alreadySent: sentSet.size,
        toSend: targets.length,
        sampleEmails: targets.slice(0, 5).map(t => t.email),
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Envoi
    let sent = 0;
    let errors = 0;
    const errorDetails: any[] = [];

    for (const p of targets) {
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SERVICE_KEY}`,
          },
          body: JSON.stringify({
            templateName: "relance-profil-incomplet",
            recipientEmail: p.email,
            idempotencyKey: `relance-incomplet-j2-${p.id}`,
            templateData: { firstName: p.first_name || "" },
          }),
        });
        if (res.ok) {
          sent++;
        } else {
          errors++;
          const txt = await res.text();
          errorDetails.push({ email: p.email, status: res.status, body: txt.slice(0, 200) });
        }
      } catch (e) {
        errors++;
        errorDetails.push({ email: p.email, error: String(e) });
      }
      // Petit délai pour ne pas saturer
      await new Promise(r => setTimeout(r, 50));
    }

    return new Response(JSON.stringify({
      total: targets.length,
      sent,
      errors,
      errorDetails: errorDetails.slice(0, 10),
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    console.error("send-relance-profil-incomplet error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
