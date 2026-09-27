
import respondSrc from "@/lib/missionRespond?raw";
describe("réactivation d'une réponse retirée", () => {
  it("réactive la même ligne au lieu de supprimer", () => {
    expect(respondSrc).toContain("reactivate_my_mission_response");
    expect(respondSrc).not.toContain("clear_my_withdrawn_mission_response");
  });
});
