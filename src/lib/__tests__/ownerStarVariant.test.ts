import { describe, it, expect } from "vitest";
import { selectOwnerStarVariant } from "../ownerStarVariant";

const TODAY = "2026-07-19";

describe("selectOwnerStarVariant", () => {
  it("retourne `publish` quand tout est vide", () => {
    expect(
      selectOwnerStarVariant({
        ongoingSit: null,
        pendingAppsCount: 0,
        latestDraft: null,
        todayIso: TODAY,
      }),
    ).toBe("publish");
  });

  it("retourne `draft` quand un brouillon vivant existe", () => {
    expect(
      selectOwnerStarVariant({
        ongoingSit: null,
        pendingAppsCount: 0,
        latestDraft: { end_date: "2026-08-10" },
        todayIso: TODAY,
      }),
    ).toBe("draft");
  });

  it("retourne `applications` quand une candidature est en attente", () => {
    expect(
      selectOwnerStarVariant({
        ongoingSit: null,
        pendingAppsCount: 2,
        latestDraft: { end_date: "2026-08-10" },
        todayIso: TODAY,
      }),
    ).toBe("applications");
  });

  it("retourne `ongoing` en priorité absolue", () => {
    expect(
      selectOwnerStarVariant({
        ongoingSit: { id: "sit-1" },
        pendingAppsCount: 5,
        latestDraft: { end_date: "2026-08-10" },
        todayIso: TODAY,
      }),
    ).toBe("ongoing");
  });

  it("priorité applications > draft", () => {
    expect(
      selectOwnerStarVariant({
        ongoingSit: null,
        pendingAppsCount: 1,
        latestDraft: { end_date: "2026-08-10" },
        todayIso: TODAY,
      }),
    ).toBe("applications");
  });

  it("priorité draft > publish", () => {
    expect(
      selectOwnerStarVariant({
        ongoingSit: null,
        pendingAppsCount: 0,
        latestDraft: { end_date: "2026-08-10" },
        todayIso: TODAY,
      }),
    ).toBe("draft");
  });

  it("ignore un brouillon archivé", () => {
    expect(
      selectOwnerStarVariant({
        ongoingSit: null,
        pendingAppsCount: 0,
        latestDraft: { cancellation_reason: "archived", end_date: "2026-08-10" },
        todayIso: TODAY,
      }),
    ).toBe("publish");
  });

  it("ignore un brouillon dont l'annonce a déjà expiré", () => {
    expect(
      selectOwnerStarVariant({
        ongoingSit: null,
        pendingAppsCount: 0,
        latestDraft: { end_date: "2025-01-01" },
        todayIso: TODAY,
      }),
    ).toBe("publish");
  });

  it("accepte un brouillon sans end_date (annonce sans date de fin)", () => {
    expect(
      selectOwnerStarVariant({
        ongoingSit: null,
        pendingAppsCount: 0,
        latestDraft: { end_date: null },
        todayIso: TODAY,
      }),
    ).toBe("draft");
  });
});
