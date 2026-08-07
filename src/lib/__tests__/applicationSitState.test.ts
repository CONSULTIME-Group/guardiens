import { describe, it, expect } from "vitest";
import {
  canShowSitContent,
  groupApplications,
  isActiveSitStatus,
  sitStateNote,
} from "@/lib/applicationSitState";

describe("applicationSitState", () => {
  it("classe les annonces actives", () => {
    expect(isActiveSitStatus("published")).toBe(true);
    expect(isActiveSitStatus("confirmed")).toBe(true);
    expect(isActiveSitStatus("in_progress")).toBe(true);
    expect(isActiveSitStatus("cancelled")).toBe(false);
    expect(isActiveSitStatus("archived")).toBe(false);
    expect(isActiveSitStatus("draft")).toBe(false);
    expect(isActiveSitStatus(null)).toBe(false);
  });

  it("masque le contenu des brouillons uniquement", () => {
    expect(canShowSitContent("draft")).toBe(false);
    expect(canShowSitContent("cancelled")).toBe(true);
  });

  it("nomme l'état de l'annonce quand elle n'est plus ouverte", () => {
    expect(sitStateNote("cancelled")).toBe("Annonce annulée par le propriétaire");
    expect(sitStateNote("archived")).toBe("Annonce archivée");
    expect(sitStateNote("in_progress")).toBe("Garde en cours");
    expect(sitStateNote("published")).toBeNull();
  });

  it("n'utilise ni tiret cadratin ni demi-cadratin dans les mentions", () => {
    const all = ["draft", "published", "confirmed", "in_progress", "completed", "cancelled", "archived"]
      .map(sitStateNote)
      .filter(Boolean)
      .join(" ");
    expect(all).not.toMatch(/[—–]/);
    expect(all.toLowerCase()).not.toContain("voisin");
  });

  it("répartit sans perdre de candidature", () => {
    const apps = [
      { sit_status: "published" },
      { sit_status: "cancelled" },
      { sit_status: "draft" },
      { sit_status: "in_progress" },
      { sit_status: "archived" },
    ];
    const { active, closed } = groupApplications(apps);
    expect(active).toHaveLength(2);
    expect(closed).toHaveLength(3);
    expect(active.length + closed.length).toBe(apps.length);
  });
});
