import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface MassEmailFilters {
  postal_prefix?: string;
  city?: string;
  abonnes_actifs?: boolean;
  id_verifiee?: boolean;
  onboarding_complete?: boolean;
  profile_completion_min?: number;
  profile_completion_max?: number;
  has_completed_sits?: "any" | "yes" | "no";
  inscrits_depuis_jours?: number;
  inscrits_avant_jours?: number;
  fondateur_only?: boolean;
  min_completed_sits?: number;
  no_signin_since_days?: number;
  no_application_ever?: boolean;
  no_sit_published_ever?: boolean;
  no_conversation_ever?: boolean;
  no_mission_ever?: boolean;
  respect_product_optout?: boolean;
  exclude_user_ids?: string[];
}


const UNSUB_TOKEN_PLACEHOLDER = "__UNSUB_TOKEN__";
const DEDUPE_WINDOW_MINUTES = 5;

// Generate a cryptographically random 32-byte hex token (aligned with send-transactional-email)
function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Empreinte stable pour anti double-envoi. Sérialisation JSON canonique
// (clés triées) puis SHA-256 hex.
function canonicalStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalStringify).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalStringify(obj[k])}`).join(",")}}`;
}

async function computeDedupeKey(input: {
  sent_by: string;
  segment: string;
  filters: unknown;
  subject: string;
  body: string;
  cta_label?: string | null;
  cta_url?: string | null;
}): Promise<string> {
  const canonical = canonicalStringify({
    sent_by: input.sent_by,
    segment: input.segment,
    filters: input.filters ?? {},
    subject: input.subject,
    body: input.body,
    cta_label: input.cta_label ?? null,
    cta_url: input.cta_url ?? null,
  });
  const bytes = new TextEncoder().encode(canonical);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function buildHtml(subject: string, body: string, ctaLabel?: string, ctaUrl?: string): string {
  // Brand : --primary 153 42% 30% ≈ #2C6E49 (vert forêt) ; --background ≈ #FAF9F6
  const ctaBlock = ctaLabel && ctaUrl
    ? `<tr><td align="center" style="padding:32px 0 8px">
<a href="${ctaUrl}" style="display:inline-block;padding:14px 32px;background-color:#2C6E49;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600;font-size:16px;box-shadow:0 4px 12px rgba(44,110,73,0.25)">${ctaLabel}</a>
</td></tr>
<tr><td align="center" style="padding:0 0 8px"><p style="margin:0;font-size:12px;color:#888">3 minutes, c'est tout.</p></td></tr>`
    : "";

  // Le lien de désinscription contient un placeholder remplacé par le token
  // propre à chaque destinataire avant l'envoi (RGPD + RFC 8058).
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
<h1 style="margin:0 0 20px;font-size:24px;line-height:1.3;color:#1a1a1a;font-weight:700">${subject}</h1>
<div style="margin:0;font-size:15px;line-height:1.75;color:#3a3a3a;white-space:pre-line">${body}</div>
</td></tr>
${ctaBlock}
<tr><td style="padding:24px 40px 32px"></td></tr>
<tr><td style="padding:20px 40px;border-top:1px solid #eee;background-color:#FAF9F6;text-align:center">
<p style="margin:0 0 6px;font-size:13px;color:#555;font-weight:600">Guardiens</p>
<p style="margin:0;font-size:12px;color:#888;line-height:1.6">L'entraide locale entre propriétaires et gardiens d'animaux.</p>
<p style="margin:14px 0 0;font-size:11px;color:#aaa">
<a href="https://guardiens.fr" style="color:#aaa;text-decoration:none">guardiens.fr</a>
&nbsp;·&nbsp;
<a href="https://guardiens.fr/unsubscribe?token=${UNSUB_TOKEN_PLACEHOLDER}" style="color:#aaa;text-decoration:underline">Se désinscrire</a>
</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

/**
 * Filtres RGPD/délivrabilité obligatoires, non désactivables :
 *   - exclusion des emails dans `suppressed_emails` (fail-closed)
 *   - exclusion des users avec `email_preferences.product_emails = false`
 * Throw si une requête échoue → l'appelant doit ABORTER l'envoi (500).
 */
async function applyMandatoryComplianceFilters(
  serviceClient: ReturnType<typeof createClient>,
  profiles: { id: string; email: string }[],
): Promise<{ id: string; email: string }[]> {
  if (profiles.length === 0) return profiles;

  const lowerEmails = Array.from(new Set(profiles.map((p) => p.email.toLowerCase())));
  const userIds = Array.from(new Set(profiles.map((p) => p.id)));
  const CHUNK = 500;

  // 1. Suppression list — fail-closed
  const suppressedSet = new Set<string>();
  for (let i = 0; i < lowerEmails.length; i += CHUNK) {
    const chunk = lowerEmails.slice(i, i + CHUNK);
    const { data, error } = await serviceClient
      .from("suppressed_emails")
      .select("email")
      .in("email", chunk);
    if (error) throw new Error(`Suppression check failed: ${error.message}`);
    for (const row of (data || []) as any[]) {
      if (row.email) suppressedSet.add(String(row.email).toLowerCase());
    }
  }

  // 2. Opt-out produit (obligatoire pour les campagnes de masse — catégorie 'product')
  const optedOutIds = new Set<string>();
  for (let i = 0; i < userIds.length; i += CHUNK) {
    const chunk = userIds.slice(i, i + CHUNK);
    const { data, error } = await serviceClient
      .from("email_preferences")
      .select("user_id")
      .eq("product_emails", false)
      .in("user_id", chunk);
    if (error) throw new Error(`Product opt-out check failed: ${error.message}`);
    for (const row of (data || []) as any[]) {
      if (row.user_id) optedOutIds.add(row.user_id);
    }
  }

  return profiles.filter(
    (p) => !suppressedSet.has(p.email.toLowerCase()) && !optedOutIds.has(p.id),
  );
}

/**
 * Récupère ou crée les tokens de désinscription (une ligne par email).
 * Retourne une map lowerEmail → token. Throw si une requête échoue.
 */
async function ensureUnsubscribeTokens(
  serviceClient: ReturnType<typeof createClient>,
  emails: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const lowerEmails = Array.from(new Set(emails.map((e) => e.toLowerCase())));
  if (lowerEmails.length === 0) return map;

  const CHUNK = 500;

  for (let i = 0; i < lowerEmails.length; i += CHUNK) {
    const chunk = lowerEmails.slice(i, i + CHUNK);
    const { data, error } = await serviceClient
      .from("email_unsubscribe_tokens")
      .select("email, token")
      .in("email", chunk);
    if (error) throw new Error(`Token lookup failed: ${error.message}`);
    for (const row of (data || []) as any[]) {
      if (row.email && row.token) map.set(String(row.email).toLowerCase(), row.token);
    }
  }

  const missing = lowerEmails.filter((e) => !map.has(e));
  if (missing.length > 0) {
    const rows = missing.map((email) => ({ email, token: generateToken() }));
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK);
      const { error } = await serviceClient
        .from("email_unsubscribe_tokens")
        .upsert(chunk, { onConflict: "email", ignoreDuplicates: true });
      if (error) throw new Error(`Token upsert failed: ${error.message}`);
    }
    // Re-read pour récupérer le token effectif (gère les races concurrentes)
    for (let i = 0; i < missing.length; i += CHUNK) {
      const chunk = missing.slice(i, i + CHUNK);
      const { data, error } = await serviceClient
        .from("email_unsubscribe_tokens")
        .select("email, token")
        .in("email", chunk);
      if (error) throw new Error(`Token re-read failed: ${error.message}`);
      for (const row of (data || []) as any[]) {
        if (row.email && row.token) map.set(String(row.email).toLowerCase(), row.token);
      }
    }
  }

  return map;
}

/**
 * Applique tous les filtres et retourne la liste de profils correspondants {id, email}.
 * Logique côté serveur — utilise le service-role client.
 */
async function fetchTargetedProfiles(
  serviceClient: ReturnType<typeof createClient>,
  segment: string,
  filters: MassEmailFilters,
): Promise<{ id: string; email: string }[]> {
  let query = serviceClient
    .from("profiles")
    .select("id, email, postal_code, city, identity_verified, profile_completion, completed_sits_count, is_founder, created_at, role");

  // Segment
  if (segment === "gardiens") query = query.in("role", ["sitter", "both"]);
  else if (segment === "proprios") query = query.in("role", ["owner", "both"]);
  else if (segment === "fondateurs") query = query.eq("is_founder", true);

  // Géo
  if (filters.postal_prefix) {
    query = query.like("postal_code", `${filters.postal_prefix}%`);
  }
  if (filters.city) {
    query = query.ilike("city", `%${filters.city}%`);
  }

  // ID vérifiée
  if (filters.id_verifiee) query = query.eq("identity_verified", true);

  // Complétion min
  if (filters.profile_completion_min && filters.profile_completion_min > 0) {
    query = query.gte("profile_completion", filters.profile_completion_min);
  }

  // Complétion max — cibler profils peu remplis
  if (filters.profile_completion_max !== undefined && filters.profile_completion_max < 100) {
    query = query.lte("profile_completion", filters.profile_completion_max);
  }

  // Onboarding complete (≥ 80%)
  if (filters.onboarding_complete) query = query.gte("profile_completion", 80);

  // Fondateur
  if (filters.fondateur_only) query = query.eq("is_founder", true);

  // Min completed sits
  if (filters.min_completed_sits && filters.min_completed_sits > 0) {
    query = query.gte("completed_sits_count", filters.min_completed_sits);
  }

  // Cycle de vie : inscrits depuis < N jours (nouveaux)
  if (filters.inscrits_depuis_jours && filters.inscrits_depuis_jours > 0) {
    const since = new Date(Date.now() - filters.inscrits_depuis_jours * 86400000).toISOString();
    query = query.gte("created_at", since);
  }
  // Cycle de vie : inscrits avant > N jours (anciens)
  if (filters.inscrits_avant_jours && filters.inscrits_avant_jours > 0) {
    const before = new Date(Date.now() - filters.inscrits_avant_jours * 86400000).toISOString();
    query = query.lte("created_at", before);
  }

  // has_completed_sits
  if (filters.has_completed_sits === "yes") {
    query = query.gt("completed_sits_count", 0);
  } else if (filters.has_completed_sits === "no") {
    query = query.or("completed_sits_count.is.null,completed_sits_count.eq.0");
  }

  // Pagination — Supabase limite à 1000 par défaut, on récupère tout
  const all: { id: string; email: string }[] = [];
  const PAGE = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await query.range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const p of data as any[]) {
      if (p.email) all.push({ id: p.id, email: p.email });
    }
    if (data.length < PAGE) break;
    from += PAGE;
  }

  // Filtre abonnés actifs (cross-table)
  let result = all;
  if (filters.abonnes_actifs) {
    const { data: subs } = await serviceClient
      .from("subscriptions")
      .select("user_id")
      .in("status", ["active", "trial"]);
    const activeIds = new Set((subs || []).map((s: any) => s.user_id));
    result = result.filter((p) => activeIds.has(p.id));
  }

  // === Filtres dormants/inactifs (cross-table) ===

  // Aucune candidature jamais envoyée
  if (filters.no_application_ever) {
    const { data: appSitters } = await serviceClient
      .from("applications")
      .select("sitter_id");
    const withApp = new Set((appSitters || []).map((a: any) => a.sitter_id));
    result = result.filter((p) => !withApp.has(p.id));
  }

  // Aucune annonce jamais publiée
  if (filters.no_sit_published_ever) {
    const { data: sitOwners } = await serviceClient
      .from("sits")
      .select("user_id");
    const withSit = new Set((sitOwners || []).map((s: any) => s.user_id));
    result = result.filter((p) => !withSit.has(p.id));
  }

  // Aucune conversation jamais (ni owner ni sitter)
  if (filters.no_conversation_ever) {
    const { data: convs } = await serviceClient
      .from("conversations")
      .select("owner_id, sitter_id");
    const withConv = new Set<string>();
    for (const c of (convs || []) as any[]) {
      if (c.owner_id) withConv.add(c.owner_id);
      if (c.sitter_id) withConv.add(c.sitter_id);
    }
    result = result.filter((p) => !withConv.has(p.id));
  }

  // Pas connecté depuis N jours (auth.users via admin API)
  if (filters.no_signin_since_days && filters.no_signin_since_days > 0) {
    const cutoff = Date.now() - filters.no_signin_since_days * 86400000;
    // listUsers paginé — on récupère tout
    const inactiveIds = new Set<string>();
    let page = 1;
    const perPage = 1000;
    while (true) {
      const { data: usersPage, error: uErr } = await (serviceClient.auth as any).admin.listUsers({
        page, perPage,
      });
      if (uErr) {
        console.error("listUsers error:", uErr);
        break;
      }
      const users = usersPage?.users || [];
      for (const u of users) {
        const lastSignIn = u.last_sign_in_at ? new Date(u.last_sign_in_at).getTime() : null;
        // Inactif si jamais connecté OU dernière connexion antérieure au cutoff
        if (lastSignIn === null || lastSignIn < cutoff) {
          inactiveIds.add(u.id);
        }
      }
      if (users.length < perPage) break;
      page++;
      if (page > 50) break; // garde-fou : max 50k users
    }
    result = result.filter((p) => inactiveIds.has(p.id));
  }

  // Aucune petite mission (coup de main) publiée
  if (filters.no_mission_ever) {
    const { data: missionAuthors } = await serviceClient
      .from("small_missions")
      .select("user_id");
    const withMission = new Set((missionAuthors || []).map((m: any) => m.user_id));
    result = result.filter((p) => !withMission.has(p.id));
  }

  // Respect opt-out catégorie "product" (conseils / accompagnement)
  if (filters.respect_product_optout) {
    const { data: optOuts } = await serviceClient
      .from("email_preferences")
      .select("user_id")
      .eq("product_emails", false);
    const optedOut = new Set((optOuts || []).map((p: any) => p.user_id));
    result = result.filter((p) => !optedOut.has(p.id));
  }



  // Exclusion explicite par user_id (ex: ne pas envoyer au propriétaire d'une annonce mise en avant)
  if (filters.exclude_user_ids && filters.exclude_user_ids.length > 0) {
    const excluded = new Set(filters.exclude_user_ids);
    result = result.filter((p) => !excluded.has(p.id));
  }

  return result;
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

    // Auth
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

    const payload = await req.json();
    const mode: "count" | "send" = payload.mode || "send";
    const segment: string = payload.segment || "tous";
    const filters: MassEmailFilters = payload.filters || {};

    // Mode COUNT — estimation réelle : applique aussi les filtres obligatoires
    // (suppression list + opt-out produit) pour ne pas surestimer.
    if (mode === "count") {
      const profiles = await fetchTargetedProfiles(serviceClient, segment, filters);
      let compliant: { id: string; email: string }[];
      try {
        compliant = await applyMandatoryComplianceFilters(serviceClient, profiles);
      } catch (e) {
        console.error("Compliance filter failed in count mode:", e);
        return new Response(JSON.stringify({ error: "Failed to verify compliance filters" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const uniqueEmails = new Set(compliant.map((p) => p.email));
      return new Response(JSON.stringify({ count: uniqueEmails.size }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mode SEND
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");
    const { subject, body, cta_label, cta_url } = payload;
    if (!subject || !body) {
      return new Response(JSON.stringify({ error: "Missing subject/body" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawProfiles = await fetchTargetedProfiles(serviceClient, segment, filters);

    // Filtres RGPD/délivrabilité obligatoires (non désactivables) —
    // fail-closed : si la vérif échoue, on n'envoie RIEN.
    let profiles: { id: string; email: string }[];
    try {
      profiles = await applyMandatoryComplianceFilters(serviceClient, rawProfiles);
    } catch (e) {
      console.error("Compliance filter failed — aborting send:", e);
      return new Response(JSON.stringify({ error: "Failed to verify compliance filters" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const recipients = [...new Set(profiles.map((p) => p.email))];

    if (recipients.length === 0) {
      return new Response(JSON.stringify({ error: "No recipients found" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === Anti double-envoi (fingerprint) =====================================
    // Empêche double-clic / rejeu sur timeout : si une campagne équivalente
    // (même auteur + segment + filtres + contenu) a été créée dans les 5
    // dernières minutes, on la RÉUTILISE au lieu d'en créer une nouvelle.
    const dedupeKey = await computeDedupeKey({
      sent_by: userId,
      segment,
      filters,
      subject,
      body,
      cta_label,
      cta_url,
    });
    const dedupeCutoff = new Date(Date.now() - DEDUPE_WINDOW_MINUTES * 60_000).toISOString();

    let campaignId: string;
    let resumed = false;
    {
      const { data: existing, error: exErr } = await serviceClient
        .from("mass_emails")
        .select("id, status")
        .eq("dedupe_key", dedupeKey)
        .gte("created_at", dedupeCutoff)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (exErr) throw new Error(`Dedupe lookup failed: ${exErr.message}`);

      if (existing?.id) {
        campaignId = existing.id as string;
        resumed = true;
        // Reprend le verrou / heartbeat pour indiquer qu'un envoi est en cours
        await serviceClient
          .from("mass_emails")
          .update({ status: "sending", locked_at: new Date().toISOString(), heartbeat_at: new Date().toISOString() })
          .eq("id", campaignId);
      } else {
        const nowIso = new Date().toISOString();
        const { data: campaign, error: campErr } = await serviceClient
          .from("mass_emails")
          .insert({
            segment,
            filters: filters as any,
            subject,
            body,
            cta_label: cta_label || null,
            cta_url: cta_url || null,
            recipients_count: 0, // sera mis à jour après envoi
            status: "sending",
            sent_by: userId,
            dedupe_key: dedupeKey,
            locked_at: nowIso,
            heartbeat_at: nowIso,
          })
          .select("id")
          .single();
        if (campErr || !campaign) {
          throw new Error(`Failed to create campaign row: ${campErr?.message}`);
        }
        campaignId = campaign.id as string;
      }
    }

    // === Reprise : exclure les destinataires déjà envoyés pour cette campagne
    let remainingRecipients = recipients;
    if (resumed) {
      const alreadySent = new Set<string>();
      const LOOK_CHUNK = 500;
      for (let i = 0; i < recipients.length; i += LOOK_CHUNK) {
        const chunk = recipients.slice(i, i + LOOK_CHUNK);
        const { data, error } = await serviceClient
          .from("mass_email_sends")
          .select("recipient_email")
          .eq("mass_email_id", campaignId)
          .eq("status", "sent")
          .in("recipient_email", chunk);
        if (error) throw new Error(`Resume lookup failed: ${error.message}`);
        for (const row of (data || []) as any[]) {
          if (row.recipient_email) alreadySent.add(row.recipient_email);
        }
      }
      remainingRecipients = recipients.filter((e) => !alreadySent.has(e));
      if (remainingRecipients.length === 0) {
        await serviceClient
          .from("mass_emails")
          .update({
            status: "sent",
            heartbeat_at: new Date().toISOString(),
          })
          .eq("id", campaignId);
        return new Response(
          JSON.stringify({ sent: 0, errors: 0, resumed: true, campaign_id: campaignId, note: "already delivered" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // Tokens de désinscription par destinataire (RGPD + List-Unsubscribe)
    let tokenMap: Map<string, string>;
    try {
      tokenMap = await ensureUnsubscribeTokens(serviceClient, remainingRecipients);
    } catch (e) {
      console.error("Unsubscribe token provisioning failed — aborting send:", e);
      return new Response(JSON.stringify({ error: "Failed to prepare unsubscribe tokens" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === FLAG : bascule enqueue-only ========================================
    // Défaut = false = ancien chemin synchrone Resend inchangé (Phase 1).
    // Toggle : UPDATE public.email_send_state SET mass_email_use_queue = true WHERE id = 1;
    let useQueue = false;
    {
      const { data: state } = await serviceClient
        .from("email_send_state")
        .select("mass_email_use_queue")
        .eq("id", 1)
        .maybeSingle();
      useQueue = !!(state as { mass_email_use_queue?: boolean } | null)?.mass_email_use_queue;
    }

    if (useQueue) {
      // Chemin queue : insère lignes `queued`, pousse 1 message pgmq / destinataire,
      // renvoie immédiatement. Le worker `process-mass-email-queue` fera l'envoi.
      const queuedRows = remainingRecipients.map((email) => ({
        mass_email_id: campaignId,
        recipient_email: email,
        resend_id: null as string | null,
        status: "queued",
        error_message: null as string | null,
      }));
      const INS_CHUNK = 500;
      for (let i = 0; i < queuedRows.length; i += INS_CHUNK) {
        const chunk = queuedRows.slice(i, i + INS_CHUNK);
        const { error } = await serviceClient
          .from("mass_email_sends")
          .upsert(chunk, {
            onConflict: "mass_email_id,recipient_email",
            ignoreDuplicates: true,
          });
        if (error) console.error(`queued upsert error (chunk ${i}):`, error);
      }

      let enqueued = 0;
      for (const email of remainingRecipients) {
        const { error } = await serviceClient.rpc("enqueue_email", {
          queue_name: "mass_emails",
          payload: { campaign_id: campaignId, recipient_email: email } as any,
        });
        if (error) {
          console.error("enqueue_email failed:", error, { email });
        } else {
          enqueued++;
        }
      }

      await serviceClient
        .from("mass_emails")
        .update({
          status: "sending",
          enqueued_count: enqueued,
          heartbeat_at: new Date().toISOString(),
        })
        .eq("id", campaignId);

      return new Response(
        JSON.stringify({ queued: enqueued, campaign_id: campaignId, mode: "queue", resumed }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const htmlTemplate = buildHtml(subject, body, cta_label, cta_url);
    let sent = 0;
    let errors = 0;
    const BATCH_SIZE = 100;

    // Un objet email par destinataire : lien de désinscription + headers
    // List-Unsubscribe (RFC 8058, one-click) personnalisés au token.
    const unsubApiBase = `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe`;
    const emailObjects = remainingRecipients.map((email) => {
      const token = tokenMap.get(email.toLowerCase()) ?? "";
      const oneClick = `${unsubApiBase}?token=${token}`;
      const uiUrl = `https://guardiens.fr/unsubscribe?token=${token}`;
      const personalizedHtml = htmlTemplate.replaceAll(UNSUB_TOKEN_PLACEHOLDER, token);
      return {
        from: "Guardiens <bonjour@guardiens.fr>",
        to: [email],
        subject,
        html: personalizedHtml,
        tracking: { opens: true, clicks: true },
        tags: [{ name: "campaign_id", value: campaignId }],
        headers: {
          "List-Unsubscribe": `<${oneClick}>, <${uiUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      };
    });

    let cancelled = false;
    for (let i = 0; i < emailObjects.length; i += BATCH_SIZE) {
      // Relit le statut avant chaque batch : si un admin a cliqué « Annuler »
      // via cancel-mass-email (UPDATE status='cancelled'), on stoppe la boucle
      // pour ne pas continuer à envoyer les batches restants.
      const { data: statusRow } = await serviceClient
        .from("mass_emails")
        .select("status")
        .eq("id", campaignId)
        .maybeSingle();
      if (statusRow?.status === "cancelled") {
        console.log(`send-mass-email: campaign ${campaignId} cancelled, stopping at batch ${i}`);
        cancelled = true;
        break;
      }
      const batch = emailObjects.slice(i, i + BATCH_SIZE);
      const batchEmails = remainingRecipients.slice(i, i + BATCH_SIZE);
      const batchRows: Array<{
        mass_email_id: string;
        recipient_email: string;
        resend_id: string | null;
        status: string;
        error_message: string | null;
      }> = [];

      try {
        const res = await fetch("https://api.resend.com/emails/batch", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify(batch),
        });
        const resBody = await res.text();
        if (res.ok) {
          sent += batch.length;
          // Parse la réponse — Resend renvoie { data: [{ id }, ...] } dans l'ordre d'envoi
          let ids: string[] = [];
          try {
            const parsed = JSON.parse(resBody);
            ids = (parsed?.data || []).map((d: any) => d?.id || null);
          } catch {
            // pas grave, on stocke sans id
          }
          batchEmails.forEach((email, idx) => {
            batchRows.push({
              mass_email_id: campaignId,
              recipient_email: email,
              resend_id: ids[idx] || null,
              status: "sent",
              error_message: null,
            });
          });
        } else {
          console.error(`Batch failed (${i}): ${res.status} ${resBody}`);
          errors += batch.length;
          batchEmails.forEach((email) => {
            batchRows.push({
              mass_email_id: campaignId,
              recipient_email: email,
              resend_id: null,
              status: "failed",
              error_message: `${res.status}: ${resBody.slice(0, 200)}`,
            });
          });
        }
      } catch (e) {
        console.error(`Batch error (${i}):`, e);
        errors += batch.length;
        batchEmails.forEach((email) => {
          batchRows.push({
            mass_email_id: campaignId,
            recipient_email: email,
            resend_id: null,
            status: "failed",
            error_message: String(e).slice(0, 200),
          });
        });
      }

      // Upsert idempotent : (mass_email_id, recipient_email) est UNIQUE.
      // ignoreDuplicates → si une ligne existe déjà pour ce destinataire
      // (rejeu, race avec un autre run), on ne l'écrase pas.
      if (batchRows.length > 0) {
        const { error: insErr } = await serviceClient
          .from("mass_email_sends")
          .upsert(batchRows, {
            onConflict: "mass_email_id,recipient_email",
            ignoreDuplicates: true,
          });
        if (insErr) console.error(`mass_email_sends upsert error (chunk ${i}):`, insErr);
      }

      // Heartbeat à chaque lot (le watchdog considère silence > 5 min)
      await serviceClient
        .from("mass_emails")
        .update({ heartbeat_at: new Date().toISOString() })
        .eq("id", campaignId);

      if (i + BATCH_SIZE < emailObjects.length) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    // Recompte le nombre total d'envois « sent » (couvre la reprise + l'existant)
    const { count: sentTotal } = await serviceClient
      .from("mass_email_sends")
      .select("id", { count: "exact", head: true })
      .eq("mass_email_id", campaignId)
      .eq("status", "sent");

    // Met à jour la campagne avec le compte final — sans écraser un statut
    // 'cancelled' posé par cancel-mass-email pendant la boucle.
    await serviceClient
      .from("mass_emails")
      .update({
        recipients_count: sentTotal ?? sent,
        status: cancelled ? "cancelled" : (errors > 0 && sent === 0 ? "error" : "sent"),
        heartbeat_at: new Date().toISOString(),
      })
      .eq("id", campaignId)
      .neq("status", "cancelled");

    return new Response(JSON.stringify({ sent, errors, resumed, cancelled, campaign_id: campaignId }), {
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
