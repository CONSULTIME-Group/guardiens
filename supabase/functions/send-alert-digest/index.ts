import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const AURA_DEPARTMENTS = [
  "01","03","07","15","26","38","42","43","63","69","73","74"
];

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

Deno.serve(async (req) => {
  try {
    const now = new Date();
    const currentHour = now.getUTCHours() + 2; // Europe/Paris (+2 été)
    const currentHourStr = `${String(currentHour).padStart(2, "0")}:00`;
    const dayOfWeek = now.getDay(); // 0=dim, 1=lun

    // 1. Récupérer toutes les préférences actives correspondant à l'heure
    const { data: prefs, error: prefsError } = await supabase
      .from("alert_preferences")
      .select(`
        *,
        profiles:user_id (
          id, first_name, email, city, postal_code, role
        )
      `)
      .eq("active", true)
      .eq("heure_envoi", currentHourStr);

    if (prefsError) throw prefsError;
    if (!prefs || prefs.length === 0) {
      return new Response("Aucune préférence à traiter", { status: 200 });
    }

    const since = new Date();
    since.setHours(since.getHours() - 24);
    const sinceISO = since.toISOString();

    let sent = 0;
    let skipped = 0;

    for (const pref of prefs) {
      const profile = pref.profiles;
      if (!profile?.email) { skipped++; continue; }

      // Fréquence hebdo : envoyer uniquement le lundi
      if (pref.frequence === "hebdo" && dayOfWeek !== 1) { skipped++; continue; }

      // Résoudre les coordonnées de la zone d'alerte
      let alertLat: number | null = null;
      let alertLng: number | null = null;

      if (pref.zone_type === "rayon") {
        const cityToResolve = pref.city || profile.city;
        if (!cityToResolve) { skipped++; continue; }

        const { data: geo } = await supabase
          .from("geocode_cache")
          .select("lat, lng")
          .eq("normalized_name", cityToResolve.toLowerCase().trim())
          .maybeSingle();

        if (!geo) { skipped++; continue; }
        alertLat = geo.lat;
        alertLng = geo.lng;
      }

      const alertTypes = pref.alert_types as string[];
      let sits: any[] = [];
      let missions: any[] = [];

      // 2a. Fetch sits dans la zone
      if (alertTypes.includes("gardes")) {
        const sitsQuery = supabase
          .from("sits")
          .select(`
            id, title, start_date, end_date, is_urgent,
            profiles:user_id (city, postal_code)
          `)
          .eq("status", "published")
          .gte("created_at", sinceISO)
          .limit(10);

        const { data: rawSits } = await sitsQuery;

        if (rawSits) {
          for (const sit of rawSits) {
            const sitCity = (sit.profiles as any)?.city;
            if (!sitCity) continue;

            if (pref.zone_type === "rayon" && alertLat && alertLng) {
              const { data: geo } = await supabase
                .from("geocode_cache")
                .select("lat, lng")
                .eq("normalized_name", sitCity.toLowerCase().trim())
                .maybeSingle();

              if (!geo) continue;
              const dist = haversine(alertLat, alertLng, geo.lat, geo.lng);
              if (dist <= pref.radius_km) sits.push(sit);

            } else if (pref.zone_type === "departement" && pref.departement) {
              const pc = (sit.profiles as any)?.postal_code || "";
              if (pc.startsWith(pref.departement)) sits.push(sit);

            } else if (pref.zone_type === "region" && pref.region_code === "ARA") {
              const pc = (sit.profiles as any)?.postal_code || "";
              const dept = pc.substring(0, 2);
              if (AURA_DEPARTMENTS.includes(dept)) sits.push(sit);
            }
          }
        }
      }

      // 2b. Fetch missions dans la zone
      if (alertTypes.includes("missions")) {
        const missionsQuery = supabase
          .from("small_missions")
          .select("id, title, city, postal_code, latitude, longitude, category, date_needed")
          .eq("status", "open")
          .gte("created_at", sinceISO)
          .limit(10);

        const { data: rawMissions } = await missionsQuery;

        if (rawMissions) {
          for (const m of rawMissions) {
            if (pref.zone_type === "rayon" && alertLat && alertLng && m.latitude && m.longitude) {
              const dist = haversine(alertLat, alertLng, Number(m.latitude), Number(m.longitude));
              if (dist <= pref.radius_km) missions.push(m);

            } else if (pref.zone_type === "departement" && pref.departement) {
              if ((m.postal_code || "").startsWith(pref.departement)) missions.push(m);

            } else if (pref.zone_type === "region" && pref.region_code === "ARA") {
              const dept = (m.postal_code || "").substring(0, 2);
              if (AURA_DEPARTMENTS.includes(dept)) missions.push(m);
            }
          }
        }
      }

      // 3. Skip si rien de nouveau
      if (sits.length === 0 && missions.length === 0) { skipped++; continue; }

      // 4. Envoyer l'email
      const html = buildDigestEmail(profile.first_name, pref.label, sits, missions);

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Guardiens <bonjour@guardiens.fr>",
          to: profile.email,
          subject: buildSubject(sits.length, missions.length, pref.label),
          html,
        }),
      });

      if (res.ok) sent++;
      else skipped++;
    }

    return new Response(
      JSON.stringify({ sent, skipped, hour: currentHourStr }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function buildSubject(sits: number, missions: number, label: string): string {
  const parts = [];
  if (sits > 0) parts.push(`${sits} garde${sits > 1 ? "s" : ""}`);
  if (missions > 0) parts.push(`${missions} mission${missions > 1 ? "s" : ""}`);
  return `🏡 ${parts.join(" · ")} près de ${label}`;
}

function buildDigestEmail(
  firstName: string,
  zoneLabel: string,
  sits: any[],
  missions: any[]
): string {
  const sitsHtml = sits.slice(0, 10).map((s: any) => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #f0f0f0">
        <strong style="color:#1a1a1a;font-size:15px">${s.title}</strong><br/>
        <span style="color:#666;font-size:13px">
          ${(s.profiles as any)?.city || ""} · 
          ${s.start_date ? new Date(s.start_date).toLocaleDateString("fr-FR") : "Dates flexibles"}
          ${s.is_urgent ? ' · <span style="color:#dc2626;font-weight:600">Urgent</span>' : ""}
        </span>
      </td>
    </tr>`).join("");

  const missionsHtml = missions.slice(0, 10).map((m: any) => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #f0f0f0">
        <strong style="color:#1a1a1a;font-size:15px">${m.title}</strong><br/>
        <span style="color:#666;font-size:13px">
          ${m.city || ""} · ${m.date_needed ? new Date(m.date_needed).toLocaleDateString("fr-FR") : ""}
        </span>
      </td>
    </tr>`).join("");

  const overflow = (sits.length + missions.length) > 10
    ? `<tr><td style="padding:16px 0;text-align:center">
        <span style="color:#666;font-size:13px;font-style:italic">
        Et d'autres annonces disponibles sur la plateforme.
        </span>
       </td></tr>` : "";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background-color:#FAF9F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAF9F6;padding:32px 0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden">

    <tr><td style="padding:32px 40px 24px;text-align:center;background-color:#FAF9F6">
      <img src="https://guardiens.fr/logo.png" alt="Guardiens" width="140" style="display:block;margin:0 auto"/>
      <h1 style="margin:16px 0 0;font-size:20px;color:#1a1a1a;font-weight:700">Votre veille — ${zoneLabel}</h1>
    </td></tr>

    <tr><td style="padding:32px 40px">
      <p style="margin:0 0 8px;font-size:15px;color:#333">Bonjour ${firstName},</p>
      <p style="margin:0 0 24px;font-size:15px;color:#333;line-height:1.6">
        Voici les nouvelles annonces publiées près de <strong>${zoneLabel}</strong> depuis hier.
      </p>

      ${sits.length > 0 ? `
        <h2 style="margin:0 0 12px;font-size:16px;color:#16a34a;border-bottom:2px solid #16a34a;padding-bottom:8px">
          🐾 Gardes (${sits.length})
        </h2>
        <table width="100%" cellpadding="0" cellspacing="0">
        ${sitsHtml}
        </table>
        <br/>
      ` : ""}

      ${missions.length > 0 ? `
        <h2 style="margin:0 0 12px;font-size:16px;color:#2563eb;border-bottom:2px solid #2563eb;padding-bottom:8px">
          🤝 Petites missions (${missions.length})
        </h2>
        <table width="100%" cellpadding="0" cellspacing="0">
        ${missionsHtml}
        </table>
        <br/>
      ` : ""}

      ${overflow}

      <tr><td style="padding:24px 0 0;text-align:center">
        <a href="https://guardiens.fr/search" style="display:inline-block;padding:12px 28px;background-color:#16a34a;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px">
          Voir toutes les annonces
        </a>
      </td></tr>

    </td></tr>

    <tr><td style="padding:24px 40px;border-top:1px solid #e5e5e5;text-align:center">
      <p style="margin:0;font-size:12px;color:#999999">
        Vous recevez cet email car vous avez configuré une veille sur Guardiens.
      </p>
      <p style="margin:8px 0 0;font-size:11px">
        <a href="https://guardiens.fr/settings" style="color:#bbbbbb">Gérer mes alertes</a>
      </p>
    </td></tr>

</table>
</td></tr></table>
</body>
</html>`;
}
