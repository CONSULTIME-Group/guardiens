/**
 * ma-ligne
 *
 * Écriture de `profiles.helps_with` en un écran.
 *  - Avec jeton (`mission_action_tokens`, action « helps_with ») : sans connexion.
 *  - Sans jeton : membre connecté, identifié par son JWT.
 * Le jeton est réutilisable tant qu'il est valide (30 jours), révocable via used_at.
 * Seul le prénom est renvoyé au client.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  HELPS_WITH_TOKEN_ACTION,
  RATE_LIMIT_PER_IP,
  RATE_LIMIT_PER_TOKEN,
  RATE_LIMIT_WINDOW_MINUTES,
  isRateLimited,
  isWellFormedToken,
  tokenState,
  validateHelpsWith,
} from "../_shared/ma-ligne-logic.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function sha(value: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

// deno-lint-ignore no-explicit-any
async function hit(service: any, key: string): Promise<number> {
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60000).toISOString();
  const { data } = await service
    .from("anon_insert_throttle")
    .select("count")
    .eq("table_name", key)
    .gte("bucket_minute", since);
  const total = (data ?? []).reduce((sum: number, row: { count: number }) => sum + (row.count ?? 0), 0);
  await service.from("anon_insert_throttle").insert({ table_name: key, bucket_minute: new Date().toISOString(), count: 1 });
  return total;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const service = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

    const body = await req.json().catch(() => ({}));
    const mode = body?.mode === "save" ? "save" : "peek";
    const rawToken = typeof body?.token === "string" ? body.token.trim() : "";

    const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
    const ipKey = `ma-ligne:ip:${await sha(ip)}`;
    if (isRateLimited(await hit(service, ipKey), RATE_LIMIT_PER_IP)) {
      return json({ ok: false, reason: "rate_limited" }, 429);
    }

    let userId: string | null = null;

    if (rawToken) {
      if (!isWellFormedToken(rawToken)) return json({ ok: false, state: "invalid" });
      const tokKey = `ma-ligne:tok:${await sha(rawToken)}`;
      if (isRateLimited(await hit(service, tokKey), RATE_LIMIT_PER_TOKEN)) {
        return json({ ok: false, reason: "rate_limited" }, 429);
      }
      const { data: row } = await service
        .from("mission_action_tokens")
        .select("action, helper_id, expires_at, used_at")
        .eq("token", rawToken)
        .eq("action", HELPS_WITH_TOKEN_ACTION)
        .maybeSingle();
      const state = tokenState(row);
      if (state !== "valid") return json({ ok: false, state });
      userId = row!.helper_id as string;
    } else {
      const auth = req.headers.get("Authorization") ?? "";
      const jwt = auth.replace(/^Bearer\s+/i, "");
      if (!jwt) return json({ ok: false, state: "unauthenticated" }, 401);
      const { data, error } = await service.auth.getUser(jwt);
      if (error || !data?.user) return json({ ok: false, state: "unauthenticated" }, 401);
      userId = data.user.id;
    }

    const { data: profile } = await service
      .from("profiles")
      .select("first_name, helps_with, account_status")
      .eq("id", userId)
      .maybeSingle();
    if (!profile || (profile.account_status && profile.account_status !== "active")) {
      return json({ ok: false, state: "invalid" });
    }
    const firstName = String(profile.first_name ?? "").trim();

    if (mode === "peek") {
      return json({ ok: true, state: "valid", first_name: firstName, helps_with: profile.helps_with ?? "" });
    }

    const check = validateHelpsWith(body?.text);
    if (!check.ok) return json({ ok: false, reason: check.reason }, 400);

    const { error: updErr } = await service
      .from("profiles")
      .update({ helps_with: check.value, available_for_help: true })
      .eq("id", userId);
    if (updErr) {
      console.error("[ma-ligne] update failed", updErr.message);
      return json({ ok: false, reason: "error" }, 500);
    }
    return json({ ok: true, state: "valid", first_name: firstName, helps_with: check.value });
  } catch (e) {
    console.error("[ma-ligne] unexpected", e);
    return json({ ok: false, reason: "error" }, 500);
  }
});
