import { describe, it, expect } from "vitest";

/**
 * Chantier 4 Casse A : garanties minimales sur la reprise de brouillon.
 * - L'URL /sits/create?resume=<id> doit être supportée en plus de l'existant ?draftId=<id>.
 * - Les nouveaux événements analytics doivent être déclarés dans EventType.
 */
describe("sit draft resume wiring", () => {
  it("CreateSit lit resume comme alias de draftId", async () => {
    const src = await import("fs").then((f) =>
      f.readFileSync("src/pages/CreateSit.tsx", "utf-8"),
    );
    expect(src).toMatch(/searchParams\.get\("resume"\)/);
    expect(src).toMatch(/searchParams\.get\("draftId"\)/);
  });

  it("Les 6 nouveaux événements analytics sont déclarés", async () => {
    const src = await import("fs").then((f) =>
      f.readFileSync("src/lib/analytics.ts", "utf-8"),
    );
    const required = [
      "dashboard_draft_card_seen",
      "dashboard_draft_card_resume_clicked",
      "dashboard_draft_card_deleted",
      "sit_draft_saved_manually",
      "sit_draft_autosave_failed",
      "sit_draft_resumed",
    ];
    for (const evt of required) {
      expect(src).toContain(`"${evt}"`);
    }
  });

  it("Le template email sit-draft-reminder est enregistré dans la registry", async () => {
    const src = await import("fs").then((f) =>
      f.readFileSync(
        "supabase/functions/_shared/transactional-email-templates/registry.ts",
        "utf-8",
      ),
    );
    expect(src).toContain("'sit-draft-reminder'");
    expect(src).toContain("sit-draft-reminder.tsx");
  });
});
