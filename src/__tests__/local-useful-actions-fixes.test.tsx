// Régressions issues de l'audit du 18/10/2026 sur le bloc « Une action utile près de chez vous ».
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { MemoryRouter } from "react-router-dom";
import { associationLocalActions, missionLocalAction, selectLocalUsefulActions, type AssociationLocalAction, type LocalAction } from "@/lib/localUsefulActions";

const hook: { data: unknown } = { data: null };
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "membre-1" } }) }));
vi.mock("@/hooks/useLocalUsefulActions", () => ({ useLocalUsefulActions: () => ({ data: hook.data, isError: false }) }));
vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));
import LocalUsefulActions from "@/components/dashboard/shared/LocalUsefulActions";
import LocalActionEditor from "@/pages/admin/_components/associations/LocalActionEditor";

const now = new Date("2026-10-18T08:00:00Z");
const lyon = { latitude: 45.764, longitude: 4.8357 };
const at20km = { latitude: 45.944, longitude: 4.8357 };
const today = new Date().toISOString().slice(0, 10);
const action = (patch: Partial<LocalAction> = {}): LocalAction => ({
  id: "a1", kind: "entraide", title: "Arroser le potager", city: "Lyon", ...lyon, href: "/petites-missions/a1",
  date: "2099-01-01", until: "2099-01-01", when: "2099-01-01", duration: "Une heure", confirmedOn: today,
  skills: ["Arroser le potager"], requiredSkills: [], beginnerFriendly: true, ...patch,
});
const mission = (patch: Record<string, unknown> = {}) => ({
  id: "m1", user_id: "autre", title: "Monter une commode", city: "Lyon", ...lyon, status: "open",
  category: "house", created_at: "2026-10-17T10:00:00Z", date_needed: "2026-10-25", ...patch,
});
const sel = (list: LocalAction[], skills: string[] = [], interests: string[] = []) =>
  selectLocalUsefulActions(list, { point: lyon, skills, interests, radiusKm: 15, now });

describe("rayon toujours atteignable sans élargissement automatique", () => {
  beforeEach(() => localStorage.clear());
  it("affiche le sélecteur, sans carte, quand une action existe seulement à 30 km", () => {
    hook.data = { point: lyon, skills: [], interests: [], actions: [action({ ...at20km })] };
    render(<MemoryRouter><LocalUsefulActions /></MemoryRouter>);
    expect(screen.getByLabelText("Rayon des actions locales")).toHaveValue("15");
    expect(screen.queryByText("Découvrir l’action →")).toBeNull();
  });
  it("reste masqué quand aucune action n'existe dans aucun rayon", () => {
    hook.data = { point: lyon, skills: [], interests: [], actions: [action({ latitude: 47 })] };
    render(<MemoryRouter><LocalUsefulActions /></MemoryRouter>);
    expect(screen.queryByTestId("local-useful-actions")).toBeNull();
  });
});

describe("savoir-faire", () => {
  it("un terme technique devient un prérequis, satisfait par une compétence seulement", () => {
    const a = missionLocalAction(mission({ title: "Arroser les plantes et refaire le tableau électrique" }), "moi", now)!;
    expect(a.beginnerFriendly).toBe(false);
    expect(a.requiredSkills).toEqual(["electricite"]);
    expect(sel([a], [], ["Bricolage"])).toHaveLength(0);
    expect(sel([a], ["Électricité"])).toHaveLength(1);
  });
  it("un intérêt classe sans ouvrir une tâche non débutante ; « Art » ne correspond plus à « départ »", () => {
    const grenier = missionLocalAction(mission({ title: "Vider le grenier avant mon départ" }), "moi", now)!;
    expect(sel([grenier], [], ["Art"])).toHaveLength(0);
  });
});

describe("durée et données imparfaites", () => {
  it("affiche un libellé de durée lisible", () => {
    expect(missionLocalAction(mission({ duration_estimate: "half_day" }), "moi", now)!.duration).toBe("Demi-journée");
  });
  it("ignore les entrées JSON invalides sans exception", () => {
    const ok: AssociationLocalAction = { enabled: true, title: "Collecte", city: "Lyon", ...lyon, confirmed_on: "2026-10-17",
      available_from: "2026-10-19", available_until: "2026-10-25", duration: "2 h", beginner_friendly: true };
    const row = (needs: unknown) => ({ slug: "s", name: "N", needs_details: needs as never });
    expect(associationLocalActions(row({ a: 1 }), now)).toEqual([]);
    expect(associationLocalActions(row([null, { url: "https://x.fr", local_action: { ...ok, required_skills: "Couture", title: 12 } }]), now)).toEqual([]);
    expect(associationLocalActions(row([null, { url: "https://x.fr", local_action: ok }]), now)).toHaveLength(1);
  });
});

describe("formulaire d'administration", () => {
  function Harness({ initial, spy }: { initial: AssociationLocalAction; spy: (v: AssociationLocalAction) => void }) {
    const [v, setV] = useState(initial);
    return <LocalActionEditor index={0} value={v} onChange={n => { spy(n); setV(n); }} />;
  }
  it("conserve les espaces saisis au clavier dans les savoir-faire", () => {
    const spy = vi.fn();
    render(<Harness initial={{}} spy={spy} />);
    const input = screen.getByPlaceholderText("Couture, conduite…") as HTMLInputElement;
    for (const ch of "Travail du bois, Taille de haies") fireEvent.change(input, { target: { value: input.value + ch } });
    expect(spy.mock.lastCall?.[0].required_skills.map((s: string) => s.trim())).toEqual(["Travail du bois", "Taille de haies"]);
  });
  it("vide réellement le code postal au dernier chiffre", () => {
    const spy = vi.fn();
    render(<Harness initial={{ postal_code: "6", city: "" }} spy={spy} />);
    const postal = screen.getByPlaceholderText("69001") as HTMLInputElement;
    fireEvent.change(postal, { target: { value: "" } });
    expect(postal.value).toBe("");
    expect(spy.mock.lastCall?.[0]).toMatchObject({ postal_code: "", city: "", latitude: null, longitude: null });
  });
});
