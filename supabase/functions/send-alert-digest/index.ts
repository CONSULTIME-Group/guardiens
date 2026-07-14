// send-alert-digest : pousse le digest de veille (rayon / département /
// France) via `send-transactional-email` (template `alert-digest`).
//
// Historique : ce endpoint appelait Resend en direct, hors cap de fréquence,
// hors opt-out product, hors log email_send_log et sans passer par la
// suppression. Refactor du 14/07/2026 : mise en conformité avec les autres
// digests.
//
// La logique de ciblage (rayon/département/région, heure d'envoi, fréquence)
// et le pré-filtrage des annonces (24h glissantes, pays=FR) sont conservés
// à l'identique.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const AURA_DEPARTMENTS = ["01","03","07","15","26","38","42","43","63","69","73","74"];

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const SPECIES: Record<string, { s: string; p: string }> = {
  dog: { s: "chien", p: "chiens" },
  cat: { s: "chat", p: "chats" },
  rabbit: { s: "lapin", p: "lapins" },
  bird: { s: "oiseau", p: "oiseaux" },
  rodent: { s: "rongeur", p: "rongeurs" },
  fish: { s: "poisson", p: "poissons" },
  reptile: { s: "reptile", p: "reptiles" },
  horse: { s: "cheval", p: "chevaux" },
  other: { s: "animal", p: "animaux" },
};

const MISSION_CATEGORY: Record<string, string> = {
  walk: "Promenade", visit: "Visite à domicile", feeding: "Repas / gamelle",
  transport: "Transport", vet: "Visite vétérinaire", house: "Coup de main maison",
  animals: "Animaux", garden: "Jardin", errand: "Courses", tech: "Technique",
  company: "Compagnie", other: "Coup de main",
};

function capitalize(s: string | null | undefined): string {
  const v = (s ?? "").toString().trim();
  if (!v) return "";
  return v.charAt(0).toUpperCase() + v.slice(1).toLowerCase();
}

function truncate(text: string | null | undefined, max = 160): string | undefined {
  const clean = (text ?? "").toString().replace(/\s+/g, " ").trim();
  if (!clean) return undefined;
  return clean.length > max ? clean.slice(0, max - 1).trimEnd() + "..." : clean;
}

function formatFrDate(iso: string | null | undefined): string | undefined {
  if (!iso) return undefined;
  try {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  } catch { return undefined; }
}

function computeDays(start?: string | null, end?: string | null): number | null {
  if (!start || !end) return null;
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (isNaN(s) || isNaN(e)) return null;
  return Math.max(1, Math.round((e - s) / 86_400_000));
}

function petsSummary(pets: any[] | null | undefined): string | undefined {
  const list = Array.isArray(pets) ? pets : [];
  if (list.length === 0) return undefined;
  const counts: Record<string, number> = {};
  for (const p of list) {
    const key = String(p?.species || "other");
    counts[key] = (counts[key] || 0) + 1;
  }
  const parts = Object.entries(counts).map(([k, n]) => {
    const lab = SPECIES[k] || SPECIES.other;
    return `${n} ${n > 1 ? lab.p : lab.s}`;
  });
  return parts.join(", ");
}

function pickSitCover(sit: any): string | null {
  if (sit?.cover_photo_url) return sit.cover_photo_url;
  const propCover = sit?.properties?.cover_photo_url;
  if (propCover) return propCover;
  const photos = sit?.properties?.photos;
  if (Array.isArray(photos) && photos.length > 0 && typeof photos[0] === "string") return photos[0];
  return null;
}

function pickMissionCover(m: any): string | null {
  const photos = m?.photos;
  if (Array.isArray(photos) && photos.length > 0 && typeof photos[0] === "string") return photos[0];
  return null;
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const forceMode = url.searchParams.get("force") === "true";

    const now = new Date();
    const currentHour = now.getUTCHours() + 2; // Europe/Paris +2 été
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
    if (!forceMode) prefsQuery = prefsQuery.eq("heure_envoi", currentHourStr);

    const { data: prefs, error: prefsError } = await prefsQuery;
    if (prefsError) throw prefsError;
    if (!prefs || prefs.length === 0) {
      return new Response(JSON.stringify({ sent: 0, skipped: 0, reason: "no_prefs" }), {
        status: 200, headers: { "Content-Type": "application/json" },
      });
    }

    const since = new Date();
    since.setHours(since.getHours() - 24);
    const sinceISO = since.toISOString();

    let sent = 0;
    let skipped = 0;
    const errors: Array<{ user_id?: string; reason: string }> = [];

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
      const sits: any[] = [];
      const missions: any[] = [];

      if (alertTypes.includes("gardes")) {
        const { data: rawSits } = await supabase
          .from("sits")
          .select(`
            id, title, specific_expectations, owner_message, start_date, end_date, is_urgent, cover_photo_url,
            city, country,
            profiles:user_id (first_name, city, postal_code, country),
            properties:property_id (cover_photo_url, photos, pets (species, name))
          `)
          .eq("status", "published")
          .or("country.is.null,country.eq.FR")
          .gte("created_at", sinceISO)
          .limit(20);

        for (const sit of rawSits ?? []) {
          const ownerCountry = (sit.profiles as any)?.country;
          if (ownerCountry && ownerCountry !== "FR") continue;
          const sitCity = (sit.profiles as any)?.city;
          if (!sitCity) continue;

          if (pref.zone_type === "rayon" && alertLat != null && alertLng != null) {
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
          } else if (pref.zone_type === "region" && pref.region_code === "FR") {
            sits.push(sit);
          } else if (pref.zone_type === "region" && pref.region_code === "ARA") {
            const pc = (sit.profiles as any)?.postal_code || "";
            if (AURA_DEPARTMENTS.includes(pc.substring(0, 2))) sits.push(sit);
          }
        }
      }

      if (alertTypes.includes("missions")) {
        const { data: rawMissions } = await supabase
          .from("small_missions")
          .select("id, title, description, city, postal_code, latitude, longitude, category, date_needed, photos, exchange_offer, mission_type")
          .eq("status", "open")
          .gte("created_at", sinceISO)
          .limit(20);

        for (const m of rawMissions ?? []) {
          if (pref.zone_type === "rayon" && alertLat != null && alertLng != null && m.latitude && m.longitude) {
            const dist = haversine(alertLat, alertLng, Number(m.latitude), Number(m.longitude));
            if (dist <= pref.radius_km) missions.push(m);
          } else if (pref.zone_type === "departement" && pref.departement) {
            if ((m.postal_code || "").startsWith(pref.departement)) missions.push(m);
          } else if (pref.zone_type === "region" && pref.region_code === "FR") {
            missions.push(m);
          } else if (pref.zone_type === "region" && pref.region_code === "ARA") {
            if (AURA_DEPARTMENTS.includes((m.postal_code || "").substring(0, 2))) missions.push(m);
          }
        }
      }

      if (sits.length === 0 && missions.length === 0) { skipped++; continue; }

      // Suppression et opt-out product
      const emailLower = String(profile.email).trim().toLowerCase();
      const { data: sup } = await supabase
        .from("suppressed_emails")
        .select("email")
        .ilike("email", emailLower)
        .maybeSingle();
      if (sup) { skipped++; continue; }

      const { data: emailPrefs } = await supabase
        .from("email_preferences")
        .select("product_emails")
        .eq("user_id", profile.id)
        .maybeSingle();
      if (emailPrefs?.product_emails === false) { skipped++; continue; }

      // Payload template
      const sitsPayload = sits.slice(0, 6).map((s: any) => ({
        id: s.id,
        title: s.title,
        city: capitalize((s.profiles as any)?.city) || undefined,
        ownerFirstName: capitalize((s.profiles as any)?.first_name) || undefined,
        startDate: formatFrDate(s.start_date),
        endDate: formatFrDate(s.end_date),
        daysCount: computeDays(s.start_date, s.end_date),
        animalsSummary: petsSummary((s.properties as any)?.pets),
        excerpt: truncate(s.specific_expectations || s.owner_message, 160),
        isUrgent: !!s.is_urgent,
        coverPhotoUrl: pickSitCover(s),
      }));

      const missionsPayload = missions.slice(0, 6).map((m: any) => ({
        id: m.id,
        title: m.title,
        city: capitalize(m.city),
        category: m.category ? MISSION_CATEGORY[m.category] ?? m.category : undefined,
        dateNeeded: formatFrDate(m.date_needed),
        excerpt: truncate(m.description, 140),
        exchangeOffer: truncate(m.exchange_offer, 100),
        coverPhotoUrl: pickMissionCover(m),
        missionType: m.mission_type === "offre" ? "offre" : "besoin",
      }));

      const zoneLabel = pref.label
        || (pref.zone_type === "rayon" ? (pref.city || profile.city) : undefined)
        || (pref.zone_type === "departement" ? `département ${pref.departement}` : undefined)
        || (pref.zone_type === "region" ? (pref.region_code === "FR" ? "France entière" : pref.region_code) : undefined)
        || "votre secteur";

      const idem = `alert-digest-${pref.id}-${now.toISOString().slice(0, 10)}-${currentHourStr}`;

      const { error: sendErr } = await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "alert-digest",
          recipientEmail: profile.email,
          idempotencyKey: idem,
          templateData: {
            firstName: capitalize(profile.first_name),
            zoneLabel,
            sits: sitsPayload,
            missions: missionsPayload,
          },
        },
      });
      if (sendErr) {
        errors.push({ user_id: profile.id, reason: String(sendErr) });
        continue;
      }
      sent++;
    }

    return new Response(
      JSON.stringify({ sent, skipped, errors, hour: currentHourStr }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("send-alert-digest fatal", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
