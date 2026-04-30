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
  exclude_user_ids?: string[];
}

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

    // Mode COUNT — estimation rapide, pas d'envoi
    if (mode === "count") {
      const profiles = await fetchTargetedProfiles(serviceClient, segment, filters);
      const uniqueEmails = new Set(profiles.map((p) => p.email));
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

    const profiles = await fetchTargetedProfiles(serviceClient, segment, filters);
    const recipients = [...new Set(profiles.map((p) => p.email))];

    if (recipients.length === 0) {
      return new Response(JSON.stringify({ error: "No recipients found" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const html = buildHtml(subject, body, cta_label, cta_url);
    let sent = 0;
    let errors = 0;
    const BATCH_SIZE = 100;

    const emailObjects = recipients.map((email) => ({
      from: "Guardiens <bonjour@guardiens.fr>",
      to: [email],
      subject,
      html,
    }));

    for (let i = 0; i < emailObjects.length; i += BATCH_SIZE) {
      const batch = emailObjects.slice(i, i + BATCH_SIZE);
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
        } else {
          console.error(`Batch failed (${i}): ${res.status} ${resBody}`);
          errors += batch.length;
        }
      } catch (e) {
        console.error(`Batch error (${i}):`, e);
        errors += batch.length;
      }
      if (i + BATCH_SIZE < emailObjects.length) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    await serviceClient.from("mass_emails").insert({
      segment,
      filters: filters as any,
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
