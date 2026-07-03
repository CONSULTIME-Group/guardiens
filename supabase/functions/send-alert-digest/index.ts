import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const AURA_DEPARTMENTS = [
  "01","03","07","15","26","38","42","43","63","69","73","74"
];

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Palette alignée avec la marque (HSL → hex)
const C = {
  bg: "#F8F4EC",         // background sable
  card: "#FFFFFF",
  ink: "#1B1B1A",        // foreground
  inkSoft: "#5C5A55",    // muted-foreground
  primary: "#2C7553",    // vert Guardiens
  primarySoft: "#E8F1EC",
  border: "#E8E1D2",
  accent: "#A56A3D",     // secondary terre
  urgent: "#B8341E",
  urgentSoft: "#FBE9E5",
};

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const forceMode = url.searchParams.get("force") === "true";

    const now = new Date();
    const currentHour = now.getUTCHours() + 2; // Europe/Paris (+2 été)
    const currentHourStr = `${String(currentHour).padStart(2, "0")}:00`;
    const dayOfWeek = now.getDay();

    let prefsQuery = supabase
      .from("alert_preferences")
      .select(`
        *,
        profiles:user_id (
          id, first_name, email, city, postal_code, role
        )
      `)
      .eq("active", true);

    if (!forceMode) {
      prefsQuery = prefsQuery.eq("heure_envoi", currentHourStr);
    }

    const { data: prefs, error: prefsError } = await prefsQuery;

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

      if (pref.frequence === "hebdo" && dayOfWeek !== 1) { skipped++; continue; }

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

      // 2a. Gardes
      if (alertTypes.includes("gardes")) {
        const { data: rawSits } = await supabase
          .from("sits")
          .select(`
            id, title, specific_expectations, owner_message, start_date, end_date, is_urgent, cover_photo_url,
            city, country,
            profiles:user_id (first_name, city, postal_code, country, avatar_url),
            properties:property_id (photos, type, description, pets (name, species, photo_url))
          `)
          .eq("status", "published")
          .or("country.is.null,country.eq.FR")
          .gte("created_at", sinceISO)
          .limit(20);

        if (rawSits) {
          for (const sit of rawSits) {
            // Les alertes par rayon/département/région ciblent la France.
            // On exclut toute annonce dont le propriétaire ou la fiche déclare un pays != FR.
            const ownerCountry = (sit.profiles as any)?.country;
            if (ownerCountry && ownerCountry !== "FR") continue;
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

      // 2b. Missions d'entraide
      if (alertTypes.includes("missions")) {
        const { data: rawMissions } = await supabase
          .from("small_missions")
          .select("id, title, description, city, postal_code, latitude, longitude, category, date_needed, photos, exchange_offer")
          .eq("status", "open")
          .gte("created_at", sinceISO)
          .limit(20);

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

      if (sits.length === 0 && missions.length === 0) { skipped++; continue; }

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
function toRad(deg: number): number { return (deg * Math.PI) / 180; }

function capitalize(s: string): string {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function buildSubject(sits: number, missions: number, label: string): string {
  const parts: string[] = [];
  if (sits > 0) parts.push(`${sits} garde${sits > 1 ? "s" : ""}`);
  if (missions > 0) parts.push(`${missions} demande${missions > 1 ? "s" : ""} d'entraide`);
  return `${parts.join(" et ")} à découvrir près de ${label}`;
}

const PROPERTY_TYPE: Record<string, string> = {
  apartment: "Appartement",
  house: "Maison",
  farm: "Ferme",
  other: "Logement",
};

const SPECIES: Record<string, string> = {
  dog: "Chien",
  cat: "Chat",
  bird: "Oiseau",
  fish: "Poisson",
  reptile: "Reptile",
  rodent: "Rongeur",
  rabbit: "Lapin",
  horse: "Cheval",
  other: "Autre",
};

const MISSION_CATEGORY: Record<string, string> = {
  walk: "Promenade",
  visit: "Visite à domicile",
  feeding: "Repas / gamelle",
  transport: "Transport",
  vet: "Visite vétérinaire",
  house: "Coup de main maison",
  other: "Coup de main",
};

function formatDateRange(start?: string | null, end?: string | null): { main: string; days: string | null } {
  if (!start) return { main: "Dates flexibles", days: null };
  const s = new Date(start);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long" };
  if (!end) {
    return { main: `À partir du ${s.toLocaleDateString("fr-FR", { ...opts, year: "numeric" })}`, days: null };
  }
  const e = new Date(end);
  const days = Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000));
  return {
    main: `Du ${s.toLocaleDateString("fr-FR", opts)} au ${e.toLocaleDateString("fr-FR", { ...opts, year: "numeric" })}`,
    days: `${days} jour${days > 1 ? "s" : ""}`,
  };
}

function pickSitImage(sit: any): string | null {
  if (sit.cover_photo_url) return sit.cover_photo_url;
  const photos = sit.properties?.photos;
  if (Array.isArray(photos) && photos.length > 0 && photos[0]) return photos[0];
  const pets = sit.properties?.pets || [];
  for (const p of pets) if (p?.photo_url) return p.photo_url;
  return null;
}

function pickMissionImage(m: any): string | null {
  const photos = m.photos;
  if (Array.isArray(photos) && photos.length > 0 && photos[0]) return photos[0];
  return null;
}

function truncate(text: string, max = 140): string {
  if (!text) return "";
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max).trim()}…` : clean;
}

function renderSitCard(sit: any): string {
  const ownerCity = capitalize((sit.profiles as any)?.city || "");
  const ownerName = capitalize((sit.profiles as any)?.first_name || "");
  const pets: any[] = sit.properties?.pets || [];
  const speciesCounts: Record<string, number> = {};
  pets.forEach((p) => {
    const k = SPECIES[p.species] || capitalize(p.species || "Animal");
    speciesCounts[k] = (speciesCounts[k] || 0) + 1;
  });
  const animalLine = Object.entries(speciesCounts)
    .map(([k, n]) => (n > 1 ? `${n} ${k.toLowerCase()}s` : k))
    .join(" · ");

  const propertyLabel = PROPERTY_TYPE[sit.properties?.type] || "Logement";
  const dates = formatDateRange(sit.start_date, sit.end_date);
  const img = pickSitImage(sit);
  const desc = truncate(sit.description || "", 130);
  const link = `https://guardiens.fr/sits/${sit.id}`;

  const imageBlock = img
    ? `<a href="${link}" style="text-decoration:none;display:block;">
         <img src="${img}" width="600" height="240" alt="${propertyLabel} à ${ownerCity}"
              style="display:block;width:100%;max-width:600px;height:240px;object-fit:cover;border:0;border-radius:12px 12px 0 0;" />
       </a>`
    : `<div style="height:8px;background:${C.primarySoft};border-radius:12px 12px 0 0;"></div>`;

  return `
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px;background:${C.card};border:1px solid ${C.border};border-radius:12px;overflow:hidden;">
    <tr><td style="padding:0;">${imageBlock}</td></tr>
    <tr><td style="padding:18px 22px 20px;">
      ${sit.is_urgent ? `<div style="display:inline-block;background:${C.urgentSoft};color:${C.urgent};font-size:11px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;padding:4px 10px;border-radius:999px;margin-bottom:10px;">Demande urgente</div><br/>` : ""}
      <a href="${link}" style="text-decoration:none;color:${C.ink};">
        <h3 style="margin:0 0 6px;font-size:18px;line-height:1.3;font-weight:700;font-family:Georgia,serif;color:${C.ink};">
          ${propertyLabel}${ownerCity ? ` à ${ownerCity}` : ""}
        </h3>
      </a>
      <p style="margin:0 0 12px;color:${C.inkSoft};font-size:14px;line-height:1.5;">
        ${dates.main}${dates.days ? ` · <span style="color:${C.accent};font-weight:600;">${dates.days}</span>` : ""}
      </p>
      ${animalLine ? `<p style="margin:0 0 10px;color:${C.ink};font-size:14px;font-weight:600;">${animalLine}</p>` : ""}
      ${desc ? `<p style="margin:0 0 14px;color:${C.inkSoft};font-size:14px;line-height:1.55;">${desc}</p>` : ""}
      <a href="${link}" style="display:inline-block;color:${C.primary};font-size:14px;font-weight:600;text-decoration:none;border-bottom:1px solid ${C.primary};padding-bottom:1px;">
        Découvrir cette garde${ownerName ? ` chez ${ownerName}` : ""} →
      </a>
    </td></tr>
  </table>`;
}

function renderMissionCard(m: any): string {
  const cat = MISSION_CATEGORY[m.category] || "Coup de main";
  const city = capitalize(m.city || "");
  const date = m.date_needed ? new Date(m.date_needed).toLocaleDateString("fr-FR", { day: "numeric", month: "long" }) : "Dès que possible";
  const desc = truncate(m.description || "", 120);
  const img = pickMissionImage(m);
  const link = `https://guardiens.fr/entraide/${m.id}`;

  const imageBlock = img
    ? `<a href="${link}" style="text-decoration:none;display:block;">
         <img src="${img}" width="600" height="200" alt="${cat}${city ? ` à ${city}` : ""}"
              style="display:block;width:100%;max-width:600px;height:200px;object-fit:cover;border:0;border-radius:12px 12px 0 0;" />
       </a>`
    : "";

  return `
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px;background:${C.card};border:1px solid ${C.border};border-radius:12px;overflow:hidden;">
    ${imageBlock ? `<tr><td style="padding:0;">${imageBlock}</td></tr>` : ""}
    <tr><td style="padding:18px 22px 20px;">
      <div style="display:inline-block;background:${C.primarySoft};color:${C.primary};font-size:11px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;padding:4px 10px;border-radius:999px;margin-bottom:10px;">${cat}</div>
      <a href="${link}" style="text-decoration:none;color:${C.ink};">
        <h3 style="margin:0 0 6px;font-size:17px;line-height:1.3;font-weight:700;font-family:Georgia,serif;color:${C.ink};">
          ${m.title || "Demande d'entraide"}
        </h3>
      </a>
      <p style="margin:0 0 10px;color:${C.inkSoft};font-size:14px;">
        ${city ? `${city} · ` : ""}${date}
      </p>
      ${desc ? `<p style="margin:0 0 14px;color:${C.inkSoft};font-size:14px;line-height:1.55;">${desc}</p>` : ""}
      ${m.exchange_offer ? `<p style="margin:0 0 14px;padding:10px 12px;background:${C.bg};border-radius:8px;color:${C.ink};font-size:13px;line-height:1.5;"><strong style="color:${C.accent};">En échange :</strong> ${truncate(m.exchange_offer, 100)}</p>` : ""}
      <a href="${link}" style="display:inline-block;color:${C.primary};font-size:14px;font-weight:600;text-decoration:none;border-bottom:1px solid ${C.primary};padding-bottom:1px;">
        Proposer mon aide →
      </a>
    </td></tr>
  </table>`;
}

function buildDigestEmail(
  firstName: string,
  zoneLabel: string,
  sits: any[],
  missions: any[]
): string {
  const niceName = capitalize(firstName || "");
  const totalNew = sits.length + missions.length;

  const sitsBlock = sits.length > 0 ? `
    <h2 style="margin:24px 0 14px;font-size:14px;font-weight:700;color:${C.primary};text-transform:uppercase;letter-spacing:1.2px;font-family:Arial,sans-serif;">
      Gardes proposées · ${sits.length}
    </h2>
    ${sits.slice(0, 6).map(renderSitCard).join("")}
  ` : "";

  const missionsBlock = missions.length > 0 ? `
    <h2 style="margin:32px 0 14px;font-size:14px;font-weight:700;color:${C.primary};text-transform:uppercase;letter-spacing:1.2px;font-family:Arial,sans-serif;">
      Demandes d'entraide · ${missions.length}
    </h2>
    ${missions.slice(0, 6).map(renderMissionCard).join("")}
  ` : "";

  const overflow = totalNew > 12 ? `
    <p style="margin:18px 0 0;text-align:center;color:${C.inkSoft};font-size:13px;font-style:italic;">
      Et d'autres opportunités vous attendent dans votre zone…
    </p>` : "";

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Votre veille Guardiens — ${zoneLabel}</title>
</head>
<body style="margin:0;padding:0;background:${C.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${C.ink};">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.bg};padding:32px 12px;">
<tr><td align="center">

<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

  <tr><td style="padding:0 4px 24px;text-align:center;">
    <a href="https://guardiens.fr" style="text-decoration:none;color:${C.primary};font-family:Georgia,serif;font-size:22px;font-weight:700;letter-spacing:0.5px;">
      Guardiens
    </a>
    <p style="margin:6px 0 0;font-size:12px;color:${C.inkSoft};letter-spacing:1.5px;text-transform:uppercase;">
      House-sitting de proximité
    </p>
  </td></tr>

  <tr><td style="background:${C.card};border:1px solid ${C.border};border-radius:16px;padding:32px 28px;">
    <h1 style="margin:0 0 6px;font-family:Georgia,serif;font-size:24px;line-height:1.25;color:${C.ink};font-weight:700;">
      Bonjour ${niceName},
    </h1>
    <p style="margin:0 0 4px;font-size:16px;line-height:1.55;color:${C.ink};">
      ${totalNew} nouveauté${totalNew > 1 ? "s" : ""} à découvrir dans votre veille
      <strong style="color:${C.primary};">${zoneLabel}</strong>.
    </p>
    <p style="margin:0;font-size:14px;color:${C.inkSoft};line-height:1.6;">
      Nous parcourons la communauté chaque jour pour vous signaler les annonces qui correspondent à votre zone et à vos préférences.
    </p>

    ${sitsBlock}
    ${missionsBlock}
    ${overflow}

    <div style="text-align:center;margin:32px 0 8px;">
      <a href="https://guardiens.fr/search"
         style="display:inline-block;padding:14px 32px;background:${C.primary};color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600;font-size:15px;letter-spacing:0.3px;">
        Voir toutes les annonces
      </a>
    </div>
    <p style="margin:14px 0 0;text-align:center;font-size:13px;color:${C.inkSoft};">
      <a href="https://guardiens.fr/messagerie" style="color:${C.primary};text-decoration:none;">Ou répondez directement aux propriétaires</a>
    </p>
  </td></tr>

  <tr><td style="padding:24px 8px 8px;text-align:center;">
    <p style="margin:0 0 8px;font-size:12px;color:${C.inkSoft};line-height:1.6;">
      Vous recevez cet email parce que vous avez configuré une veille sur Guardiens.
    </p>
    <p style="margin:0;font-size:12px;">
      <a href="https://guardiens.fr/settings" style="color:${C.primary};text-decoration:none;">Modifier mes préférences d'alerte</a>
      <span style="color:${C.border};margin:0 6px;">·</span>
      <a href="https://guardiens.fr/settings" style="color:${C.inkSoft};text-decoration:none;">Me désabonner</a>
    </p>
    <p style="margin:14px 0 0;font-size:11px;color:${C.inkSoft};">
      Guardiens — house-sitting de confiance, partout en France.
    </p>
  </td></tr>

</table>

</td></tr></table>
</body>
</html>`;
}
