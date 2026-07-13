/**
 * send-owner-activation-campaign — Campagne "réveil propriétaires dormants".
 *
 * Segment : profiles.role in ('owner','both') qui n'ont AUCUN sit avec status
 * dans ('published','confirmed','in_progress','completed'). Exclusions :
 * suppressed_emails, email_preferences.product_emails=false, doublons.
 *
 * Modes :
 *  - preview   : renvoie count + échantillon 20 destinataires (email masqué)
 *  - send      : envoie réellement au segment
 *  - test_only : envoie UNIQUEMENT à l'admin appelant (aucun impact segment)
 *
 * Idempotence : une seule campagne par jour (dedupe_key owner_activation_<YYYY-MM-DD>).
 * Sécurité : admin uniquement (user_roles.role = 'admin').
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUBJECT = "Guardiens, ce n'est pas que pour partir 15 jours";
const CTA_LABEL = "Publier ma première annonce";
const CTA_URL =
  "https://guardiens.fr/sits/create?utm_source=email&utm_campaign=owner_activation&utm_medium=nudge";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  const head = local.slice(0, Math.min(3, local.length));
  return `${head}${"*".repeat(Math.max(3, local.length - head.length))}@${domain}`;
}

interface Recipient {
  id: string;
  email: string;
  first_name: string | null;
}

async function fetchSegment(sc: ReturnType<typeof createClient>): Promise<Recipient[]> {
  const PAGE = 1000;
  const all: Recipient[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await sc
      .from("profiles")
      .select("id, email, first_name, role, account_status")
      .in("role", ["owner", "both"])
      .not("email", "is", null)
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const p of data as any[]) {
      if (!p.email) continue;
      if (p.account_status && p.account_status !== "active") continue;
      all.push({ id: p.id, email: String(p.email).trim(), first_name: p.first_name });
    }
    if (data.length < PAGE) break;
    from += PAGE;
  }

  if (all.length === 0) return all;

  // Exclude owners with at least one non-draft sit
  const ids = all.map((r) => r.id);
  const publishedOwners = new Set<string>();
  const CHUNK = 500;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const { data: sits } = await sc
      .from("sits")
      .select("user_id, status")
      .in("user_id", ids.slice(i, i + CHUNK))
      .in("status", ["published", "confirmed", "in_progress", "completed"]);
    for (const s of (sits || []) as any[]) publishedOwners.add(s.user_id);
  }

  // Opt-out product emails
  const optedOut = new Set<string>();
  for (let i = 0; i < ids.length; i += CHUNK) {
    const { data: prefs } = await sc
      .from("email_preferences")
      .select("user_id, product_emails")
      .in("user_id", ids.slice(i, i + CHUNK));
    for (const p of (prefs || []) as any[]) {
      if (p.product_emails === false) optedOut.add(p.user_id);
    }
  }

  // Suppressed emails
  const emailsLower = new Set(all.map((r) => r.email.toLowerCase()));
  const suppressed = new Set<string>();
  const emailList = [...emailsLower];
  for (let i = 0; i < emailList.length; i += CHUNK) {
    const { data: sups } = await sc
      .from("suppressed_emails")
      .select("email")
      .in("email", emailList.slice(i, i + CHUNK));
    for (const s of (sups || []) as any[]) {
      if (s.email) suppressed.add(String(s.email).toLowerCase());
    }
  }

  const seenEmail = new Set<string>();
  const out: Recipient[] = [];
  for (const r of all) {
    if (publishedOwners.has(r.id)) continue;
    if (optedOut.has(r.id)) continue;
    const key = r.email.toLowerCase();
    if (seenEmail.has(key)) continue;
    if (suppressed.has(key)) continue;
    seenEmail.add(key);
    out.push(r);
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const sc = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: role } = await sc
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await req.json().catch(() => ({}));
    const mode: "preview" | "send" | "test_only" = payload.mode ?? "preview";

    // Idempotence : refuse un 2ᵉ send/test dans la même journée
    const dedupeKey = `owner_activation_${todayKey()}`;
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const { data: existing } = await sc
      .from("mass_emails")
      .select("id, created_at, recipients_count")
      .eq("segment", "owner_activation")
      .gte("created_at", startOfDay.toISOString())
      .order("created_at", { ascending: false })
      .limit(1);
    const alreadySentToday = existing && existing.length > 0;

    // TEST ONLY : envoie uniquement à l'admin
    if (mode === "test_only") {
      const adminEmail = user.email;
      if (!adminEmail) {
        return new Response(JSON.stringify({ error: "Admin email introuvable" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: adminProfile } = await sc
        .from("profiles")
        .select("first_name")
        .eq("id", user.id)
        .maybeSingle();
      const { error: sendErr } = await sc.functions.invoke("send-transactional-email", {
        body: {
          templateName: "owner-activation-nudge",
          recipientEmail: adminEmail,
          idempotencyKey: `owner_activation_test_${user.id}_${Date.now()}`,
          templateData: { firstName: (adminProfile as any)?.first_name ?? "" },
        },
      });
      if (sendErr) throw sendErr;
      return new Response(JSON.stringify({ sent: 1, errors: 0, mode: "test_only" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const recipients = await fetchSegment(sc);

    if (mode === "preview") {
      return new Response(
        JSON.stringify({
          count: recipients.length,
          subject: SUBJECT,
          cta_label: CTA_LABEL,
          cta_url: CTA_URL,
          already_sent_today: !!alreadySentToday,
          last_campaign: alreadySentToday
            ? {
                id: existing![0].id,
                created_at: existing![0].created_at,
                recipients_count: existing![0].recipients_count,
              }
            : null,
          sample: recipients.slice(0, 20).map((r) => ({
            first_name: r.first_name ?? "",
            email_masked: maskEmail(r.email),
          })),
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // SEND
    if (alreadySentToday) {
      return new Response(
        JSON.stringify({
          error: "Une campagne owner_activation a déjà été envoyée aujourd'hui",
          code: "already_sent_today",
          last_campaign: existing![0],
        }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    if (recipients.length === 0) {
      return new Response(JSON.stringify({ error: "Aucun destinataire" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: campaign, error: campErr } = await sc
      .from("mass_emails")
      .insert({
        segment: "owner_activation",
        filters: { campaign: "owner_activation", dedupe_key: dedupeKey } as any,
        subject: SUBJECT,
        body: "Campagne réveil propriétaires dormants (owner-activation-nudge)",
        cta_label: CTA_LABEL,
        cta_url: CTA_URL,
        recipients_count: 0,
        status: "sending",
        sent_by: user.id,
      })
      .select("id")
      .single();
    if (campErr || !campaign) throw new Error(`mass_emails insert failed: ${campErr?.message}`);
    const campaignId = campaign.id as string;

    let sent = 0;
    let errors = 0;

    // Rate limit ~500/min : batch 50 puis pause 6s
    const BATCH = 50;
    for (let i = 0; i < recipients.length; i += BATCH) {
      const batch = recipients.slice(i, i + BATCH);
      await Promise.all(
        batch.map(async (r) => {
          try {
            const { error } = await sc.functions.invoke("send-transactional-email", {
              body: {
                templateName: "owner-activation-nudge",
                recipientEmail: r.email,
                idempotencyKey: `${dedupeKey}_${r.id}`,
                templateData: { firstName: r.first_name ?? "" },
              },
            });
            if (error) throw error;
            sent += 1;
          } catch (e) {
            console.error(`owner-activation send failed for ${r.email}:`, e);
            errors += 1;
          }
        }),
      );
      if (i + BATCH < recipients.length) {
        await new Promise((res) => setTimeout(res, 6000));
      }
    }

    await sc
      .from("mass_emails")
      .update({
        recipients_count: sent,
        status: errors > 0 && sent === 0 ? "error" : "sent",
      })
      .eq("id", campaignId);

    return new Response(
      JSON.stringify({ sent, errors, campaign_id: campaignId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("send-owner-activation-campaign error:", err);
    return new Response(
      JSON.stringify({ error: String((err as Error).message || err), code: "internal_error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
