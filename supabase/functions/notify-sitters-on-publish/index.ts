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
import {
  APPLY_COMPLETION_THRESHOLD,
  completionMessageFor,
  remainingCompletionSteps,
} from "../_shared/completion-steps/index.ts";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Fenetre de rattrapage, en minutes, sur published_at. */
export const PUBLISH_LOOKBACK_MINUTES = 30;
/**
 * Plafond de destinataires par ANNONCE, pas par execution : `targets` est
 * reconstruit dans la boucle sur les annonces. Dix annonces publiees dans la
 * meme fenetre peuvent donc produire jusqu'a dix fois ce plafond.
 * Valeur alignee sur `c_rank_cap` du declencheur notify_sitters_on_new_sit,
 * pour une seule regle de plafond entre les deux canaux (30/08/2026).
 * Les alertes configurees a la main (`alert_preferences.source IS NULL`)
 * passent hors plafond, les alertes issues de la migration automatique du
 * 31/07 repassent dans le classement normal par distance.
 */
export const MAX_RECIPIENTS_PER_RUN = 100;
/** Source posee par la migration automatique du 31/07/2026, jamais choisie. */
export const MIGRATED_ALERT_SOURCE = "migration_email_preferences_2026_07_31";


/**
 * Taille maximale d'un lot `.in()`. Au dela d'environ 200 identifiants,
 * l'URL PostgREST devient trop longue et la requete echoue : un lot de
 * 500 UUID produit une URL d'environ 19 ko, refusee. Constat du 19/08/2026 :
 * le premier lot de 500 echouait en silence, et les 500 premiers gardiens
 * eligeibles n'etaient jamais charges. Tout lot en echec doit etre remonte,
 * jamais avale.
 */
const IN_BATCH_SIZE = 200;
// Taille de page de la lecture sitter_gallery, paginee explicitement pour
// echapper au plafond de lignes PostgREST (N lignes par gardien).
const GALLERY_PAGE_SIZE = 1000;

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
  const { data: existing, error: lookupErr } = await supabase
    .from("admin_signals")
    .select("id")
    .eq("signal_type", signalType)
    .eq("entity_id", entityId)
    .is("resolved_at", null)
    .limit(1);
  if (lookupErr) {
    console.error("admin signal lookup failed", signalType, lookupErr);
    return;
  }
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

  const denied = await requireCronCaller(req, corsHeaders, "notify-sitters-on-publish");
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
      .select("user_id, zone_type, radius_km, departement, alert_types, active, source")
      .eq("active", true);
    if (prefsErr) throw prefsErr;
    // Ordre deterministe, alertes faites main (source NULL) evaluees avant
    // les migrees a gardien egal : la deduplication `seen` retient la
    // premiere zone rencontree, un gardien ayant configure une alerte a la
    // main est toujours traite comme tel, quel que soit l'ordre de la base.
    const zones = (prefs ?? [])
      .filter((p: any) =>
        Array.isArray(p.alert_types) ? p.alert_types.includes("gardes") : true,
      )
      .sort(
        (a: any, b: any) =>
          String(a.user_id).localeCompare(String(b.user_id)) ||
          (a.source == null ? 0 : 1) - (b.source == null ? 0 : 1),
      );

    for (const sit of (sits ?? []) as any[]) {
      const guard = evaluateSitAlert("nearby-sit-alert", sit.status);
      if (guard.block) continue;

      const { data: owner, error: ownerErr } = await supabase
        .from("profiles")
        .select("id, first_name, city, latitude, longitude, postal_code")
        .eq("id", sit.user_id)
        .maybeSingle();
      if (ownerErr) {
        errors.push(`owner ${sit.id}: ${ownerErr.message}`);
        continue;
      }
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
        const { data: prop, error: propErr } = await supabase
          .from("properties")
          .select("cover_photo_url, photos")
          .eq("id", sit.property_id)
          .maybeSingle();
        if (propErr) console.error("property cover lookup failed", sit.property_id, propErr);
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
      for (let i = 0; i < candidateIds.length; i += IN_BATCH_SIZE) {
        const { data: rows, error: batchErr } = await supabase
          .from("profiles")
          .select("id, first_name, email, city, country, latitude, longitude, postal_code, account_status, role, profile_completion, identity_verified, avatar_url, bio")
          .in("id", candidateIds.slice(i, i + IN_BATCH_SIZE));
        // Un lot en echec ne passe plus inapercu : sans ces profils, le
        // ciblage se tait et des gardiens ne sont jamais prevenus.
        if (batchErr) throw new Error(`profiles batch ${i / IN_BATCH_SIZE}: ${batchErr.message}`);
        for (const r of (rows ?? []) as any[]) sitterById.set(r.id, r);
      }

      // Desabonnements et adresses supprimees, ecartes avant tout envoi.
      const optedOut = new Set<string>();
      for (let i = 0; i < candidateIds.length; i += IN_BATCH_SIZE) {
        const { data: eprefs, error: eprefsErr } = await supabase
          .from("email_preferences")
          .select("user_id, alert_emails, sit_alert_frequency")
          .in("user_id", candidateIds.slice(i, i + IN_BATCH_SIZE));
        if (eprefsErr) throw new Error(`email_preferences batch ${i / IN_BATCH_SIZE}: ${eprefsErr.message}`);
        // Cette diffusion est l'alerte immediate. Elle ne concerne donc que
        // les personnes ayant choisi « a chaque nouvelle annonce ». Les
        // reglages 'weekly' et 'none' sont servis, ou pas, ailleurs.
        for (const p of (eprefs ?? []) as any[]) {
          if (p.alert_emails === false) optedOut.add(p.user_id);
          else if ((p.sit_alert_frequency ?? "immediate") !== "immediate") optedOut.add(p.user_id);
        }
      }
      const emails = [...sitterById.values()].map((s) => String(s.email || "").toLowerCase()).filter(Boolean);
      const suppressed = new Set<string>();
      for (let i = 0; i < emails.length; i += IN_BATCH_SIZE) {
        const { data: sups, error: supsErr } = await supabase
          .from("suppressed_emails")
          .select("email")
          .in("email", emails.slice(i, i + IN_BATCH_SIZE));
        if (supsErr) throw new Error(`suppressed_emails batch ${i / IN_BATCH_SIZE}: ${supsErr.message}`);
        for (const s of (sups ?? []) as any[]) if (s.email) suppressed.add(String(s.email).toLowerCase());
      }

      type Target = {
        user_id: string;
        email: string;
        first_name: string;
        distance_km: number | null;
        manual: boolean;
      };
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
          // Alerte faite main : `source IS NULL`. Un rayon pose par la
          // migration automatique n'est pas un choix, il ne donne donc
          // aucune priorite hors plafond.
          manual: zone.source === null || zone.source === undefined,
        });
      }

      targets.sort((a, b) => (a.distance_km ?? 99999) - (b.distance_km ?? 99999));
      // Priorite hors plafond aux seules alertes configurees a la main,
      // meme regle que le declencheur notify_sitters_on_new_sit.
      const manualTargets = targets.filter((t) => t.manual);
      const rankedTargets = targets.filter((t) => !t.manual);
      let selected = targets;
      if (rankedTargets.length > MAX_RECIPIENTS_PER_RUN) {
        const kept = new Set(rankedTargets.slice(0, MAX_RECIPIENTS_PER_RUN).map((t) => t.user_id));
        selected = targets.filter((t) => t.manual || kept.has(t.user_id));
        const dropped = targets.length - selected.length;
        metrics.dropped_over_cap += dropped;
        await raiseSignal(supabase, "publish_alert_volume_capped", `publish_alert_volume_capped_${sit.id}`, {
          sit_id: sit.id,
          targeted: targets.length,
          sent: selected.length,
          manual: manualTargets.length,
          dropped,
          title: "Alerte de publication ecretee au plafond de volume",
          detail: `${dropped} gardiens ecartes sur cette annonce, plafond de ${MAX_RECIPIENTS_PER_RUN} destinataires par annonce, alertes faites main hors plafond.`,
        });
      }

      metrics.recipients_targeted += selected.length;

      // Incitation a completer le profil (30/08/2026). Depuis le
      // dedoublonnage, une annonce servie en immediat ne repart plus dans le
      // digest : c'est donc cette alerte qui porte desormais la phrase de
      // completion. Meme module que le digest, jamais un bareme duplique.
      // Le calcul detaille n'est fait que pour les destinataires sous le
      // seuil, en requetes groupees, jamais une par personne.
      const completionByUser = new Map<
        string,
        { sentence?: string; steps: number; href?: string }
      >();
      const belowIds = selected
        .filter((t) => (sitterById.get(t.user_id)?.profile_completion ?? 0) < APPLY_COMPLETION_THRESHOLD)
        .map((t) => t.user_id);
      if (belowIds.length > 0) {
        // Regle du digest : en cas d'erreur de lecture, aucune phrase plutot
        // qu'une phrase fausse.
        let readOk = true;
        const sitterRowById = new Map<string, any>();
        for (let i = 0; i < belowIds.length; i += IN_BATCH_SIZE) {
          const { data: srows, error: sErr } = await supabase
            .from("sitter_profiles")
            .select("user_id, competences, lifestyle, interests, languages, life_pace, animal_types")
            .in("user_id", belowIds.slice(i, i + IN_BATCH_SIZE));
          if (sErr) {
            console.error("[publish-alert] lecture sitter_profiles impossible", sErr.message);
            readOk = false;
            break;
          }
          for (const r of (srows ?? []) as any[]) sitterRowById.set(r.user_id, r);
        }
        // Comptage galerie groupe : une seule lecture par lot, agregation en
        // memoire. sitter_gallery porte user_id, la colonne que compte
        // _calculate_sitter_score.
        const galleryCountByUser = new Map<string, number>();
        if (readOk) {
          for (let i = 0; i < belowIds.length; i += IN_BATCH_SIZE) {
            // Pagination explicite : cette lecture renvoie N lignes par
            // gardien, le plafond de lignes PostgREST peut tronquer le lot
            // en silence et poser gallery_count = 0 aux derniers.
            const batchIds = belowIds.slice(i, i + IN_BATCH_SIZE);
            let from = 0;
            for (;;) {
              const { data: grows, error: gErr } = await supabase
                .from("sitter_gallery")
                .select("user_id")
                .in("user_id", batchIds)
                .order("id", { ascending: true })
                .range(from, from + GALLERY_PAGE_SIZE - 1);
              if (gErr) {
                console.error("[publish-alert] lecture sitter_gallery impossible", gErr.message);
                readOk = false;
                break;
              }
              for (const g of (grows ?? []) as any[]) {
                galleryCountByUser.set(g.user_id, (galleryCountByUser.get(g.user_id) ?? 0) + 1);
              }
              if ((grows ?? []).length < GALLERY_PAGE_SIZE) break;
              from += GALLERY_PAGE_SIZE;
            }
            if (!readOk) break;
          }
        }
        if (readOk) {
          for (const uid of belowIds) {
            const prof = sitterById.get(uid);
            if (!prof) continue;
            const sitterRow = sitterRowById.get(uid) ?? {};
            const steps = remainingCompletionSteps({
              first_name: prof.first_name,
              postal_code: prof.postal_code,
              city: prof.city,
              country: prof.country,
              avatar_url: prof.avatar_url,
              bio: prof.bio,
              identity_verified: prof.identity_verified,
              competences: sitterRow.competences,
              lifestyle: sitterRow.lifestyle,
              interests: sitterRow.interests,
              languages: sitterRow.languages,
              life_pace: sitterRow.life_pace,
              animal_types: sitterRow.animal_types,
              gallery_count: galleryCountByUser.get(uid) ?? 0,
            });
            const message = completionMessageFor(prof.profile_completion ?? 0, steps);
            completionByUser.set(uid, {
              sentence: message?.sentence,
              steps: message?.stepCount ?? 0,
              href: message?.href,
            });
          }
        }
      }

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
          const { data: reclaimed, error: reclaimErr } = await supabase
            .from("sit_notification_log")
            .update({ status: "claimed", released_at: null, release_reason: null })
            .eq("idempotency_key", idempotencyKey)
            .eq("status", "released")
            .select("idempotency_key")
            .maybeSingle();
          if (reclaimErr) {
            errors.push(`reclaim ${idempotencyKey}: ${reclaimErr.message}`);
            continue;
          }
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
              canApply: (sitterById.get(t.user_id)?.profile_completion ?? 0) >= APPLY_COMPLETION_THRESHOLD,
              completionSentence: completionByUser.get(t.user_id)?.sentence,
              completionSteps: completionByUser.get(t.user_id)?.steps ?? 0,
              completionHref: completionByUser.get(t.user_id)?.href,
            },
          },
        });
        if (sendErr) {
          metrics.send_failed++;
          errors.push(`send ${idempotencyKey}: ${sendErr.message}`);
          // Relachement non destructif : la ligne reste, l'annonce reste
          // envoyable au passage suivant.
          const { error: releaseErr } = await supabase
            .from("sit_notification_log")
            .update({ status: "released", released_at: new Date().toISOString(), release_reason: "send_failed" })
            .eq("idempotency_key", idempotencyKey);
          if (releaseErr) console.error("release failed", idempotencyKey, releaseErr);
          
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
