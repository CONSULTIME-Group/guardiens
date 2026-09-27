import { describe, expect, it } from "vitest";
import hub from "@/pages/EntraideHub?raw";
import cards from "@/components/entraide/EntraideCards?raw";
import dialog from "@/components/entraide/CanHelpDialog?raw";
import banner from "@/components/messages/MissionChooseBanner?raw";
import messages from "@/pages/Messages?raw";
import card from "@/components/missions/MissionResponseCard?raw";
import registry from "../../supabase/functions/_shared/transactional-email-templates/registry.ts?raw";
import how from "@/components/landing/HowItWorksSection?raw";
import sas from "@/components/landing/ServiceAfterServiceSection?raw";
import final from "@/components/landing/FinalCtaSection?raw";
import { liveListingsTitle } from "@/components/landing/LiveListingsStrip";
import { homeCtaTarget } from "@/components/landing/homeCta";

describe("P1", () => {
  it("fenêtre Je peux, réponses actives, séparateur", () => {
    expect(dialog).toContain("Vous proposez votre aide à");
    expect(hub).toContain('.in("status", ["pending", "accepted"])');
    expect(hub).toContain("Plus loin, pour celles et ceux qui voyagent");
    expect(cards).not.toContain("Disponible pour un coup de main");
  });
  it("titre En ce moment", () => {
    expect(liveListingsTitle(null)).toBe("En ce moment sur Guardiens");
    expect(liveListingsTitle({ lat: 1, lng: 1, city: "lyon" })).toBe("En ce moment près de Lyon");
  });
});
describe("P2", () => {
  it("Choisir dans la messagerie et la carte, gabarit enregistré", () => {
    expect(banner).toContain("Choisir {name}");
    expect(messages).toContain("<MissionChooseBanner");
    expect(card).not.toContain("Retenir cette personne");
    expect(registry).toContain("'mission-choose-helper': missionChooseHelper");
  });
});
describe("P3", () => {
  it("cartes, bloc vert, visiteurs", () => {
    expect(how).toContain("Un coup de main en un clic, par exemple :");
    expect(sas).not.toContain("Promenades de chiens à Lyon");
    expect(sas).not.toContain("howto-step");
    expect(final).toContain("!isAuthenticated && (");
    expect(homeCtaTarget("/sits/create", false)).toBe("/inscription?redirect=%2Fsits%2Fcreate");
  });
});
