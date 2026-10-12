/**
 * Lot M1 (12/10/2026) : mesure de l'entraide et trace des envois push.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  endpointHost,
  pushFailure,
  sendWithPushEvents,
} from "../../../supabase/functions/_shared/web-push/send-events";
import { ALMA_SKILLS_ACTION_ID, pickAlmaRail } from "@/lib/almaRailPhrase";

const read = (p: string) => readFileSync(p, "utf8");

function fakeClient(userId: string | null = "u1") {
  const inserts: Array<{ table: string; row: any }> = [];
  const updates: Array<{ table: string; row: any; value: unknown }> = [];
  const rpcs: Array<{ fn: string; args: any }> = [];
  const client = {
    from: (table: string) => ({
      insert: async (row: any) => { inserts.push({ table, row }); return { error: null }; },
      update: (row: any) => ({ eq: async (_c: string, value: unknown) => { updates.push({ table, row, value }); return { error: null }; } }),
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: userId ? { user_id: userId } : null, error: null }) }) }),
    }),
    rpc: async (fn: string, args: any) => { rpcs.push({ fn, args }); return { data: true, error: null }; },
  };
  return { client, inserts, updates, rpcs };
}

const ctx = { channel: "member_test" as const, subscriptionId: "s1", endpoint: "https://fcm.googleapis.com/fcm/send/secret-token", jobId: "r1", eventKind: "test" };

describe("M1, envois push tracés", () => {
  it("hôte seul, jamais l'adresse complète", () => {
    expect(endpointHost(ctx.endpoint)).toBe("fcm.googleapis.com");
    expect(endpointHost("pas une url")).toBeNull();
  });

  it("raison fournie par le service, sans adresse, bornée", () => {
    expect(pushFailure({ statusCode: 410, body: "Gone, see https://x.example/secret" })).toEqual({ http_status: 410, reason: "Gone, see [url]" });
    expect(pushFailure(new Error("timeout"))).toEqual({ http_status: null, reason: "timeout" });
    expect(pushFailure({})).toEqual({ http_status: null, reason: "network_ambiguous" });
    expect(pushFailure({ statusCode: 500, body: "x".repeat(400) }).reason!.length).toBe(160);
    // Code présent, corps vide : le message générique de la bibliothèque n'est pas une raison.
    expect(pushFailure({ statusCode: 410, body: "", message: "Received unexpected response code" })).toEqual({ http_status: 410, reason: null });
  });

  it("succès : tentative puis succès, last_success_at mis à jour (envoi de test)", async () => {
    const f = fakeClient();
    const status = await sendWithPushEvents(f.client, ctx, async () => 201, { manageSubscription: true });
    expect(status).toBe(201);
    expect(f.inserts.map((i) => i.row.event_type)).toEqual(["push_send_attempted", "push_send_succeeded"]);
    expect(f.inserts.every((i) => i.table === "analytics_events" && i.row.user_id === "u1")).toBe(true);
    expect(f.updates).toHaveLength(1);
    expect(f.updates[0]).toMatchObject({ table: "push_subscriptions", value: "s1" });
    expect(typeof f.updates[0].row.last_success_at).toBe("string");
    expect(JSON.stringify(f.inserts)).not.toContain("secret-token");
  });

  it("410 : échec tracé avec code, hôte et raison, abonnement désactivé, erreur relancée", async () => {
    const f = fakeClient();
    const gone = Object.assign(new Error("unexpected"), { statusCode: 410, body: "expired" });
    await expect(sendWithPushEvents(f.client, ctx, async () => { throw gone; }, { manageSubscription: true })).rejects.toBe(gone);
    const failed = f.inserts[1].row;
    expect(failed.event_type).toBe("push_send_failed");
    expect(failed.metadata).toMatchObject({ http_status: 410, endpoint_host: "fcm.googleapis.com", reason: "expired", channel: "member_test" });
    expect(f.rpcs).toEqual([{ fn: "push_disable_subscription", args: { p_subscription_id: "s1", p_reason: "http_410" } }]);
  });

  it("403 : échec tracé, abonnement gardé (jeton serveur possible, lot N1)", async () => {
    const f = fakeClient();
    await expect(sendWithPushEvents(f.client, ctx, async () => { throw { statusCode: 403 }; }, { manageSubscription: true })).rejects.toBeTruthy();
    expect(f.inserts[1].row.metadata.http_status).toBe(403);
    expect(f.rpcs).toEqual([]);
  });

  it("dispatcher : aucune double gestion de l'abonnement", async () => {
    const f = fakeClient();
    await sendWithPushEvents(f.client, { ...ctx, channel: "dispatch" }, async () => 201, { manageSubscription: false });
    await expect(sendWithPushEvents(f.client, { ...ctx, channel: "dispatch" }, async () => { throw { statusCode: 404 }; }, { manageSubscription: false })).rejects.toBeTruthy();
    expect(f.updates).toEqual([]);
    expect(f.rpcs).toEqual([]);
  });

  it("une trace en panne ne bloque jamais l'envoi", async () => {
    const client = {
      from: () => ({ insert: async () => { throw new Error("down"); }, update: () => ({ eq: async () => ({ error: null }) }), select: () => ({ eq: () => ({ maybeSingle: async () => { throw new Error("down"); } }) }) }),
      rpc: async () => ({ data: true, error: null }),
    };
    await expect(sendWithPushEvents(client, ctx, async () => 201, { manageSubscription: true })).resolves.toBe(201);
  });

  it("le limiteur anonyme laisse passer le service_role (migration préparée)", () => {
    const sql = read("supabase/prepared-migrations/20261012090000_m1_limiteur_anonyme_service_role.sql");
    expect(sql).toContain("IF auth.uid() IS NOT NULL OR COALESCE(auth.role(), '') = 'service_role' THEN");
    expect(sql).toContain("RAISE EXCEPTION 'Rate limit exceeded for anonymous inserts on %'");
  });

  it("les trois chemins d'envoi passent par la trace", () => {
    expect(read("supabase/functions/dispatch-web-push/index.ts")).toContain("{ manageSubscription: false }");
    expect(read("supabase/functions/push-self-test/index.ts")).toContain("{ manageSubscription: true }");
    expect(read("supabase/functions/send-web-push-test/index.ts")).toContain("{manageSubscription:true}");
  });
});

describe("M1, événements d'entraide", () => {
  it("tuile d'idée : tile_id stable et page d'origine", () => {
    const hub = read("src/pages/EntraideHub.tsx");
    expect(hub).toContain('trackEvent("entraide_idea_tile_clicked", {');
    expect(hub).toContain("tile_id: key,");
    expect(hub).toContain("source: typeof window !== \"undefined\" ? window.location.pathname : null,");
  });

  it("carte Alma savoir-faire : action_id porté par l'action", () => {
    const r = pickAlmaRail({ variant: "confirmed", hidden: false, profileCompletion: 80, isAvailable: true, skillsMissing: true });
    expect(r.action?.id).toBe(ALMA_SKILLS_ACTION_ID);
    expect(read("src/components/dashboard/sitter/AlmaRailWhisper.tsx")).toContain("action_id: action.id");
  });

  it("projet publié : mêmes clés que mission_composer_submitted", () => {
    const src = read("src/pages/CreateProjet.tsx");
    const block = src.slice(src.indexOf('trackEvent("projet_composer_submitted"'), src.indexOf("} catch", src.indexOf('trackEvent("projet_composer_submitted"')));
    for (const key of ["mission_id:", "category:", "mission_type:"]) expect(block).toContain(key);
  });
});
