/**
 * nudge-missing-photo
 *
 * Relance one-shot pour les gardiens récents (3 à 30 jours) qui ont commencé
 * l'onboarding (profile_completion > 0) mais n'ont pas encore ajouté de photo
 * de profil (avatar_url null/vide).
 *
 * Aucun cron n'est câblé ici : la fonction est appelable manuellement ou par
 * un cron externe. Deux modes :
 *   - { mode: "count" } : renvoie juste le nombre d'utilisateurs éligibles
 *   - { mode: "send" }  : envoie les emails (défaut)
 *
 * Dédup : réutilise le mécanisme éprouvé de send-relance-profil-incomplet :
 * on filtre les destinataires déjà présents dans email_send_log avec
 * template_name = 'nudge-missing-photo' et status in ('sent','pending').
 * Chaque envoi passe par send-transactional-email qui journalise ensuite dans
 * email_send_log, ce qui rend la dédup naturelle sur les runs suivants.
 *
 * Cap de sécurité : 200 destinataires par run.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const TEMPLATE_NAME = "nudge-missing-photo";
const RUN_LIMIT = 200;

interface Candidate {
  id: string;
  email: string;
  first_name: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Auth : service-role direct, sinon user admin (même garde que
    // send-relance-profil-incomplet).
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const service = createClient(SUPABASE_URL, SERVICE_KEY);

    if (token !== SERVICE_KEY) {
      const userClient = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: roleData } = await service
        .from("user_roles").select("role")
        .eq("user_id", user.id).eq("role", "admin").maybeSingle();
      if (!roleData) {
        return new Response(JSON.stringify({ error: "Admin only" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const mode = (body?.mode as string) === "count" ? "count" : "send";

    // Audience éligible.
    const now = Date.now();
    const upperBound = new Date(now - 3 * 86400000).toISOString();  // >= 3j
    const lowerBound = new Date(now - 30 * 86400000).toISOString(); // <= 30j

    const { data: profiles, error: pErr } = await service
      .from("profiles")
      .select("id, email, first_name, avatar_url, profile_completion, account_status, role, created_at")
      .in("role", ["sitter", "both"])
      .or("avatar_url.is.null,avatar_url.eq.")
      .gt("profile_completion", 0)
      .or("account_status.is.null,account_status.eq.active")
      .lte("created_at", upperBound)
      .gte("created_at", lowerBound)
      .not("email", "is", null)
      .limit(RUN_LIMIT * 3); // marge pour absorber les filtres suivants

    if (pErr) throw pErr;

    const candidates: Candidate[] = (profiles || [])
      .filter((p: any) => typeof p.email === "string" && p.email.length > 0)
      .map((p: any) => ({
        id: p.id as string,
        email: (p.email as string).trim().toLowerCase(),
        first_name: (p.first_name as string | null) ?? null,
      }));

    if (candidates.length === 0) {
      return new Response(JSON.stringify({ mode, count: 0, eligible: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emails = candidates.map((c) => c.email);
    const userIds = candidates.map((c) => c.id);

    // Suppression list.
    const { data: suppressed } = await service
      .from("suppressed_emails").select("email").in("email", emails);
    const suppressedSet = new Set((suppressed || []).map((s: any) => s.email));

    // Opt-out produit.
    const { data: prefs } = await service
      .from("email_preferences")
      .select("user_id, product_emails")
      .in("user_id", userIds);
    const optedOut = new Set(
      (prefs || [])
        .filter((p: any) => p.product_emails === false)
        .map((p: any) => p.user_id as string),
    );

    // Dédup : déjà relancés par ce nudge.
    const { data: alreadySent } = await service
      .from("email_send_log")
      .select("recipient_email")
      .eq("template_name", TEMPLATE_NAME)
      .in("recipient_email", emails)
      .in("status", ["sent", "pending"]);
    const sentSet = new Set(
      (alreadySent || []).map((s: any) => (s.recipient_email as string).trim().toLowerCase()),
    );

    const targets = candidates
      .filter((c) =>
        !suppressedSet.has(c.email) &&
        !optedOut.has(c.id) &&
        !sentSet.has(c.email)
      )
      .slice(0, RUN_LIMIT);

    if (mode === "count") {
      return new Response(JSON.stringify({
        mode: "count",
        count: targets.length,
        rawCandidates: candidates.length,
        suppressed: suppressedSet.size,
        optedOut: optedOut.size,
        alreadySent: sentSet.size,
        sample: targets.slice(0, 5).map((t) => ({ id: t.id, email: t.email })),
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mode send.
    let sent = 0;
    let errors = 0;
    const errorDetails: Array<Record<string, unknown>> = [];

    for (const t of targets) {
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SERVICE_KEY}`,
          },
          body: JSON.stringify({
            templateName: TEMPLATE_NAME,
            recipientEmail: t.email,
            idempotencyKey: `nudge-missing-photo-${t.id}`,
            templateData: { firstName: t.first_name || "" },
          }),
        });
        if (res.ok) {
          sent += 1;
        } else {
          errors += 1;
          const txt = await res.text();
          errorDetails.push({ email: t.email, status: res.status, body: txt.slice(0, 200) });
        }
      } catch (e) {
        errors += 1;
        errorDetails.push({ email: t.email, error: String(e) });
      }
      await new Promise((r) => setTimeout(r, 50));
    }

    return new Response(JSON.stringify({
      mode: "send",
      total: targets.length,
      sent,
      errors,
      errorDetails: errorDetails.slice(0, 10),
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[nudge-missing-photo]", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
