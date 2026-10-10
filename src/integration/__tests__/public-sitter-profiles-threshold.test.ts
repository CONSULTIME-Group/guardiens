/**
 * Test 11, visibilité de `public_sitter_profiles` (intégration base, lecture seule).
 *
 * Décision du 10/10/2026 : un gardien est visible quel que soit son taux de
 * complétion (compte actif, prénom renseigné). Seule la candidature exige
 * 40 % (garde serveur trg_guard_application_min_completion).
 * Chaque ligne de la vue doit donc exister dans public_profiles (compte actif),
 * aucune colonne privée n'est exposée, et le Canada compte ses 2 gardiens
 * (85 % et 35 %) dans la recherche comme dans les compteurs.
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
async function anonRpc(fn: string, body: unknown) {
  const res = await fetch(`${URL}/rest/v1/rpc/${fn}`, { method: "POST", headers, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

describe.runIf(enabled)("public_sitter_profiles, visibilité sans seuil", () => {
  it("expose des profils sous 40 %, tous adossés à un compte actif", async () => {
    const view = await anonGet("public_sitter_profiles?select=user_id&limit=1000");
    expect(view.length).toBeGreaterThan(0);
    const ids = view.map((r: any) => r.user_id);
    let under = 0, missing = 0;
    for (let i = 0; i < ids.length; i += 100) {
      const slice = ids.slice(i, i + 100);
      const rows = await anonGet(`public_profiles?select=id,profile_completion&id=in.(${slice.join(",")})`);
      missing += slice.length - rows.length;
      under += rows.filter((r: any) => (r.profile_completion ?? 0) < 40).length;
    }
    expect(missing, "ligne de la vue sans compte actif public").toBe(0);
    expect(under, "aucun profil sous 40 % visible").toBeGreaterThan(0);
  }, 60000);

  it("n'expose aucune colonne privée", async () => {
    const [row] = await anonGet("public_sitter_profiles?select=*&limit=1");
    for (const k of ["sensitivities", "email", "phone", "latitude", "longitude", "last_name"]) {
      expect(Object.keys(row)).not.toContain(k);
    }
  });

  it("Canada : 2 gardiens dans la recherche et dans le compteur", async () => {
    const pool = await anonRpc("search_sitter_pool", { p_country: "CA" });
    const counts = await anonRpc("search_sitter_country_counts", {});
    const ca = counts.find((c: any) => c.country === "CA")?.sitters;
    expect(pool.length).toBe(2);
    expect(ca).toBe(2);
    expect(pool.some((r: any) => r.profile_completion < 40)).toBe(true);
  }, 60000);
});
