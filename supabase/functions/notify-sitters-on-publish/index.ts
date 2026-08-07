/**
 * notify-sitters-on-publish
 * -------------------------------------------------------------------------
 * Alerte automatique des gardiens a la publication d'une annonce.
 *
 * Constat du 07/08/2026 : les 562 alertes 'nearby-sit-alert' en base portaient
 * toutes le prefixe 'listing-proximity-', c'est a dire la diffusion manuelle
 * depuis l'admin. Aucun cron n'appelait send-listing-proximity, donc quand un
 * proprietaire publiait, aucun gardien n'etait prevenu.
 *
 * Cadence : toutes les 15 minutes, sur les annonces passees en 'published'
 * dans les 30 dernieres minutes (fenetre volontairement plus large que la
 * cadence, pour absorber un passage rate).
 *
 * Ciblage : les preferences d'alerte actives, dans leur zone reelle.
 *   - 'rayon'       : le rayon choisi par la personne (radius_km), jamais
 *                     ecrase par une valeur fixe.
 *   - 'departement' : code de departement deduit du code postal.
 *   - 'france'      : tout le pays.
 *
 * Idempotence stricte : une ligne 'sit_notification_log' par couple annonce et
 * gardien, cle 'publish-alert-{sit_id}-{user_id}'. Un second passage dans la
 * meme fenetre n'envoie rien de plus.
 */
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { startCronRun } from "../_shared/cron-run-log.ts";
import { requireCronCaller } from "../_shared/require-cron-caller.ts";
import { evaluateSitAlert, PUBLISHED_STATUS } from "../_shared/sit-alert-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Fenetre de rattrapage, en minutes, sur published_at. */
export const PUBLISH_LOOKBACK_MINUTES = 30;
/** Plafond de destinataires par execution. Au dela, on ecarte et on signale. */
export const MAX_RECIPIENTS_PER_RUN = 150;

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Code de departement a partir d'un code postal francais. */
export function deptFromPostal(postal: string | null | undefined): string | null {
  const clean = String(postal ?? "").trim();
  if (!/^\d{5}$/.test(clean)) return null;
  if (clean.startsWith("97") || clean.startsWith("98")) return clean.slice(0, 3);
  return clean.slice(0, 2);
}

export interface AlertZone {
  zone_type: string;
  radius_km: number | null;
  departement: string | null;
}

export interface SitLocation {
  lat: number | null;
  lon: number | null;
  dept: string | null;
}

export interface SitterLocation {
  lat: number | null;
  lon: number | null;
  postal_code: string | null;
}

/**
 * Decision pure de ciblage : cette zone d'alerte couvre-t-elle cette annonce ?
 * Renvoie la distance quand elle est calculable, pour trier par proximite.
 */
export function zoneMatches(
  zone: AlertZone,
  sit: SitLocation,
  sitter: SitterLocation,
): { match: boolean; distanceKm: number | null } {
  const distanceKm =
    sit.lat != null && sit.lon != null && sitter.lat != null && sitter.lon != null
      ? Math.round(haversineKm(sit.lat, sit.lon, sitter.lat, sitter.lon) * 10) / 10
      : null;

  if (zone.zone_type === "france") return { match: true, distanceKm };

  if (zone.zone_type === "departement") {
    const zoneDept = (zone.departement ?? "").trim() || deptFromPostal(sitter.postal_code);
    return { match: !!zoneDept && !!sit.dept && zoneDept === sit.dept, distanceKm };
  }

  if (zone.zone_type === "rayon") {
    // Le rayon choisi par la personne fait foi. Sans rayon renseigne, on ne
    // devine pas : la zone ne cible rien.
    if (zone.radius_km == null || distanceKm == null) return { match: false, distanceKm };
    return { match: distanceKm <= zone.radius_km, distanceKm };
  }

  // 'region' et toute valeur inconnue : hors perimetre de ce cron.
  return { match: false, distanceKm };
}

function toTitleCase(s: string | null | undefined): string {
  const clean = (s ?? "").toString().trim();
  if (!clean) return "";
  return clean
    .split(/(\s|-)/)
    .map((part) => (/\s|-/.test(part) ? part : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()))
    .join("");
}

function formatDateFr(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

async function uuidFromString(input: string): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input)));
  const hex = Array.from(bytes.slice(0, 16)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

async function raiseSignal(
  supabase: SupabaseClient,
  signalType: string,
  key: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  const entityId = await uuidFromString(key);
  const { data: existing } = await supabase
    .from("admin_signals")
    .select("id")
    .eq("signal_type", signalType)
    .eq("entity_id", entityId)
    .is("resolved_at", null)
    .limit(1);
  if (existing && existing.length > 0) return;
  const { error } = await supabase.from("admin_signals").insert({
    signal_type: signalType,
    severity: "warning",
    entity_type: "sit",
    entity_id: entityId,
    metadata,
  });
  if (error && error.code !== "23505") console.error("admin signal insert failed", signalType, error);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const denied = await requireCronCaller(req, corsHeaders);
  if (denied) return denied;

  const run = await startCronRun("notify-sitters-on-publish");
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const metrics = {
    sits_considered: 0,
    recipients_targeted: 0,
    emails_sent: 0,
    already_notified: 0,
    send_failed: 0,
    dropped_over_cap: 0,
  };
  const errors: string[] = [];

  try {
    const since = new Date(Date.now() - PUBLISH_LOOKBACK_MINUTES * 60_000).toISOString();
    const { data: sits, error: sitsErr } = await supabase
      .from("sits")
      .select("id, title, city, start_date, end_date, status, user_id, property_id, cover_photo_url, published_at")
      .eq("status", PUBLISHED_STATUS)
      .gte("published_at", since)
      .order("published_at", { ascending: true });
    if (sitsErr) throw sitsErr;

    metrics.sits_considered = (sits ?? []).length;

    // Zones d'alerte actives portant sur les gardes, chargees une fois.
    const { data: prefs, error: prefsErr } = await supabase
      .from("alert_preferences")
      .select("user_id, zone_type, radius_km, departement, alert_types, active")
      .eq("active", true);
    if (prefsErr) throw prefsErr;
    const zones = (prefs ?? []).filter((p: any) =>
      Array.isArray(p.alert_types) ? p.alert_types.includes("gardes") : true,
    );

    for (const sit of (sits ?? []) as any[]) {
      const guard = evaluateSitAlert("nearby-sit-alert", sit.status);
      if (guard.block) continue;

      const { data: owner } = await supabase
        .from("profiles")
        .select("id, first_name, city, latitude, longitude, postal_code")
        .eq("id", sit.user_id)
        .maybeSingle();
      if (!owner) continue;

      const sitLocation: SitLocation = {
        lat: (owner as any).latitude ?? null,
        lon: (owner as any).longitude ?? null,
        dept: deptFromPostal((owner as any).postal_code),
      };
      const ownerFirstName = toTitleCase((owner as any).first_name);
      const listingCity = String(sit.city || (owner as any).city || "").trim();

      // Animaux et photo, pour un email qui dit quelque chose.
      let coverPhotoUrl: string | null = (sit.cover_photo_url || "").trim() || null;
      if (!coverPhotoUrl && sit.property_id) {
        const { data: prop } = await supabase
          .from("properties")
          .select("cover_photo_url, photos")
          .eq("id", sit.property_id)
          .maybeSingle();
        const photos = (prop as any)?.photos as string[] | null;
        coverPhotoUrl =
          ((prop as any)?.cover_photo_url || "").trim() ||
          (Array.isArray(photos) ? photos.find((p) => typeof p === "string" && p.trim()) ?? null : null);
      }

      const candidateIds = [...new Set(zones.map((z: any) => z.user_id as string))].filter(
        (id) => id !== sit.user_id,
      );
      if (candidateIds.length === 0) continue;

      const sitterById = new Map<string, any>();
      const CH = 500;
      for (let i = 0; i < candidateIds.length; i += CH) {
        const { data: rows } = await supabase
          .from("profiles")
          .select("id, first_name, email, city, latitude, longitude, postal_code, account_status, role")
          .in("id", candidateIds.slice(i, i + CH));
        for (const r of (rows ?? []) as any[]) sitterById.set(r.id, r);
      }

      // Desabonnements et adresses supprimees, ecartes avant tout envoi.
      const optedOut = new Set<string>();
      for (let i = 0; i < candidateIds.length; i += CH) {
        const { data: eprefs } = await supabase
          .from("email_preferences")
          .select("user_id, alert_emails")
          .in("user_id", candidateIds.slice(i, i + CH));
        for (const p of (eprefs ?? []) as any[]) if (p.alert_emails === false) optedOut.add(p.user_id);
      }
      const emails = [...sitterById.values()].map((s) => String(s.email || "").toLowerCase()).filter(Boolean);
      const suppressed = new Set<string>();
      for (let i = 0; i < emails.length; i += CH) {
        const { data: sups } = await supabase
          .from("suppressed_emails")
          .select("email")
          .in("email", emails.slice(i, i + CH));
        for (const s of (sups ?? []) as any[]) if (s.email) suppressed.add(String(s.email).toLowerCase());
      }

      type Target = { user_id: string; email: string; first_name: string; distance_km: number | null };
      const targets: Target[] = [];
      const seen = new Set<string>();
      for (const zone of zones as any[]) {
        if (seen.has(zone.user_id)) continue;
        const sitter = sitterById.get(zone.user_id);
        if (!sitter) continue;
        if (!sitter.email) continue;
        if (sitter.account_status && sitter.account_status !== "active") continue;
        if (!["sitter", "both"].includes(String(sitter.role || ""))) continue;
        if (optedOut.has(zone.user_id)) continue;
        if (suppressed.has(String(sitter.email).toLowerCase())) continue;

        const verdict = zoneMatches(
          { zone_type: zone.zone_type, radius_km: zone.radius_km, departement: zone.departement },
          sitLocation,
          { lat: sitter.latitude ?? null, lon: sitter.longitude ?? null, postal_code: sitter.postal_code ?? null },
        );
        if (!verdict.match) continue;
        seen.add(zone.user_id);
        targets.push({
          user_id: zone.user_id,
          email: String(sitter.email).trim(),
          first_name: sitter.first_name || "",
          distance_km: verdict.distanceKm,
        });
      }

      targets.sort((a, b) => (a.distance_km ?? 99999) - (b.distance_km ?? 99999));
      let selected = targets;
      if (targets.length > MAX_RECIPIENTS_PER_RUN) {
        selected = targets.slice(0, MAX_RECIPIENTS_PER_RUN);
        const dropped = targets.length - selected.length;
        metrics.dropped_over_cap += dropped;
        await raiseSignal(supabase, "publish_alert_volume_capped", `publish_alert_volume_capped_${sit.id}`, {
          sit_id: sit.id,
          targeted: targets.length,
          sent: selected.length,
          dropped,
          title: "Alerte de publication ecretee au plafond de volume",
          detail: `${dropped} gardiens ecartes sur cette annonce, plafond de ${MAX_RECIPIENTS_PER_RUN} destinataires par execution.`,
        });
      }
      metrics.recipients_targeted += selected.length;

      for (const t of selected) {
        const idempotencyKey = `publish-alert-${sit.id}-${t.user_id}`;
        // Idempotence stricte : la cle primaire de sit_notification_log
        // interdit un second envoi, meme si le cron repasse. Une ligne
        // relachee apres un echec technique reste en base, et redevient
        // envoyable au passage suivant, sans jamais disparaitre du journal.
        const { error: claimErr } = await supabase.from("sit_notification_log").insert({
          idempotency_key: idempotencyKey,
          user_id: t.user_id,
          source: "notify-sitters-on-publish",
          sit_ids: [sit.id],
        });
        if (claimErr) {
          if (claimErr.code !== "23505") {
            errors.push(`claim ${idempotencyKey}: ${claimErr.message}`);
            continue;
          }
          const { data: reclaimed } = await supabase
            .from("sit_notification_log")
            .update({ status: "claimed", released_at: null, release_reason: null })
            .eq("idempotency_key", idempotencyKey)
            .eq("status", "released")
            .select("idempotency_key")
            .maybeSingle();
          if (!reclaimed) {
            metrics.already_notified++;
            continue;
          }
        }


        const { error: sendErr } = await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "nearby-sit-alert",
            recipientEmail: t.email,
            idempotencyKey,
            templateData: {
              sitterFirstName: toTitleCase(t.first_name) || undefined,
              ownerFirstName: ownerFirstName || undefined,
              sitTitle: sit.title || undefined,
              city: listingCity || undefined,
              distanceKm: t.distance_km ?? undefined,
              startDate: formatDateFr(sit.start_date) || undefined,
              endDate: formatDateFr(sit.end_date) || undefined,
              sitId: sit.id,
              coverPhotoUrl: coverPhotoUrl || null,
            },
          },
        });
        if (sendErr) {
          metrics.send_failed++;
          errors.push(`send ${idempotencyKey}: ${sendErr.message}`);
          // Relachement non destructif : la ligne reste, l'annonce reste
          // envoyable au passage suivant.
          await supabase
            .from("sit_notification_log")
            .update({ status: "released", released_at: new Date().toISOString(), release_reason: "send_failed" })
            .eq("idempotency_key", idempotencyKey);
          await supabase.from("sit_notification_log").delete().eq("idempotency_key", idempotencyKey);
        } else {
          metrics.emails_sent++;
        }
      }
    }

    await run.finish(errors.length > 0 ? "partial" : "success", { ...metrics, errors: errors.slice(0, 20) });
    return new Response(JSON.stringify({ success: true, ...metrics }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    await run.fail(err, metrics);
    console.error("notify-sitters-on-publish error", err);
    return new Response(JSON.stringify({ error: String((err as Error).message || err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
