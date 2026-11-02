/** Lot MSG2 : la notification d'un message ouvre sa conversation. */
import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { buildPushPayload } from "../../../supabase/functions/_shared/web-push/payload";

const ID = "6156d505-7f29-4970-b261-e71f6ac75f21";
const JOB = "11111111-2222-4333-8444-555555555555";

function worker() {
  const handlers: Record<string, (e: any) => any> = {};
  const self: any = {
    addEventListener: (n: string, f: any) => { handlers[n] = f; },
    location: { origin: "https://guardiens.fr" },
    navigator: {},
    registration: { showNotification: vi.fn().mockResolvedValue(undefined) },
    clients: { matchAll: vi.fn().mockResolvedValue([]), openWindow: vi.fn().mockResolvedValue(null) },
  };
  vm.runInNewContext(readFileSync("public/push-sw.js", "utf8"), { self, URL, Promise, RegExp, Math, isFinite });
  const emit = async (n: string, e: any) => {
    let p: any; handlers[n]({ ...e, waitUntil: (x: any) => { p = x; } }); await p;
  };
  return { self, emit };
}

describe("MSG2", () => {
  it("le message porte le lien de sa conversation", () => {
    const p = buildPushPayload("message", JOB, undefined, ID);
    expect(p.url).toBe(`/messages/${ID}`);
    expect(p.kind).toBe("message");
  });
  it("sans conversation valide, repli sur la liste", () => {
    expect(buildPushPayload("message", JOB, undefined, "x/../y").url).toBe("/messages");
    expect(buildPushPayload("message", JOB).kind).toBeUndefined();
  });
  it("une candidature ignore la conversation", () => {
    expect(buildPushPayload("application", JOB, undefined, ID).url).toBe("/notifications");
  });
  it("le worker ouvre la conversation", async () => {
    const w = worker();
    await w.emit("push", { data: { json: () => buildPushPayload("message", JOB, undefined, ID) } });
    const options = w.self.registration.showNotification.mock.calls[0][1];
    expect(options.data.url).toBe(`/messages/${ID}`);
    expect(options.tag).toBe(`guardiens-message-${JOB}`);
    await w.emit("notificationclick", { notification: { close: vi.fn(), data: { url: options.data.url } } });
    expect(w.self.clients.openWindow).toHaveBeenCalledWith(`https://guardiens.fr/messages/${ID}`);
  });
  it("le worker refuse un autre lien de message", async () => {
    const w = worker();
    await w.emit("push", { data: { json: () => ({ kind: "message", url: "/messages/../admin" }) } });
    expect(w.self.registration.showNotification.mock.calls[0][1].data.url).toBe("/messages");
  });
});
