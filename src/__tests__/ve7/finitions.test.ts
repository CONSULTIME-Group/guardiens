// Lot VE-7 (24/11/2026) : finitions de la vue d'ensemble relevées à la recette
// en ligne du lot VE-6 (fenêtre de « Marquer comme traité », ponctuation du
// détail, titre de la ligne « lieu à situer »).
import { describe, expect, it } from "vitest";
import { buildWorkList, type WorkListRaw } from "../../../supabase/functions/_shared/admin-work-list.ts";
import { buildGestures, sitLabel } from "@/lib/admin/gestures";
import { closeWording, ignoreConfirmTitle } from "@/components/admin/signals/IgnoreSignalsButton";

const NOW = new Date("2026-11-24T08:00:00Z").getTime();
const gesturesOf = (signals: unknown[], sits: unknown[]) =>
  buildGestures(buildWorkList({ sources: { signals: true, sits: true, queues: true, relances: true, health: true }, signals, sits, queues: [], relances_failed_7d: 0, health: [] } as unknown as WorkListRaw, NOW), NOW);

describe("VE-7 : détail d'une ligne d'annonce", () => {
  it("le titre perd sa ponctuation finale et la ville n'est dite qu'une fois", () => {
    expect(sitLabel("Garde de maison et d’animaux, à Puycelsi.", "Puycelsi")).toBe("Garde de maison et d’animaux, à Puycelsi");
    expect(sitLabel("Garde de Aïko", "Licq Atherey")).toBe("Garde de Aïko, Licq Atherey");
    expect(sitLabel("Deux chats à garder !", "")).toBe("Deux chats à garder");
    expect(sitLabel("", "Longvic")).toBe("Annonce sans titre, Longvic");
  });

  it("cas relevé en ligne : Puycelsi", () => {
    const g = gesturesOf(
      [{ id: "p1", signal_type: "pending_application", severity: "critical", entity_type: "sit", entity_id: "puy", detected_at: "2026-11-22T10:00:00Z", metadata: { owner_id: "o", owner_first_name: "Helen" } }],
      [{ id: "puy", start_date: "2026-11-28", title: "Garde de maison et d’animaux, à Puycelsi.", city: "Puycelsi" }],
    )[0];
    expect(g.detail).toBe("Garde de maison et d’animaux, à Puycelsi. Départ dans 4 jours, la relance automatique est déjà partie.");
    expect(g.detail).not.toMatch(/\.,|\.\./);
  });

  it("deux annonces du même type : chaque détail finit par un point", () => {
    const sig = (id: string, sit: string) => ({ id, signal_type: "stalled_discussion", severity: "critical", entity_type: "sit", entity_id: sit, detected_at: "2026-11-22T10:00:00Z", metadata: {} });
    const list = gesturesOf([sig("a", "s1"), sig("b", "s2")], [
      { id: "s1", start_date: "2026-11-28", title: "Maison de village", city: "Puycelsi" },
      { id: "s2", start_date: "2026-11-29", title: "Longère", city: "Saillans" },
    ]);
    expect(list.map((g) => g.detail)).toEqual(["Maison de village, Puycelsi.", "Longère, Saillans."]);
  });

  it("lieu à situer : le titre de la ligne dit « du propriétaire »", () => {
    const g = gesturesOf(
      [{ id: "c1", signal_type: "owner_missing_coordinates", severity: "warning", entity_type: "profile", entity_id: "o", detected_at: "2026-11-22T10:00:00Z", metadata: { sit_id: "dj", sit_title: "Garde de la maison" } }],
      [{ id: "dj", start_date: "2026-12-27", title: "Garde de la maison", city: "Tezdayine Djerba Tunisie" }],
    )[0];
    expect(g.title).toBe("Corriger le lieu du propriétaire à situer sur la carte");
    expect(g.title).not.toContain("de 1 ");
  });
});

describe("VE-7 : fenêtre de « Marquer comme traité »", () => {
  it("la ligne se ferme avec le mot du lien, du titre au message", () => {
    const one = closeWording(true, 1);
    expect(one.title).toBe("Marquer cette ligne comme traitée ?");
    expect(one.description).toBe("Elle sort de la liste et de l'email du matin. Vous pourrez annuler pendant 10 secondes.");
    expect(one.confirm).toBe("Marquer comme traité");
    expect(one.success).toBe("Ligne marquée comme traitée.");
    expect(closeWording(true, 3).description).toContain("Ses 3 signaux sortent de la liste");
    for (const text of Object.values(closeWording(true, 3))) expect(text).not.toMatch(/gnor|[—–]/);
  });

  it("les cartes gardent « Ignorer », mot pour mot", () => {
    const w = closeWording(false, 1);
    expect(w.title).toBe(ignoreConfirmTitle(1));
    expect(w.confirm).toBe("Ignorer");
    expect(w.success).toBe("Signal ignoré.");
    expect(closeWording(false, 3).success).toBe("3 signaux ignorés.");
    expect(closeWording(false, 3).description).toContain("Ils sortent de la liste");
  });
});
