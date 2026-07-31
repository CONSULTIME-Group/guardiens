/**
 * Test 10 — Masquage des dates par `get_public_sit` (intégration base).
 *
 * On interroge l'API réellement servie, en anonyme, plutôt que de reconstituer
 * la logique SQL. Sur une garde close (confirmed / in_progress) non terminée,
 * `start_date` et `end_date` doivent revenir à null pour un appelant anonyme.
 */
import { describe, it, expect } from "vitest";

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
const enabled = !!URL && !!KEY;

const headers = { apikey: KEY ?? "", Authorization: `Bearer ${KEY ?? ""}`, "Content-Type": "application/json" };

async function anonGet(path: string) {
  const res = await fetch(`${URL}/rest/v1/${path}`, { headers });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

async function anonRpc(fn: string, body: any) {
  const res = await fetch(`${URL}/rest/v1/rpc/${fn}`, { method: "POST", headers, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

describe.runIf(enabled)("get_public_sit, masquage des dates en anonyme", () => {
  it("renvoie start_date, end_date et les champs libres à null sur une garde close", async () => {
    // Les gardes closes ne sont plus lisibles en anonyme sur la table `sits` :
    // on identifie les candidates via la vue publique réduite.
    const candidates = await anonGet(`public_closed_sits?select=id,status&status=in.(confirmed,in_progress)&limit=1`);
    if (!candidates.length) {
      expect(candidates.length, "aucune garde close en base, test non concluant").toBeGreaterThan(0);
      return;
    }
    const sit = candidates[0];
    const rows = await anonRpc("get_public_sit", { p_param: sit.id });
    expect(rows.length).toBe(1);
    expect(rows[0].start_date, "start_date exposée à un anonyme sur une garde close").toBeNull();
    expect(rows[0].end_date, "end_date exposée à un anonyme sur une garde close").toBeNull();
    expect(rows[0].daily_routine, "daily_routine exposée à un anonyme sur une garde close").toBeNull();
    expect(rows[0].specific_expectations, "specific_expectations exposées à un anonyme").toBeNull();
    expect(rows[0].owner_message, "owner_message exposé à un anonyme").toBeNull();
    expect(rows[0].dates_hidden).toBe(true);
  }, 20000);


  it("n'expose pas les dates via une lecture directe non plus", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const rows = await anonGet(
      `sits?select=id,status,start_date,end_date&status=in.(confirmed,in_progress)&end_date=gte.${today}&limit=5`,
    );
    const leaked = rows.filter((r: any) => r.start_date !== null || r.end_date !== null);
    expect(leaked.map((r: any) => r.id), "dates de gardes closes lisibles en anonyme sur la table sits").toEqual([]);
  }, 20000);
});
