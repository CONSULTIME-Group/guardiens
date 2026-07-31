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
import { claimSitNotification, raiseClaimErrorSignal, releaseSitNotification } from "../_shared/sitNotificationClaim.ts";
import { parisDateKey, parisHourSlot } from "../_shared/paris-hour.ts";
import { geocodeKeyCandidates } from "../_shared/geocode-lookup.ts";

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

    // Aperçu de mesure. Sort avant le claim et avant tout envoi, ne pose
    // aucune réservation dans sit_notification_log.
    let dryRun = false;
    let sinceHours = 24;
    let userId: string | null = null;
    try {
      const body = await req.json();
      if (body && typeof body === "object") {
        dryRun = body.dry_run === true;
        if (typeof body.user_id === "string" && /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(body.user_id)) {
          userId = body.user_id;
        }
        // since_hours n'est lisible qu'en dry run : la fenêtre de production
        // reste 24h, sans exception.
        if (dryRun && Number.isFinite(Number(body.since_hours))) {
          sinceHours = Math.min(24 * 90, Math.max(1, Math.floor(Number(body.since_hours))));
        }
      }
    } catch { /* pas de body JSON : mode normal */ }

    const now = new Date();
    const currentHourStr = parisHourSlot(now);
    const currentParisDate = parisDateKey(now);
    const dayOfWeek = now.getDay();

    let prefsQuery = supabase
      .from("alert_preferences")
      .select(`
        *,
        profiles:user_id (
          id, first_name, email, city, postal_code, departement_code, role
        )
      `)
      .eq("active", true);
    if (userId) prefsQuery = prefsQuery.eq("user_id", userId);
    // En dry run, on mesure toute la population active, tous créneaux confondus.
    if (!forceMode && !dryRun) prefsQuery = prefsQuery.eq("heure_envoi", currentHourStr);

    const { data: prefs, error: prefsError } = await prefsQuery;
    if (prefsError) throw prefsError;
    if (!prefs || prefs.length === 0) {
      return new Response(JSON.stringify({ sent: 0, skipped: 0, reason: "no_prefs" }), {
        status: 200, headers: { "Content-Type": "application/json" },
      });
    }

    const since = new Date();
    since.setHours(since.getHours() - sinceHours);
    const sinceISO = since.toISOString();

    // Le cache de géocodage tient en mémoire (moins de 2000 lignes) : une
    // seule lecture, puis résolution locale, sinon le nombre de requêtes
    // explose avec la population.
    const geoRows: Array<{ normalized_name: string; lat: number; lng: number }> = [];
    for (let from = 0; ; from += 1000) {
      const { data: page } = await supabase
        .from("geocode_cache")
        .select("normalized_name, lat, lng")
        .range(from, from + 999);
      if (!page || page.length === 0) break;
      geoRows.push(...(page as any));
      if (page.length < 1000) break;
    }
    const geoMap = new Map<string, { lat: number; lng: number }>();
    for (const r of geoRows) {
      if (r.lat == null || r.lng == null) continue;
      geoMap.set(r.normalized_name, { lat: Number(r.lat), lng: Number(r.lng) });
    }
    const resolveCity = (city: string | null | undefined) => {
      const v = (city ?? "").toString().trim();
      if (!v) return null;
      for (const k of geocodeKeyCandidates(v)) {
        const hit = geoMap.get(k);
        if (hit) return hit;
      }
      return null;
    };

    let sent = 0;
    let skipped = 0;
    let claimSkipped = 0;
    let rayonFallbackDept = 0;
    const claimSkippedBy: Record<string, number> = {};
    const errors: Array<{ user_id?: string; reason: string }> = [];

    const MIGRATION_SOURCE = "migration_email_preferences_2026_07_31";
    const dry = {
      recipients: 0,
      recipients_migrated: 0,
      per_sit: {} as Record<string, { title: string; city: string | null; recipients: number }>,
      excluded: {} as Record<string, number>,
      excluded_migrated: {} as Record<string, number>,
    };
    const mark = (reason: string, pref: any) => {
      dry.excluded[reason] = (dry.excluded[reason] ?? 0) + 1;
      if (pref?.source === MIGRATION_SOURCE) {
        dry.excluded_migrated[reason] = (dry.excluded_migrated[reason] ?? 0) + 1;
      }
    };


    // Repli départemental : deux codes département suffisent à comparer deux
    // localisations quand le géocodage manque. La précision se dégrade, le
    // résultat ne se vide pas.
    const deptOf = (...candidates: Array<string | null | undefined>): string | null => {
      for (const c of candidates) {
        const v = (c ?? "").toString().trim();
        if (!v) continue;
        if (/^(2A|2B)/i.test(v)) return v.slice(0, 2).toUpperCase();
        const m = v.match(/^\d{2}/);
        if (m) return m[0];
      }
      return null;
    };

    for (const pref of prefs) {
      const profile = pref.profiles;
      if (!profile?.email) { skipped++; mark("sans_email", pref); continue; }

      if (pref.frequence === "hebdo" && dayOfWeek !== 1) { skipped++; mark("hebdo_hors_jour", pref); continue; }

      let alertLat: number | null = null;
      let alertLng: number | null = null;
      let alertDept: string | null = null;

      if (pref.zone_type === "rayon") {
        const cityToResolve = pref.city || profile.city;
        if (cityToResolve) {
          const geo = resolveCity(cityToResolve);
          if (geo) {
            alertLat = geo.lat;
            alertLng = geo.lng;
          }
        }
        if (alertLat == null || alertLng == null) {
          alertDept = deptOf(profile.departement_code, profile.postal_code);
          if (!alertDept) { skipped++; mark("localisation_introuvable", pref); continue; }
          rayonFallbackDept++;
        }
      }

      const alertTypes = pref.alert_types as string[];
      const sits: any[] = [];
      const missions: any[] = [];

      const isFrance = pref.zone_type === "france"
        || (pref.zone_type === "region" && pref.region_code === "FR");

      if (alertTypes.includes("gardes")) {
        const { data: rawSits } = await supabase
          .from("sits")
          .select(`
            id, title, specific_expectations, owner_message, start_date, end_date, is_urgent, cover_photo_url,
            city, country, departement_code, accepting_applications,
            profiles:user_id (first_name, city, postal_code, departement_code, country),
            properties:property_id (cover_photo_url, photos, pets (species, name))
          `)
          .eq("status", "published")
          .or("country.is.null,country.eq.FR")
          .gte("created_at", sinceISO)
          .order("created_at", { ascending: false })
          .limit(200);

        for (const sit of rawSits ?? []) {
          if (sit.accepting_applications === false) continue;
          const ownerCountry = (sit.profiles as any)?.country;
          if (ownerCountry && ownerCountry !== "FR") continue;

          const sitDept = deptOf(
            sit.departement_code,
            (sit.profiles as any)?.departement_code,
            (sit.profiles as any)?.postal_code,
          );

          if (isFrance) {
            // France entière : aucune condition géographique.
            sits.push(sit);
            continue;
          }

          if (pref.zone_type === "rayon") {
            const sitCity = (sit.profiles as any)?.city;
            let matched = false;
            if (alertLat != null && alertLng != null && sitCity) {
              const geo = resolveCity(sitCity);
              if (geo) {
                matched = haversine(alertLat, alertLng, geo.lat, geo.lng) <= pref.radius_km;
              } else {
                // Géocodage manquant côté annonce : repli département.
                const ownDept = alertDept
                  ?? deptOf(profile.departement_code, profile.postal_code);
                matched = !!ownDept && ownDept === sitDept;
              }
            } else if (alertDept) {
              matched = alertDept === sitDept;
            }
            if (matched) sits.push(sit);
          } else if (pref.zone_type === "departement" && pref.departement) {
            if (sitDept === deptOf(pref.departement)) sits.push(sit);
          } else if (pref.zone_type === "region" && pref.region_code === "ARA") {
            if (sitDept && AURA_DEPARTMENTS.includes(sitDept)) sits.push(sit);
          }
        }
      }

      if (alertTypes.includes("missions")) {
        const { data: rawMissions } = await supabase
          .from("small_missions")
          .select("id, title, description, city, postal_code, latitude, longitude, category, date_needed, photos, exchange_offer, mission_type")
          .eq("status", "open")
          .gte("created_at", sinceISO)
          .order("created_at", { ascending: false })
          .limit(200);

        for (const m of rawMissions ?? []) {
          const mDept = deptOf(m.postal_code);

          if (isFrance) {
            missions.push(m);
            continue;
          }

          if (pref.zone_type === "rayon") {
            if (alertLat != null && alertLng != null && m.latitude && m.longitude) {
              const dist = haversine(alertLat, alertLng, Number(m.latitude), Number(m.longitude));
              if (dist <= pref.radius_km) missions.push(m);
            } else {
              const ownDept = alertDept
                ?? deptOf(profile.departement_code, profile.postal_code);
              if (ownDept && ownDept === mDept) missions.push(m);
            }
          } else if (pref.zone_type === "departement" && pref.departement) {
            if (mDept === deptOf(pref.departement)) missions.push(m);
          } else if (pref.zone_type === "region" && pref.region_code === "ARA") {
            if (mDept && AURA_DEPARTMENTS.includes(mDept)) missions.push(m);
          }
        }
      }

      if (sits.length === 0 && missions.length === 0) { skipped++; mark("hors_zone_ou_rien_a_dire", pref); continue; }

      // Suppression et opt-out product
      const emailLower = String(profile.email).trim().toLowerCase();
      const { data: sup } = await supabase
        .from("suppressed_emails")
        .select("email")
        .ilike("email", emailLower)
        .maybeSingle();
      if (sup) { skipped++; mark("supprime", pref); continue; }

      const { data: emailPrefs } = await supabase
        .from("email_preferences")
        .select("product_emails")
        .eq("user_id", profile.id)
        .maybeSingle();
      if (emailPrefs?.product_emails === false) { skipped++; mark("desabonne", pref); continue; }

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
        || (pref.zone_type === "france" ? "France entière" : undefined)
        || (pref.zone_type === "rayon" ? (pref.city || profile.city || (alertDept ? `département ${alertDept}` : undefined)) : undefined)
        || (pref.zone_type === "departement" ? `département ${pref.departement}` : undefined)
        || (pref.zone_type === "region" ? (pref.region_code === "FR" ? "France entière" : pref.region_code) : undefined)
        || "votre secteur";

      const idem = `alert-digest-${pref.id}-${currentParisDate}-${currentHourStr}`;

      if (dryRun) {
        // Lecture seule : on regarde si le créneau du jour est déjà réservé
        // par un autre pipeline, sans rien réserver soi-même.
        const { data: held } = await supabase
          .from("sit_notification_log")
          .select("source")
          .eq("user_id", profile.id)
          .eq("notification_date", currentParisDate)
          .limit(1);
        if (held && held.length > 0) {
          skipped++;
          mark(`plafond_frequence:${held[0].source ?? "inconnu"}`, pref);
          continue;
        }
        dry.recipients++;
        if (pref.source === MIGRATION_SOURCE) dry.recipients_migrated++;
        for (const s of sitsPayload) {
          const entry = dry.per_sit[s.id] ?? { title: s.title, city: s.city ?? null, recipients: 0 };
          entry.recipients++;
          dry.per_sit[s.id] = entry;
        }
        continue;
      }



      // Idempotence inter-pipelines : le créneau du jour n'est réservé que
      // maintenant, une fois le contenu établi et le destinataire éligible.
      const claim = await claimSitNotification(
        supabase,
        profile.id,
        "alert-digest",
        sitsPayload.map((s: any) => s.id),
      );
      if (!claim.granted) {
        claimSkipped++;
        const key = claim.heldBy ?? (claim.error ? "claim_error" : "inconnu");
        claimSkippedBy[key] = (claimSkippedBy[key] ?? 0) + 1;
        continue;
      }

      const _steRes = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-transactional-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
        body: JSON.stringify({
          templateName: "alert-digest",
          recipientEmail: profile.email,
          idempotencyKey: idem,
          templateData: {
            firstName: capitalize(profile.first_name),
            zoneLabel,
            sits: sitsPayload,
            missions: missionsPayload,
          },
        }),
      });
      const _steTxt1 = _steRes.ok ? '' : await _steRes.text().catch(() => '');
      if (!_steRes.ok) console.error('send-transactional-email failed', _steRes.status, _steTxt1);
      const sendErr = _steRes.ok ? null : new Error(`send-transactional-email ${_steRes.status}: ${_steTxt1}`);
      if (sendErr) {
        await releaseSitNotification(supabase, profile.id);
        errors.push({ user_id: profile.id, reason: String(sendErr) });
        continue;
      }
      sent++;
    }


    await raiseClaimErrorSignal(supabase, "alert-digest", claimSkippedBy.claim_error ?? 0);

    return new Response(
      JSON.stringify({
        dry_run: dryRun,
        since_hours: sinceHours,
        prefs_evaluated: prefs.length,
        sent, skipped,
        claim_skipped: claimSkipped,
        claim_skipped_by: claimSkippedBy,
        rayon_fallback_dept: rayonFallbackDept,
        errors,
        hour: currentHourStr,
        ...(dryRun ? { preview: dry } : {}),
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("send-alert-digest fatal", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
