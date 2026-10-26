/**
 * Lot G1 : coordonnées des profils. Constat du 26/10/2026 : 36 profils
 * français à code postal sans coordonnées, dont 28 sans ville (la mise à jour
 * s'arrêtait) et un échec passager jamais repris (Clarensac).
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  BACKFILL_LIMIT,
  backfillWindow,
  isBackfillCandidate,
  isFrPostalCode,
  planProfileGeocode,
} from "../../../supabase/functions/_shared/profile-geocode-rules";

describe("quand et comment situer un profil (lot G1)", () => {
  it("ville renseignée : comme avant", () => {
    expect(planProfileGeocode({ city: "Clarensac", postal_code: "30870", country: "FR" }))
      .toMatchObject({ kind: "city", city: "Clarensac", postal: "30870", isFR: true });
    expect(planProfileGeocode({ city: "Marrakech", country: "MA" })).toMatchObject({ kind: "city", isFR: false });
  });
  it("ville vide, code postal français valide : par le code postal", () => {
    expect(planProfileGeocode({ city: null, postal_code: "69380", country: "FR" })).toEqual({ kind: "postal", postal: "69380" });
    expect(planProfileGeocode({ city: "  ", postal_code: "69 380", country: null })).toEqual({ kind: "postal", postal: "69380" });
  });
  it("rien à situer : ville vide et code postal absent, faux ou étranger", () => {
    expect(planProfileGeocode({ city: null, postal_code: null }).kind).toBe("none");
    expect(planProfileGeocode({ city: null, postal_code: "00000" }).kind).toBe("none");
    expect(planProfileGeocode({ city: null, postal_code: "1000", country: "BE" }).kind).toBe("none");
    expect(isFrPostalCode("6938")).toBe(false);
  });
  it("rattrapage : profils sans position situables, fenêtre de 1 h à 7 jours", () => {
    expect(isBackfillCandidate({ city: "Clarensac", postal_code: "30870", latitude: null, longitude: null })).toBe(true);
    expect(isBackfillCandidate({ city: "Clarensac", latitude: 43.8, longitude: 4.2 })).toBe(false);
    expect(isBackfillCandidate({ city: null, postal_code: null, latitude: null })).toBe(false);
    const now = new Date("2026-10-26T03:17:00Z");
    const w = backfillWindow(now);
    expect(w.updatedBefore).toBe("2026-10-26T02:17:00.000Z");
    expect(w.updatedAfter).toBe("2026-10-19T03:17:00.000Z");
    expect(BACKFILL_LIMIT).toBeLessThanOrEqual(50);
  });
});

describe("branchements (lot G1)", () => {
  const fn = readFileSync("supabase/functions/geocode-profile/index.ts", "utf8");
  const sql = readFileSync("drizzle/migrations/0107_g1_coordonnees_profils.sql", "utf8");

  it("geocode-profile situe par code postal et porte le rattrapage journalisé", () => {
    expect(fn).toContain("planProfileGeocode(");
    expect(fn).toContain("geocodeOfficialFr(plan.postal, true)");
    expect(fn).toContain('body?.mode === "backfill"');
    expect(fn).toContain('startCronRun("geocode-profile-backfill")');
  });
  it("le rattrapage reste derrière le secret partagé ou un admin", () => {
    const backfill = fn.indexOf('body?.mode === "backfill"');
    const guard = fn.indexOf("trustedTrigger");
    expect(guard).toBeGreaterThan(0);
    expect(guard).toBeLessThan(backfill);
  });
  it("le trigger part aussi sans ville avec un code postal français valide", () => {
    expect(sql).toMatch(/IF NOT v_has_city AND NOT v_has_fr_postal THEN/);
    expect(sql).toContain("NEW.postal_code <> '00000'");
  });
  it("tâche planifiée nocturne avec le secret, jamais la clé publique", () => {
    expect(sql).toContain("'geocode-profiles-backfill'");
    expect(sql).toContain('{"mode":"backfill"}');
    const cmd = sql.slice(sql.indexOf("SELECT cron.schedule("));
    expect(cmd.slice(0, cmd.indexOf("$cmd$", cmd.indexOf("$cmd$") + 5))).toContain("GEOCODE_PROFILE_SECRET");
  });
});
