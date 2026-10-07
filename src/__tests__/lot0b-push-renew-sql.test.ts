// @vitest-environment node
/**
 * Lot 0b : renouvellement côté base (migration 0056 réelle sur PGlite).
 * - perdu en 410 : nouvelle adresse, préférences gardées, enabled = true
 * - désactivé volontairement : jamais renouvelé
 * - abonnement d'un autre membre : jamais renouvelé
 */
import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const U1 = "11111111-1111-1111-1111-111111111111";
const U2 = "22222222-2222-2222-2222-222222222222";
const S410 = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const SVOL = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const SOTHER = "cccccccc-cccc-cccc-cccc-cccccccccccc";
let db: PGlite;

const renew = async (user: string, sub: string, endpoint: string) =>
  (await db.query<{ r: string }>(
    `SELECT public.push_renew_subscription($1, $2, $3, 'fcm.googleapis.com', 'auth2', 'p256dh2') AS r`,
    [user, sub, endpoint],
  )).rows[0].r;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE TABLE public.push_subscriptions(
      id uuid PRIMARY KEY, user_id uuid NOT NULL, endpoint text UNIQUE NOT NULL, endpoint_host text,
      auth_key text, p256dh_key text, opt_in_messages boolean, opt_in_applications boolean,
      opt_in_nearby_sits boolean, enabled boolean, disabled_at timestamptz, disabled_reason text,
      updated_at timestamptz
    );
    INSERT INTO public.push_subscriptions VALUES
      ('${S410}', '${U1}', 'https://fcm.googleapis.com/old', 'fcm.googleapis.com', 'a', 'p', true, false, true, false, now(), 'http_410', now()),
      ('${SVOL}', '${U1}', 'https://fcm.googleapis.com/vol', 'fcm.googleapis.com', 'a', 'p', true, true, false, false, now(), 'member_disabled', now()),
      ('${SOTHER}', '${U2}', 'https://fcm.googleapis.com/other', 'fcm.googleapis.com', 'a', 'p', true, true, false, false, now(), 'http_410', now());
  `);
  await db.exec(readFileSync("drizzle/migrations/0056_push_renew_subscription.sql", "utf8"));
});

describe("Lot 0b, push_renew_subscription", () => {
  it("renouvelle un abonnement perdu en 410, préférences gardées, enabled = true", async () => {
    expect(await renew(U1, S410, "https://fcm.googleapis.com/new")).toBe("renewed");
    const row = (await db.query<any>(`SELECT * FROM public.push_subscriptions WHERE id = $1`, [S410])).rows[0];
    expect(row.endpoint).toBe("https://fcm.googleapis.com/new");
    expect(row.enabled).toBe(true);
    expect(row.disabled_reason).toBeNull();
    expect([row.opt_in_messages, row.opt_in_applications, row.opt_in_nearby_sits]).toEqual([true, false, true]);
  });

  it("ne renouvelle jamais un abonnement désactivé volontairement", async () => {
    expect(await renew(U1, SVOL, "https://fcm.googleapis.com/vol2")).toBe("not_renewable");
    const row = (await db.query<any>(`SELECT enabled, endpoint FROM public.push_subscriptions WHERE id = $1`, [SVOL])).rows[0];
    expect(row).toEqual({ enabled: false, endpoint: "https://fcm.googleapis.com/vol" });
  });

  it("ne renouvelle jamais l'abonnement d'un autre membre", async () => {
    expect(await renew(U1, SOTHER, "https://fcm.googleapis.com/x")).toBe("not_found");
  });

  it("refuse une adresse déjà utilisée par un autre abonnement", async () => {
    expect(await renew(U2, SOTHER, "https://fcm.googleapis.com/new")).toBe("endpoint_in_use");
  });
});
