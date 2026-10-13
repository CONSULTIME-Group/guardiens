/**
 * Lot Z (14/10/2026), cloche et notifications.
 *
 * - Aucune notification écrite pour autrui depuis le navigateur : la RLS
 *   (auth.uid() = user_id) la refuse sans bruit. Seuls les écrans admin
 *   gardent l'écriture (politique notifications_admin_insert).
 * - Les boutons d'entraide de la messagerie passent par le chemin officiel
 *   (accept_mission_response, notify-mission-event).
 * - Pastilles et familles d'Alma couvrent les types réellement créés.
 * - Liens : « Tout voir », plus de /pricing ni de /mes-gardes.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  NOTIFICATION_KINDS,
  URGENT_NOTIFICATION_TYPES,
  isUrgentNotification,
  notificationCategory,
  notificationTone,
} from "@/lib/notificationKinds";

const calls = vi.hoisted(() => ({
  rpc: [] as Array<{ name: string; args: any }>,
  invoke: [] as Array<{ name: string; body: any }>,
  updates: [] as Array<{ table: string; values: any; filters: Array<[string, string, any]> }>,
  rpcResult: { data: null as any, error: null as any },
  updateRows: [{ id: "r1" }] as any[],
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn(async (name: string, args: any) => {
      calls.rpc.push({ name, args });
      return calls.rpcResult;
    }),
    functions: {
      invoke: vi.fn(async (name: string, opts: any) => {
        calls.invoke.push({ name, body: opts?.body });
        return { data: null, error: null };
      }),
    },
    from: (table: string) => {
      const entry = { table, values: null as any, filters: [] as Array<[string, string, any]> };
      const chain: any = {
        update: (values: any) => { entry.values = values; calls.updates.push(entry); return chain; },
        eq: (c: string, v: any) => { entry.filters.push(["eq", c, v]); return chain; },
        is: (c: string, v: any) => { entry.filters.push(["is", c, v]); return chain; },
        select: async () => ({ data: calls.updateRows, error: null }),
        then: (resolve: any) => resolve({ data: null, error: null }),
      };
      return chain;
    },
  },
}));

import {
  chooseMissionResponse,
  declineMissionResponse,
  declinedIdsFrom,
} from "@/lib/missionResponseDecision";
import { markAllNotificationsRead } from "@/lib/notificationsRead";

const read = (p: string) => readFileSync(p, "utf8");

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return name === "__tests__" ? [] : walk(p);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [p] : [];
  });

const SRC_FILES = walk("src");

/** Types vus en base sur 60 jours au 13/10/2026 (SELECT type, count(*) ...). */
const TYPES_IN_BASE = [
  "new_sit_nearby", "mission_help_needed", "new_message", "new_application", "info",
  "identity_verified", "identity_rejected", "mission_wave_relaunch", "reminder_48h",
  "application_cancelled", "application_closed", "application_rejected", "reminder_7days",
  "sit_expired", "mission_response_received", "sit_unconfirmed", "review_reminder_j1",
  "sit_completed", "mission_auto_closed", "experience_verified", "accord_ready_for_sitter",
  "sit_started", "sit_invitation", "review_published", "mission_cancelled", "mission_wave_empty",
  "review_reminder_j5", "mission_declined", "identity_pending", "mission_accepted",
  "listing_deleted", "mission_auto_completed", "mission_place_missing", "mission_invitation",
  "accord_signed_both", "question_answer_received", "application_reopened",
];

/** Types créés par les triggers, fonctions edge et écrans admin encore actifs. */
const TYPES_FROM_CREATORS = [
  "sit_confirmed", "application_accepted", "sit_cancelled", "sit_republished",
  "long_stay_application_rejected", "long_stay_application_cancelled", "reinvitation",
  "sit_proposal_declined", "sit_proposal_closed", "review_dispute", "dispute_resolved",
  "mission_feedback_received", "mission_thanks_received", "mission_completed",
  "mission_response_withdrawn", "mission_meetup_prompt", "mission_first_help_badge",
  "emergency_alert", "admin_contact", "listing_hidden", "experience_rejected",
  "experience_complement", "identity_remind_complete", "identity_remind_review",
  "identity_resend_request", "subscription_offered",
];

describe("lot Z, aucune notification pour autrui depuis le front", () => {
  const INSERT = /\.from\(\s*["'`]notifications["'`](?:\s+as\s+any)?\s*\)\s*\.insert\(/;

  it("seuls les écrans admin écrivent dans notifications", () => {
    const offenders = SRC_FILES.filter(
      (f) => !f.startsWith(join("src", "pages", "admin")) && INSERT.test(read(f)),
    );
    expect(offenders).toEqual([]);
  });

  it("messagerie, proposition d'échange et acceptation de candidature n'écrivent plus de notification", () => {
    for (const f of [
      "src/components/messages/ConversationHeader.tsx",
      "src/components/missions/ProposeHelperExchangeDialog.tsx",
      "src/hooks/useAcceptApplication.tsx",
    ]) {
      expect(read(f), f).not.toMatch(/from\(\s*["']notifications["']\s*\)/);
    }
    expect(read("src/components/missions/ProposeHelperExchangeDialog.tsx")).not.toContain("mission_proposal");
  });
});

describe("lot Z, boutons d'entraide de la messagerie", () => {
  const header = read("src/components/messages/ConversationHeader.tsx");
  const banner = read("src/components/messages/MissionChooseBanner.tsx");
  const lib = read("src/lib/missionResponseDecision.ts");

  it("Accepter l'échange et Décliner passent par le module partagé", () => {
    const accept = header.slice(header.indexOf("const handleAcceptExchange"), header.indexOf("const handleDeclineExchange"));
    const decline = header.slice(header.indexOf("const handleDeclineExchange"), header.indexOf("const [markingDone"));
    expect(accept).toContain("chooseMissionResponse(");
    expect(accept).not.toMatch(/\.update\(/);
    expect(accept).toContain('declineOthers: missionData.category !== "projet"');
    expect(decline).toContain("declineMissionResponse(");
    expect(decline).not.toMatch(/\.update\(/);
    expect(header).toContain('<Button size="sm" onClick={handleAcceptExchange} disabled={deciding}>Accepter l\'échange</Button>');
  });

  it("le bandeau Choisir suit le même chemin", () => {
    expect(banner).toContain("chooseMissionResponse(");
    expect(banner).not.toContain('rpc("accept_mission_response"');
  });

  it("le module appelle la RPC puis notify-mission-event", () => {
    expect(lib).toMatch(/rpc\("accept_mission_response",\s*\{\s*p_response_id: input\.responseId,\s*p_decline_others: input\.declineOthers/);
    expect(lib).toContain('event_type: "mission_accepted"');
    expect(lib).toContain('event_type: "mission_declined"');
    expect(lib).toContain('functions.invoke("notify-mission-event"');
    expect(lib).toContain('.eq("status", "pending" as any)');
    expect(lib).not.toMatch(/from\(\s*["']notifications["']\s*\)/);
  });

  beforeEach(() => {
    calls.rpc = [];
    calls.invoke = [];
    calls.updates = [];
    calls.updateRows = [{ id: "r1" }];
    calls.rpcResult = { data: null, error: null };
  });

  const input = { responseId: "r1", missionId: "m1", actorId: "author", responderId: "helper" };

  it("retenir : RPC, puis mission_accepted pour la personne et mission_declined pour les écartées", async () => {
    calls.rpcResult = { data: { conversation_id: "c1", declined_responder_ids: ["x", "y"] }, error: null };
    const res = await chooseMissionResponse({ ...input, declineOthers: true });
    expect(res).toEqual({ ok: true, conversationId: "c1", declinedIds: ["x", "y"] });
    expect(calls.rpc).toEqual([{ name: "accept_mission_response", args: { p_response_id: "r1", p_decline_others: true } }]);
    expect(calls.invoke).toEqual([
      { name: "notify-mission-event", body: { event_type: "mission_accepted", mission_id: "m1", actor_id: "author", target_ids: ["helper"], metadata: { conversation_id: "c1" } } },
      { name: "notify-mission-event", body: { event_type: "mission_declined", mission_id: "m1", actor_id: "author", target_ids: ["x", "y"] } },
    ]);
  });

  it("retenir : une erreur de la RPC ne prévient personne", async () => {
    calls.rpcResult = { data: null, error: { message: "response_not_pending: accepted" } };
    const res = await chooseMissionResponse({ ...input, declineOthers: false });
    expect(res).toEqual({ ok: false, reason: "not_pending", message: "response_not_pending: accepted" });
    expect(calls.invoke).toEqual([]);
  });

  it("décliner : proposition pending seulement, puis mission_declined", async () => {
    const res = await declineMissionResponse(input);
    expect(res.ok).toBe(true);
    expect(calls.updates).toEqual([{
      table: "small_mission_responses",
      values: { status: "declined" },
      filters: [["eq", "id", "r1"], ["eq", "status", "pending"]],
    }]);
    expect(calls.invoke).toEqual([
      { name: "notify-mission-event", body: { event_type: "mission_declined", mission_id: "m1", actor_id: "author", target_ids: ["helper"] } },
    ]);
  });

  it("décliner : rien à décliner, personne n'est prévenu", async () => {
    calls.updateRows = [];
    const res = await declineMissionResponse(input);
    expect(res).toEqual({ ok: false, reason: "not_pending" });
    expect(calls.invoke).toEqual([]);
  });

  it("Tout marquer comme lu : toutes les non lues du membre", async () => {
    const res = await markAllNotificationsRead("me");
    expect(res.ok).toBe(true);
    expect(calls.updates).toHaveLength(1);
    expect(calls.updates[0].table).toBe("notifications");
    expect(Object.keys(calls.updates[0].values)).toEqual(["read_at"]);
    expect(calls.updates[0].filters).toEqual([["eq", "user_id", "me"], ["is", "read_at", null]]);
  });

  it("declinedIdsFrom lit les personnes écartées par la RPC", () => {
    expect(declinedIdsFrom({ declined_responder_ids: ["a", "b", 3] })).toEqual(["a", "b"]);
    expect(declinedIdsFrom({})).toEqual([]);
    expect(declinedIdsFrom(null)).toEqual([]);
  });
});

describe("lot Z, types de notification", () => {
  it("chaque type vu en base ou créé aujourd'hui a une pastille et une famille", () => {
    const missing = [...TYPES_IN_BASE, ...TYPES_FROM_CREATORS].filter((t) => !NOTIFICATION_KINDS[t]);
    expect(missing).toEqual([]);
    for (const t of TYPES_IN_BASE) expect(notificationCategory(t), t).not.toBe("other");
  });

  it("types jamais créés retirés", () => {
    expect(NOTIFICATION_KINDS.sitter_available).toBeUndefined();
    expect(NOTIFICATION_KINDS.mission_proposal).toBeUndefined();
  });

  it("urgentes : candidature et proposition d'aide reçues, aide acceptée, message", () => {
    expect([...URGENT_NOTIFICATION_TYPES].sort()).toEqual(
      ["mission_accepted", "mission_response_received", "new_application", "new_message"],
    );
    expect(isUrgentNotification("mission_proposal")).toBe(false);
  });

  it("familles lues par Alma", () => {
    expect(notificationCategory("mission_response_received")).toBe("applications");
    expect(notificationCategory("new_application")).toBe("applications");
    expect(notificationCategory("new_message")).toBe("messages");
    expect(notificationCategory("review_published")).toBe("social");
    expect(notificationCategory("new_sit_nearby")).toBe("annonces");
    expect(notificationCategory("type_inconnu")).toBe("other");
    expect(notificationTone("type_inconnu")).toBe("muted");
    expect(notificationTone("sit_cancelled")).toBe("destructive");
  });

  it("cloche, page et Alma lisent la table partagée", () => {
    expect(read("src/components/notifications/NotificationItem.tsx")).toContain("notificationTone(n.type)");
    expect(read("src/components/notifications/NotificationItem.tsx")).not.toContain("const typeTone");
    const alma = read("src/components/ai/alma/AlmaNotifSummaryBubble.tsx");
    expect(alma).toContain("notificationCategory(n.type)");
    expect(alma).toContain("isUrgentNotification(n.type)");
    expect(alma).not.toContain("sitter_available");
    const page = read("src/pages/Notifications.tsx");
    expect(page).toContain("isUrgentNotification(n.type)");
    expect(page).not.toContain("mission_proposal");
  });
});

describe("lot Z, lecture des notifications", () => {
  const lib = read("src/lib/notificationsRead.ts");
  const bell = read("src/components/layout/NotificationBell.tsx");
  const page = read("src/pages/Notifications.tsx");
  const item = read("src/components/notifications/NotificationItem.tsx");

  it("Tout marquer comme lu vise toutes les non lues du membre en base", () => {
    const fn = lib.slice(lib.indexOf("export async function markAllNotificationsRead"), lib.indexOf("export async function markNotificationRead"));
    expect(fn).toContain('.eq("user_id", userId)');
    expect(fn).toContain('.is("read_at", null)');
    expect(fn).not.toContain('.in("id"');
    expect(bell).toContain("markAllNotificationsRead(userId)");
    expect(page).toContain("markAllNotificationsRead(userId)");
    expect(bell).not.toContain('.in("id", unreadIds)');
    expect(page).not.toContain('.in("id", ids)');
  });

  it("un clic sur /notifications marque la notification comme lue", () => {
    expect(item).toContain("onClick={handleOpen}");
    expect(item).toMatch(/const handleOpen = \(\) => \{\s*if \(isUnread\) onMarkRead\(n\.id\);/);
  });

  it("la cloche mène à /notifications", () => {
    expect(bell).toMatch(/to="\/notifications"[\s\S]{0,200}Tout voir/);
  });
});

describe("lot Z, liens et code mort", () => {
  const app = read("src/App.tsx");

  it("les routes visées existent", () => {
    expect(app).toContain('path="/notifications"');
    expect(app).toContain('path="/tarifs"');
  });

  it("plus aucun lien vers /pricing ni /mes-gardes", () => {
    const LINK = /["'`]\/(pricing|mes-gardes)\b/;
    const offenders = SRC_FILES.filter((f) => LINK.test(read(f)));
    expect(offenders).toEqual([]);
    expect(app).not.toContain('path="/pricing"');
    expect(app).not.toContain('path="/mes-gardes"');
  });

  it("plus de cas verrouillé dans la cloche ni la page", () => {
    for (const f of [
      "src/components/layout/NotificationBell.tsx",
      "src/components/notifications/NotificationItem.tsx",
      "src/pages/Notifications.tsx",
    ]) {
      expect(read(f), f).not.toContain("isLockedInvite");
      expect(read(f), f).not.toContain("useSubscriptionAccess");
    }
  });

  it("composants jamais importés supprimés", () => {
    expect(existsSync("src/components/dashboard/sitter/SitterActivityPanel.tsx")).toBe(false);
    expect(existsSync("src/components/ai/alma/wiring/AlmaDormantReturnWhisper.tsx")).toBe(false);
  });

  it("fonctions edge des rappels fondateurs supprimées, sans appel restant", () => {
    expect(existsSync("supabase/functions/send-founder-reminder-7")).toBe(false);
    expect(existsSync("supabase/functions/send-founder-reminder-30")).toBe(false);
    expect(SRC_FILES.filter((f) => read(f).includes("send-founder-reminder"))).toEqual([]);
    expect(read("supabase/config.toml")).not.toContain("send-founder-reminder");
  });

  it("onglet Entraide d'un profil public : vue publique pour un visiteur", () => {
    const src = read("src/pages/PublicSitterProfile.tsx");
    const effect = src.slice(src.indexOf("const loadEntraideData"), src.indexOf("loadEntraideData();"));
    expect(effect).toContain(".from(isSignedIn ? 'small_missions' : ('public_small_missions' as any))");
  });
});
