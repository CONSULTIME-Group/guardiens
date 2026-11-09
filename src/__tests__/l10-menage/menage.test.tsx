/**
 * Lot L10 (09/11/2026, arène tableau de bord v2) : un bloc entraide sur
 * téléphone, composants du tableau de bord sans écran retirés (F11).
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { existsSync, readFileSync } from "node:fs";

vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => ({}), rpc: async () => ({ data: null, error: null }) } }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "u1" } }) }));

import { EntraideFollowUpView, hasEntraideFollowUp } from "@/components/dashboard/story/EntraideFollowUpView";
import type { HelpRow } from "@/components/dashboard/MesCoupsDeMain";

afterEach(cleanup);

const row = (o: Partial<HelpRow>): HelpRow => ({
  id: "m1", title: "Arroser le potager", city: "Lyon", status: "in_progress", close_reason: null,
  role: "owner", other_id: "u2", other_first_name: "Camille", word: null, answered: false, ...o,
});

const REMOVED = [
  "SitterFirstNBASkeleton", "CockpitGreeting", "CommunityQuestionsSection", "DraftResumeCard",
  "shared/LiveSignalStrip", "shared/NearbyHelpersCarousel", "shared/SectionEyebrow",
  "owner/TodoCard", "owner/MobileStickyCTA", "owner/ActivationScoreCard", "owner/NearbyOwnerSittersCard",
  "owner/NextActionsList", "owner/EmptyCard", "owner/MissionsTabsCard",
  "sitter/SitterTeaserCard", "sitter/SitterStatusBar", "sitter/VerifiedSitterRailCard",
  "sitter/SitterBadgesSection", "sitter/SitterMobileStickyCTA", "sitter/NearbyAnnoncesCard",
];

describe("un bloc entraide sur téléphone", () => {
  it("les deux accueils gardent le bandeau sur ordinateur et montent le suivi seul sur téléphone", () => {
    for (const f of ["src/components/dashboard/OwnerDashboard.tsx", "src/components/dashboard/SitterDashboard.tsx"]) {
      const src = readFileSync(f, "utf8");
      const i = src.indexOf("{isDesktopRail ? (\n              <DeferredMount minHeight={160}>\n                <OwnerEntraideBand");
      expect(i, f).toBeGreaterThan(0);
      expect(src.indexOf("<EntraideFollowUp />", i), f).toBeGreaterThan(i);
      expect(src.match(/<OwnerEntraideBand/g)?.length, f).toBe(1);
      expect(src.match(/<EntraideLine/g)?.length, f).toBe(1);
    }
  });

  it("rien à suivre : aucun bloc", () => {
    expect(hasEntraideFollowUp([row({ status: "completed" })], [])).toBe(false);
    expect(hasEntraideFollowUp([row({ answered: true })], [])).toBe(false);
    const { container } = render(<MemoryRouter><EntraideFollowUpView exchanges={[row({ answered: true })]} proposals={[]} /></MemoryRouter>);
    expect(container.innerHTML).toBe("");
  });

  it("un coup de main en cours : la question, sans lien plein vers une autre page", () => {
    render(<MemoryRouter><EntraideFollowUpView exchanges={[row({})]} proposals={[]} /></MemoryRouter>);
    const block = screen.getByTestId("entraide-follow-up");
    expect(block.textContent).toContain("Arroser le potager");
    expect(block.textContent).toContain("Le coup de main a eu lieu ?");
    // La réponse « Oui » de MeetupAnswer est la seule action pleine du bloc, sous le premier écran.
    expect([...block.querySelectorAll("a")].filter((a) => /(^|\s)bg-primary(\s|$)/.test(a.className))).toEqual([]);
  });

  it("des propositions à suivre : la liste", () => {
    const proposals = [{ responseId: "r1", missionId: "m2", title: "Courses du samedi", city: "Lyon", state: "pending", href: "/petites-missions/m2", conversationId: null }] as any;
    expect(hasEntraideFollowUp([], proposals)).toBe(true);
    render(<MemoryRouter><EntraideFollowUpView exchanges={[]} proposals={proposals} /></MemoryRouter>);
    expect(screen.getByTestId("help-proposals").textContent).toContain("Courses du samedi");
  });
});

describe("composants sans écran retirés", () => {
  it("les fichiers sont partis et plus rien ne les cite", () => {
    for (const r of REMOVED) {
      expect(existsSync(`src/components/dashboard/${r}.tsx`), r).toBe(false);
    }
    expect(existsSync("src/hooks/useCtaCooldown.ts")).toBe(false);
    expect(existsSync("src/hooks/useActiveOwnersCount.ts")).toBe(false);
  });
});
