/**
 * Test 11 — Seuil de `public_sitter_profiles` (intégration base).
 *
 * On lit la vue telle qu'elle est servie, en anonyme, puis on recoupe la
 * complétion via `public_profiles`. Aucun profil sous 40 ne doit apparaître.
 */
import { describe, it, expect } from "vitest";

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
const enabled = !!URL && !!KEY;
const MIN = 40;

const headers = { apikey: KEY ?? "", Authorization: `Bearer ${KEY ?? ""}` };

async function anonGet(path: string) {
  const res = await fetch(`${URL}/rest/v1/${path}`, { headers });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

describe.runIf(enabled)("public_sitter_profiles, seuil de complétion", () => {
  it("ne renvoie aucun profil dont profile_completion est inférieur à 40", async () => {
    const view = await anonGet("public_sitter_profiles?select=user_id&limit=500");
    expect(view.length, "vue vide, test non concluant").toBeGreaterThan(0);
    const ids = view.map((r: any) => r.user_id);

    const under: string[] = [];
    for (let i = 0; i < ids.length; i += 100) {
      const slice = ids.slice(i, i + 100);
      const rows = await anonGet(
        `public_profiles?select=id,profile_completion&id=in.(${slice.join(",")})&profile_completion=lt.${MIN}`,
      );
      rows.forEach((r: any) => under.push(`${r.id}:${r.profile_completion}`));
    }
    expect(under, `profils sous le seuil exposés par la vue : ${under.join(", ")}`).toEqual([]);
  }, 60000);
});
