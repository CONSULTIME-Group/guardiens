/**
 * Lot Q1 (12/10/2026) : diffusion d'une garde lointaine.
 * Constat : l'annonce d'Andrée (Saint Ludger, Québec) partait vers 538
 * gardiens en France avec « près de chez vous » et « à environ 5 500 km ».
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  FAR_RECIPIENT_KM,
  NATIONWIDE_RADIUS_KM,
  farSubject,
  isFarForRecipient,
  isNationwideRadius,
  isOwnerFarFromFrance,
} from "../../supabase/functions/_shared/far-listing";

const PROX = readFileSync("supabase/functions/send-listing-proximity/index.ts", "utf8");
const TPL = readFileSync("supabase/functions/_shared/transactional-email-templates/nearby-sit-alert.tsx", "utf8");

describe("Q1, propriétaire loin de la France", () => {
  it("Québec, Papeete et Marrakech sont loin ; Bruxelles, Genève et Ajaccio restent proches", () => {
    expect(isOwnerFarFromFrance(45.742131, -70.694618)).toBe(true);
    expect(isOwnerFarFromFrance(-17.5516, -149.5585)).toBe(true);
    expect(isOwnerFarFromFrance(31.6295, -7.9811)).toBe(true);
    expect(isOwnerFarFromFrance(50.8503, 4.3517)).toBe(false);
    expect(isOwnerFarFromFrance(46.2044, 6.1432)).toBe(false);
    expect(isOwnerFarFromFrance(41.9192, 8.7386)).toBe(false);
    expect(isOwnerFarFromFrance(null, null)).toBe(false);
  });
});

describe("Q1, texte par gardien", () => {
  it("au-delà de 200 km, texte lointain ; lieu inconnu, selon le propriétaire", () => {
    expect(isFarForRecipient(FAR_RECIPIENT_KM, false)).toBe(false);
    expect(isFarForRecipient(FAR_RECIPIENT_KM + 1, false)).toBe(true);
    expect(isFarForRecipient(5500, true)).toBe(true);
    expect(isFarForRecipient(12, true)).toBe(false);
    expect(isFarForRecipient(null, true)).toBe(true);
    expect(isFarForRecipient(null, false)).toBe(false);
  });
  it("diffusion nationale à partir de 1 000 km", () => {
    expect(isNationwideRadius(NATIONWIDE_RADIUS_KM - 1)).toBe(false);
    expect(isNationwideRadius(NATIONWIDE_RADIUS_KM)).toBe(true);
    expect(isNationwideRadius(20000)).toBe(true);
  });
  it("objet sans « près de chez vous », charte respectée", () => {
    const s = farSubject("Andrée", "Saint Ludger, Québec, Canada");
    expect(s).toBe("Andrée cherche un gardien à Saint Ludger, Québec, Canada");
    for (const x of [s, farSubject("", "Papeete"), farSubject("Andrée", ""), farSubject(null, null)]) {
      expect(x).not.toMatch(/près de chez vous|[!—–']/);
    }
  });
});

describe("Q1, fonction de diffusion", () => {
  it("rayon national : tous les gardiens actifs, lieu renseigné ou non, sans boîte englobante", () => {
    expect(PROX).toContain("const nationwide = isNationwideRadius(radiusKm);");
    expect(PROX).toContain("if (!nationwide) {");
    expect(PROX).toContain("if (nationwide || (d !== null && d <= radiusKm)) {");
  });
  it("campagne annulée ignorée, alertes de publication comptées, fenêtre de 7 jours levée pour une garde lointaine", () => {
    expect(PROX).toContain('.filter((c) => c?.status !== "cancelled")');
    expect(PROX).toContain('.from("sit_notification_log")');
    expect(PROX).toContain('.contains("sit_ids", [sitId])');
    expect(PROX).toContain("const farBroadcast = nationwide && ownerFar;");
    expect(PROX).toContain("{ recentWindow: !farBroadcast }");
  });
  it("chaque gardien reçoit le drapeau farAway, sans distance quand la garde est lointaine", () => {
    expect(PROX).toContain("const far = isFarForRecipient(r.distance_km, ownerFar);");
    expect(PROX).toContain("farAway: far,");
    expect(PROX).toContain("distanceKm: far || r.distance_km === null ? undefined : r.distance_km,");
  });
});

describe("Q1, gabarit", () => {
  it("variante lointaine : titre, phrase et objet propres, sans « secteur » ni distance", () => {
    expect(TPL).toContain("'Une garde pour partir loin'");
    expect(TPL).toContain("Une garde lointaine se prépare tôt (trajet, dates, arrivée).");
    expect(TPL).toContain("? farSubject(data.ownerFirstName, data.city)");
    const farBlock = TPL.slice(TPL.indexOf("{far ? (\n            <Text"), TPL.indexOf(") : (", TPL.indexOf("{far ? (\n            <Text")));
    expect(farBlock).not.toMatch(/secteur|km de chez vous|près de chez vous/);
  });
  it("une alerte à plus de 200 km passe d'elle-même en texte lointain (alerte de publication comprise)", () => {
    expect(TPL).toContain("typeof data.farAway === 'boolean' ? data.farAway : isFarForRecipient(data.distanceKm ?? null, false)");
  });
  it("aucun tiret cadratin ni demi-cadratin", () => {
    expect(TPL).not.toMatch(/[—–]/);
  });
});
