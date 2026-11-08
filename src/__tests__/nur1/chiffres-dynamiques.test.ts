/**
 * Lot NUR1 (08/11/2026, décision de Jérémie : « 43 et 248, dynamique ») :
 * l'email J+21 donne le cumul maisons gardées et animaux accompagnés lu à
 * l'envoi (communityTotals, même calcul que l'accueil et llms.txt), jamais un
 * chiffre écrit en dur.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { communityTotals } from "../../../supabase/functions/_shared/community-totals.js";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");
const TPL = "supabase/functions/_shared/transactional-email-templates/owner-no-sit-j21.tsx";

describe("email J+21, chiffres des gardes", () => {
  it("cumul : socle des fondateurs plus les gardes de la communauté", () => {
    expect(communityTotals({ maisons_gardees: 6, animaux_accompagnes: 14 })).toEqual({ houses: 43, animals: 248 });
  });
  it("aucun chiffre en dur dans le gabarit, phrase seulement avec deux chiffres", () => {
    const s = read(TPL);
    expect(s).not.toMatch(/\b37(&nbsp;|\s)maisons/);
    expect(s).toContain("gardesSentence(communityHouses, communityAnimals)");
    expect(s).toMatch(/if \(!ok\(houses\) \|\| !ok\(animals\)\) return null/);
  });
  it("evaluate-journeys lit get_public_stats une fois par passage, sans chiffre si la lecture échoue", () => {
    const s = read("supabase/functions/evaluate-journeys/index.ts");
    expect(s).toContain("import { communityTotals } from '../_shared/community-totals.js'");
    expect(s).toContain("supabase.rpc('get_public_stats')");
    expect(s).toContain("communityTotalsCache = error || !row ? null : communityTotals(row)");
    expect(s).toMatch(/template === 'owner-no-sit-j21'[\s\S]{0,200}communityHouses: totals\.houses, communityAnimals: totals\.animals/);
  });
});
