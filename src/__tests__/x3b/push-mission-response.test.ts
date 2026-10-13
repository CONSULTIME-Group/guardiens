/**
 * Lot X3b (constat C-05) : une proposition d'aide part aussi en push vers
 * l'auteur du besoin, par le circuit existant (file push_delivery_jobs,
 * dispatch-web-push, worker public/push-sw.js).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import {
  buildPushPayload,
  isPushEventKind,
  MISSION_RESPONSE_BODY,
} from "../../../supabase/functions/_shared/web-push/payload";

function worker() {
  const handlers: Record<string, (event: any) => void> = {};
  const shown: any[] = [];
  const self = {
    location: { origin: "https://guardiens.fr" },
    addEventListener: (name: string, handler: (event: any) => void) => { handlers[name] = handler; },
    registration: {
      showNotification: (title: string, options: any) => { shown.push({ title, options }); return Promise.resolve(); },
      getNotifications: () => Promise.resolve([]),
    },
    clients: { matchAll: () => Promise.resolve([]), openWindow: () => Promise.resolve(null) },
  };
  runInNewContext(readFileSync("public/push-sw.js", "utf8"), { self, URL });
  async function emit(name: string, data: any) {
    let pending: Promise<unknown> | undefined;
    handlers[name]({ ...data, waitUntil: (p: Promise<unknown>) => { pending = p; } });
    await pending;
  }
  return { emit, shown };
}

const JOB = "0f0e0d0c-0b0a-4908-9706-050403020100";

describe("charge utile d'une proposition d'aide", () => {
  it("type reconnu, texte constant, lien interne", () => {
    expect(isPushEventKind("mission_response")).toBe(true);
    const p = buildPushPayload("mission_response", JOB, 2);
    expect(p).toMatchObject({ title: "Guardiens", url: "/notifications", kind: "mission_response", badge: 2 });
    expect(p.tag).toBe(`guardiens-mission_response-${JOB}`);
  });

  it("un worker plus ancien l'affiche comme une candidature, jamais comme un faux message", () => {
    const p = buildPushPayload("mission_response", JOB);
    expect(p.body).toBe("Vous avez reçu une nouvelle candidature.");
    expect(p.body).not.toBe("Vous avez un nouveau message.");
  });

  it("les charges utiles existantes restent identiques", () => {
    expect(buildPushPayload("message", "job-1")).toEqual({
      title: "Guardiens", body: "Vous avez un nouveau message.", url: "/messages", tag: "guardiens-message-job-1",
    });
    expect(buildPushPayload("application", "job-2")).not.toHaveProperty("kind");
  });
});

describe("worker push-5", () => {
  it("affiche le texte d'entraide et ouvre les notifications", async () => {
    const w = worker();
    await w.emit("push", { data: { json: () => buildPushPayload("mission_response", JOB) } });
    expect(w.shown).toHaveLength(1);
    expect(w.shown[0].options.body).toBe(MISSION_RESPONSE_BODY);
    expect(w.shown[0].options.data.url).toBe("/notifications");
    expect(w.shown[0].options.tag).toBe(`guardiens-mission_response-${JOB}`);
  });

  it("une étiquette douteuse est remplacée", async () => {
    const w = worker();
    await w.emit("push", { data: { json: () => ({ kind: "mission_response", tag: "x@example.test", body: "Privé" }) } });
    expect(w.shown[0].options.tag).toBe("guardiens-mission-response");
    expect(JSON.stringify(w.shown)).not.toContain("Privé");
  });

  it("version alignée entre le worker et la page", () => {
    const sw = readFileSync("public/push-sw.js", "utf8");
    const page = readFileSync("src/lib/web-push.ts", "utf8");
    expect(sw).toContain("var PUSH_SW_VERSION = 'push-5';");
    expect(page).toContain("export const PUSH_SW_VERSION = 'push-5';");
  });

  it("texte positif, sans tiret long", () => {
    expect(MISSION_RESPONSE_BODY).toBe("Quelqu'un vous propose son aide.");
    expect(MISSION_RESPONSE_BODY).not.toMatch(/[—–]/);
  });
});

describe("réglage", () => {
  it("l'interrupteur des candidatures couvre aussi les propositions d'aide", () => {
    const settings = readFileSync("src/components/settings/PushNotificationsSection.tsx", "utf8");
    expect(settings).toContain("Candidatures et propositions d'aide");
  });
});
