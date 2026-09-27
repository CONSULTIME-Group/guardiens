import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const SRC = fs.readFileSync(path.join(process.cwd(), "src/components/sits/views/OwnerSitView.tsx"), "utf8");

describe("fenêtre de retrait, motif via la plateforme", () => {
  const handler = SRC.slice(SRC.indexOf("const handleConfirmWithCandidate"), SRC.indexOf("const requestUnpublish"));

  it("accepte la candidature choisie et passe l'annonce en confirmed", () => {
    expect(handler).toContain("acceptApplication(");
    expect(handler).toContain("applicationId: c.applicationId");
    expect(handler).toMatch(/status:\s*"confirmed"/);
  });

  it("n'appelle ni unpublish_sit ni le déclin groupé", () => {
    expect(handler).not.toContain("unpublish_sit");
    expect(handler).not.toContain("declineOpenApplications");
    expect(SRC).toMatch(/if \(unpublishReason === "found_onplatform"\) return;/);
  });

  it("affiche le titre, le repli et masque l'option sans candidat", () => {
    expect(SRC).toContain("Avec qui la garde se fait-elle ?");
    expect(SRC).toContain("Avec une personne rencontrée ailleurs");
    expect(SRC).toContain('setUnpublishReason("found_offline")');
    expect(SRC).toMatch(/opt\.v !== "found_onplatform" \|\| platformCandidates\.length > 0/);
  });
});
