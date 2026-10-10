import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { readFileSync } from "node:fs";
import { lookupActiveLineTokens, isTransientError } from "../../../supabase/functions/send-mass-email/lineTokens";
import { reopenWithAnotherSentence, repeatsOpener } from "../../../supabase/functions/_shared/alma-companion";
import { ROLE_SWITCH_INTENT } from "../../../supabase/functions/_shared/alma-next-action";
import { measureCompanion } from "@/lib/alma/companionMetrics";
import { openingRepetition } from "@/lib/admin/alma-conversations";
import EmailClickRedirect from "@/pages/EmailClickRedirect";

const fold = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

function client(script: Array<{ data?: any[]; error?: any; throws?: boolean }>) {
  const calls: string[][] = [];
  let n = 0;
  const c = {
    from: () => ({ select: () => ({ in: (_c: string, v: string[]) => ({ is: () => ({ gt: async () => {
      calls.push(v);
      const step = script[Math.min(n++, script.length - 1)];
      if (step.throws) throw new Error("error sending request");
      return { data: step.data ?? [], error: step.error ?? null };
    } }) }) }) }),
  };
  return { c, calls };
}

describe("send-mass-email, jetons de ligne", () => {
  const ids = Array.from({ length: 120 }, (_, i) => `p${i}`);
  it("lots de 50, profils dédupliqués, jetons réutilisés", async () => {
    const { c, calls } = client([{ data: [{ profile_id: "p1", token: "t1" }] }]);
    const m = await lookupActiveLineTokens(c as any, [...ids, ...ids], "now", { wait: async () => {} });
    expect(calls.map((x) => x.length)).toEqual([50, 50, 20]);
    expect(m.get("p1")).toBe("t1");
  });
  it("erreur de transport : nouvelle tentative puis succès", async () => {
    const { c, calls } = client([{ throws: true }, { data: [] }]);
    await lookupActiveLineTokens(c as any, ["a"], "now", { wait: async () => {} });
    expect(calls.length).toBe(2);
  });
  it("échec persistant ou droits : arrêt explicite, aucun envoi possible", async () => {
    const send = vi.fn();
    const run = async (cl: any) => { await lookupActiveLineTokens(cl, ["a"], "now", { wait: async () => {} }); send(); };
    const t = client([{ throws: true }]);
    await expect(run(t.c)).rejects.toThrow(/line token lookup failed/);
    expect(t.calls.length).toBe(3);
    const p = client([{ error: { message: "permission denied for table helps_line_tokens", code: "42501" } }]);
    await expect(run(p.c)).rejects.toThrow(/permission denied/);
    expect(p.calls.length).toBe(1);
    expect(send).not.toHaveBeenCalled();
    expect(isTransientError({ message: "TypeError: error sending request" })).toBe(true);
  });
});

describe("Alma, amorce répétée sur la réponse finale (cas 40, 41, 43, 50)", () => {
  const cases: Record<string, { a: string; must: string[] }> = {
    "cas-40": { a: "La garde se situe dans le 69380, dans le Rhône, pour des dates allant du 9 au 20 janvier 2027. L'annonce mentionne un yorkshire de 11 ans. La commune exacte vous sera précisée par le propriétaire : vous pouvez lui poser la question en envoyant votre candidature.\n\nVous pouvez postuler à cette annonce.", must: ["69380", "yorkshire", "propriétaire", "postuler"] },
    "cas-41": { a: "Les photos de votre logement se gèrent toutes au même endroit, dans la rubrique Galerie de votre profil propriétaire. Vous pouvez y ajouter de nouvelles photos, en remplacer certaines, ou en supprimer d'autres. Si la photo que vous enlevez servait de couverture à votre annonce, la suivante prendra sa place automatiquement.", must: ["Galerie", "supprimer"] },
    "cas-43": { a: "Guardiens propose des gardes en France, mais il n'y a aucune garde en Italie aujourd'hui.\n\nPour voir les gardes proposées par d'autres membres, rendez-vous dans votre espace gardien.\n\nJe peux vous montrer les gardes disponibles en France.", must: ["aucune garde en Italie", "espace gardien"] },
    "cas-50": { a: "Pour trouver quelqu'un pour garder Filou pendant vos vacances en novembre, vous devez publier une annonce de garde. Vous décrivez votre besoin et les dates. Les gardiens intéressés pourront vous contacter.\n\nVous pouvez publier votre annonce de garde.", must: ["Filou", "novembre", "publier"] },
  };
  for (const [id, { a, must }] of Object.entries(cases)) {
    it(id, () => {
      const out = reopenWithAnotherSentence(a, [a])!;
      expect(out).toBeTruthy();
      expect(repeatsOpener(out, [a])).toBe(false);
      for (const m of must) expect(out).toContain(m);
      expect(out.length).toBe(a.length);
      // la dernière ligne d'action reste à la fin
      if (a.includes("\n\n")) expect(out.split("\n\n").pop()).toBe(a.split("\n\n").pop());
      expect(out).not.toMatch(/^(Vous pouvez y|Elle|Il|Cela)\b/);
    });
  }
  it("aucune variante acceptée : null, jamais de préfixe ajouté", () => {
    expect(reopenWithAnotherSentence("Une seule phrase ici présente.", ["Une seule phrase ici présente."])).toBeNull();
    expect(reopenWithAnotherSentence(cases["cas-40"].a, [cases["cas-40"].a], () => false)).toBeNull();
  });
});

describe("Alma, inverser propriétaire et gardien", () => {
  it.each(["J'ai inverséproprietaire et guardien comment inverser le compte", "Comment basculer côté gardien ?", "Je veux changer d'espace"])("%s", (q) =>
    expect(ROLE_SWITCH_INTENT.test(fold(q))).toBe(true));
  it("sans rapport", () => expect(ROLE_SWITCH_INTENT.test(fold("Je cherche un coup de main pour mon jardin"))).toBe(false));
});

describe("Admin Alma, une seule définition de la répétition", () => {
  it("Conversations et Pilotage donnent le même taux", () => {
    const answers = ["Bonjour ! Voici ce que je vois ici.", "bonjour, voici ce que je vois là", "Autre départ complet ici.", "Ok.", "Ok."];
    const rows = answers.map((answer, i) => ({ id: String(i), created_at: "", surface: "x", active_role: "owner", question: "", answer, register: null, refusal_reason: null, input_mode: null }));
    const m = measureCompanion(answers.map((answer) => ({ answer, classification: null })));
    expect(openingRepetition(rows as any).repetitionRate).toBeCloseTo(m.sharedOpeners / m.answers);
    expect(m.sharedOpeners).toBe(2);
  });
});

describe("/go, route critique hors chargement différé", () => {
  it("import direct dans App et redirection sûre", () => {
    const app = readFileSync("src/App.tsx", "utf8");
    expect(app).toMatch(/import EmailClickRedirect from "\.\/pages\/EmailClickRedirect"/);
    expect(app).not.toMatch(/lazy\(\(\) => import\("\.\/pages\/EmailClickRedirect"\)/);
    const replace = vi.fn();
    Object.defineProperty(window, "location", { value: { ...window.location, replace }, writable: true });
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(""));
    const u = btoa("https://guardiens.fr/annonces").replace(/=+$/, "");
    render(<MemoryRouter initialEntries={[`/go?u=${u}`]}><Routes><Route path="/go" element={<EmailClickRedirect />} /></Routes></MemoryRouter>);
    expect(replace).toHaveBeenCalledWith("https://guardiens.fr/annonces");
    expect(fetchSpy).not.toHaveBeenCalled(); // sans mid, aucun suivi
    replace.mockClear();
    const evil = btoa("https://exemple.invalid/x");
    render(<MemoryRouter initialEntries={[`/go?u=${evil}`]}><Routes><Route path="/go" element={<EmailClickRedirect />} /></Routes></MemoryRouter>);
    expect(replace).toHaveBeenCalledWith("https://guardiens.fr");
  });
});
