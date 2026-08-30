import { describe, it, expect } from "vitest";
import { MISSION_TEMPLATES } from "@/data/missionTemplates";
import { hasMoneyMention } from "@/lib/missionContentGuards";

describe("missionTemplates sans mention monétaire", () => {
  it("aucun modèle ne déclenche MONEY_RX", () => {
    const bad = MISSION_TEMPLATES.filter((t: any) =>
      hasMoneyMention([t.title, t.description, t.exchange, t.label].filter(Boolean).join(" "))
    ).map((t: any) => t.id);
    expect(bad).toEqual([]);
  });
});
