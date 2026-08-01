/**
 * send-listing-proximity — diffusion admin d'une annonce (sits) aux gardiens
 * de proximité, depuis SignalsSection / BroadcastSitDialog.
 *
 * Modes :
 *  - "preview" : renvoie la liste des destinataires (prénom, ville, distance, email)
 *  - "send"    : envoie un email personnalisé par destinataire via
 *                `send-transactional-email` (template `nearby-sit-alert`).
 *
 * Refactor 14/07/2026 : abandon de l'appel direct Resend au profit du pipeline
 * transactionnel unique (cap de fréquence, opt-out product_emails,
 * suppressed_emails, log email_send_log, idempotence). L'ancien buildHtml
 * inline a été supprimé — le template React `nearby-sit-alert` sert désormais
 * de source unique (photo de couverture, titre, ville, dates, animaux, CTA).
 *
 * Ciblage : profils role in ('sitter','both'), latitude/longitude non nulls,
 * dans un rayon (km) autour du propriétaire.
 * Exclusions préalables : propriétaire, comptes non actifs, suppressed_emails,
 * opt-out product_emails, emails vides/doublons. (Redondant avec les checks
 * côté send-transactional-email, mais permet un compte de destinataires exact
 * en preview et évite des invocations inutiles.)
 *
 * Sécurité : admin uniquement (user_roles.role = 'admin').
 */
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { clampRadiusKm, MAX_RADIUS_KM, PROXIMITY_DEDUP_DAYS } from "../_shared/proximity-radius.ts";
import { PUBLISHED_STATUS } from "../_shared/sit-alert-guard.ts";

/**
 * Adresses à ne pas resservir :
 * - celles déjà servies pour CETTE annonce, toutes campagnes confondues,
 * - celles servies par n'importe quelle diffusion de proximité dans les
 *   PROXIMITY_DEDUP_DAYS derniers jours.
 * Le rayon est libre, la déduplication est la garde.
 */
async function computeAlreadyServed(
  serviceClient: SupabaseClient,
  sitId: string,
): Promise<Set<string>> {
  const served = new Set<string>();
  const cutoff = new Date(Date.now() - PROXIMITY_DEDUP_DAYS * 86400_000).toISOString();

  const { data: campaigns } = await serviceClient
    .from("mass_emails")
    .select("id, filters, created_at")
    .eq("segment", "listing_proximity");

  const ids = ((campaigns || []) as any[])
    .filter(
      (c) =>
        String(c?.filters?.sit_id || "") === sitId ||
        String(c?.created_at || "") >= cutoff,
    )
    .map((c) => c.id as string);

  const CH = 200;
  for (let i = 0; i < ids.length; i += CH) {
    const { data: rows } = await serviceClient
      .from("mass_email_sends")
      .select("recipient_email")
      .in("mass_email_id", ids.slice(i, i + CH))
      .eq("status", "sent");
    for (const row of (rows || []) as any[]) {
      if (row.recipient_email) served.add(String(row.recipient_email).toLowerCase());
    }
  }
  return served;
}

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

function toTitleCase(s: string | null | undefined): string {
  const clean = (s ?? "").toString().trim();
  if (!clean) return "";
  return clean
    .split(/(\s|-)/)
    .map((part) =>
      /\s|-/.test(part) ? part : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase(),
    )
    .join("");
}

function formatDateFr(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function buildDateRange(startIso: string | null, endIso: string | null): string {
  const s = formatDateFr(startIso);
  const e = formatDateFr(endIso);
  if (s && e) return `du ${s} au ${e}`;
  if (s && !e) return `à partir du ${s}`;
  if (!s && e) return `jusqu'au ${e}`;
  return "";
}

function buildExcerpt(desc: string | null | undefined, maxLen = 220): string {
  const clean = (desc ?? "").toString().replace(/\s+/g, " ").trim();
  if (!clean) return "";
  if (clean.length <= maxLen) return clean;
  return clean.slice(0, maxLen - 3).trimEnd() + "...";
}

function buildSubject(authorFirstName: string, city: string): string {
  const who = authorFirstName || "un propriétaire";
  if (city) return `${who} cherche un gardien près de chez vous à ${city}`;
  return `${who} cherche un gardien près de chez vous`;
}

const SPECIES_LABELS: Record<string, { singular: string; plural: string }> = {
  dog: { singular: "chien", plural: "chiens" },
  cat: { singular: "chat", plural: "chats" },
  rabbit: { singular: "lapin", plural: "lapins" },
  bird: { singular: "oiseau", plural: "oiseaux" },
  rodent: { singular: "rongeur", plural: "rongeurs" },
  fish: { singular: "poisson", plural: "poissons" },
  reptile: { singular: "reptile", plural: "reptiles" },
  horse: { singular: "cheval", plural: "chevaux" },
  other: { singular: "animal", plural: "animaux" },
};

function joinWithEt(parts: string[]): string {
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(", ")} et ${parts[parts.length - 1]}`;
}

function buildPetsSentence(pets: Array<{ species: string; name: string }>): string {
  if (!pets.length) return "";
  const groups = new Map<string, string[]>();
  for (const p of pets) {
    const key = p.species || "other";
    if (!groups.has(key)) groups.set(key, []);
    if (p.name && p.name.trim()) groups.get(key)!.push(toTitleCase(p.name));
  }
  const parts: string[] = [];
  for (const [species, names] of groups) {
    const list = pets.filter((x) => (x.species || "other") === species);
    const count = list.length;
    const label = SPECIES_LABELS[species] || SPECIES_LABELS.other;
    const noun = count > 1 ? label.plural : label.singular;
    const namesPart = names.length ? ` (${joinWithEt(names)})` : "";
    parts.push(`${count} ${noun}${namesPart}`);
  }
  return joinWithEt(parts);
}

interface Recipient {
  user_id: string;
  first_name: string;
  city: string;
  email: string;
  distance_km: number;
}

async function computeRecipients(
  serviceClient: SupabaseClient<any, "public", any>,
  sitId: string,
  radiusKm: number,
) {
  const { data: sit, error: sErr } = await serviceClient
    .from("sits")
    .select("id, title, owner_message, specific_expectations, user_id, city, start_date, end_date, status, country, property_id, cover_photo_url")
    .eq("id", sitId)
    .maybeSingle();
  if (sErr) throw new Error(`Erreur chargement annonce: ${sErr.message}`);
  if (!sit) throw new Error(`Annonce introuvable (${sitId})`);

  const { data: author, error: aErr } = await serviceClient
    .from("profiles")
    .select("id, first_name, city, latitude, longitude")
    .eq("id", (sit as any).user_id)
    .maybeSingle();
  if (aErr || !author) throw new Error("Propriétaire introuvable pour cette annonce");

  const authorFirstName = toTitleCase((author as any).first_name);
  const centerLat = (author as any).latitude as number | null;
  const centerLon = (author as any).longitude as number | null;
  if (centerLat == null || centerLon == null) {
    const who = authorFirstName || "Le propriétaire";
    throw new Error(
      `Cette annonce ne peut pas être diffusée par proximité. ${who} n'a pas de coordonnées géographiques dans son profil. Demandez-lui de compléter sa localisation (ville + code postal) dans son profil.`,
    );
  }

  // Property + pets pour enrichissement carte (photo fallback + phrase animaux)
  const propertyId = (sit as any).property_id as string | null;
  let propertyCover: string | null = null;
  let propertyFirstPhoto: string | null = null;
  const petsList: Array<{ species: string; name: string }> = [];
  if (propertyId) {
    const { data: prop } = await serviceClient
      .from("properties")
      .select("cover_photo_url, photos")
      .eq("id", propertyId)
      .maybeSingle();
    if (prop) {
      propertyCover = ((prop as any).cover_photo_url || "").trim() || null;
      const photos = (prop as any).photos as string[] | null;
      if (Array.isArray(photos) && photos.length > 0) {
        const first = photos.find((p) => typeof p === "string" && p.trim());
        if (first) propertyFirstPhoto = first;
      }
    }
    const { data: pets } = await serviceClient
      .from("pets")
      .select("species, name")
      .eq("property_id", propertyId);
    for (const p of (pets || []) as any[]) {
      const species = String(p.species || "other");
      petsList.push({ species, name: String(p.name || "") });
    }
  }

  const coverPhotoUrl =
    ((sit as any).cover_photo_url || "").trim() ||
    propertyCover ||
    propertyFirstPhoto ||
    null;

  const petsSentence = buildPetsSentence(petsList);

  const latDelta = radiusKm / 111;
  const lonDelta = radiusKm / (111 * Math.cos((centerLat * Math.PI) / 180) || 1);

  const all: Recipient[] = [];
  const PAGE = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await serviceClient
      .from("profiles")
      .select("id, first_name, email, city, latitude, longitude, account_status, role")
      .in("role", ["sitter", "both"])
      .not("latitude", "is", null)
      .not("longitude", "is", null)
      .gte("latitude", centerLat - latDelta)
      .lte("latitude", centerLat + latDelta)
      .gte("longitude", centerLon - lonDelta)
      .lte("longitude", centerLon + lonDelta)
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const p of data as any[]) {
      if (!p.email) continue;
      if (p.account_status && p.account_status !== "active") continue;
      if (p.id === (sit as any).user_id) continue;
      const d = haversineKm(centerLat, centerLon, Number(p.latitude), Number(p.longitude));
      if (d <= radiusKm) {
        all.push({
          user_id: p.id,
          first_name: p.first_name || "",
          city: p.city || "",
          email: String(p.email).trim(),
          distance_km: Math.round(d * 10) / 10,
        });
      }
    }
    if (data.length < PAGE) break;
    from += PAGE;
  }

  const ids = all.map((r) => r.user_id);

  const optedOut = new Set<string>();
  if (ids.length > 0) {
    const CHUNK = 500;
    for (let i = 0; i < ids.length; i += CHUNK) {
      const { data: prefs } = await serviceClient
        .from("email_preferences")
        .select("user_id, alert_emails")
        .in("user_id", ids.slice(i, i + CHUNK));
      for (const p of (prefs || []) as any[]) {
        // Le template diffusé (nearby-sit-alert) est catégorisé « alert » :
        // le pré-filtre doit interroger alert_emails, pas product_emails.
        if (p.alert_emails === false) optedOut.add(p.user_id);

      }
    }
  }

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
      for (const s of (sups || []) as any[]) {
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

  const listingCity = ((sit as any).city && String((sit as any).city).trim())
    || ((author as any).city && String((author as any).city).trim())
    || "";

  return {
    sit: sit as any,
    authorFirstName,
    centerLat,
    centerLon,
    recipients: filtered,
    coverPhotoUrl,
    petsSentence,
    listingCity,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
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
    // Plafond serveur : au-delà de MAX_RADIUS_KM l'objet « près de chez vous »
    // devient faux. On ne refuse pas la campagne, on la ramène au plafond et on
    // le journalise dans la réponse.
    const radiusDecision = clampRadiusKm(payload.radius_km);
    const radiusKm: number = radiusDecision.radiusKm;
    if (radiusDecision.clamped) {
      console.warn("radius clamped", {
        requested: radiusDecision.requestedRadiusKm,
        applied: radiusKm,
        sit_id: payload.sit_id,
      });
    }
    const signalId: string | null = payload.signal_id ?? null;
    if (!sitId) {
      return new Response(JSON.stringify({ error: "sit_id requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      sit,
      authorFirstName,
      recipients: geoRecipients,
      coverPhotoUrl,
      petsSentence,
      listingCity,
    } = await computeRecipients(serviceClient, sitId, radiusKm);

    // Liste explicite optionnelle : INTERSECTION avec la cible géographique,
    // jamais union. Une adresse hors rayon, exclue par une préférence, ou
    // supprimée, reste exclue. La liste restreint, elle n'outrepasse rien.
    const rawFilter = Array.isArray(payload.recipient_emails)
      ? (payload.recipient_emails as unknown[])
      : null;
    const recipientFilter = rawFilter
      ? new Set(
          rawFilter
            .map((e) => String(e || "").trim().toLowerCase())
            .filter((e) => e.length > 0),
        )
      : null;
    const recipients = recipientFilter
      ? geoRecipients.filter((r) => recipientFilter.has(r.email.toLowerCase()))
      : geoRecipients;
    const recipientFilterInfo = {
      recipient_filter_applied: recipientFilter !== null,
      recipient_filter_size: recipientFilter ? recipientFilter.size : 0,
      recipient_filter_intersection: recipientFilter ? recipients.length : 0,
      geo_targeted: geoRecipients.length,
    };
    if (recipientFilter) {
      console.log("recipient filter applied", { sit_id: sitId, ...recipientFilterInfo });
    }

    // Déduplication (même annonce, ou toute diffusion de proximité des 7
    // derniers jours). Appliquée en preview comme à l'envoi, pour que le
    // compte affiché à l'admin soit celui réellement expédié.
    const alreadyServed = await computeAlreadyServed(serviceClient, sitId);
    const targets = recipients.filter((r) => !alreadyServed.has(r.email.toLowerCase()));
    const dedupInfo = {
      dedup_days: PROXIMITY_DEDUP_DAYS,
      excluded_recent: recipients.length - targets.length,
    };

    const subject = buildSubject(authorFirstName, listingCity);
    const excerpt = buildExcerpt(sit.owner_message ?? sit.specific_expectations);
    const dateRange = buildDateRange(sit.start_date, sit.end_date);
    const startDateFr = formatDateFr(sit.start_date);
    const endDateFr = formatDateFr(sit.end_date);

    if (mode === "preview") {
      const PREVIEW_LIMIT = 500;
      return new Response(
        JSON.stringify({
          count: targets.length,
          radius_km: radiusKm,
          requested_radius_km: radiusDecision.requestedRadiusKm,
          radius_clamped: radiusDecision.clamped,
          max_radius_km: MAX_RADIUS_KM,
          ...recipientFilterInfo,
          ...dedupInfo,
          sit_status: (sit as any).status ?? null,
          author_first_name: authorFirstName,
          sit: {
            id: sit.id,
            title: sit.title,
            city: listingCity,
            excerpt,
            date_range: dateRange,
            cover_photo_url: coverPhotoUrl,
            pets_sentence: petsSentence,
          },
          subject,
          recipients: targets.slice(0, PREVIEW_LIMIT).map((r) => ({
            first_name: toTitleCase(r.first_name),
            city: r.city,
            distance_km: r.distance_km,
            email: r.email,
          })),
          truncated: targets.length > PREVIEW_LIMIT,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Mode SEND (refonte 31/07/2026) : ENFILEMENT SEUL.
    // La fonction ne contacte plus Resend ni send-transactional-email. Elle
    // calcule la cible, écrit toutes les lignes en `queued` dans
    // mass_email_sends, pousse un message pgmq par destinataire, puis rend la
    // main. C'est `process-mass-email-queue` (cron chaque minute) qui expédie,
    // à cadence maîtrisée, avec ses reprises sur échec.

    // Contrôle à l'enqueue : une annonce non publiée ne doit jamais alimenter
    // la file. Le second contrôle, au moment de l'envoi, vit dans
    // send-transactional-email (le statut peut changer après l'enfilement).
    const sitStatus = String((sit as any).status || "");
    if (sitStatus !== PUBLISHED_STATUS) {
      return new Response(
        JSON.stringify({
          error: `Diffusion refusée : cette annonce n'est pas publiée (statut actuel: ${sitStatus || "inconnu"}). Republiez-la avant de la diffuser.`,
          code: "sit_not_published",
          sit_status: sitStatus || null,
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (recipients.length === 0) {
      return new Response(JSON.stringify({ error: "Aucun destinataire" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Idempotence de ciblage : tout destinataire ayant déjà une ligne `sent`
    // pour CETTE MÊME ANNONCE (toutes campagnes confondues) est exclu. Le
    // plafond de fréquence reste une seconde barrière, jamais la seule.
    const alreadyServed = new Set<string>();
    {
      const { data: priorCampaigns } = await serviceClient
        .from("mass_emails")
        .select("id, filters")
        .eq("segment", "listing_proximity");
      const priorIds = ((priorCampaigns || []) as any[])
        .filter((c) => String(c?.filters?.sit_id || "") === sitId)
        .map((c) => c.id as string);
      if (priorIds.length > 0) {
        const CH = 200;
        for (let i = 0; i < priorIds.length; i += CH) {
          const { data: served } = await serviceClient
            .from("mass_email_sends")
            .select("recipient_email")
            .in("mass_email_id", priorIds.slice(i, i + CH))
            .eq("status", "sent");
          for (const row of (served || []) as any[]) {
            if (row.recipient_email) alreadyServed.add(String(row.recipient_email).toLowerCase());
          }
        }
      }
    }

    const targets = recipients.filter((r) => !alreadyServed.has(r.email.toLowerCase()));
    if (targets.length === 0) {
      return new Response(
        JSON.stringify({
          queued: 0,
          targeted: recipients.length,
          already_served: alreadyServed.size,
          mode: "queue",
          radius_km: radiusKm,
          requested_radius_km: radiusDecision.requestedRadiusKm,
          radius_clamped: radiusDecision.clamped,
          max_radius_km: MAX_RADIUS_KM,
          ...recipientFilterInfo,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Row campagne pour la traçabilité admin (SignalsSection).
    const { data: campaign, error: campErr } = await serviceClient
      .from("mass_emails")
      .insert({
        segment: "listing_proximity",
        filters: { sit_id: sitId, radius_km: radiusKm } as any,
        subject,
        body: `Annonce de garde (${sit.title}) diffusée à ${radiusKm} km, propriétaire ${authorFirstName}`,
        cta_label: "Voir l'annonce",
        cta_url: `https://guardiens.fr/sits/${sit.id}`,
        recipients_count: targets.length,
        status: "sending",
        sent_by: user.id,
      })
      .select("id")
      .single();
    if (campErr || !campaign) {
      throw new Error(`Failed to create campaign row: ${campErr?.message}`);
    }
    const campaignId = campaign.id as string;

    const queuedRows = targets.map((r) => ({
      mass_email_id: campaignId,
      recipient_email: r.email,
      status: "queued",
      attempts: 0,
      resend_id: null as string | null,
      error_message: null as string | null,
    }));
    const INS_CHUNK = 500;
    for (let i = 0; i < queuedRows.length; i += INS_CHUNK) {
      const { error: insErr } = await serviceClient
        .from("mass_email_sends")
        .upsert(queuedRows.slice(i, i + INS_CHUNK), {
          onConflict: "mass_email_id,recipient_email",
          ignoreDuplicates: true,
        });
      if (insErr) console.error(`queued upsert error (chunk ${i}):`, insErr);
    }

    // Message pgmq par destinataire. La présence de `template_name` indique au
    // worker qu'il doit passer par send-transactional-email (rendu React
    // `nearby-sit-alert`) et non par le gabarit générique des campagnes.
    let enqueued = 0;
    for (const r of targets) {
      const { error: qErr } = await serviceClient.rpc("enqueue_email", {
        queue_name: "mass_emails",
        payload: {
          campaign_id: campaignId,
          recipient_email: r.email,
          template_name: "nearby-sit-alert",
          idempotency_key: `listing-proximity-${sit.id}-${r.user_id}`,
          template_data: {
            sitterFirstName: toTitleCase(r.first_name) || undefined,
            ownerFirstName: authorFirstName || undefined,
            sitTitle: sit.title || undefined,
            city: listingCity || undefined,
            distanceKm: r.distance_km,
            startDate: startDateFr || undefined,
            endDate: endDateFr || undefined,
            sitId: sit.id,
            animalsSummary: petsSentence || undefined,
            coverPhotoUrl: coverPhotoUrl || null,
          },
        } as any,
      });
      if (qErr) console.error("enqueue_email failed:", qErr, { email: r.email });
      else enqueued++;
    }

    await serviceClient
      .from("mass_emails")
      .update({
        enqueued_count: enqueued,
        status: "sending",
        heartbeat_at: new Date().toISOString(),
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

    return new Response(JSON.stringify({
      mode: "queue",
      queued: enqueued,
      targeted: recipients.length,
      already_served: alreadyServed.size,
      campaign_id: campaignId,
      radius_km: radiusKm,
      requested_radius_km: radiusDecision.requestedRadiusKm,
      radius_clamped: radiusDecision.clamped,
      max_radius_km: MAX_RADIUS_KM,
      ...recipientFilterInfo,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = String((err as Error).message || err);
    console.error("send-listing-proximity error:", err);
    const isMissingCoords =
      message.includes("Aucune coordonnée") ||
      message.includes("coordonnées géographiques");
    return new Response(
      JSON.stringify({
        error: message,
        code: isMissingCoords ? "owner_coords_missing" : "internal_error",
        fallback: isMissingCoords,
      }),
      {
        status: isMissingCoords ? 422 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
