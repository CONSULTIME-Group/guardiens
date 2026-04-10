import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function buildHtml(subject: string, body: string, ctaLabel?: string, ctaUrl?: string): string {
  const ctaBlock = ctaLabel && ctaUrl
    ? `<tr><td style="padding:24px 0 0"><a href="${ctaUrl}" style="display:inline-block;padding:12px 28px;background-color:#16a34a;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px">${ctaLabel}</a></td></tr>`
    : "";

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background-color:#FAF9F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAF9F6;padding:32px 0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden">
<tr><td style="padding:32px 40px 24px;text-align:center;background-color:#FAF9F6">
<img src="https://guardiens.fr/logo.png" alt="Guardiens" width="140" style="display:block;margin:0 auto"/>
</td></tr>
<tr><td style="padding:32px 40px">
<h1 style="margin:0 0 20px;font-size:22px;color:#1a1a1a">${subject}</h1>
<p style="margin:0;font-size:15px;line-height:1.7;color:#333333;white-space:pre-line">${body}</p>
${ctaBlock}
</td></tr>
<tr><td style="padding:24px 40px;border-top:1px solid #e5e5e5;text-align:center">
<p style="margin:0;font-size:12px;color:#999999">Guardiens — La communauté d'entraide entre propriétaires et gardiens d'animaux</p>
<p style="margin:8px 0 0;font-size:11px;color:#bbbbbb"><a href="https://guardiens.fr/unsubscribe" style="color:#bbbbbb">Se désinscrire</a></p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;

    // Admin check
    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: roleData } = await serviceClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { segment, filters, subject, body, cta_label, cta_url } = await req.json();

    if (!segment || !subject || !body) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build query for recipients
    let query = serviceClient.from("profiles").select("email");

    if (segment === "gardiens") {
      query = query.in("role", ["sitter", "both"]);
    } else if (segment === "proprios") {
      query = query.in("role", ["owner", "both"]);
    } else if (segment === "fondateurs") {
      query = query.eq("is_founder", true);
    }
    // 'tous' → no role filter

    if (filters?.id_verifiee) {
      query = query.eq("identity_verified", true);
    }

    const { data: profiles, error: profilesErr } = await query;
    if (profilesErr) throw profilesErr;

    let recipients = (profiles || []).map((p) => p.email).filter(Boolean);

    // Filter active subscribers if needed
    if (filters?.abonnes_actifs) {
      const { data: subs } = await serviceClient
        .from("subscriptions")
        .select("user_id")
        .in("status", ["active", "trial"]);
      const activeUserIds = new Set((subs || []).map((s) => s.user_id));
      
      // Need user_ids to cross-reference
      const { data: profilesWithIds } = await serviceClient
        .from("profiles")
        .select("id, email");
      
      const emailToId = new Map<string, string>();
      (profilesWithIds || []).forEach((p) => {
        if (p.email) emailToId.set(p.email, p.id);
      });
      
      recipients = recipients.filter((email) => {
        const uid = emailToId.get(email);
        return uid && activeUserIds.has(uid);
      });
    }

    // Deduplicate
    recipients = [...new Set(recipients)];

    if (recipients.length === 0) {
      return new Response(JSON.stringify({ error: "No recipients found" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const html = buildHtml(subject, body, cta_label, cta_url);
    let sent = 0;
    let errors = 0;
    const BATCH_SIZE = 50;

    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);
      
      const promises = batch.map(async (email) => {
        try {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: "Guardiens <bonjour@guardiens.fr>",
              to: [email],
              subject,
              html,
            }),
          });
          const resBody = await res.text();
          if (res.ok) {
            sent++;
          } else {
            console.error(`Failed for ${email}: ${res.status} ${resBody}`);
            errors++;
          }
        } catch (e) {
          console.error(`Error sending to ${email}:`, e);
          errors++;
        }
      });

      await Promise.all(promises);

      // Wait between batches
      if (i + BATCH_SIZE < recipients.length) {
        await new Promise((r) => setTimeout(r, 100));
      }
    }

    // Log the send
    await serviceClient.from("mass_emails").insert({
      segment,
      filters: filters || {},
      subject,
      body,
      cta_label: cta_label || null,
      cta_url: cta_url || null,
      recipients_count: sent,
      status: errors > 0 && sent === 0 ? "error" : "sent",
      sent_by: userId,
    });

    return new Response(JSON.stringify({ sent, errors }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-mass-email error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
