/**
 * Lot L9 (09/11/2026, arène tableau de bord v2, emprunt A-15 depuis B-13) :
 * « Préparer votre arrivée » et « Guide lu ».
 * Recette de l'arène : heure d'arrivée dans le message, « Guide lu » en base.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";
import { prepareMessage, ARRIVAL_SLOTS } from "@/lib/prepareSitMessage";
import { resolveOwnerStory, resolveSitterStory, type Story } from "@/lib/dashboardStory";
import { buildOwnerStoryInput } from "@/lib/ownerStoryInput";

const h = vi.hoisted(() => ({
  inserts: [] as any[],
  rpcs: [] as any[],
  moderation: "ok" as "ok" | "block",
  events: [] as any[],
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => ({
      insert: async (v: any) => {
        h.inserts.push({ table, v });
        return { error: null };
      },
    }),
    rpc: async (name: string, args: any) => {
      h.rpcs.push({ name, args });
      if (name === "get_or_create_conversation") return { data: "conv-1", error: null };
      return { data: true, error: null };
    },
    functions: { invoke: async () => ({ data: null, error: null }) },
  },
}));
vi.mock("@/lib/moderation", () => ({
  moderateContent: async () => ({ status: h.moderation, reasons: ["coordonnées"] }),
  describeRetainedText: () => "Ce message est retenu par une vérification automatique, avant envoi.",
}));
vi.mock("@/lib/analytics", () => ({ trackEvent: (e: string, o: any) => h.events.push({ e, o }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import PrepareSitSheet from "@/components/dashboard/story/PrepareSitSheet";
import StoryHero from "@/components/dashboard/story/StoryHero";
import { markHouseGuideRead } from "@/lib/houseGuideRead";

const TODAY = "2026-11-09";

beforeEach(() => {
  h.inserts = [];
  h.rpcs = [];
  h.moderation = "ok";
  h.events = [];
});
afterEach(cleanup);

describe("message de préparation", () => {
  it("reste vide tant que l'heure d'arrivée manque", () => {
    expect(prepareMessage({ ownerFirstName: "Anne", sitterFirstName: "Léa", startDate: "2026-12-19", slot: null })).toBe("");
  });

  it("dit l'heure d'arrivée et la date, sans rencontre choisie d'office", () => {
    const m = prepareMessage({ ownerFirstName: "Anne Martin", sitterFirstName: "Léa", startDate: "2026-12-19", slot: "apres_midi" });
    expect(m).toContain("Bonjour Anne,");
    expect(m).toContain("J'arriverai le 19 décembre dans l'après-midi.");
    expect(m).not.toMatch(/appeler|rencontrer/);
    expect(m.endsWith("À bientôt,\nLéa")).toBe(true);
  });

  it("propose l'appel ou la visite seulement quand le gardien le choisit, au conditionnel", () => {
    expect(prepareMessage({ ownerFirstName: "Anne", startDate: "2026-12-19", slot: "matin", meeting: "appel" })).toContain(
      "Si vous le souhaitez, nous pouvons nous appeler avant la garde.",
    );
    expect(prepareMessage({ ownerFirstName: "Anne", startDate: "2026-12-19", slot: "soir", meeting: "visite" })).toContain(
      "Si vous le souhaitez, je peux passer vous rencontrer avant la garde.",
    );
  });

  it("ne cite rien d'absent : sans date ni prénoms, des formules neutres", () => {
    const m = prepareMessage({ slot: "midi" });
    expect(m).toBe("Bonjour,\n\nJ'arriverai le premier jour de la garde vers midi.\n\nÀ bientôt.");
  });

  it("chaque créneau a sa formule, sans tiret long", () => {
    for (const s of ARRIVAL_SLOTS) {
      const m = prepareMessage({ ownerFirstName: "Anne", startDate: "2026-12-19", slot: s.value, meeting: "appel" });
      expect(m).toContain(s.phrase);
      expect(m).not.toMatch(/[—–]/);
    }
  });
});

describe("récit gardien : « Écrire à Anne » ouvre la préparation", () => {
  const confirmed = { id: "c1", propertyId: "p1", start_date: "2026-12-19", ownerFirstName: "Anne", petNames: ["Caramel"] };

  it("garde confirmée : le bouton porte l'action prepare, le lien reste le repli", () => {
    const s = resolveSitterStory({ today: TODAY, confirmedSit: confirmed });
    expect(s.chapter).toBe("confirmed");
    expect(s.cta).toEqual({ label: "Écrire à Anne", href: "/sits/c1", action: "prepare" });
  });

  it("guide ouvert à J-7 : le guide reste le bouton plein, l'écriture passe en lien second", () => {
    const s = resolveSitterStory({ today: "2026-12-14", confirmedSit: confirmed });
    expect(s.chapter).toBe("guide_open");
    expect(s.cta.action).toBeUndefined();
    expect(s.secondary).toEqual({ label: "Écrire à Anne", href: "/sits/c1", action: "prepare" });
  });
});

describe("récit propriétaire : guide lu", () => {
  const src = (guide_read_at: string | null) => ({
    today: TODAY,
    sits: [{ id: "c1", status: "confirmed", start_date: "2026-11-20", end_date: "2026-11-28", applications: [{ status: "accepted", sitter_id: "s2", guide_read_at }] }],
    pets: [{ name: "Caramel" }],
    awaitingApps: [],
    sitterProfiles: { s2: { first_name: "Hugo" } },
    pendingReviews: [],
  });

  it("le guide lu remplace la phrase de rencontre", () => {
    const input = buildOwnerStoryInput(src("2026-11-13T09:00:00Z"));
    expect(input.confirmedSit?.guideRead).toBe(true);
    const s = resolveOwnerStory(input);
    expect(s.chapter).toBe("confirmed");
    expect(s.lead).toBe("Hugo a lu le guide de la maison.");
  });

  it("guide pas encore lu : la rencontre reste dite facultative", () => {
    const s = resolveOwnerStory(buildOwnerStoryInput(src(null)));
    expect(s.lead).toBe("Se rencontrer avant, si vous le souhaitez : une visite ou un appel.");
  });

  it("l'accueil lit guide_read_at avec les candidatures, sans lecture de plus", () => {
    const shared = readFileSync("src/lib/dashboardShared.ts", "utf8");
    expect(shared).toContain('.select("*, applications(id, status, sitter_id, guide_read_at)")');
  });
});

describe("StoryHero : action sur place", () => {
  const story: Story = resolveSitterStory({ today: TODAY, confirmedSit: { id: "c1", start_date: "2026-12-19", ownerFirstName: "Anne" } });

  it("avec onAction, le bouton ouvre la feuille au lieu de naviguer", () => {
    const onAction = vi.fn();
    render(<MemoryRouter><StoryHero story={story} onAction={onAction} /></MemoryRouter>);
    const cta = screen.getByTestId("story-cta");
    expect(cta.tagName).toBe("BUTTON");
    fireEvent.click(cta);
    expect(onAction).toHaveBeenCalledWith(story.cta);
    expect(h.events.some((x) => x.e === "dashboard_story_cta_clicked" && x.o.metadata.action === "prepare")).toBe(true);
  });

  it("sans onAction, le lien vers la garde reste", () => {
    render(<MemoryRouter><StoryHero story={story} /></MemoryRouter>);
    const cta = screen.getByTestId("story-cta");
    expect(cta.tagName).toBe("A");
    expect(cta.getAttribute("href")).toBe("/sits/c1");
  });
});

describe("feuille « Préparer votre arrivée »", () => {
  const target = { sitId: "c1", ownerId: "owner-1", ownerFirstName: "Anne", startDate: "2026-12-19" };
  const renderSheet = () =>
    render(<PrepareSitSheet open onOpenChange={() => {}} target={target} userId="sitter-1" sitterFirstName="Léa" chapter="confirmed" />);

  it("aucune heure ni rencontre choisie d'office, envoi fermé tant que l'heure manque", () => {
    renderSheet();
    const slots = screen.getByTestId("prepare-slots").querySelectorAll("button");
    expect(slots).toHaveLength(4);
    slots.forEach((b) => expect(b.getAttribute("aria-pressed")).toBe("false"));
    screen.getByTestId("prepare-meeting").querySelectorAll("button").forEach((b) => expect(b.getAttribute("aria-pressed")).toBe("false"));
    expect((screen.getByTestId("prepare-send") as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByTestId("prepare-message")).toBeNull();
  });

  it("envoie à Anne le message avec l'heure d'arrivée, dans la conversation de la garde", async () => {
    renderSheet();
    fireEvent.click(screen.getByRole("button", { name: "L'après-midi" }));
    fireEvent.click(screen.getByRole("button", { name: "Un appel avant" }));
    const ta = screen.getByTestId("prepare-message") as HTMLTextAreaElement;
    expect(ta.value).toContain("J'arriverai le 19 décembre dans l'après-midi.");
    expect(screen.getByText("Anne lira :")).toBeTruthy();
    fireEvent.click(screen.getByTestId("prepare-send"));
    await waitFor(() => expect(h.inserts).toHaveLength(1));
    expect(h.rpcs[0]).toMatchObject({ name: "get_or_create_conversation", args: { p_other_user_id: "owner-1", p_context_type: "sit_application", p_sit_id: "c1" } });
    expect(h.inserts[0]).toMatchObject({ table: "messages", v: { conversation_id: "conv-1", sender_id: "sitter-1", is_system: false } });
    expect(h.inserts[0].v.content).toContain("dans l'après-midi");
    expect(h.events.find((x) => x.e === "dashboard_prepare_sheet_sent")?.o.metadata).toMatchObject({ slot: "apres_midi", meeting: "appel", edited: false });
  });

  it("un texte réécrit est gardé quand l'heure change", () => {
    renderSheet();
    fireEvent.click(screen.getByRole("button", { name: "Le matin" }));
    const ta = screen.getByTestId("prepare-message") as HTMLTextAreaElement;
    fireEvent.change(ta, { target: { value: "Bonjour Anne, j'arrive en train." } });
    fireEvent.click(screen.getByRole("button", { name: "En soirée" }));
    expect((screen.getByTestId("prepare-message") as HTMLTextAreaElement).value).toBe("Bonjour Anne, j'arrive en train.");
  });

  it("un message retenu par la modération n'est pas envoyé", async () => {
    h.moderation = "block";
    renderSheet();
    fireEvent.click(screen.getByRole("button", { name: "Vers midi" }));
    fireEvent.click(screen.getByTestId("prepare-send"));
    await screen.findByTestId("prepare-retained");
    expect(h.inserts).toHaveLength(0);
  });
});

describe("guide lu en base", () => {
  it("le guide ouvert par un non-propriétaire appelle mark_house_guide_read, erreurs ignorées", async () => {
    expect(await markHouseGuideRead("p1")).toBe(true);
    expect(h.rpcs).toEqual([{ name: "mark_house_guide_read", args: { p_property_id: "p1" } }]);
    const page = readFileSync("src/pages/HouseGuide.tsx", "utf8");
    const readable = page.indexOf('setAccess("readable");');
    const call = page.indexOf("markHouseGuideRead(propertyId)");
    expect(readable).toBeGreaterThan(0);
    expect(call).toBeGreaterThan(readable);
    expect(call).toBeLessThan(page.indexOf('setAccess("pending")'));
  });

  it("la fonction ne marque que la garde retenue du gardien connecté, à partir de J-7", () => {
    const sql = readFileSync("drizzle/migrations/0122_l9_guide_lu.sql", "utf8");
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS guide_read_at timestamptz");
    expect(sql).toContain("a.sitter_id = auth.uid()");
    expect(sql).toContain("a.status = 'accepted'::application_status");
    expect(sql).toContain("a.guide_read_at IS NULL");
    expect(sql).toContain(">= s.start_date - 7");
    expect(sql).toMatch(/REVOKE EXECUTE ON FUNCTION public\.mark_house_guide_read\(uuid\) FROM PUBLIC, anon, authenticated/);
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.mark_house_guide_read\(uuid\) TO authenticated, service_role/);
  });
});
