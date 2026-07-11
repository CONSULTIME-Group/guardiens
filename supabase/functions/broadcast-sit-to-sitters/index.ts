/**
 * broadcast-sit-to-sitters — envoi ciblé d'une annonce de garde aux gardiens
 * de proximité (pendant du proximity mission, mais pour les sits).
 *
 * Modes : "preview" (compte + destinataires) et "send" (envoi individuel).
 * Ciblage : gardiens vérifiés à profil >= 60 %, latitude/longitude non nuls,
 * dans un rayon (km) autour du propriétaire (les sits n'ont pas de coords propres).
 * Exclusions : auteur, suppressed_emails, opt-out product_emails, comptes inactifs.
 * Sécurité : admin uniquement.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function mdToHtml(md: string): string {
  // Markdown minimal : paragraphes séparés par lignes vides, liens [texte](url).
  const safe = escapeHtml(md).replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" style="color:#2C6E49;text-decoration:underline">$1</a>',
  );
  return safe
    .split(/\n\s*\n/)
    .map(
      (p) =>
        `<p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#3a3a3a">${p.replace(/\n/g, "<br/>")}</p>`,
    )
    .join("");
}

function buildHtml(params: {
  recipientFirstName: string;
  subject: string;
  bodyMarkdown: string;
  ctaLabel: string;
  ctaUrl: string;
}): string {
  const greeting = params.recipientFirstName
    ? `Bonjour ${escapeHtml(params.recipientFirstName)},`
    : "Bonjour,";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background-color:#FAF9F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAF9F6;padding:32px 16px">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.04)">
<tr><td style="padding:0;background:linear-gradient(135deg,#2C6E49 0%,#3a8a5d 100%);height:6px;line-height:6px;font-size:0">&nbsp;</td></tr>
<tr><td style="padding:32px 40px 8px;text-align:center;background-color:#ffffff">
<img src="https://guardiens.fr/logo-guardiens.png" alt="Guardiens" width="120" style="display:block;margin:0 auto;height:auto"/>
</td></tr>
<tr><td style="padding:24px 40px 8px">
<h1 style="margin:0 0 20px;font-size:22px;line-height:1.35;color:#1a1a1a;font-weight:700">${escapeHtml(params.subject)}</h1>
<p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#3a3a3a">${greeting}</p>
${mdToHtml(params.bodyMarkdown)}
</td></tr>
<tr><td align="center" style="padding:16px 0 8px">
<a href="${escapeHtml(params.ctaUrl)}" style="display:inline-block;padding:14px 32px;background-color:#2C6E49;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600;font-size:16px;box-shadow:0 4px 12px rgba(44,110,73,0.25)">${escapeHtml(params.ctaLabel)}</a>
</td></tr>
<tr><td style="padding:24px 40px 8px">
<p style="margin:0 0 4px;font-size:15px;line-height:1.7;color:#3a3a3a">À bientôt,</p>
<p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#3a3a3a">L'équipe Guardiens</p>
</td></tr>
<tr><td style="padding:20px 40px;border-top:1px solid #eee;background-color:#FAF9F6;text-align:center">
<p style="margin:0 0 6px;font-size:13px;color:#555;font-weight:600">Guardiens</p>
<p style="margin:0;font-size:12px;color:#888;line-height:1.6">L'entraide locale entre propriétaires et gardiens d'animaux.</p>
<p style="margin:14px 0 0;font-size:11px;color:#aaa">
<a href="https://guardiens.fr" style="color:#aaa;text-decoration:none">guardiens.fr</a>
&nbsp;·&nbsp;
<a href="https://guardiens.fr/unsubscribe" style="color:#aaa;text-decoration:underline">Se désinscrire</a>
</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

interface Recipient {
  user_id: string;
  first_name: string;
  city: string;
  email: string;
  distance_km: number;
}

async function computeRecipients(
  serviceClient: ReturnType<typeof createClient>,
  sitId: string,
  radiusKm: number,
) {
  const { data: sit, error: sErr } = await serviceClient
    .from("sits")
    .select("id, title, city, user_id, status")
    .eq("id", sitId)
    .maybeSingle();
  if (sErr || !sit) throw new Error(`Annonce introuvable (${sitId})`);

  const { data: owner, error: oErr } = await serviceClient
    .from("profiles")
    .select("id, first_name, latitude, longitude")
    .eq("id", (sit as { user_id: string }).user_id)
    .maybeSingle();
  if (oErr || !owner) throw new Error("Propriétaire introuvable");
  const ownerAny = owner as { id: string; first_name: string | null; latitude: number | null; longitude: number | null };
  const centerLat = ownerAny.latitude;
  const centerLon = ownerAny.longitude;
  if (centerLat == null || centerLon == null) {
    throw new Error("Aucune coordonnée disponible pour le propriétaire");
  }

  const latDelta = radiusKm / 111;
  const lonDelta = radiusKm / (111 * Math.cos((centerLat * Math.PI) / 180) || 1);

  const all: Recipient[] = [];
  const PAGE = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await serviceClient
      .from("profiles")
      .select("id, first_name, email, city, latitude, longitude, account_status, role, identity_verified, profile_completion")
      .not("latitude", "is", null)
      .not("longitude", "is", null)
      .gte("latitude", centerLat - latDelta)
      .lte("latitude", centerLat + latDelta)
      .gte("longitude", centerLon - lonDelta)
      .lte("longitude", centerLon + lonDelta)
      .in("role", ["sitter", "both"])
      .eq("identity_verified", true)
      .gte("profile_completion", 60)
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const p of data as Array<Record<string, unknown>>) {
      if (!p.email) continue;
      if (p.account_status && p.account_status !== "active") continue;
      if (p.id === ownerAny.id) continue;
      const d = haversineKm(
        centerLat,
        centerLon,
        Number(p.latitude),
        Number(p.longitude),
      );
      if (d <= radiusKm) {
        all.push({
          user_id: String(p.id),
          first_name: String(p.first_name ?? ""),
          city: String(p.city ?? ""),
          email: String(p.email).trim(),
          distance_km: Math.round(d * 10) / 10,
        });
      }
    }
    if (data.length < PAGE) break;
    from += PAGE;
  }

  // Opt-out product
  const ids = all.map((r) => r.user_id);
  const optedOut = new Set<string>();
  if (ids.length > 0) {
    const CHUNK = 500;
    for (let i = 0; i < ids.length; i += CHUNK) {
      const { data: prefs } = await serviceClient
        .from("email_preferences")
        .select("user_id, product_emails")
        .in("user_id", ids.slice(i, i + CHUNK));
      for (const p of (prefs || []) as Array<{ user_id: string; product_emails: boolean | null }>) {
        if (p.product_emails === false) optedOut.add(p.user_id);
      }
    }
  }

  // Suppressed
  const emailsLower = new Set(all.map((r) => r.email.toLowerCase()));
  const suppressed = new Set<string>();
  if (emailsLower.size > 0) {
    const list = [...emailsLower];
    const CHUNK = 500;
    for (let i = 0; i < list.length; i += CHUNK) {
      const { data: sups } = await serviceClient
        .from("suppressed_emails")
        .select("email")
        .in("email", list.slice(i, i + CHUNK));
      for (const s of (sups || []) as Array<{ email: string }>) {
        if (s.email) suppressed.add(String(s.email).toLowerCase());
      }
    }
  }

  const seenEmail = new Set<string>();
  const filtered: Recipient[] = [];
  for (const r of all.sort((a, b) => a.distance_km - b.distance_km)) {
    const key = r.email.toLowerCase();
    if (seenEmail.has(key)) continue;
    if (suppressed.has(key)) continue;
    if (optedOut.has(r.user_id)) continue;
    seenEmail.add(key);
    filtered.push(r);
  }

  return { sit, owner: ownerAny, recipients: filtered, centerLat, centerLon };
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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
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

    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: roleData } = await serviceClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await req.json();
    const mode: "preview" | "send" = payload.mode || "preview";
    const sitId: string = payload.sit_id;
    const radiusKm: number = Math.max(1, Math.min(200, Number(payload.radius_km) || 30));
    const subject: string = String(payload.subject ?? "").trim();
    const body: string = String(payload.body ?? "").trim();
    const signalId: string | null = payload.signal_id ?? null;

    if (!sitId) {
      return new Response(JSON.stringify({ error: "sit_id requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { sit, recipients } = await computeRecipients(serviceClient, sitId, radiusKm);
    const sitAny = sit as { id: string; title: string; city: string | null };
    const sitUrl = `https://guardiens.fr/annonces/${sitAny.id}`;
    const finalSubject = subject || "Une garde vient de s'ouvrir près de chez vous";

    if (mode === "preview") {
      const PREVIEW_LIMIT = 500;
      return new Response(
        JSON.stringify({
          count: recipients.length,
          sit: { id: sitAny.id, title: sitAny.title, city: sitAny.city },
          subject: finalSubject,
          recipients: recipients.slice(0, PREVIEW_LIMIT),
          truncated: recipients.length > PREVIEW_LIMIT,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");
    if (!body) {
      return new Response(JSON.stringify({ error: "Corps du message requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (recipients.length === 0) {
      return new Response(JSON.stringify({ error: "Aucun destinataire" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: campaign, error: campErr } = await serviceClient
      .from("mass_emails")
      .insert({
        segment: "proximity",
        filters: { sit_id: sitId, radius_km: radiusKm, source: "admin_signal" },
        subject: finalSubject,
        body,
        cta_label: "Voir l'annonce",
        cta_url: sitUrl,
        recipients_count: 0,
        status: "sending",
        sent_by: user.id,
      })
      .select("id")
      .single();
    if (campErr || !campaign) throw new Error(`Campaign row: ${campErr?.message}`);
    const campaignId = (campaign as { id: string }).id;

    let sent = 0;
    let errors = 0;

    const BATCH_SIZE = 100;
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);
      const emailObjects = batch.map((r) => ({
        from: "Guardiens <bonjour@guardiens.fr>",
        to: [r.email],
        subject: finalSubject,
        html: buildHtml({
          recipientFirstName: r.first_name,
          subject: finalSubject,
          bodyMarkdown: body,
          ctaLabel: "Voir l'annonce",
          ctaUrl: sitUrl,
        }),
      }));
      try {
        const resp = await fetch("https://api.resend.com/emails/batch", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(emailObjects),
        });
        if (!resp.ok) {
          errors += batch.length;
          console.error("[broadcast-sit] batch failed", await resp.text());
        } else {
          sent += batch.length;
        }
      } catch (e) {
        errors += batch.length;
        console.error("[broadcast-sit] batch exception", e);
      }
      const rows = batch.map((r) => ({
        mass_email_id: campaignId,
        recipient_email: r.email,
        status: "sent",
      }));
      await serviceClient.from("mass_email_sends").insert(rows);
    }

    await serviceClient
      .from("mass_emails")
      .update({
        recipients_count: sent,
        status: errors > 0 ? "partial" : "sent",
        completed_at: new Date().toISOString(),
      })
      .eq("id", campaignId);

    if (signalId) {
      await serviceClient
        .from("admin_signals")
        .update({
          resolved_at: new Date().toISOString(),
          action_taken: "broadcast_sent",
          admin_id: user.id,
        })
        .eq("id", signalId);
    }

    return new Response(
      JSON.stringify({ sent, errors, campaign_id: campaignId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[broadcast-sit-to-sitters]", err);
    return new Response(
      JSON.stringify({ error: String((err as Error)?.message ?? err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
