// Lot PUB2 : une copie locale ancienne n'écrase jamais un brouillon modifié
// depuis en base, quelle que soit l'horloge du téléphone.
import { describe, expect, it } from "vitest";
import { chooseDraftSource } from "@/lib/sitDraftResume";

const T = (iso: string) => Date.parse(iso);

describe("copie locale ou brouillon en base", () => {
  it("téléphone en avance de 4 minutes, base modifiée depuis l'ordinateur : la base gagne", () => {
    expect(chooseDraftSource({
      remoteUpdatedAt: "2026-11-07T21:01:00Z",
      localSavedAt: T("2026-11-07T21:04:00Z"),
      localBaseUpdatedAt: "2026-11-07T20:00:00Z",
    })).toEqual({ source: "remote", reason: "remote_changed_since_copy" });
  });

  it("saisie hors réseau, base inchangée depuis la copie : la copie locale gagne", () => {
    expect(chooseDraftSource({
      remoteUpdatedAt: "2026-11-07T20:00:00Z",
      localSavedAt: T("2026-11-07T20:30:00Z"),
      localBaseUpdatedAt: "2026-11-07T20:00:00Z",
    })).toEqual({ source: "local", reason: "copy_after_remote" });
  });

  it("téléphone en retard d'une heure, base inchangée : la copie locale gagne quand même", () => {
    expect(chooseDraftSource({
      remoteUpdatedAt: "2026-11-07T20:00:00Z",
      localSavedAt: T("2026-11-07T19:10:00Z"),
      localBaseUpdatedAt: "2026-11-07T20:00:00Z",
    }).source).toBe("local");
  });

  it("aucun brouillon en base : la copie locale est reprise", () => {
    expect(chooseDraftSource({ remoteUpdatedAt: null, localSavedAt: 1 }).source).toBe("local");
  });

  it("copie écrite avant ce lot (sans horodatage serveur) : la plus récente des deux heures", () => {
    expect(chooseDraftSource({ remoteUpdatedAt: "2026-11-07T20:00:00Z", localSavedAt: T("2026-11-07T19:00:00Z") }))
      .toEqual({ source: "remote", reason: "legacy_remote_newer" });
    expect(chooseDraftSource({ remoteUpdatedAt: "2026-11-07T20:00:00Z", localSavedAt: T("2026-11-07T21:00:00Z") }))
      .toEqual({ source: "local", reason: "legacy_local_newer" });
  });
});
