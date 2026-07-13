/**
 * send-listing-proximity — unique source de vérité pour la diffusion d'une
 * annonce de garde (sits) aux gardiens de proximité.
 *
 * Modes :
 *  - "preview" : renvoie la liste des destinataires (prénom, ville, distance, email)
 *  - "send"    : envoie un email personnalisé par destinataire (jamais de CC groupé)
 *
 * Ciblage : profils role in ('sitter','both'), latitude/longitude non nulls,
 * dans un rayon (km) autour du propriétaire.
 * Exclusions : propriétaire, comptes non actifs, suppressed_emails, opt-out
 * product_emails, emails vides/doublons.
 *
 * Sécurité : admin uniquement (user_roles.role = 'admin'). Aucun envoi automatique.
 */
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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

function buildHtml(params: {
  recipientFirstName: string;
  authorFirstName: string;
  listingTitle: string;
  listingCity: string;
  listingExcerpt: string;
  dateRange: string;
  listingUrl: string;
  subject: string;
  coverPhotoUrl: string | null;
  petsSentence: string;
  affinityLine: string;
}): string {
  const {
    recipientFirstName,
    authorFirstName,
    listingTitle,
    listingCity,
    listingExcerpt,
    dateRange,
    listingUrl,
    subject,
    coverPhotoUrl,
    petsSentence,
    affinityLine,
  } = params;
  const greeting = recipientFirstName ? `Bonjour ${escapeHtml(recipientFirstName)},` : "Bonjour,";
  const author = escapeHtml(authorFirstName || "un propriétaire du coin");
  const title = escapeHtml(listingTitle || "une garde d'animaux");
  const city = escapeHtml(listingCity || "");
  const url = escapeHtml(listingUrl);
  const excerptHtml = listingExcerpt
    ? `<p style="margin:0 0 14px;font-size:14px;line-height:1.7;color:#555;font-style:italic;border-left:3px solid #2C6E49;padding:4px 0 4px 12px">${escapeHtml(listingExcerpt)}</p>`
    : "";
  const dateHtml = dateRange
    ? `<p style="margin:0 0 14px;font-size:14px;line-height:1.7;color:#3a3a3a"><strong>Dates : </strong>${escapeHtml(dateRange)}</p>`
    : "";
  const petsHtml = petsSentence
    ? `<p style="margin:0 0 10px;font-size:14px;line-height:1.7;color:#3a3a3a"><strong>Animaux : </strong>${escapeHtml(petsSentence)}</p>`
    : "";
  const affinityHtml = affinityLine
    ? `<p style="margin:0 0 14px;font-size:13px;line-height:1.6;color:#2C6E49;font-weight:600">${escapeHtml(affinityLine)}</p>`
    : "";
  const coverHtml = coverPhotoUrl
    ? `<tr><td style="padding:0"><img src="${escapeHtml(coverPhotoUrl)}" alt="Photo de l'annonce" width="600" style="width:100%;max-width:600px;height:auto;display:block"/></td></tr>`
    : "";
  const introLine = city
    ? `Près de chez vous, à ${city}, ${author} cherche un gardien pour ses animaux : <strong>${title}</strong>.`
    : `Près de chez vous, ${author} cherche un gardien pour ses animaux : <strong>${title}</strong>.`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background-color:#FAF9F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAF9F6;padding:32px 16px">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.04)">
<tr><td style="padding:0;background:linear-gradient(135deg,#2C6E49 0%,#3a8a5d 100%);height:6px;line-height:6px;font-size:0">&nbsp;</td></tr>
${coverHtml}
<tr><td style="padding:32px 40px 8px;text-align:center;background-color:#ffffff">
<img src="https://guardiens.fr/logo-guardiens.png" alt="Guardiens" width="120" style="display:block;margin:0 auto;height:auto"/>
</td></tr>
<tr><td style="padding:24px 40px 8px">
<h1 style="margin:0 0 20px;font-size:22px;line-height:1.35;color:#1a1a1a;font-weight:700">${escapeHtml(subject)}</h1>
<p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#3a3a3a">${greeting}</p>
<p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#3a3a3a">${introLine}</p>
${dateHtml}
${petsHtml}
${affinityHtml}
${excerptHtml}
</td></tr>
<tr><td align="center" style="padding:16px 0 8px">
<a href="${url}" style="display:inline-block;padding:14px 32px;background-color:#2C6E49;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600;font-size:16px;box-shadow:0 4px 12px rgba(44,110,73,0.25)">Voir l'annonce</a>
</td></tr>
<tr><td style="padding:16px 40px 8px">
<p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#3a3a3a">Si les dates et le contexte vous conviennent, vous pouvez postuler directement depuis l'annonce.</p>
<p style="margin:0 0 4px;font-size:15px;line-height:1.7;color:#3a3a3a">À bientôt,</p>
<p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#3a3a3a">Jérémie et Elisa</p>
</td></tr>
<tr><td style="padding:24px 40px 32px"></td></tr>
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
  animal_types: string[] | null;
  affinity_score: number | null;
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

  // Property + pets (owner's animals) for the rich template
  const propertyId = (sit as any).property_id as string | null;
  let propertyCover: string | null = null;
  let propertyFirstPhoto: string | null = null;
  const ownerPetSpecies = new Set<string>();
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
      ownerPetSpecies.add(species);
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
          animal_types: null,
          affinity_score: null,
        });
      }
    }
    if (data.length < PAGE) break;
    from += PAGE;
  }

  const ids = all.map((r) => r.user_id);

  // Sitter profiles: animal_types + affinity_score for enrichment
  if (ids.length > 0) {
    const CHUNK = 500;
    const spMap = new Map<string, { animal_types: string[] | null; affinity_score: number | null }>();
    for (let i = 0; i < ids.length; i += CHUNK) {
      const { data: sps } = await serviceClient
        .from("sitter_profiles")
        .select("user_id, animal_types, affinity_score")
        .in("user_id", ids.slice(i, i + CHUNK));
      for (const s of (sps || []) as any[]) {
        spMap.set(s.user_id, {
          animal_types: Array.isArray(s.animal_types) ? s.animal_types : null,
          affinity_score: typeof s.affinity_score === "number" ? s.affinity_score : null,
        });
      }
    }
    for (const r of all) {
      const sp = spMap.get(r.user_id);
      if (sp) {
        r.animal_types = sp.animal_types;
        r.affinity_score = sp.affinity_score;
      }
    }
  }

  const optedOut = new Set<string>();
  if (ids.length > 0) {
    const CHUNK = 500;
    for (let i = 0; i < ids.length; i += CHUNK) {
      const { data: prefs } = await serviceClient
        .from("email_preferences")
        .select("user_id, product_emails")
        .in("user_id", ids.slice(i, i + CHUNK));
      for (const p of (prefs || []) as any[]) {
        if (p.product_emails === false) optedOut.add(p.user_id);
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

  // Resolve owner city: sit.city fallback profiles.city
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
    ownerPetSpecies,
    listingCity,
  };
}

function computeAffinityLine(
  recipient: Recipient,
  authorFirstName: string,
  ownerPetSpecies: Set<string>,
): string {
  if (typeof recipient.affinity_score === "number" && recipient.affinity_score > 0) {
    return `Affinité avec ${authorFirstName || "le propriétaire"} : ${Math.round(recipient.affinity_score)} %`;
  }
  if (ownerPetSpecies.size > 0 && recipient.animal_types && recipient.animal_types.length > 0) {
    const sitterSet = new Set(recipient.animal_types.map((x) => String(x)));
    const inter = [...ownerPetSpecies].filter((s) => sitterSet.has(s)).length;
    const total = ownerPetSpecies.size;
    if (total > 0 && inter > 0) {
      const pct = Math.round((inter / total) * 100);
      return `Affinité animaux : ${pct} %`;
    }
  }
  return "";
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
    const radiusKm: number = Math.max(1, Math.min(2000, Number(payload.radius_km) || 30));
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
      recipients,
      coverPhotoUrl,
      petsSentence,
      ownerPetSpecies,
      listingCity,
    } = await computeRecipients(serviceClient, sitId, radiusKm);

    const subject = buildSubject(authorFirstName, listingCity);
    const excerpt = buildExcerpt(sit.owner_message ?? sit.specific_expectations);
    const dateRange = buildDateRange(sit.start_date, sit.end_date);
    const listingUrl = `https://guardiens.fr/annonces/${sit.id}`;
    const ctaLabel = "Voir l'annonce";

    if (mode === "preview") {
      const PREVIEW_LIMIT = 500;
      return new Response(
        JSON.stringify({
          count: recipients.length,
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
          recipients: recipients.slice(0, PREVIEW_LIMIT).map((r) => ({
            first_name: toTitleCase(r.first_name),
            city: r.city,
            distance_km: r.distance_km,
            email: r.email,
          })),
          truncated: recipients.length > PREVIEW_LIMIT,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Mode SEND
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");
    if (recipients.length === 0) {
      return new Response(JSON.stringify({ error: "Aucun destinataire" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: campaign, error: campErr } = await serviceClient
      .from("mass_emails")
      .insert({
        segment: "listing_proximity",
        filters: { sit_id: sitId, radius_km: radiusKm } as any,
        subject,
        body: `Annonce de garde (${sit.title}) à ${radiusKm} km, propriétaire ${authorFirstName}`,
        cta_label: ctaLabel,
        cta_url: listingUrl,
        recipients_count: 0,
        status: "sending",
        sent_by: user.id,
      })
      .select("id")
      .single();
    if (campErr || !campaign) {
      throw new Error(`Failed to create campaign row: ${campErr?.message}`);
    }
    const campaignId = campaign.id as string;

    let sent = 0;
    let errors = 0;
    const sendRows: Array<{
      mass_email_id: string;
      recipient_email: string;
      resend_id: string | null;
      status: string;
      error_message: string | null;
    }> = [];

    const BATCH_SIZE = 100;
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);
      const emailObjects = batch.map((r) => ({
        from: "Guardiens <bonjour@guardiens.fr>",
        to: [r.email],
        subject,
        html: buildHtml({
          recipientFirstName: toTitleCase(r.first_name),
          authorFirstName,
          listingTitle: sit.title || "",
          listingCity,
          listingExcerpt: excerpt,
          dateRange,
          listingUrl,
          subject,
          coverPhotoUrl,
          petsSentence,
          affinityLine: computeAffinityLine(r, authorFirstName, ownerPetSpecies),
        }),
        tracking: { opens: true, clicks: true },
        tags: [
          { name: "campaign_id", value: campaignId },
          { name: "campaign_type", value: "listing_proximity" },
        ],
      }));
      try {
        const res = await fetch("https://api.resend.com/emails/batch", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify(emailObjects),
        });
        const resBody = await res.text();
        if (res.ok) {
          sent += batch.length;
          let ids: string[] = [];
          try {
            const parsed = JSON.parse(resBody);
            ids = (parsed?.data || []).map((d: any) => d?.id || null);
          } catch { /* ignore */ }
          batch.forEach((r, idx) => {
            sendRows.push({
              mass_email_id: campaignId,
              recipient_email: r.email,
              resend_id: ids[idx] || null,
              status: "sent",
              error_message: null,
            });
          });
        } else {
          console.error(`Listing proximity batch failed (${i}): ${res.status} ${resBody}`);
          errors += batch.length;
          batch.forEach((r) => {
            sendRows.push({
              mass_email_id: campaignId,
              recipient_email: r.email,
              resend_id: null,
              status: "failed",
              error_message: `${res.status}: ${resBody.slice(0, 200)}`,
            });
          });
        }
      } catch (e) {
        console.error(`Listing proximity batch error (${i}):`, e);
        errors += batch.length;
        batch.forEach((r) => {
          sendRows.push({
            mass_email_id: campaignId,
            recipient_email: r.email,
            resend_id: null,
            status: "failed",
            error_message: String(e).slice(0, 200),
          });
        });
      }
      if (i + BATCH_SIZE < recipients.length) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    const INSERT_CHUNK = 500;
    for (let i = 0; i < sendRows.length; i += INSERT_CHUNK) {
      const chunk = sendRows.slice(i, i + INSERT_CHUNK);
      const { error: insErr } = await serviceClient
        .from("mass_email_sends")
        .insert(chunk);
      if (insErr) console.error(`mass_email_sends insert error (chunk ${i}):`, insErr);
    }

    await serviceClient
      .from("mass_emails")
      .update({
        recipients_count: sent,
        status: errors > 0 && sent === 0 ? "error" : "sent",
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

    return new Response(JSON.stringify({ sent, errors, campaign_id: campaignId }), {
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
