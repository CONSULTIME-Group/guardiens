/**
 * Règles d'accès de `volunteer_availability` (intégration base).
 *
 * La déclaration reste privée : en anonyme, aucune ligne ne sort et aucune
 * écriture ne passe.
 */
import { describe, it, expect } from "vitest";

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
const enabled = !!URL && !!KEY;

const headers = {
  apikey: KEY ?? "",
  Authorization: `Bearer ${KEY ?? ""}`,
  "Content-Type": "application/json",
};

describe.runIf(enabled)("volunteer_availability, accès anonyme", () => {
  it("la lecture anonyme ne renvoie aucune ligne", async () => {
    const res = await fetch(
      `${URL}/rest/v1/volunteer_availability?select=user_id&limit=5`,
      { headers },
    );
    if (res.ok) {
      expect(await res.json()).toEqual([]);
    } else {
      expect(res.status).toBeGreaterThanOrEqual(400);
    }
  }, 30000);

  it("l'écriture anonyme est refusée", async () => {
    const res = await fetch(`${URL}/rest/v1/volunteer_availability`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        user_id: "00000000-0000-0000-0000-000000000000",
        available: true,
      }),
    });
    expect(res.ok).toBe(false);
  }, 30000);
});
