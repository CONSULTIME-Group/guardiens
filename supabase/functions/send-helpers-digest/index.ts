// send-helpers-digest
// Email hebdomadaire (lundi) "Membres disponibles pour aider"
// - Rayon FIXE: 25 km (cf. demande produit)
// - Inclut uniquement les profils ayant au moins une compétence SPÉCIFIQUE (custom_skills non vide)
//   -> on exclut les profils "généralistes" qui n'ont coché que des catégories
// - Inclut uniquement les NOUVEAUX profils (créés depuis le dernier envoi, par défaut 7 jours)
// - Si aucun nouveau profil dans la zone -> AUCUN email envoyé
//
// Modes:
//   GET/POST sans param  -> exécution de production: tous les utilisateurs avec autour_de_vous=true
//   ?test=true&user_id=<uuid>  -> envoi de test uniquement pour cet utilisateur, fenêtre élargie à 90j
//
// Cette fonction est volontairement isolée de send-alert-digest qui gère les annonces (gardes/missions).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const RADIUS_KM = 25;
const PROD_WINDOW_DAYS = 7;
const TEST_WINDOW_DAYS = 90;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const isTest = url.searchParams.get("test") === "true";
    const testUserId = url.searchParams.get("user_id");

    if (isTest && !testUserId) {
      return json({ error: "user_id requis en mode test" }, 400);
    }

    const sinceDays = isTest ? TEST_WINDOW_DAYS : PROD_WINDOW_DAYS;
    const since = new Date();
    since.setDate(since.getDate() - sinceDays);
    const sinceISO = since.toISOString();

    // 1) Sélection des bénéficiaires (utilisateurs ayant activé "Autour de vous")
    let recipientsQuery = supabase
      .from("profiles")
      .select("id, first_name, email, city, postal_code, email_preferences");

    if (isTest) {
      recipientsQuery = recipientsQuery.eq("id", testUserId!);
    } else {
      // En prod on lit la préférence dans email_preferences->>autour_de_vous
      recipientsQuery = recipientsQuery.contains("email_preferences", { autour_de_vous: true });
    }

    const { data: recipients, error: recipientsError } = await recipientsQuery;
    if (recipientsError) throw recipientsError;
    if (!recipients || recipients.length === 0) {
      return json({ sent: 0, skipped: 0, reason: "Aucun destinataire" });
    }

    // Pré-charger les compétences validées (status='approved') pour ne déclencher
    // que sur des compétences réellement reconnues par la modération.
    const { data: approvedSkills, error: skillsErr } = await supabase
      .from("skills_library")
      .select("label, normalized_label")
      .eq("status", "approved");
    if (skillsErr) throw skillsErr;

    const approvedSet = new Set<string>(
      (approvedSkills || [])
        .map((s: any) => (s.normalized_label || s.label || "").toString().trim().toLowerCase())
        .filter((s: string) => s.length > 0),
    );

    const normalizeSkill = (s: unknown): string =>
      typeof s === "string" ? s.trim().toLowerCase().replace(/\s+/g, " ") : "";

    let sent = 0;
    let skipped = 0;
    const details: any[] = [];

    for (const r of recipients) {
      if (!r.email) { skipped++; details.push({ user: r.id, reason: "no_email" }); continue; }

      // 2) Centre géographique = première alerte rayon, sinon ville profil
      const { data: alert } = await supabase
        .from("alert_preferences")
        .select("city, zone_type, radius_km")
        .eq("user_id", r.id)
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const centerCity = alert?.city || r.city;
      if (!centerCity) { skipped++; details.push({ user: r.id, reason: "no_city" }); continue; }

      const { data: geo } = await supabase
        .from("geocode_cache")
        .select("lat, lng")
        .eq("normalized_name", centerCity.toLowerCase().trim())
        .maybeSingle();

      if (!geo) { skipped++; details.push({ user: r.id, reason: "geocode_miss", city: centerCity }); continue; }

      // 3) Recherche des nouveaux helpers avec compétence spécifique
      // On récupère un peu large puis on filtre côté serveur (pas de PostGIS ici)
      const { data: candidates } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, avatar_url, city, postal_code, custom_skills, skill_categories, created_at")
        .neq("id", r.id)
        .gte("created_at", sinceISO)
        .not("custom_skills", "is", null);

      const helpers: any[] = [];
      for (const c of candidates || []) {
        // Filtre compétence spécifique :
        // - chaque entrée custom_skills doit être une string non vide après trim
        // - elle doit correspondre à une compétence VALIDÉE (status='approved') dans skills_library
        const rawSkills = Array.isArray(c.custom_skills) ? c.custom_skills : [];
        const skills = rawSkills.filter((s: any) => {
          const norm = normalizeSkill(s);
          return norm.length > 0 && approvedSet.has(norm);
        });
        if (skills.length === 0) continue;

        if (!c.city) continue;
        const { data: cgeo } = await supabase
          .from("geocode_cache")
          .select("lat, lng")
          .eq("normalized_name", c.city.toLowerCase().trim())
          .maybeSingle();
        if (!cgeo) continue;

        const dist = haversine(geo.lat, geo.lng, cgeo.lat, cgeo.lng);
        if (dist <= RADIUS_KM) {
          helpers.push({ ...c, _skills: skills, _distance_km: Math.round(dist) });
        }
      }

      // 4) Aucun nouveau -> pas d'email
      if (helpers.length === 0) {
        skipped++;
        details.push({ user: r.id, reason: "no_new_helpers", center: centerCity });
        continue;
      }

      helpers.sort((a, b) => a._distance_km - b._distance_km);

      const html = buildEmail(r.first_name || "", centerCity, helpers.slice(0, 12), isTest);
      const subject = `${helpers.length} membre${helpers.length > 1 ? "s" : ""} disponible${helpers.length > 1 ? "s" : ""} pour aider près de ${centerCity}`;

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Guardiens <bonjour@guardiens.fr>",
          to: r.email,
          subject: isTest ? `[TEST] ${subject}` : subject,
          html,
        }),
      });

      if (res.ok) {
        sent++;
        details.push({ user: r.id, email: r.email, helpers: helpers.length, center: centerCity });
      } else {
        skipped++;
        const body = await res.text();
        details.push({ user: r.id, reason: "resend_error", status: res.status, body: body.slice(0, 200) });
      }
    }

    return json({ sent, skipped, mode: isTest ? "test" : "prod", radius_km: RADIUS_KM, window_days: sinceDays, details });
  } catch (err) {
    console.error("send-helpers-digest error", err);
    return json({ error: String(err) }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function buildEmail(firstName: string, centerCity: string, helpers: any[], isTest: boolean): string {
  const cards = helpers.map((h) => {
    const name = escapeHtml([h.first_name, h.last_name?.[0] ? h.last_name[0] + "." : ""].filter(Boolean).join(" ") || "Un membre");
    const city = escapeHtml(h.city || "");
    const skillsList = h._skills.slice(0, 4).map((s: string) => `<span style="display:inline-block;background:#f3f1ec;color:#1A3C34;font-size:12px;padding:4px 10px;border-radius:999px;margin:2px 4px 2px 0;">${escapeHtml(s.length > 60 ? s.slice(0, 57) + "…" : s)}</span>`).join("");
    const avatar = h.avatar_url
      ? `<img src="${escapeHtml(h.avatar_url)}" width="56" height="56" alt="" style="display:block;width:56px;height:56px;border-radius:50%;object-fit:cover;border:0;" />`
      : `<div style="width:56px;height:56px;border-radius:50%;background:#e8e3d6;color:#1A3C34;font-weight:700;display:inline-block;text-align:center;line-height:56px;font-size:20px;">${escapeHtml((h.first_name || "?")[0].toUpperCase())}</div>`;

    return `
    <tr><td style="padding:14px 0;border-bottom:1px solid #f0ece4;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td width="56" valign="top" style="padding-right:14px;">${avatar}</td>
          <td valign="top">
            <a href="https://guardiens.fr/gardiens/${h.id}" style="text-decoration:none;color:#1A3C34;font-weight:600;font-size:15px;">${name}</a>
            <div style="color:#6b7280;font-size:13px;margin-top:2px;">${city} · à ${h._distance_km} km</div>
            <div style="margin-top:8px;">${skillsList}</div>
          </td>
        </tr>
      </table>
    </td></tr>`;
  }).join("");

  const testBanner = isTest ? `<div style="background:#fef3c7;color:#92400e;padding:10px 16px;font-size:13px;text-align:center;">Aperçu de test — fenêtre élargie à 90 jours pour vous montrer un exemple représentatif.</div>` : "";

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background-color:#FAF9F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
${testBanner}
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAF9F6;padding:32px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;">
  <tr><td style="padding:32px 40px 16px;text-align:center;background-color:#FAF9F6;">
    <img src="https://guardiens.fr/logo.png" alt="Guardiens" width="140" style="display:block;margin:0 auto;"/>
    <h1 style="margin:18px 0 4px;font-size:22px;color:#1A3C34;font-weight:700;">Membres disponibles pour aider</h1>
    <p style="margin:0;color:#6b7280;font-size:14px;">Près de ${escapeHtml(centerCity)} · dans un rayon de ${RADIUS_KM} km</p>
  </td></tr>
  <tr><td style="padding:24px 40px;">
    <p style="margin:0 0 18px;font-size:15px;color:#333;">Bonjour ${escapeHtml(firstName)},</p>
    <p style="margin:0 0 20px;font-size:15px;color:#333;line-height:1.6;">
      Voici les nouveaux membres qui ont rejoint la plateforme près de chez vous et qui ont déclaré des compétences précises.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0">${cards}</table>
    <div style="text-align:center;margin-top:28px;">
      <a href="https://guardiens.fr/search" style="display:inline-block;padding:12px 28px;background-color:#1A3C34;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">Voir tous les membres</a>
    </div>
  </td></tr>
  <tr><td style="padding:20px 40px;border-top:1px solid #e5e5e5;text-align:center;">
    <p style="margin:0;font-size:12px;color:#9ca3af;">Vous recevez cet email car vous avez activé « Autour de vous » dans vos paramètres.</p>
    <p style="margin:6px 0 0;font-size:12px;"><a href="https://guardiens.fr/settings" style="color:#9ca3af;">Gérer mes préférences</a></p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}
