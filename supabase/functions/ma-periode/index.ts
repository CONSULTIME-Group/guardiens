/**
 * ma-periode (lot N4)
 *
 * Question « Vous partez quand ? ».
 *  - Avec jeton (`departure_tokens`) : sans connexion, source 'email'.
 *  - Sans jeton : membre connecté (JWT), source 'dashboard' (ou 'message').
 * Modes : peek (lecture) et save (enregistre une période, idempotent à la minute).
 * Réponse : prénom, commune, noms d'animaux, préparation, gardiens proches
 * (prénom, photo, distance). Jamais de coordonnées ni d'email.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { isRateLimited, RATE_LIMIT_PER_IP, RATE_LIMIT_PER_TOKEN, RATE_LIMIT_WINDOW_MINUTES } from "../_shared/ma-ligne-logic.ts";
import {
  almaDepartureState,
  departureTokenState,
  isDeparturePeriod,
  isDuplicateAnswer,
  isScannerBurst,
  SCANNER_WINDOW_MS,
  isOwnerV2Holdout,
  isWellFormedDepartureToken,
  type IntentRow,
} from "../_shared/owner-departure-logic.ts";
import { ownerReadiness } from "../_shared/owner-readiness.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function sha(value: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

// deno-lint-ignore no-explicit-any
async function hit(service: any, key: string): Promise<number> {
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60000).toISOString();
  const { data } = await service.from("anon_insert_throttle").select("count").eq("table_name", key).gte("bucket_minute", since);
  const total = (data ?? []).reduce((s: number, r: { count: number }) => s + (r.count ?? 0), 0);
  await service.from("anon_insert_throttle").insert({ table_name: key, bucket_minute: new Date().toISOString(), count: 1 });
  return total;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const body = await req.json().catch(() => ({}));
    const mode = body?.mode === "save" ? "save" : "peek";
    const rawToken = typeof body?.token === "string" ? body.token.trim() : "";

    let userId: string | null = null;
    let source: "email" | "dashboard" | "message" = "dashboard";

    if (rawToken) {
      const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
      if (isRateLimited(await hit(service, `ma-periode:ip:${await sha(ip)}`), RATE_LIMIT_PER_IP)) {
        return json({ ok: false, reason: "rate_limited" }, 429);
      }
      if (!isWellFormedDepartureToken(rawToken)) return json({ ok: false, state: "invalid" });
      if (isRateLimited(await hit(service, `ma-periode:tok:${await sha(rawToken)}`), RATE_LIMIT_PER_TOKEN)) {
        return json({ ok: false, reason: "rate_limited" }, 429);
      }
      const { data: row } = await service.from("departure_tokens")
        .select("profile_id, expires_at, revoked_at").eq("token", rawToken).maybeSingle();
      const state = departureTokenState(row);
      if (state !== "valid") return json({ ok: false, state });
      userId = row!.profile_id as string;
      source = "email";
    } else {
      const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
      if (!jwt) return json({ ok: false, state: "unauthenticated" }, 401);
      const { data, error } = await service.auth.getUser(jwt);
      if (error || !data?.user) return json({ ok: false, state: "unauthenticated" }, 401);
      userId = data.user.id;
      source = body?.source === "message" ? "message" : "dashboard";
    }

    const { data: profile } = await service.from("profiles").select("account_status").eq("id", userId).maybeSingle();
    if (!profile || (profile.account_status && profile.account_status !== "active")) return json({ ok: false, state: "invalid" });

    const { data: lastRows } = await service.from("owner_departure_intents")
      .select("period, answered_at").eq("user_id", userId).neq("source", "scanner_suspect").order("answered_at", { ascending: false }).limit(1);
    let last: IntentRow | null = (lastRows ?? [])[0] ?? null;

    if (mode === "save") {
      const period = body?.period;
      if (!isDeparturePeriod(period)) return json({ ok: false, reason: "invalid_period" }, 400);
      if (!isDuplicateAnswer(last, period)) {
        const answered_at = new Date().toISOString();
        // Robots de messagerie : plusieurs périodes distinctes par le même
        // jeton en moins de deux minutes, toutes marquées scanner_suspect.
        let rowSource: string = source;
        if (source === "email") {
          const since = new Date(Date.now() - SCANNER_WINDOW_MS).toISOString();
          const { data: burst } = await service.from("owner_departure_intents")
            .select("id, period, answered_at").eq("user_id", userId).in("source", ["email", "scanner_suspect"]).gte("answered_at", since);
          if (isScannerBurst(burst ?? [], period)) {
            rowSource = "scanner_suspect";
            const ids = (burst ?? []).map((b: { id: string }) => b.id);
            if (ids.length) await service.from("owner_departure_intents").update({ source: "scanner_suspect" }).in("id", ids);
          }
        }
        const { error } = await service.from("owner_departure_intents").insert({ user_id: userId, period, source: rowSource, answered_at });
        if (error) {
          console.error("[ma-periode] insert failed", error.message);
          return json({ ok: false, reason: "error" }, 500);
        }
        if (rowSource !== "scanner_suspect") last = { period, answered_at };
        else {
          const { data: human } = await service.from("owner_departure_intents").select("period, answered_at")
            .eq("user_id", userId).neq("source", "scanner_suspect").order("answered_at", { ascending: false }).limit(1);
          last = (human ?? [])[0] ?? null;
        }
      }
      if (rawToken) {
        await service.from("departure_tokens").update({ used_at: new Date().toISOString() }).eq("token", rawToken).is("used_at", null);
      }
    }

    const { count: publishedCount } = await service.from("sits").select("id", { count: "exact", head: true })
      .eq("user_id", userId).or("status.neq.draft,published_at.not.is.null");
    // Annonce publiée à venir (lot N7) : le bouton y mène directement.
    const todayParis = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());
    const { data: upcoming } = await service.from("sits").select("id").eq("user_id", userId).eq("status", "published")
      .gte("end_date", todayParis).order("start_date", { ascending: true }).limit(1);
    const payload = await ownerReadiness(service, userId!);

    return json({
      ok: true,
      state: "valid",
      first_name: payload.firstName,
      city: payload.city,
      pet_names: payload.petNames,
      readiness: payload.readiness,
      nearby: payload.nearby,
      period: last?.period ?? null,
      answered_at: last?.answered_at ?? null,
      alma_state: almaDepartureState(last),
      holdout: isOwnerV2Holdout(userId!),
      has_published: (publishedCount ?? 0) > 0,
      upcoming_sit_id: (upcoming ?? [])[0]?.id ?? null,
    });
  } catch (e) {
    console.error("[ma-periode] unexpected", e);
    return json({ ok: false, reason: "error" }, 500);
  }
});
