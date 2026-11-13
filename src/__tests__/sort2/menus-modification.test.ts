// Lot SORT2 (12/11/2026) : libellé de la rubrique, bouton central de l'onglet
// Sorties, modification et reprise d'une sortie.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { buildNavGroups, entraideNavLabel, flattenNavGroups } from "@/lib/navModel";
import { bottomNavFab } from "@/lib/bottomNavFab";
import { OUTINGS_FLAG } from "@/lib/outingsFlag";
import { OUTING_COPY, draftFromOuting, minCapacityForEdit, outingDraftErrors, outingUpdateFromDraft, type PublicOuting } from "@/lib/outings";

const read = (p: string) => readFileSync(p, "utf8");

const outing: PublicOuting = {
  id: "o1", slug: "belote-a-quatre-1a2b3c4d", organizer_id: "u1", title: "Belote à quatre", description: "Je fournis les cartes.",
  category: "jeux", starts_at: "2026-12-12T17:00:00Z", place_kind: "home", place_label: "Lyon 5e", setting: "indoor", city: "Lyon",
  postal_code: "69005", capacity: 4, reserved: 2, participation_eur: 3.5, status: "open", cancel_note: null, cancelled_at: null,
  created_at: "2026-11-12T10:00:00Z", taken: 3, organizer_first_name: "Martine", organizer_member_since: null, organizer_identity_verified: false,
};

describe("libellé de la rubrique", () => {
  const entraide = (open?: boolean) => flattenNavGroups(buildNavGroups("sitter", false, open)).find((e) => e.to === "/petites-missions")?.label;
  it("« Entraide » tant que les sorties sont fermées, « Entraide & sorties » ensuite", () => {
    expect(entraide()).toBe("Entraide");
    expect(entraide(false)).toBe("Entraide");
    expect(entraide(true)).toBe("Entraide & sorties");
    expect(entraideNavLabel(true)).toBe(OUTING_COPY.hubTitle);
  });
  it("les deux menus lisent le drapeau, sans tirer les images des sorties dans la coquille", () => {
    const nav = read("src/components/layout/Navigation.tsx");
    expect(nav.match(/useFeatureFlag\(OUTINGS_FLAG\)\.enabled/g)?.length).toBe(2);
    expect(nav).toContain('from "@/lib/outingsFlag"');
    expect(nav).not.toContain('from "@/lib/outings"');
    expect(OUTINGS_FLAG).toBe("sorties");
  });
});

describe("bouton central", () => {
  it("propose une sortie sur l'onglet Sorties, reste inchangé ailleurs", () => {
    expect(bottomNavFab("/sorties", true)).toEqual({ to: "/sorties/proposer", label: "Proposer", ariaLabel: "Proposer une sortie", icon: "plus" });
    expect(bottomNavFab("/sorties", false).to).toBe("/sorties/proposer");
    expect(bottomNavFab("/petites-missions", true).to).toBe("/petites-missions/creer");
    expect(bottomNavFab("/dashboard", true).to).toBe("/publier"); // lot SORT9
  });
});

describe("modifier et reproposer", () => {
  it("« Modifier » garde le jour, « Reproposer » le laisse à choisir", () => {
    const edit = draftFromOuting(outing, { keepDate: true });
    expect(edit.title).toBe("Belote à quatre");
    expect(edit.date).toMatch(/^2026-12-1[23]$/);
    expect(edit.time).toMatch(/^\d{2}:\d{2}$/);
    expect(edit.free).toBe(false);
    expect(edit.fee).toBe("3,5");
    const again = draftFromOuting(outing, { keepDate: false });
    expect(again.date).toBe("");
    expect(again.time).toBe("");
    expect(outingDraftErrors(again, new Date("2026-12-20T10:00:00Z")).date).toBeTruthy();
    expect(again.agendaConsent).toBe(false);
  });
  it("une modification laisse l'organisateur et l'accord d'agenda tels quels", () => {
    const row = outingUpdateFromDraft(draftFromOuting(outing, { keepDate: true }));
    expect(Object.keys(row)).not.toContain("organizer_id");
    expect(Object.keys(row)).not.toContain("agenda_consent");
    expect(row.participation_eur).toBe(3.5);
  });
  it("le total reste au moins égal aux places prises", () => {
    expect(minCapacityForEdit(outing, 2)).toBe(3);
    expect(minCapacityForEdit({ taken: 2, reserved: 2 }, 2)).toBe(3);
    expect(minCapacityForEdit({ taken: 6, reserved: 1 }, 1)).toBe(6);
  });
  it("écrans : liens de modification et de reprise, inscrits prévenus par la base", () => {
    const detail = read("src/pages/SortieDetail.tsx");
    expect(detail).toContain("/sorties/proposer?modifier=${outing.slug}");
    expect(detail).toContain("/sorties/proposer?depuis=${outing.slug}");
    const form = read("src/pages/SortieCreate.tsx");
    expect(form).toContain("data.organizer_id !== user.id");
    expect(form).toContain("updateOuting(source.id, outingUpdateFromDraft(draft))");
    const sql = read("drizzle/migrations/0146_sort2_modification_sortie.sql");
    expect(sql).toContain("AFTER UPDATE OF starts_at, place_kind, place_label, city ON public.outings");
    expect(sql).toContain("'outing_changed'");
    expect(sql).not.toMatch(/small_missions/);
  });
  it("textes affirmatifs", () => {
    for (const t of [OUTING_COPY.updated, OUTING_COPY.editIntro, OUTING_COPY.repropose, OUTING_COPY.reproposeIntro, OUTING_COPY.capacityFloor, OUTING_COPY.editTitle]) {
      expect(t, t).not.toMatch(/[—–]/);
      expect(t, t).not.toMatch(/\b(ne|pas|jamais|aucun|aucune|rien)\b|n['’]/i);
    }
  });
});
