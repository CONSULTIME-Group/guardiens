// send-weekly-nearby-digest
// ---------------------------------------------------------------------------
// Resume hebdomadaire de proximite, categorie 'digest'.
//
// Destinataires : les personnes dont au moins un flux est en 'weekly'
//   - sit_alert_frequency = 'weekly'   -> section gardes
//   - mutual_aid_frequency = 'weekly'  -> sections entraide et questions
//
// Regles impératives (voir _shared/weekly-digest-rules.ts) :
//   - total nul, aucun envoi, sortie silencieuse journalisee dans cron_run_log
//   - moins de trois elements, elargissement du rayon par paliers jusqu'a
//     100 km, annonce explicite dans le texte
//   - jamais un element deja notifie a cette personne (sit_notification_log)
//   - heures calmes respectees, via parisWindowVerdict
//
// Body : { manual?: boolean, dry_run?: boolean, user_id?: string }
import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { startCronRun } from "../_shared/cron-run-log.ts";
import { parisWindowVerdict } from "../_shared/paris-hour.ts";
import { claimSitNotification, releaseSitNotification } from "../_shared/sitNotificationClaim.ts";
import { recordDeliveryFailure } from "../_shared/delivery-failure.ts";
import {
  orderAndCap,
  resolveDigestScope,
  shouldSendDigest,
  wideningSentence,
} from "../_shared/weekly-digest-rules.ts";

const TARGET_PARIS_HOUR = 10;
const DEFAULT_RADIUS_KM = 30;
const LOOKBACK_DAYS = 30;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function formatFrDate(iso?: string | null): string | undefined {
  if (!iso) return undefined;
  try {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return iso ?? undefined;
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let body: { manual?: boolean; dry_run?: boolean; user_id?: string } = {};
  try {
    if (req.body) body = await req.json();
  } catch {
    /* corps vide */
  }

  if (!body.manual && !body.dry_run && !body.user_id) {
    const verdict = parisWindowVerdict(new Date(), TARGET_PARIS_HOUR);
    if (!verdict.run) {
      return json({ ok: true, skipped: true, reason: verdict.reason, paris_hour: verdict.parisHour });
    }
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const run = await startCronRun("send-weekly-nearby-digest");
  const metrics = {
    recipients_considered: 0,
    users_sent: 0,
    users_empty: 0,
    users_widened: 0,
    users_skipped: 0,
    send_failed: 0,
  };
  const errors: Array<{ user_id: string; reason: string }> = [];

  try {
    const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 3600 * 1000).toISOString();
    const todayIso = new Date().toISOString().slice(0, 10);

    // 1. Reglages : au moins un flux en hebdomadaire.
    let prefsQ = supabase
      .from("email_preferences")
      .select("user_id, sit_alert_frequency, mutual_aid_frequency, nearby_daily_radius_km")
      .or("sit_alert_frequency.eq.weekly,mutual_aid_frequency.eq.weekly");
    if (body.user_id) prefsQ = prefsQ.eq("user_id", body.user_id);
    const { data: prefs, error: prefsErr } = await prefsQ;
    if (prefsErr) throw prefsErr;
    metrics.recipients_considered = (prefs ?? []).length;
    if ((prefs ?? []).length === 0) {
      await run.finish("success", metrics);
      return json({ ok: true, reason: "no_recipients", ...metrics });
    }

    // 2. Contenu ouvert, charge une seule fois.
    const [{ data: sits }, { data: missions }, { data: questions }] = await Promise.all([
      supabase
        .from("sits")
        .select("id, title, city, start_date, end_date, user_id, status, accepting_applications, profiles:user_id (latitude, longitude)")
        .eq("status", "published")
        .gte("created_at", since),
      supabase
        .from("small_missions")
        .select("id, title, city, mission_type, latitude, longitude, user_id, status, created_at")
        .eq("status", "open")
        .gte("created_at", since),
      supabase
        .from("community_questions")
        .select("id, title, city, latitude, longitude, author_id, status, accepted_answer_id, answers_count, is_hidden, created_at")
        .is("accepted_answer_id", null)
        .gte("created_at", since),
    ]);

    const openSits = (sits ?? []).filter((s: any) => {
      if (s.accepting_applications === false) return false;
      if (s.end_date && s.end_date < todayIso) return false;
      return true;
    });
    const openMissions = missions ?? [];
    const openQuestions = (questions ?? []).filter((q: any) => !q.is_hidden && q.status !== "closed");

    // 3. Destinataires.
    const ids = (prefs ?? []).map((p: any) => p.user_id);
    const profiles: any[] = [];
    for (let i = 0; i < ids.length; i += 200) {
      const { data: chunk } = await supabase
        .from("profiles")
        .select("id, first_name, email, latitude, longitude, account_status")
        .in("id", ids.slice(i, i + 200));
      profiles.push(...(chunk ?? []));
    }
    const prefByUser = new Map((prefs ?? []).map((p: any) => [p.user_id, p]));

    for (const p of profiles) {
      try {
        if (p.account_status && p.account_status !== "active") {
          metrics.users_skipped++;
          continue;
        }
        const email = String(p.email ?? "").trim();
        if (!email) {
          metrics.users_skipped++;
          continue;
        }
        const lat = Number(p.latitude);
        const lng = Number(p.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          metrics.users_skipped++;
          continue;
        }
        const origin = { lat, lng };
        const pref = prefByUser.get(p.id) as any;
        const baseRadius = Number(pref?.nearby_daily_radius_km ?? DEFAULT_RADIUS_KM) || DEFAULT_RADIUS_KM;
        const wantsSits = pref?.sit_alert_frequency === "weekly";
        const wantsMutualAid = pref?.mutual_aid_frequency === "weekly";

        // Adresse supprimee.
        const { data: sup } = await supabase
          .from("suppressed_emails")
          .select("email")
          .ilike("email", email)
          .maybeSingle();
        if (sup) {
          metrics.users_skipped++;
          continue;
        }

        // Elements deja notifies a cette personne, tous pipelines confondus.
        const alreadyNotified = new Set<string>();
        const { data: logRows } = await supabase
          .from("sit_notification_log")
          .select("sit_ids, status")
          .eq("user_id", p.id)
          .limit(500);
        for (const row of (logRows ?? []) as any[]) {
          if (row.status === "released") continue;
          for (const sid of row.sit_ids ?? []) alreadyNotified.add(String(sid));
        }

        type Candidate = {
          kind: "sit" | "mission" | "question";
          id: string;
          distanceKm: number | null;
          payload: Record<string, unknown>;
        };
        const candidates: Candidate[] = [];

        if (wantsSits) {
          for (const s of openSits as any[]) {
            if (s.user_id === p.id) continue;
            if (alreadyNotified.has(String(s.id))) continue;
            const o = s.profiles ?? {};
            const olat = Number(o.latitude);
            const olng = Number(o.longitude);
            if (!Number.isFinite(olat) || !Number.isFinite(olng)) continue;
            const d = haversineKm(origin, { lat: olat, lng: olng });
            candidates.push({
              kind: "sit",
              id: s.id,
              distanceKm: d,
              payload: {
                id: s.id,
                title: s.title,
                city: s.city,
                distanceKm: Math.round(d),
                startDate: formatFrDate(s.start_date),
                endDate: formatFrDate(s.end_date),
              },
            });
          }
        }

        if (wantsMutualAid) {
          for (const m of openMissions as any[]) {
            if (m.user_id === p.id) continue;
            const mlat = Number(m.latitude);
            const mlng = Number(m.longitude);
            if (!Number.isFinite(mlat) || !Number.isFinite(mlng)) continue;
            const d = haversineKm(origin, { lat: mlat, lng: mlng });
            candidates.push({
              kind: "mission",
              id: m.id,
              distanceKm: d,
              payload: {
                id: m.id,
                title: m.title,
                city: m.city,
                distanceKm: Math.round(d),
                missionType: m.mission_type ?? "besoin",
              },
            });
          }
          for (const q of openQuestions as any[]) {
            if (q.author_id === p.id) continue;
            const qlat = Number(q.latitude);
            const qlng = Number(q.longitude);
            if (!Number.isFinite(qlat) || !Number.isFinite(qlng)) continue;
            const d = haversineKm(origin, { lat: qlat, lng: qlng });
            candidates.push({
              kind: "question",
              id: q.id,
              distanceKm: d,
              payload: {
                id: q.id,
                title: q.title,
                city: q.city,
                distanceKm: Math.round(d),
                answersCount: q.answers_count ?? 0,
              },
            });
          }
        }

        const scope = resolveDigestScope(candidates, baseRadius);
        const selected = orderAndCap(scope.items);
        if (!shouldSendDigest(selected.length)) {
          metrics.users_empty++;
          continue;
        }
        if (scope.widened) metrics.users_widened++;

        const templateData = {
          firstName: p.first_name ?? undefined,
          radiusKm: scope.radiusKm,
          baseRadiusKm: scope.baseRadiusKm,
          wideningNotice: wideningSentence(scope.baseRadiusKm, scope.radiusKm),
          sits: selected.filter((c) => c.kind === "sit").map((c) => c.payload),
          missions: selected.filter((c) => c.kind === "mission").map((c) => c.payload),
          questions: selected.filter((c) => c.kind === "question").map((c) => c.payload),
        };

        if (body.dry_run) {
          metrics.users_sent++;
          continue;
        }

        const sitIds = selected.filter((c) => c.kind === "sit").map((c) => c.id);
        if (!body.manual && sitIds.length > 0) {
          const claim = await claimSitNotification(supabase, p.id, "weekly-nearby-digest", sitIds);
          if (!claim.granted) {
            metrics.users_skipped++;
            continue;
          }
        }

        const weekKey = new Date().toISOString().slice(0, 10);
        const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-transactional-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            templateName: "weekly-nearby-digest",
            recipientEmail: email,
            idempotencyKey: `weekly-nearby-${p.id}-${weekKey}`,
            templateData,
          }),
        });
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          metrics.send_failed++;
          await recordDeliveryFailure(supabase, {
            templateName: "weekly-nearby-digest",
            recipientEmail: email,
            recipientId: p.id,
            entityType: "user",
            entityId: p.id,
            source: "send-weekly-nearby-digest",
            errorMessage: `HTTP ${res.status}: ${txt.slice(0, 500)}`,
            extra: { http_status: res.status },
          });
          if (!body.manual && sitIds.length > 0) {
            await releaseSitNotification(supabase, p.id, "send_failed");
          }
          errors.push({ user_id: p.id, reason: `send_failed ${res.status}` });
          continue;
        }
        metrics.users_sent++;
      } catch (loopErr) {
        errors.push({ user_id: p.id, reason: String(loopErr) });
      }
    }

    await run.finish(errors.length > 0 ? "partial" : "success", { ...metrics, errors: errors.slice(0, 20) });
    return json({ ok: true, ...metrics, errors, dry_run: !!body.dry_run });
  } catch (err) {
    await run.fail(err, metrics);
    console.error("send-weekly-nearby-digest fatal", err);
    return json({ error: String(err) }, 500);
  }
});
