import { describe, it, expect } from "vitest";
import { authorizeWaveCaller } from "../../supabase/functions/_shared/wave-caller";

const SERVICE = "service-role-key";
const OWNER = "owner-uuid";
const MISSION = "mission-uuid";

const deps = {
  serviceKey: SERVICE,
  getUserId: async (token: string) =>
    token === "jwt-owner" ? OWNER : token === "jwt-autre" ? "autre-uuid" : null,
  getMissionOwnerId: async (missionId: string) => (missionId === MISSION ? OWNER : null),
};

describe("notify-mission-wave, contrôle d'accès", () => {
  it("anonyme sans en-tête : 401", async () => {
    const d = await authorizeWaveCaller({ ...deps, authHeader: null, missionId: MISSION });
    expect(d).toMatchObject({ allowed: false, status: 401 });
  });

  it("jeton inconnu : 401", async () => {
    const d = await authorizeWaveCaller({ ...deps, authHeader: "Bearer inconnu", missionId: MISSION });
    expect(d).toMatchObject({ allowed: false, status: 401 });
  });

  it("membre étranger au besoin : 403", async () => {
    const d = await authorizeWaveCaller({ ...deps, authHeader: "Bearer jwt-autre", missionId: MISSION });
    expect(d).toMatchObject({ allowed: false, status: 403 });
  });

  it("membre auteur du besoin : accepté", async () => {
    const d = await authorizeWaveCaller({ ...deps, authHeader: "Bearer jwt-owner", missionId: MISSION });
    expect(d).toMatchObject({ allowed: true, via: "owner", userId: OWNER });
  });

  it("membre sur un besoin introuvable : 403", async () => {
    const d = await authorizeWaveCaller({ ...deps, authHeader: "Bearer jwt-owner", missionId: "autre-mission" });
    expect(d).toMatchObject({ allowed: false, status: 403 });
  });

  it("membre sur le passage horaire (corps vide) : 403", async () => {
    const d = await authorizeWaveCaller({ ...deps, authHeader: "Bearer jwt-owner", missionId: null });
    expect(d).toMatchObject({ allowed: false, status: 403 });
  });

  it("clé de service, publication : accepté", async () => {
    const d = await authorizeWaveCaller({ ...deps, authHeader: `Bearer ${SERVICE}`, missionId: MISSION });
    expect(d).toMatchObject({ allowed: true, via: "service" });
  });

  it("clé de service, passage horaire : accepté", async () => {
    const d = await authorizeWaveCaller({ ...deps, authHeader: `Bearer ${SERVICE}`, missionId: null });
    expect(d).toMatchObject({ allowed: true, via: "service" });
  });
});
