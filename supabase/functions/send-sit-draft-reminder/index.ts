// send-sit-draft-reminder
// Relance les owners ayant un sit en status='draft' créé il y a plus de 24h
// et jamais publié. Anti-doublon via email_send_log (template_name + recipient).
// Déclenchement : cron quotidien 10h Europe/Paris (à planifier via pg_cron).
// Plafond : 25 envois max par run, les plus anciens d'abord.

import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TEMPLATE = "sit-draft-reminder";
const TOTAL_FIELDS = 8;
const MAX_PER_RUN = 25;

const NEARBY_RADIUS_KM = 30;

// Aligné sur send-mass-email-proximity/index.ts
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

function countRemaining(sit: Record<string, any>): number {
  const filled = [
    sit.title,
    sit.start_date,
    sit.end_date,
    sit.specific_expectations,
    Array.isArray(sit.environments) && sit.environments.length > 0,
    sit.city,
    sit.owner_message,
    sit.daily_routine,
  ].filter((v) => (typeof v === "string" ? v.trim().length > 0 : !!v)).length;
  return Math.max(0, TOTAL_FIELDS - filled);
}

// Compte les gardiens vérifiés dans un rayon de 30 km du lieu de la garde.
// Ne doit jamais faire échouer l'envoi : retombe sur 0 en cas d'erreur.
async function countNearbyVerifiedSitters(
  supabase: any,
  centerLat: number | null,
  centerLon: number | null,
): Promise<number> {
  try {
    if (typeof centerLat !== "number" || typeof centerLon !== "number") return 0;
    const latDelta = NEARBY_RADIUS_KM / 111;
    const lonDelta = NEARBY_RADIUS_KM / (111 * Math.max(0.1, Math.cos((centerLat * Math.PI) / 180)));
    const { data, error } = await supabase
      .from("profiles")
      .select("id, latitude, longitude")
      .in("role", ["sitter", "both"])
      .eq("identity_verified", true)
      .eq("account_status", "active")
      .not("latitude", "is", null)
      .not("longitude", "is", null)
      .gte("latitude", centerLat - latDelta)
      .lte("latitude", centerLat + latDelta)
      .gte("longitude", centerLon - lonDelta)
      .lte("longitude", centerLon + lonDelta)
      .limit(2000);
    if (error || !data) return 0;
    return data.filter(
      (p: any) =>
        haversineKm(centerLat, centerLon, Number(p.latitude), Number(p.longitude)) <= NEARBY_RADIUS_KM,
    ).length;
  } catch (_e) {
    return 0;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Auth guard: only accept the service-role key (used by pg_cron via pg_net).
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
  if (token !== serviceKey) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }


  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const now = Date.now();
  const cutoffDate = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const today = new Date(now).toISOString().slice(0, 10);

  // Récupérer les drafts créés il y a plus de 24h, les plus anciens d'abord.
  // Filtre dates : on ne relance que les brouillons sans date de début
  // ou dont la garde est encore à venir (start_date strictement après aujourd'hui).
  const { data: drafts, error } = await supabase
    .from("sits")
    .select("id, user_id, title, start_date, end_date, specific_expectations, environments, city, owner_message, daily_routine, created_at")
    .eq("status", "draft")
    .lt("created_at", cutoffDate)
    .or(`start_date.is.null,start_date.gt.${today}`)
    .order("created_at", { ascending: true })
    .limit(100);

  if (error) {
    console.error("[sit-draft-reminder] fetch drafts failed", error);
    return new Response(JSON.stringify({ error: "fetch_failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!drafts || drafts.length === 0) {
    return new Response(JSON.stringify({ ok: true, sent: 0, skipped: 0 }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let sent = 0;
  let skipped = 0;
  const errors: Array<{ sit_id: string; reason: string }> = [];

  for (const draft of drafts) {
    try {
      // Vérifier : owner n'a jamais publié
      const { count: publishedCount } = await supabase
        .from("sits")
        .select("id", { count: "exact", head: true })
        .eq("user_id", draft.user_id)
        .in("status", ["published", "confirmed", "completed"]);
      if ((publishedCount ?? 0) > 0) {
        skipped++;
        continue;
      }

      // Charger le profil
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, first_name")
        .eq("id", draft.user_id)
        .maybeSingle();
      if (!profile?.email) {
        skipped++;
        continue;
      }

      // Anti-doublon : 1 envoi max par sit
      const { count: alreadySent } = await supabase
        .from("email_send_log")
        .select("id", { count: "exact", head: true })
        .eq("template_name", TEMPLATE)
        .eq("recipient_email", profile.email);
      if ((alreadySent ?? 0) > 0) {
        skipped++;
        continue;
      }

      // Respect des préférences email. Le template sit-draft-reminder est
      // classé "product" dans _shared/email-categories.ts, on lit donc product_emails.
      const { data: prefs } = await supabase
        .from("email_preferences")
        .select("product_emails")
        .eq("user_id", draft.user_id)
        .maybeSingle();
      if (prefs && (prefs as any).product_emails === false) {
        skipped++;
        continue;
      }

      const fieldsRemaining = countRemaining(draft as Record<string, any>);
      const resumeUrl = `https://guardiens.fr/sits/create?resume=${draft.id}`;

      const _steRes = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-transactional-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
        body: JSON.stringify({
          templateName: TEMPLATE,
          recipientEmail: profile.email,
          idempotencyKey: `sit-draft-reminder-${draft.id}`,
          templateData: {
            firstName: profile.first_name || "",
            sitId: draft.id,
            fieldsRemaining,
            nearbySittersCount: 0,
            resumeUrl,
          },
        }),
      });
      const _steTxt1 = _steRes.ok ? '' : await _steRes.text().catch(() => '');
      if (!_steRes.ok) console.error('send-transactional-email failed', _steRes.status, _steTxt1);
      const sendErr = _steRes.ok ? null : new Error(`send-transactional-email ${_steRes.status}: ${_steTxt1}`);
      if (sendErr) {
        errors.push({ sit_id: draft.id, reason: sendErr.message });
        continue;
      }
      sent++;
      if (sent >= MAX_PER_RUN) break;
    } catch (e: any) {
      errors.push({ sit_id: draft.id, reason: e?.message ?? "unknown" });
    }
  }

  return new Response(
    JSON.stringify({ ok: true, sent, skipped, total: drafts.length, errors }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
