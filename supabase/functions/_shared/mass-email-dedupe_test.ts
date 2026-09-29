import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { campaignMatches, resolveDedupeKey, splitReceived, utmFromUrl, windowStartIso } from "./mass-email-dedupe.ts";

const c = (o: Record<string, unknown>) => ({ id: "1", created_at: "2026-09-01T00:00:00Z", status: "sent", cta_url: null, dedupe_key: "k", filters: {}, ...o }) as any;

Deno.test("clé : gabarit prioritaire, sinon utm", () => {
  assertEquals(resolveDedupeKey({ template_name: "owner-noel-2026", utm_campaign: "x" }), { kind: "template", value: "owner-noel-2026" });
  assertEquals(resolveDedupeKey({ cta_url: "https://guardiens.fr/a?utm_campaign=oser" }), { kind: "utm", value: "oser" });
  assertEquals(resolveDedupeKey({}), null);
  assertEquals(utmFromUrl("nope"), null);
});
Deno.test("campagne annulée ou même empreinte ignorée", () => {
  const key = { kind: "template", value: "t" } as const;
  assertEquals(campaignMatches(c({ filters: { template_name: "t" } }), key), true);
  assertEquals(campaignMatches(c({ status: "cancelled", filters: { template_name: "t" } }), key), false);
  assertEquals(campaignMatches(c({ filters: { template_name: "t" } }), key, { excludeDedupeKey: "k" }), false);
});
Deno.test("utm lu dans filtres ou lien, fenêtre respectée", () => {
  const key = { kind: "utm", value: "u" } as const;
  assertEquals(campaignMatches(c({ cta_url: "https://x.fr/?utm_campaign=u" }), key), true);
  assertEquals(campaignMatches(c({ filters: { utm_campaign: "u" } }), key), true);
  assertEquals(campaignMatches(c({ filters: { utm_campaign: "u" } }), key, { sinceIso: "2026-09-10T00:00:00Z" }), false);
  assertEquals(windowStartIso(null), null);
});
Deno.test("split insensible à la casse", () => {
  const r = splitReceived([{ email: "A@x.fr" }, { email: "b@x.fr" }], new Set(["a@x.fr"]));
  assertEquals(r.alreadyReceived, 1);
  assertEquals(r.rows.length, 1);
});
